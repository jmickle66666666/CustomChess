var Chess = function(fen) {
    
    var BLACK = 'b';
    var WHITE = 'w';

    var EMPTY = '-';

    // state
    var turn = WHITE;
    var CASTLE_RIGHTS = '-';
    var EN_PASSANT = '-';
    var HALFMOVE_CLOCK = 0;
    var FULLMOVE_CLOCK = 1;

    var BOARD = new Array(64);
    var BOARD_WIDTH = 8;

    var PIECES = [];

    function sanMoveToObject(sanMove) {
        // I really want to replace all the san/coords bullshit with move objects internally. TODO
        // this is just the beginning.....
        var output = {
            from : '',
            to : '',
            promotion : '',
            capture : false
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

    function moveObjectToSan(moveObject) {
        return output.from + output.capture?'x':'' + output.to + output.promotion!=''?'='+output.promotion:'';
    }

    function validateMove(moveObject) {
        return legalMoves().indexOf(moveObjectToSan(moveObject)) > -1;
    }

    function getColor(piece) {
        if (piece == piece.toUpperCase()) return WHITE;
        return BLACK;
    }

    function getColorAt(san) {
        return getColor(BOARD[sanToBoardPos(san)]);
    }

    function isEmpty(san) {
        return BOARD[sanToBoardPos(san)] == EMPTY;
    }

    function getPieceBySymbol(symbol) {
        for (var i = 0; i < PIECES.length; i++) {
            if (PIECES[i].symbol == symbol.toLowerCase()) return PIECES[i];
        }
        console.log("can't find "+symbol);
    }

    function sanToCoords(san) {
        var file = san.charCodeAt(0)-96;
        var rank = parseInt(san.charAt(1));
        return { 'rank':rank, 'file':file };
    }

    function coordsToSan(file,rank) {
        return String.fromCharCode(file+96) + rank;
    }

    function boardPosToSan(position) {
        return coordsToSan(1 + position % 8, 8 - Math.floor(position / 8));
    }

    function sanToBoardPos(san) {
        var coords = sanToCoords(san);
        return ((8 - coords.rank) * 8) + (coords.file-1);
    }

    function coordsToBoardPos(coords) {
        return ((8 - coords.rank) * 8) + (coords.file-1);
    }

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

    function newPiece(options) {
        var defaultArgs = {
            'moves' : [],
            'royal' : false,
            'symbol' : 'x',
            'legalMoves' : function (san) {
                return buildMoves(san,this.moves);
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
                    output.push(out + '=Q');
                    output.push(out + '=R');
                    output.push(out + '=N');
                    output.push(out + '=B');
                }
            }
            if (doubleMove) {
                if (color == 'w') upMove.rank += 1;
                if (color == 'b') upMove.rank -= 1;
                if (isEmpty(coordsToSan(upMove.file,upMove.rank))) output.push(san + coordsToSan(upMove.file,upMove.rank));
            }

            // attacking
            if (!isEmpty(coordsToSan(coords.file + 1,coords.rank + (color=='w'?1:-1)))) {
                if (color != getColor(coordsToSan(coords.file + 1, coords.rank + (color=='w'?1:-1)))) {
                    var out = san + 'x' + coordsToSan(coords.file + 1, coords.rank + (color=='w'?1:-1));
                    if (!promotionRank) {
                        output.push(out);
                    } else {
                        output.push(out + '=Q');
                        output.push(out + '=R');
                        output.push(out + '=N');
                        output.push(out + '=B');
                    }
                }
            }

            if (!isEmpty(coordsToSan(coords.file - 1,coords.rank + (color=='w'?1:-1)))) {
                if (color != getColor(coordsToSan(coords.file - 1, coords.rank + (color=='w'?1:-1)))) {
                    var out = san + 'x' + coordsToSan(coords.file - 1, coords.rank + (color=='w'?1:-1));
                    if (!promotionRank) {
                        output.push(out);
                    } else {
                        output.push(out + '=Q');
                        output.push(out + '=R');
                        output.push(out + '=N');
                        output.push(out + '=B');
                    }
                }
            }

            return output;
        },
        symbol : 'p'
    });

    PIECES.push(PAWN);

    // other stuff

    var DEFAULT_POSITION = '1nbqkbnr/Pppppppp/8/8/8/8/1PP1PPPP/RNBQKBNR w - - 0 1';

    if (!fen) {
        fen = DEFAULT_POSITION;
    }

    function loadFEN(fen) {
        var fenPosition = 0;
        var boardPosition = 0;
        var fenDefinition = fen.split(' ')[0];

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
        turn = fen.split(' ')[1];
    }

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
        
        output = [fenPosition,turn,CASTLE_RIGHTS,EN_PASSANT,HALFMOVE_CLOCK,FULLMOVE_CLOCK].join(' ');

        return output;
    }

    function legalMoves() {
        var output = [];
        for (var i = 0; i < BOARD.length; i++) {
            if (BOARD[i] != EMPTY) {
                if ((turn == WHITE && BOARD[i] == BOARD[i].toUpperCase()) ||
                    (turn == BLACK && BOARD[i] == BOARD[i].toLowerCase()))
                        output = output.concat(getPieceBySymbol(BOARD[i]).legalMoves(boardPosToSan(i)));
            }
        }
        return output;
    }

    function executeMove(move) {
        if (validateMove(move)) {
            var fromPiece = BOARD[sanToBoardPos(move.from)];
            
            if (move.promotion != '') {
                BOARD[sanToBoardPos(move.to)] = move.promotion;
            } else {
                BOARD[sanToBoardPos(move.to)] = fromPiece;  
            }

            BOARD[sanToBoardPos(move.from)] = EMPTY;
        } else return null;
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

        moves : function () {
            return legalMoves();
        },

        setTurn : function(side) {
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

        // not implemented
        game_over: function() { return false; }
    }

}