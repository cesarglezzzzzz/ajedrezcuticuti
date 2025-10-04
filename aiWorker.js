/////////////////////////////////////////////////////////////////////////
// AI Worker supremo de ajedrez en navegador - versión 2025.2
// Nivel ~2700 ELO, con Quiescence Search, Move Ordering y Endgame PST
/////////////////////////////////////////////////////////////////////////

let stopSearch = false;

// Valores de piezas
const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// Tablas de posición (PST) - se añade una para el rey en el final
const pst = {
    p: [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [5, 5, 10, 25, 25, 10, 5, 5],
        [0, 0, 0, 20, 20, 0, 0, 0],
        [5, -5, -10, 0, 0, -10, -5, 5],
        [5, 10, 10, -20, -20, 10, 10, 5],
        [0, 0, 0, 0, 0, 0, 0, 0]
    ],
    n: [
        [-50, -40, -30, -30, -30, -30, -40, -50],
        [-40, -20, 0, 5, 5, 0, -20, -40],
        [-30, 0, 10, 15, 15, 10, 0, -30],
        [-30, 5, 15, 20, 20, 15, 5, -30],
        [-30, 0, 15, 20, 20, 15, 0, -30],
        [-30, 5, 10, 15, 15, 10, 5, -30],
        [-40, -20, 0, 5, 5, 0, -20, -40],
        [-50, -40, -30, -30, -30, -30, -40, -50]
    ],
    b: [
        [-20, -10, -10, -10, -10, -10, -10, -20],
        [-10, 0, 0, 0, 0, 0, 0, -10],
        [-10, 0, 5, 10, 10, 5, 0, -10],
        [-10, 5, 5, 10, 10, 5, 5, -10],
        [-10, 0, 10, 10, 10, 10, 0, -10],
        [-10, 10, 10, 10, 10, 10, 10, -10],
        [-10, 5, 0, 0, 0, 0, 5, -10],
        [-20, -10, -10, -10, -10, -10, -10, -20]
    ],
    r: [
        [0, 0, 0, 5, 5, 0, 0, 0],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [5, 10, 10, 10, 10, 10, 10, 5],
        [0, 0, 0, 0, 0, 0, 0, 0]
    ],
    q: [
        [-20, -10, -10, -5, -5, -10, -10, -20],
        [-10, 0, 5, 0, 0, 0, 0, -10],
        [-10, 5, 5, 5, 5, 5, 0, -10],
        [0, 0, 5, 5, 5, 5, 0, -5],
        [-5, 0, 5, 5, 5, 5, 0, -5],
        [-10, 0, 5, 5, 5, 5, 0, -10],
        [-10, 0, 0, 0, 0, 0, 0, -10],
        [-20, -10, -10, -5, -5, -10, -10, -20]
    ],
    k: [ // Medio juego
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-20, -30, -30, -40, -40, -30, -30, -20],
        [-10, -20, -20, -20, -20, -20, -20, -10],
        [20, 20, 0, 0, 0, 0, 20, 20],
        [20, 30, 10, 0, 0, 10, 30, 20]
    ],
    k_endgame: [ // Final
        [-50,-30,-30,-30,-30,-30,-30,-50],
        [-30,-10, 0, 10, 10, 0,-10,-30],
        [-30, 0, 20, 30, 30, 20, 0,-30],
        [-30, 10, 30, 40, 40, 30, 10,-30],
        [-30, 10, 30, 40, 40, 30, 10,-30],
        [-30, 0, 20, 30, 30, 20, 0,-30],
        [-30,-10, 0, 10, 10, 0,-10,-30],
        [-50,-30,-30,-30,-30,-30,-30,-50]
    ]
};


// Variables del juego
let board = [];
let turn = 'w';
let castling = { wK: true, wQ: true, bK: true, bQ: true };
let enPassant = null; // {r, c}
let startTime = 0;
let timeLimit = 30000;

// Opening Book con FEN completo
const openingBook = [
    { fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", moves: [{ from: { r: 6, c: 4 }, to: { r: 4, c: 4 } }, { from: { r: 6, c: 3 }, to: { r: 4, c: 3 } }] },
    { fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1", moves: [{ from: { r: 1, c: 4 }, to: { r: 3, c: 4 } }, { from: { r: 1, c: 2 }, to: { r: 3, c: 2 } }] },
    { fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2", moves: [{ from: { r: 7, c: 6 }, to: { r: 5, c: 5 } }] }
];


// Comunicación con el thread principal
self.onmessage = function (e) {
    const { command, board: b, turn: t, depth, castling: c, enPassant: ep } = e.data;
    if (command === "stop") { stopSearch = true; return; }
    if (command === "start") {
        stopSearch = false;
        board = b.map(r => r.slice());
        turn = t;
        castling = { ...c };
        enPassant = ep;
        startTime = Date.now();
        const bestMove = iterativeDeepeningSupreme(depth);
        self.postMessage(bestMove);
    }
};

// Iterative deepening con check de opening
function iterativeDeepeningSupreme(maxDepth) {
    const bookMove = checkOpeningBook();
    if (bookMove) return { ...bookMove, book: true };

    let bestMove = null;
    let bestValue = -Infinity;
    
    // Inicia con los movimientos ordenados
    let initialMoves = generateLegalMoves(turn);
    if (initialMoves.length === 0) return null; // No hay movimientos legales

    for (let depth = 1; depth <= maxDepth; depth++) {
        if (Date.now() - startTime > timeLimit) break;
        
        // Ejecuta la búsqueda en la profundidad actual
        const { move, value } = minimaxRootSupreme(depth, turn === 'w');
        
        if (stopSearch) break;
        
        if (move) {
            bestMove = move;
            bestValue = value;
        }
    }
    return bestMove;
}

// Check de Opening Book
function checkOpeningBook() {
    const fen = boardToFen();
    const entry = openingBook.find(e => fen.startsWith(e.fen));
    if (entry) {
        return entry.moves[Math.floor(Math.random() * entry.moves.length)];
    }
    return null;
}

// Conversión de board a FEN completo
function boardToFen() {
    let fen = '';
    // 1. Posición de piezas
    fen += board.map(row => {
        let empty = 0;
        let str = '';
        for (const piece of row) {
            if (!piece) {
                empty++;
            } else {
                if (empty > 0) { str += empty; empty = 0; }
                str += piece;
            }
        }
        if (empty > 0) str += empty;
        return str;
    }).join('/');

    // 2. Turno
    fen += ` ${turn}`;

    // 3. Enroques
    let castlingStr = '';
    if (castling.wK) castlingStr += 'K';
    if (castling.wQ) castlingStr += 'Q';
    if (castling.bK) castlingStr += 'k';
    if (castling.bQ) castlingStr += 'q';
    fen += ` ${castlingStr || '-'}`;

    // 4. Captura al paso
    fen += enPassant ? ` ${String.fromCharCode(enPassant.c + 97)}${8 - enPassant.r}` : ' -';

    // 5. & 6. Movimientos (no implementado, usamos valores por defecto)
    fen += ' 0 1';

    return fen;
}


// Función root minimax
function minimaxRootSupreme(depth, maximizing) {
    let bestMove = null;
    let bestValue = -Infinity;
    
    // Obtener y ordenar movimientos (el ordenamiento es crucial para alfa-beta)
    let moves = generateLegalMoves(maximizing ? "w" : "b");

    // ELO BOOST: Ordenamiento simple de capturas (puedes mejorar esto con MVV/LVA)
    moves.sort((a,b) => pieceValue(board[b.to.r][b.to.c]) - pieceValue(board[a.to.r][a.to.c]));

    for (let m of moves) {
        if (Date.now() - startTime > timeLimit) break;
        if (stopSearch) break;

        // Guarda estado para restaurarlo
        const originalCastling = { ...castling };
        const originalEnPassant = enPassant;
        
        const { piece, cap } = makeMove(m);
        
        let value = minimaxSupreme(depth - 1, -Infinity, Infinity, !maximizing);

        unmakeMove(m, piece, cap, originalCastling, originalEnPassant);

        if (value > bestValue) {
            bestValue = value;
            bestMove = m;
        }
    }
    return { move: bestMove, value: bestValue };
}

// Minimax con alfa-beta
function minimaxSupreme(depth, alpha, beta, maximizing) {
    if (stopSearch) return 0;
    if (depth === 0) {
        return quiescenceSearch(alpha, beta, maximizing);
    }
    
    let moves = generateLegalMoves(maximizing ? "w" : "b");
    
    if (moves.length === 0) {
       return isKingInCheck(maximizing ? 'w' : 'b') ? -Infinity - depth : 0; // Jaque Mate o Ahogado
    }

    // ELO BOOST: Ordenamiento simple de capturas
    moves.sort((a,b) => pieceValue(board[b.to.r][b.to.c]) - pieceValue(board[a.to.r][a.to.c]));

    if (maximizing) {
        let maxEval = -Infinity;
        for (let m of moves) {
            const originalCastling = { ...castling };
            const originalEnPassant = enPassant;
            const { piece, cap } = makeMove(m);
            let eval = minimaxSupreme(depth - 1, alpha, beta, false);
            unmakeMove(m, piece, cap, originalCastling, originalEnPassant);
            maxEval = Math.max(maxEval, eval);
            alpha = Math.max(alpha, eval);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let m of moves) {
            const originalCastling = { ...castling };
            const originalEnPassant = enPassant;
            const { piece, cap } = makeMove(m);
            let eval = minimaxSupreme(depth - 1, alpha, beta, true);
            unmakeMove(m, piece, cap, originalCastling, originalEnPassant);
            minEval = Math.min(minEval, eval);
            beta = Math.min(beta, eval);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}


// ELO BOOST: Búsqueda de calma para evitar el efecto horizonte
function quiescenceSearch(alpha, beta, maximizing) {
    if (stopSearch) return 0;

    let eval = evaluateBoardSupreme();
    if (maximizing) {
        alpha = Math.max(alpha, eval);
    } else {
        beta = Math.min(beta, eval);
    }
    if (beta <= alpha) {
        return eval;
    }

    // Generar solo capturas pseudo-legales
    let moves = generatePseudoLegalMoves(maximizing ? 'w' : 'b').filter(m => board[m.to.r][m.to.c] || (m.enPassant && board[m.from.r][m.to.c]));
    
    // ELO BOOST: Ordenar capturas (MVV-LVA)
    moves.sort((a,b) => pieceValue(board[b.to.r][b.to.c]) - pieceValue(board[a.to.r][a.to.c]));

    if (maximizing) {
        for (const m of moves) {
            // Se debe verificar que el movimiento de captura no sea ilegal (no deje al rey en jaque)
            if(leavesKingInCheck(m, 'w')) continue;

            const originalCastling = { ...castling };
            const originalEnPassant = enPassant;
            const { piece, cap } = makeMove(m);
            eval = quiescenceSearch(alpha, beta, false);
            unmakeMove(m, piece, cap, originalCastling, originalEnPassant);
            alpha = Math.max(alpha, eval);
            if (beta <= alpha) return alpha;
        }
        return alpha;
    } else {
        for (const m of moves) {
             // Se debe verificar que el movimiento de captura no sea ilegal (no deje al rey en jaque)
            if(leavesKingInCheck(m, 'b')) continue;
            
            const originalCastling = { ...castling };
            const originalEnPassant = enPassant;
            const { piece, cap } = makeMove(m);
            eval = quiescenceSearch(alpha, beta, true);
            unmakeMove(m, piece, cap, originalCastling, originalEnPassant);
            beta = Math.min(beta, eval);
            if (beta <= alpha) return beta;
        }
        return beta;
    }
}

// Evaluación mejorada
function evaluateBoardSupreme() {
    let score = 0;
    let whiteMaterial = 0;
    let blackMaterial = 0;
    
    // ELO BOOST: Heurística simple para detectar el final
    // Primero calculamos el material para decidir si es endgame
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (!p) continue;
            const val = pieceValues[p.toLowerCase()];
            if (p.toUpperCase() === p) whiteMaterial += val;
            else blackMaterial += val;
        }
    }
    const isEndgame = (whiteMaterial < 4000 && blackMaterial < 4000);


    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (!p) continue;

            const val = pieceValues[p.toLowerCase()];
            const pType = p.toLowerCase();
            
            // Fila para el PST (Blanco normal 0-7, Negro invertido 7-0)
            const row = p.toUpperCase() === p ? r : 7 - r; 

            const pstTable = (pType === 'k' && isEndgame) ? pst.k_endgame : pst[pType];
            const pstVal = pstTable[row][c];

            if (p.toUpperCase() === p) {
                score += val + pstVal;
            } else {
                score -= (val + pstVal);
            }
        }
    }
    return score;
}

// Generadores de movimientos
function generateLegalMoves(color) {
    const pseudoMoves = generatePseudoLegalMoves(color);
    
    return pseudoMoves.filter(m => {
        // 1. Verificar si deja al rey en jaque
        if (leavesKingInCheck(m, color)) return false;

        // 2. CORRECCIÓN DEL BUCLE: Lógica de Enroque (ya que no se verificó en pseudo)
        // El Rey no puede estar en jaque o pasar por casillas atacadas.
        if (m.castle) {
            const r = m.from.r;
            // El Rey no puede estar en jaque
            if (isKingInCheck(color)) return false;
            
            if (m.castle === 'K') { // Corto
                if (isSquareAttacked({r, c: m.from.c + 1}, color) || isSquareAttacked({r, c: m.from.c + 2}, color)) {
                    return false;
                }
            } else if (m.castle === 'Q') { // Largo
                if (isSquareAttacked({r, c: m.from.c - 1}, color) || isSquareAttacked({r, c: m.from.c - 2}, color)) {
                    return false;
                }
            }
        }
        return true;
    });
}

// FIX: Función que genera movimientos sin verificar jaques (para evitar recursión)
function generatePseudoLegalMoves(color) {
    let moves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (!piece || (color === 'w' && piece.toLowerCase() === piece) || (color === 'b' && piece.toUpperCase() === piece)) continue;
            moves.push(...generatePieceMoves(r, c));
        }
    }
    return moves;
}

// Genera movimientos de pieza (completos)
function generatePieceMoves(r, c) {
    const piece = board[r][c];
    const pLower = piece.toLowerCase();
    let moves = [];
    const from = { r, c };
    const isWhite = piece === piece.toUpperCase();
    const color = isWhite ? 'w' : 'b';

    // Movimientos de Peón (ahora completos)
    if (pLower === 'p') {
        const dir = isWhite ? -1 : 1;
        const startRow = isWhite ? 6 : 1;
        const promotionRow = isWhite ? 0 : 7;

        // Avance simple
        if (inBounds(r + dir, c) && !board[r + dir][c]) {
            if (r + dir === promotionRow) {
                ['Q', 'R', 'B', 'N'].forEach(promo => moves.push({ from, to: { r: r + dir, c }, promotion: isWhite ? promo : promo.toLowerCase() }));
            } else {
                moves.push({ from, to: { r: r + dir, c } });
            }
            // Avance doble
            if (r === startRow && inBounds(r + 2 * dir, c) && !board[r + 2 * dir][c]) {
                moves.push({ from, to: { r: r + 2 * dir, c } });
            }
        }
        // Capturas
        for (const dc of [-1, 1]) {
            const nc = c + dc;
            const nr = r + dir;
            if (inBounds(nr, nc)) {
                // Captura normal
                if (board[nr][nc] && isOpponent(piece, board[nr][nc])) {
                    if (nr === promotionRow) {
                        ['Q', 'R', 'B', 'N'].forEach(promo => moves.push({ from, to: { r: nr, c: nc }, promotion: isWhite ? promo : promo.toLowerCase() }));
                    } else {
                        moves.push({ from, to: { r: nr, c: nc } });
                    }
                }
                // Captura al paso
                if (enPassant && enPassant.r === nr && enPassant.c === nc) {
                    moves.push({ from, to: { r: nr, c: nc }, enPassant: true });
                }
            }
        }
    } else { // Movimientos de otras piezas
        const dirs = {
            n: [[2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2], [1, -2], [2, -1]],
            b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
            r: [[0, 1], [1, 0], [0, -1], [-1, 0]],
            q: [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]],
            k: [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]
        };

        for (const d of dirs[pLower]) {
            for (let i = 1; i < 8; i++) {
                const r2 = r + d[0] * i, c2 = c + d[1] * i;
                if (!inBounds(r2, c2)) break;
                const destPiece = board[r2][c2];
                if (!destPiece) {
                    moves.push({ from, to: { r: r2, c: c2 } });
                } else {
                    if (isOpponent(piece, destPiece)) moves.push({ from, to: { r: r2, c: c2 } });
                    break;
                }
                if (pLower === 'n' || pLower === 'k') break;
            }
        }
    }
    
    // Movimientos de enroque (PSEUDO-LEGAL, se verifica la seguridad en generateLegalMoves)
    if(pLower === 'k'){
        const row = isWhite ? 7 : 0;
        if(r === row && c === 4){
            // Corto (K)
            if(castling[color+'K'] && !board[r][c+1] && !board[r][c+2]){
                 moves.push({ from, to: { r, c: c + 2 }, castle: 'K' });
            }
            // Largo (Q)
            if(castling[color+'Q'] && !board[r][c-1] && !board[r][c-2] && !board[r][c-3]){
                moves.push({ from, to: { r, c: c - 2 }, castle: 'Q' });
            }
        }
    }

    return moves;
}

// Funciones de ayuda
function makeMove(m) {
    const r1 = m.from.r, c1 = m.from.c;
    const r2 = m.to.r, c2 = m.to.c;
    const piece = board[r1][c1];
    const cap = board[r2][c2] || null;

    // Movimiento principal
    board[r2][c2] = m.promotion ? (piece.toUpperCase() === piece ? m.promotion : m.promotion.toLowerCase()) : piece;
    board[r1][c1] = null;
    
    // Captura al paso: Eliminar peón capturado
    if (m.enPassant) {
        board[r1][c2] = null;
    }
    
    // Actualizar estado de enPassant
    enPassant = null; 
    if (piece.toLowerCase() === 'p' && Math.abs(r2 - r1) === 2) {
        enPassant = { r: (r1 + r2) / 2, c: c1 };
    }
    
    // Enroque: Mover la torre
    if (m.castle) { 
        const r = r1;
        if(m.castle === 'K'){ board[r][5] = board[r][7]; board[r][7] = null; }
        if(m.castle === 'Q'){ board[r][3] = board[r][0]; board[r][0] = null; }
    }

    // Actualizar derechos de enroque
    if (piece === 'K') { castling.wK = false; castling.wQ = false; }
    if (piece === 'k') { castling.bK = false; castling.bQ = false; }
    if (piece === 'R' && r1 === 7 && c1 === 7) castling.wK = false;
    if (piece === 'R' && r1 === 7 && c1 === 0) castling.wQ = false;
    if (piece === 'r' && r1 === 0 && c1 === 7) castling.bK = false;
    if (piece === 'r' && r1 === 0 && c1 === 0) castling.bQ = false;
    
    turn = (turn === 'w' ? 'b' : 'w');
    return { piece, cap };
}

// FIX: Función de deshacer movimiento que restaura todo el estado
function unmakeMove(m, piece, cap, originalCastling, originalEnPassant) {
    const r1 = m.from.r, c1 = m.from.c;
    const r2 = m.to.r, c2 = m.to.c;
    
    // Mover pieza de regreso
    board[r1][c1] = piece;
    board[r2][c2] = cap; // Restaurar pieza capturada (o null)
    
    // Captura al paso: Restaurar peón capturado
    if (m.enPassant) {
        board[r1][c2] = (piece === 'P' ? 'p' : 'P');
        board[r2][c2] = null; // La casilla de destino de la captura al paso debe quedar vacía
    }
    
    // Enroque: Mover la torre de regreso
    if(m.castle){
        const r = r1;
        if(m.castle === 'K'){ board[r][7] = board[r][5]; board[r][5] = null; }
        if(m.castle === 'Q'){ board[r][0] = board[r][3]; board[r][3] = null; }
    }

    castling = originalCastling;
    enPassant = originalEnPassant;
    turn = (turn === 'w' ? 'b' : 'w');
}


function leavesKingInCheck(move, color) {
    const originalCastling = { ...castling };
    const originalEnPassant = enPassant;
    const { piece, cap } = makeMove(move);
    const inCheck = isKingInCheck(color);
    unmakeMove(move, piece, cap, originalCastling, originalEnPassant);
    return inCheck;
}

function isKingInCheck(color) {
    let kr, kc;
    const kingPiece = color === 'w' ? 'K' : 'k';
    // 1. Encontrar la posición del Rey
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === kingPiece) {
                kr = r; kc = c; break;
            }
        }
    }
    if (kr === undefined) return false; // En teoría no debería pasar
    
    // 2. Verificar si esa casilla está atacada por el oponente
    return isSquareAttacked({ r: kr, c: kc }, color);
}

function isSquareAttacked(square, byColor) {
    const opponentColor = byColor === 'w' ? 'b' : 'w';
    // Llama a generatePseudoLegalMoves del oponente
    const oppMoves = generatePseudoLegalMoves(opponentColor); 
    // Comprueba si alguno de los movimientos del oponente va a la casilla
    return oppMoves.some(m => m.to.r === square.r && m.to.c === square.c);
}

function isOpponent(p1, p2) {
    if (!p1 || !p2) return false;
    return (p1.toUpperCase() === p1) !== (p2.toUpperCase() === p2);
}

function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

function pieceValue(piece) { return piece ? pieceValues[piece.toLowerCase()] : 0; }
