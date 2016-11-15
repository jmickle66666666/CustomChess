var Chess = function(fen) {
    
    var BLACK = 'b';
    var WHITE = 'w';

    var EMPTY = '-';

    // state
    var TURN = WHITE;
    var CASTLE_RIGHTS = '-';
    var EN_PASSANT = '-';
    var HALFMOVE_CLOCK = 0;
    var FULLMOVE_CLOCK = 1;

    var BOARD = new Array(64);
    var BOARD_WIDTH = 8;

    var PIECES = [];

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
        return ((rank-1) * 8) + (file-1);
    }

    function buildMoves(san,moves) {
        var outMoves = [];
        for (var i = 0; i < moves.length; i++) {
            if (moves[i][0] == 'leap') {
                var inMoves = buildLeap(san,moves[i][1]);
                outMoves = outMoves.concat(inMoves);
            }
        }
        return outMoves;
    }

    function buildLeap(san,move) {
        var coords = sanToCoords(san);
        var output = [];
        function checkAndAdd(file,rank) {
            if (file > 0 && rank > 0 && file <=8 && rank <=8) {
                var move = coordsToSan(file,rank);
                output.push(san+move);
            }
        }
        checkAndAdd(coords.file + move[0], coords.rank + move[1]);
        checkAndAdd(coords.file + move[0], coords.rank - move[1]);
        checkAndAdd(coords.file - move[0], coords.rank + move[1]);
        checkAndAdd(coords.file - move[0], coords.rank - move[1]);
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

    var DEFAULT_POSITION = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';

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
                fenPosition += spaceCounter;
                fenPosition += "/";
                spaceCounter = 0;
            }
        }
        if (spaceCounter > 0) fenPosition += spaceCounter;
        
        output = [fenPosition,TURN,CASTLE_RIGHTS,EN_PASSANT,HALFMOVE_CLOCK,FULLMOVE_CLOCK].join(' ');

        return output;
    }

    function legalMoves() {
        var output = [];
        for (var i = 0; i < BOARD.length; i++) {
            if (BOARD[i] != EMPTY) {
                if ((TURN == WHITE && BOARD[i] == BOARD[i].toUpperCase()) ||
                    (TURN == BLACK && BOARD[i] == BOARD[i].toLowerCase()))
                        output = output.concat(getPieceBySymbol(BOARD[i]).legalMoves(boardPosToSan(i)));
            }
        }
        return output;
    }

    loadFEN(fen);

    // PUBLIC API
    return {
        fen : function() {
            return saveFEN();
        },

        moves : function () {
            return legalMoves();
        }
    }

}