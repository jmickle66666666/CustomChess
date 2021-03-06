var Chess = function(fen) {
    
    // Constants 
    var BLACK = 'b';
    var WHITE = 'w';
    var EMPTY = '-';
    var DEFAULT_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    // Board state

    var lastFen = DEFAULT_POSITION; // for undoing
    var turn = WHITE;
    var CASTLE_RIGHTS = {
        "white" : { "qside" : false, "kside" : false },
        "black" : { "qside" : false, "kside" : false }
    };

    var EN_PASSANT = '-';
    var HALFMOVE_CLOCK = 0;
    var FULLMOVE_CLOCK = 1;

    var BOARD = new Array(64);
    var BOARD_WIDTH = 8;

    var PIECES = [];

    // Convert castling writes to fen-compatible string
    function fenCastleRights() {
        output = "";
        if (CASTLE_RIGHTS.white.kside) output += "K";
        if (CASTLE_RIGHTS.white.qside) output += "Q";
        if (CASTLE_RIGHTS.black.kside) output += "k";
        if (CASTLE_RIGHTS.black.qside) output += "q";
        if (output == "") output = "-";
        return output;
    }

    // Read castling writes from fen-compatible string
    function loadFenCastleRights(fenData) {
        CASTLE_RIGHTS.white.kside = fenData.indexOf("K") > -1;
        CASTLE_RIGHTS.white.qside = fenData.indexOf("Q") > -1;
        CASTLE_RIGHTS.black.kside = fenData.indexOf("k") > -1;
        CASTLE_RIGHTS.black.qside = fenData.indexOf("q") > -1;
    }

    // Checks if the current player is currently in check
    function inCheck() {
        for (var i = 0; i < BOARD.length; i++) {
            if (BOARD[i] != EMPTY) {
                // Iterate all royal pieces for the current player
                    if (getPieceBySymbol(BOARD[i]).royal == true && getColor(BOARD[i]) == turn) {
                        for (var j = 0; j < BOARD.length; j++) {
                            if (BOARD[j] != EMPTY) {
                                // Iterate each piece for the opponent, and see if it attacking the royal piece
                                    if (getColor(BOARD[j]) != turn) {
                                        if (getPieceBySymbol(BOARD[j]).attacking(boardPosToSan(j),boardPosToSan(i))) return true;
                                            }}}}}} return false;
    }

    // convert a3a4 format to move object
    function sanMoveToObject(sanMove) {
        // I really want to replace all the san/coords bullshit with move objects internally. TODO
        // this is just the beginning.....
        var output = {
            from : '',
            to : '',
            promotion : '',
            capture : false,
            piece : '',
            color : '',
            check : false,
            checkmate : false
        };

        output.from = sanMove.substring(0,2);
        if (sanMove.charAt(2) == 'x') {
            output.capture = true;
            output.to = sanMove.substring(3,5);
        }
        else output.to = sanMove.substring(2,4);
        if (sanMove.indexOf('=') > -1) {
            output.promotion = sanMove.charAt(sanMove.indexOf('=')+1);
        }

        output.piece = BOARD[sanToBoardPos(output.from)];
        output.color = getColorAt(output.from);
        if (output.capture == false) {
            output.capture = !isEmpty(output.to);
        }
        executeMove(sanToSimpleMoveObject(sanMove));
        if (inCheck()) {
            if (legalMoves().length == 0) {
                output.checkmate = true;
            } else {
                output.check = true;
            }
        }
        undo();

        return output;
    }

    // convert a3a4 format to move object, without comprehensive data
    function sanToSimpleMoveObject(sanMove) {
        var output = {
            from : '',
            to : '',
            promotion : '',
            capture : false,
        };

        output.from = sanMove.substring(0,2);
        if (sanMove.charAt(2) == 'x') {
            output.capture = true;
            output.to = sanMove.substring(3,5);
        }
        else output.to = sanMove.substring(2,4);
        if (sanMove.indexOf('=') > -1) {
            output.promotion = sanMove.charAt(sanMove.indexOf('=')+1);
        }

        return output;
    }

    // convert move object to a3a4 format
    function moveObjectToSan(moveObject) {
        var output = '';
        var piece = BOARD[sanToBoardPos(moveObject.from)];
        var color = getColor(piece);
        output += moveObject.from;
        // check it is actually capturing
        if (!isEmpty(moveObject.to)) moveObject.capture = true;
        if (moveObject.capture) {
            output += 'x';
        }
        output += moveObject.to;
        // same, gotta check if it really is promoting.
        if (moveObject.promotion != '') {
            if ((piece == 'p' && moveObject.to[1] == 1) || (piece == 'P' && moveObject.to[1] == 8))
                output += '=' + moveObject.promotion;
        }

        return output;
    }

    // is the move currently legal
    function validateMove(moveObject) {
        return legalMoves().indexOf(moveObjectToSan(moveObject)) > -1;
    }

    // get the color of a piece character
    // eg: getColor('k'); // BLACK
    function getColor(piece) {
        if (piece == EMPTY) return null;
        if (piece == piece.toUpperCase()) return WHITE;
        return BLACK;
    }

    // get the color of a piece, from a san position
    // eg: getColor('a5');
    function getColorAt(san) {
        return getColor(BOARD[sanToBoardPos(san)]);
    }

    // is the board position empty?
    function isEmpty(san) {
        return BOARD[sanToBoardPos(san)] == EMPTY;
    }

    // get the piece data from a symbol
    function getPieceBySymbol(symbol) {
        for (var i = 0; i < PIECES.length; i++) {
            if (PIECES[i].symbol == symbol.toLowerCase()) return PIECES[i];
        }
        console.log("can't find "+symbol);
    }

    // convert 'a5' format to { file : 1, rank: 5 }
    function sanToCoords(san) {
        var file = san.charCodeAt(0)-96;
        var rank = parseInt(san.charAt(1));
        return { 'rank':rank, 'file':file };
    }

    // convert { file : 1, rank: 5 } format to 'a5'
    function coordsToSan(file,rank) {
        return String.fromCharCode(file+96) + rank;
    }

    // convert board index to 'a5' format
    function boardPosToSan(position) {
        return coordsToSan(1 + position % 8, 8 - Math.floor(position / 8));
    }

    // convert 'a5' format to board index
    function sanToBoardPos(san) {
        var coords = sanToCoords(san);
        return ((8 - coords.rank) * 8) + (coords.file-1);
    }

    // convert { file : 1, rank: 5 } format to board index
    function coordsToBoardPos(coords) {
        return ((8 - coords.rank) * 8) + (coords.file-1);
    }

    // utility function to build possible moves based on type and position
    function buildMoves(san,moves) {
        var outMoves = [];
        for (var i = 0; i < moves.length; i++) {
            if (moves[i][0] == 'leap') {
                var inMoves = buildLeap(san,moves[i][1]);
                outMoves = outMoves.concat(inMoves);
            }

            if (moves[i][0] == 'slide') {
                var inMoves = buildSlide(san,moves[i][1]);
                outMoves = outMoves.concat(inMoves);
            }
        }
        return outMoves;
    }

    // check if a move is possible
    function checkMove(file,rank,san,move) {
        if (file > 0 && rank > 0 && file <= 8 && rank <= 8) {
            var move = coordsToSan(file,rank);
            if (BOARD[sanToBoardPos(move)] != EMPTY) {
                // Square is not empty, lets see if we can attack it
                if (getColor(BOARD[sanToBoardPos(san)]) != getColor(BOARD[sanToBoardPos(move)])) {
                    // Opponent piece, is it royal though? (You can't capture a king!)
                    if (getPieceBySymbol(BOARD[sanToBoardPos(move)]).royal != true) {
                        return san+'x'+move;
                    }
                }
            } else {
                return san+move;
            }
        }
        return null;
    }

    // utility to build 'leap' moves
    function buildLeap(san,move) {
        var coords = sanToCoords(san);
        var output = [];
        var m;
        m = checkMove(coords.file + move[0], coords.rank + move[1],san,move); if (m) output.push(m);
        m = checkMove(coords.file + move[0], coords.rank - move[1],san,move); if (m) output.push(m);
        m = checkMove(coords.file - move[0], coords.rank + move[1],san,move); if (m) output.push(m);
        m = checkMove(coords.file - move[0], coords.rank - move[1],san,move); if (m) output.push(m);
        return output.reduce(function(a,b){if(a.indexOf(b)<0)a.push(b);return a;},[]);
    }

    // utility to build 'slide' moves
    function buildSlide(san,move) {
        var coords = sanToCoords(san);
        var output = [];
        var m;
        function pushSlide(x,y) {
            var nc = { file : coords.file, rank : coords.rank };
            while (nc.file <= 8 && nc.file > 0 && nc.rank > 0 && nc.rank <= 8) {
                nc.file += x;
                nc.rank += y;
                if (!(nc.file <= 8 && nc.file > 0 && nc.rank > 0 && nc.rank <= 8)) break;
                sq = BOARD[coordsToBoardPos(nc)];
                if (sq != EMPTY && getColor(sq) == getColor(BOARD[sanToBoardPos(san)])) {
                    // blocked, stop.
                    break;
                }
                m = checkMove(nc.file, nc.rank,san,move); if (m) output.push(m);
            }
        }
        pushSlide(move[0],move[1]);
        pushSlide(-move[0],move[1]);
        pushSlide(move[0],-move[1]);
        pushSlide(-move[0],-move[1]);
        return output.reduce(function(a,b){if(a.indexOf(b)<0)a.push(b);return a;},[]);
    }

    // check if a set of moves will result an attack from the 'from' square to the 'to' square
    function attacking(from, to, moves) {
        var coords = sanToCoords(from);
        for (var i = 0; i < moves.length; i++) {
            if (moves[i][0] == 'leap') {
                if (coordsToSan(coords.file + moves[i][1][0], coords.rank + moves[i][1][1]) == to) return true;
                if (coordsToSan(coords.file - moves[i][1][0], coords.rank + moves[i][1][1]) == to) return true;
                if (coordsToSan(coords.file + moves[i][1][0], coords.rank - moves[i][1][1]) == to) return true;
                if (coordsToSan(coords.file - moves[i][1][0], coords.rank - moves[i][1][1]) == to) return true;
            }
            if (moves[i][0] == 'slide') {
                var x,y;
                x = coords.file; y = coords.rank;
                while (x <= 8 && y <= 8) {
                    x += moves[i][1][0];
                    y += moves[i][1][1];
                    if (!(x <= 8 && y <= 8)) break;
                    sq = BOARD[coordsToBoardPos({file:x,rank:y})];
                    if (sq != EMPTY && sq != BOARD[sanToBoardPos(to)]) {
                        // blocked, stop.
                        break;
                    }
                    if (coordsToSan(x,y) == to) return true;
                }
                x = coords.file; y = coords.rank;
                while (x >= 1 && y <= 8) {
                    x -= moves[i][1][0];
                    y += moves[i][1][1];
                    if (!(x >= 1 && y <= 8)) break;
                    sq = BOARD[coordsToBoardPos({file:x,rank:y})];
                    if (sq != EMPTY && sq != BOARD[sanToBoardPos(to)]) {
                        // blocked, stop.
                        break;
                    }
                    if (coordsToSan(x,y) == to) return true;
                }
                x = coords.file; y = coords.rank;
                while (x <= 8 && y >= 1) {
                    x += moves[i][1][0];
                    y -= moves[i][1][1];
                    if (!(x <= 8 && y >= 1)) break;
                    sq = BOARD[coordsToBoardPos({file:x,rank:y})];
                    if (sq != EMPTY && sq != BOARD[sanToBoardPos(to)]) {
                        // blocked, stop.
                        break;
                    }
                    if (coordsToSan(x,y) == to) return true;
                }
                x = coords.file; y = coords.rank;
                while (x >= 1 && y >= 1) {
                    x -= moves[i][1][0];
                    y -= moves[i][1][1];
                    if (!(x >= 1 && y >= 1)) break;
                    sq = BOARD[coordsToBoardPos({file:x,rank:y})];
                    if (sq != EMPTY && sq != BOARD[sanToBoardPos(to)]) {
                        // blocked, stop.
                        break;
                    }
                    if (coordsToSan(x,y) == to) return true;
                }
            }
        }
        return false;
    }

    // create a new piece
    function newPiece(options) {
        var defaultArgs = {
            'moves' : [],
            'royal' : false,
            'symbol' : 'x',
            'legalMoves' : function (san) {
                return buildMoves(san,this.moves);
            },
            'attacking' : function (from,to) {
                return attacking(from, to, this.moves);
            }
        }
        for(var index in defaultArgs) {
            if(typeof options[index] == "undefined") options[index] = defaultArgs[index];
        }
        return options;
    }

    // Default piece definitions

    var KING = newPiece({
        moves : [
            ['leap',[1,0]],
            ['leap',[1,1]],
            ['leap',[0,1]]
        ],
        legalMoves : function (san) {
            var output = buildMoves(san,this.moves);
            // add castling
            var pos = sanToCoords(san);
            // black kingside
            var color = getColorAt(san);
            if (color == BLACK) {
            if (CASTLE_RIGHTS.black.kside == true) {
                if (isEmpty(coordsToSan(pos.file + 1,pos.rank)) && 
                    isEmpty(coordsToSan(pos.file + 2,pos.rank))) output.push('O-O');
            }
            // black queenside
            if (CASTLE_RIGHTS.black.qside == true) {
                if (isEmpty(coordsToSan(pos.file - 1,pos.rank)) && 
                    isEmpty(coordsToSan(pos.file - 2,pos.rank)) &&
                    isEmpty(coordsToSan(pos.file - 3,pos.rank))) output.push('O-O-O');
            }
            } else {
            // white kingside
            if (CASTLE_RIGHTS.white.kside == true) {
                if (isEmpty(coordsToSan(pos.file + 1,pos.rank)) && 
                    isEmpty(coordsToSan(pos.file + 2,pos.rank))) output.push('O-O');
            }
            // white queenside
            if (CASTLE_RIGHTS.white.qside == true) {
                if (isEmpty(coordsToSan(pos.file - 1,pos.rank)) && 
                    isEmpty(coordsToSan(pos.file - 2,pos.rank)) &&
                    isEmpty(coordsToSan(pos.file - 3,pos.rank))) output.push('O-O-O');
            }
            }
            return output;
        },
        royal : true,
        symbol : 'k'
    });

    PIECES.push(KING);

    var KNIGHT = newPiece({
        moves : [
            ['leap',[1,2]],
            ['leap',[2,1]]
        ],
        symbol : 'n'
    });

    PIECES.push(KNIGHT);

    var QUEEN = newPiece({
        moves : [
            ['slide',[1,1]],
            ['slide',[1,0]],
            ['slide',[0,1]]
        ],
        symbol : 'q'
    });

    PIECES.push(QUEEN);

    var BISHOP = newPiece({
        moves : [
            ['slide',[1,1]]
        ],
        symbol : 'b'
    });

    PIECES.push(BISHOP);

    var ROOK = newPiece({
        moves : [
            ['slide',[0,1]],
            ['slide',[1,0]]
        ],
        symbol : 'r'
    });

    PIECES.push(ROOK);

    var SPAREQUEEN = newPiece({
        moves : [
            ['slide',[1,1]],
            ['slide',[1,0]],
            ['slide',[0,1]]
        ],
        symbol : 'o'
    });

    PIECES.push(SPAREQUEEN);

    // The pawn requires bespoke behaviour for moving.

    var PAWN = newPiece({
        legalMoves : function(san) {
            
            var output = [];
            var color = getColorAt(san);
            var coords = sanToCoords(san);

            // if we somehow have a pawn at the edge, exit early.
            if (color == 'b' && coords.rank == 1) return [];
            if (color == 'w' && coords.rank == 8) return [];

            // promotion & double move check
            var promotionRank = false;
            var doubleMove = false;
            if (color == 'b') {
                if (coords.rank == 2) promotionRank = true;
                if (coords.rank == 7) doubleMove = true;
            }
            if (color == 'w') {
                if (coords.rank == 7) promotionRank = true;
                if (coords.rank == 2) doubleMove = true;
            }

            // movement
            var upMove = sanToCoords(san);
            if (color == 'w') upMove.rank += 1;
            if (color == 'b') upMove.rank -= 1;
            if (isEmpty(coordsToSan(upMove.file,upMove.rank))) {
                var out = san + coordsToSan(upMove.file,upMove.rank);
                if (!promotionRank) {
                    output.push(out);
                } else {
                    for (var i = 0; i < PIECES.length; i++) {
                        var prom = PIECES[i].symbol;
                        output.push(out + '=' + prom);
                    }
                }
            }
            if (doubleMove) {
                if (color == 'w') upMove.rank += 1;
                if (color == 'b') upMove.rank -= 1;
                if (isEmpty(coordsToSan(upMove.file,upMove.rank)) &&
                    isEmpty(coordsToSan(upMove.file,upMove.rank + (color=='w'?-1:1)))) output.push(san + coordsToSan(upMove.file,upMove.rank));
            }
            var _tof,_tor,to_san;
            // attacking
            if (coords.file <= 7) {
                _tof = coords.file + 1;
                _tor = coords.rank + (color=='w'?1:-1);
                to_san = coordsToSan(_tof,_tor);
                if (!isEmpty(to_san)) {
                    if (color != getColorAt(to_san) && getPieceBySymbol(BOARD[sanToBoardPos(to_san)]).royal != true) {
                        var out = san + 'x' + to_san;
                        if (!promotionRank) {
                            output.push(out);
                        } else {
                            for (var i = 0; i < PIECES.length; i++) {
                                var prom = PIECES[i].symbol;
                                output.push(out + '=' + prom);
                            }
                        }
                    }
                }
            }

            if (coords.file >= 2) {
                _tof = coords.file - 1;
                _tor = coords.rank + (color=='w'?1:-1);
                to_san = coordsToSan(_tof,_tor);
                if (!isEmpty(to_san)) {
                    if (color != getColorAt(to_san) && getPieceBySymbol(BOARD[sanToBoardPos(to_san)]).royal != true) {
                        var out = san + 'x' + to_san;
                        if (!promotionRank) {
                            output.push(out);
                        } else {
                            for (var i = 0; i < PIECES.length; i++) {
                                var prom = PIECES[i].symbol;
                                output.push(out + '=' + prom);
                            }
                        }
                    }
                }
            }

            return output;
        },
        attacking : function (from, to) {
            var color = getColorAt(from);
            var coords = sanToCoords(from);

            // if we somehow have a pawn at the edge, exit early.
            if (color == 'b' && coords.rank == 1) return false;
            if (color == 'w' && coords.rank == 8) return false;

            if (coordsToSan(coords.file + 1, coords.rank + (color=='w'?1:-1)) == to) return true;
            if (coordsToSan(coords.file - 1, coords.rank + (color=='w'?1:-1)) == to) return true;
            return false;
        },
        symbol : 'p'
    });

    PIECES.push(PAWN);

    // other stuff

    if (!fen) {
        fen = DEFAULT_POSITION;
    }

    // load a fen string into board state
    function loadFEN(fen) {
        var fenPosition = 0;
        var boardPosition = 0;
        var fenArray = fen.split(' ');
        var fenDefinition = fenArray[0];


        for (fenPosition = 0; fenPosition < fenDefinition.length; fenPosition += 1) {
            if (isNaN(fenDefinition.charAt(fenPosition))) {
                // piece
                if (fenDefinition.charAt(fenPosition) != '/') {
                    BOARD[boardPosition] = fenDefinition.charAt(fenPosition);
                    boardPosition += 1;
                }
            } else {
                for (var a = 0; a < parseInt(fenDefinition.charAt(fenPosition)); a++) BOARD[boardPosition + a] = EMPTY;
                boardPosition += parseInt(fenDefinition.charAt(fenPosition));
            }
        }
        turn = fenArray[1];

        loadFenCastleRights(fenArray[2]);
        EN_PASSANT = fenArray[3];
        HALFMOVE_CLOCK = parseInt(fenArray[4]);
        FULLMOVE_CLOCK = parseInt(fenArray[5]);
    }

    // output the board state as a FEN string
    function saveFEN() {
        var spaceCounter = 0;
        var fenPosition = '';
        var output = '';
        for (var i = 0; i < BOARD.length; i++) {
            if (BOARD[i] == EMPTY) spaceCounter += 1;
            else {
                if (spaceCounter > 0) {
                    fenPosition += spaceCounter;
                    spaceCounter = 0;
                }
                fenPosition += BOARD[i];
            }
            if (i % BOARD_WIDTH == 7 && i < BOARD.length -1) {
                if (spaceCounter != 0) fenPosition += spaceCounter;
                fenPosition += "/";
                spaceCounter = 0;
            }
        }
        if (spaceCounter > 0) fenPosition += spaceCounter;
        
        output = [fenPosition,turn,fenCastleRights(),EN_PASSANT,HALFMOVE_CLOCK.toString(),FULLMOVE_CLOCK.toString()].join(' ');

        return output;
    }

    // build a list of the current legal moves
    // currently outputs 'a3a5' format moves
    function legalMoves() {
        var output = [];
        var outmoves = [];
        for (var i = 0; i < BOARD.length; i++) {
            if (BOARD[i] != EMPTY) {
                if ((turn == WHITE && BOARD[i] == BOARD[i].toUpperCase()) ||
                    (turn == BLACK && BOARD[i] == BOARD[i].toLowerCase()))
                        outmoves = outmoves.concat(getPieceBySymbol(BOARD[i]).legalMoves(boardPosToSan(i)));
            }
        }

        // verify moves avoid check:
        for (i = 0; i < outmoves.length; i++) {
            var cr = testMove(outmoves[i]);
            if (!inCheck()) output.push(outmoves[i]);
            loadFEN(cr);
        }

        return output;
    }

    function simpleMoves() {
        var moveList = legalMoves();
        var output = [];
        for (var i = 0; i < moveList.length; i++) {
            output.push(simplify(moveList[i]));
        }
        return output;
    }

    function simplify(sanMove) {
        var output = '';
        var move = sanMoveToObject(sanMove);
        if (!move.capture) {
            if (move.piece.toUpperCase() != 'P') output += move.piece.toUpperCase();
        } else {
            if (move.piece.toUpperCase() != 'P') {
                output += move.piece.toUpperCase();
            } else {
                output += move.from.charAt(0);
            }
            output += 'x';
        }
        output += move.to;
        if (move.promotion != '') output += '='+output.promotion;
        if (move.check) output += '+';
        if (move.checkmate) output += '#';
        return output;
    }

    // move a piece without changing turn or affecting other board state information
    function testMove(move) {
        var currentFen = saveFEN();
        move = sanToSimpleMoveObject(move);
        var fromPiece = BOARD[sanToBoardPos(move.from)];
        if (move.promotion != '') {
            if (turn == WHITE) move.promotion = move.promotion.toUpperCase();
            BOARD[sanToBoardPos(move.to)] = move.promotion;
        } else {
            BOARD[sanToBoardPos(move.to)] = fromPiece;  
        }
        BOARD[sanToBoardPos(move.from)] = EMPTY;
        return currentFen;
    }

    // move a piece on the board
    function executeMove(move) {

        if (validateMove(move)) {
            lastFen = saveFEN();

            // please ignore this
            move = sanToSimpleMoveObject(moveObjectToSan(move));
            var fromPiece = BOARD[sanToBoardPos(move.from)];
            
            if (move.promotion != '') {
                if (turn == WHITE) move.promotion = move.promotion.toUpperCase();
                BOARD[sanToBoardPos(move.to)] = move.promotion;
            } else {
                BOARD[sanToBoardPos(move.to)] = fromPiece;  
            }

            BOARD[sanToBoardPos(move.from)] = EMPTY;

            if (turn == BLACK) FULLMOVE_CLOCK += 1;
            if (turn == WHITE) turn = BLACK; else turn = WHITE;

            if (!move.capture) HALFMOVE_CLOCK += 1; else HALFMOVE_CLOCK = 0;
        } else return null;
    }

    function undo() {
        loadFEN(lastFen);
    }

    loadFEN(fen);

    // PUBLIC API
    return {
        fen : function() {
            return saveFEN();
        },

        reset : function() {
            loadFEN(DEFAULT_POSITION);
        },

        load : function(fen) {
            loadFEN(fen);
        },

        simple_moves : function () {
            return simpleMoves();
        },

        moves : function () {
            return legalMoves();
        },

        set_turn : function(side) {
            turn = side;
        },

        turn : function() {
            return turn;
        },

        get : function(square) {
            return BOARD[sanToBoardPos(square)];
        },

        move : function(move) {
            return executeMove(move);
        },

        in_check : function() {
            return inCheck();
        },

        in_checkmate : function() {
            return inCheck() && legalMoves() == 0;
        },

        in_stalemate : function() {
            return !inCheck() && legalMoves() == 0;
        },

        in_draw : function() {
            return !inCheck() && legalMoves() == 0;
        },

        game_over: function() { 
            return this.in_draw() || this.in_checkmate();
        }
    }

}