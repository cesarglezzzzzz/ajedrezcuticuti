const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restartBtn");

let board = [];
let turn = "w";
let selected = null;
let castling = {wK:true,wQ:true,bK:true,bQ:true};
let enPassant = null; // {r, c}

// Piezas Unicode
const pieces = {
  P:"♙", R:"♖", N:"♘", B:"♗", Q:"♕", K:"♔",
  p:"♟", r:"♜", n:"♞", b:"♝", q:"♛", k:"♚"
};

// Worker IA
const aiWorker = new Worker("aiWorker.js");

// --- Inicializa tablero ---
function initBoard(){
  board = [
    ["r","n","b","q","k","b","n","r"],
    ["p","p","p","p","p","p","p","p"],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["P","P","P","P","P","P","P","P"],
    ["R","N","B","Q","K","B","N","R"]
  ];
  turn="w"; selected=null; castling={wK:true,wQ:true,bK:true,bQ:true}; enPassant=null;
  drawBoard(); 
  updateStatus(); 
  restartBtn.style.display="none";
}

// --- Dibuja tablero ---
function drawBoard(){
  boardEl.innerHTML="";
  document.querySelectorAll('.square').forEach(sq => sq.classList.remove('highlight', 'selected'));
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const sq = document.createElement("div");
      sq.className="square "+((r+c)%2==0?"white":"black");
      sq.dataset.r=r; sq.dataset.c=c;
      sq.textContent = board[r][c]?pieces[board[r][c]]:"";
      sq.addEventListener("click", onClick);
      boardEl.appendChild(sq);
    }
  }
}

// --- Click del jugador ---
function onClick(e){
  if(turn!=="w" || statusEl.textContent.includes("pensando")) return;

  const r=parseInt(e.target.dataset.r), c=parseInt(e.target.dataset.c);
  
  if(selected){
    movePiece(selected.r, selected.c, r, c);
    selected=null;
    drawBoard(); // Limpia los 'highlights'
  } else if(board[r][c] && board[r][c]===board[r][c].toUpperCase()){
    selected={r,c};
    highlightMoves(r, c);
  }
}

// --- Destaca movimientos legales ---
function highlightMoves(r, c) {
  document.querySelectorAll('.square').forEach(sq => sq.classList.remove('highlight', 'selected'));
  
  const selectedSq = document.querySelector(`[data-r="${r}"][data-c="${c}"]`);
  if(selectedSq) selectedSq.classList.add('selected');

  // Usamos la función del Worker para generar movimientos legales
  const moves = generateLegalMoves('w').filter(m => m.from.r === r && m.from.c === c);
  
  moves.forEach(m => {
    const highlightSq = document.querySelector(`[data-r="${m.to.r}"][data-c="${m.to.c}"]`);
    if(highlightSq) highlightSq.classList.add('highlight');
  });
}

// --- Mover pieza ---
function movePiece(r1,c1,r2,c2){
  if(turn!=="w") return;
  
  const moves = generateLegalMoves("w"); 
  // Buscar la jugada legal en el formato unificado
  let legal = moves.find(m => m.from.r===r1 && m.from.c===c1 && m.to.r===r2 && m.to.c===c2);
  
  if(legal) {
    // Si es promoción, forzar a Q (simplificación de UI, el Worker maneja el objeto promoción)
    if (board[r1][c1].toLowerCase() === 'p' && (r2 === 0 || r2 === 7)) {
      // Sobrescribe si el Worker no especificó la promoción (aunque lo hace)
      legal.promotion = board[r1][c1] === 'P' ? 'Q' : 'q';
    }
    
    executeMove(legal);
    turn="b";
    updateStatus();
    drawBoard();
    if(checkEndGame()) return;
    setTimeout(aiTurn, 50);
  }
}

// --- Ejecuta movimiento (UNIFICADO con IA) ---
function executeMove(m){
  const r1 = m.from.r, c1 = m.from.c;
  const r2 = m.to.r, c2 = m.to.c;
  const p = board[r1][c1];

  // 1. Movimiento principal y captura
  board[r2][c2] = p; board[r1][c1] = "";

  // 2. En Passant - Eliminación del peón capturado
  if (m.enPassant) {
    const capturedPawnRow = r1; 
    board[capturedPawnRow][c2] = ""; 
  }
  
  // 3. En Passant - Actualización del estado global para la siguiente jugada
  enPassant = null;
  if (p.toLowerCase() === "p" && Math.abs(r2 - r1) === 2) {
    enPassant = { r: (r1 + r2) / 2, c: c1 }; 
  }
  
  // 4. Promoción
  if (m.promotion) { 
    board[r2][c2] = m.promotion;
  }
  
  // 5. Enroque - Movimiento de la Torre
  if (m.castle) {
    const row = r1;
    if (m.castle === 'K') { board[row][5] = board[row][7]; board[row][7] = ""; } // Corto
    if (m.castle === 'Q') { board[row][3] = board[row][0]; board[row][0] = ""; } // Largo
  }

  // 6. Actualización de derechos de enroque
  if (p === "K") { castling.wK = false; castling.wQ = false; }
  if (p === "k") { castling.bK = false; castling.bQ = false; }
  if (p === "R" && r1 === 7 && c1 === 0) castling.wQ = false;
  if (p === "R" && r1 === 7 && c1 === 7) castling.wK = false;
  if (p === "r" && r1 === 0 && c1 === 0) castling.bQ = false;
  if (p === "r" && r1 === 0 && c1 === 7) castling.bK = false;
}

function aiTurn(){
  statusEl.textContent = "IA está pensando... (Profundidad 6)";
  aiWorker.postMessage({
    command: "start",
    board: board.map(r => r.slice()), 
    turn: 'b',
    castling: { ...castling },
    enPassant: enPassant,
    depth: 6   
  });
}

aiWorker.onmessage = function(e){
  const bestMove = e.data;
  if(bestMove){
    executeMove(bestMove);
    turn="w";
    updateStatus();
    drawBoard();
    checkEndGame();
  }
};

// --- Estado ---
function updateStatus(){
  statusEl.textContent = turn==="w"?"Tu turno":"Turno de IA";
}

// --- Reinicio ---
restartBtn.onclick = initBoard;

// --- Fin de juego ---
function checkEndGame(){
  // Revisar jaque mate o ahogado (la IA ya tiene esta lógica)
  const moves = generateLegalMoves(turn);
  if (moves.length === 0) {
    const inCheck = isKingInCheck(turn);
    if (inCheck) {
      statusEl.textContent = `¡Jaque Mate! Ganó ${turn === 'w' ? 'IA' : 'Tú'}`;
    } else {
      statusEl.textContent = "¡Ahogado! Tablas";
    }
    restartBtn.style.display = "block";
    return true;
  }
  return false;
}

// --- Funciones para la UI (Implementación ligera de movimientos) ---

// Se requiere una implementación de movimientos legales/jaque aquí para que la UI funcione
// y para la verificación de fin de partida. Es una duplicación ligera del Worker.

function isOpponent(p1, p2) {
  if (!p1 || !p2) return false;
  return (p1.toUpperCase() === p1) !== (p2.toUpperCase() === p2);
}
function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }


function generatePseudoLegalMoves(color) {
  // Lógica mínima para UI. Se puede simplificar o usar un helper.
  // Por simplicidad, se replica la estructura del Worker.
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

function generateLegalMoves(color) {
  return generatePseudoLegalMoves(color).filter(m => !leavesKingInCheck(m, color));
}


// Implementación simple de makeMove para la verificación temporal de jaque en la UI
function leavesKingInCheck(move, color) {
    const r1 = move.from.r, c1 = move.from.c;
    const r2 = move.to.r, c2 = move.to.c;
    const piece = board[r1][c1];
    const cap = board[r2][c2];

    // Mover temporalmente
    board[r2][c2] = piece;
    board[r1][c1] = null;
    
    // Captura al paso (solo para el chequeo)
    let epPawn = null;
    if (move.enPassant) {
        epPawn = board[r1][c2];
        board[r1][c2] = null;
    }

    // Enroque (solo para el chequeo)
    if (move.castle) {
        const r = r1;
        if(move.castle === 'K'){ board[r][5] = board[r][7]; board[r][7] = null; }
        if(move.castle === 'Q'){ board[r][3] = board[r][0]; board[r][0] = null; }
    }


    const inCheck = isKingInCheck(color);

    // Restaurar tablero
    board[r1][c1] = piece;
    board[r2][c2] = cap;

    if (move.enPassant) {
        board[r1][c2] = epPawn;
    }

    // Restaurar torre del enroque
    if (move.castle) {
        const r = r1;
        if(move.castle === 'K'){ board[r][7] = board[r][5]; board[r][5] = null; }
        if(move.castle === 'Q'){ board[r][0] = board[r][3]; board[r][3] = null; }
    }
    
    return inCheck;
}


function isKingInCheck(color) {
    let kr, kc;
    const kingPiece = color === 'w' ? 'K' : 'k';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === kingPiece) {
                kr = r; kc = c; break;
            }
        }
    }
    if (kr === undefined) return false;
    return isSquareAttacked({ r: kr, c: kc }, color);
}

function isSquareAttacked(square, byColor) {
    const opponentColor = byColor === 'w' ? 'b' : 'w';
    const oppMoves = generatePseudoLegalMoves(opponentColor);
    return oppMoves.some(m => m.to.r === square.r && m.to.c === square.c);
}

// Genera movimientos de pieza para la UI (debe replicar la lógica del Worker para consistencia)
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
                // Captura al paso (En Passant)
                if (enPassant && enPassant.r === nr && enPassant.c === nc && board[r][nc] && board[r][nc].toLowerCase() === 'p') {
                    moves.push({ from, to: { r: nr, c: nc }, enPassant: true });
                }
            }
        }
    } else { // Movimientos de otras piezas (N, B, R, Q, K)
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
    
    // Movimientos de enroque (pseudo-legal)
    if(pLower === 'k'){
        const row = isWhite ? 7 : 0;
        if(r === row && c === 4){
            // Corto (K)
            if(castling[color+'K'] && !board[row][5] && !board[row][6]){
                 moves.push({ from, to: { r, c: c + 2 }, castle: 'K' });
            }
            // Largo (Q)
            if(castling[color+'Q'] && !board[row][3] && !board[row][2] && !board[row][1]){
                moves.push({ from, to: { r, c: c - 2 }, castle: 'Q' });
            }
        }
    }

    return moves;
}

// --- Lógica de Jaque ---

// Ejecuta un movimiento temporalmente para ver si deja al rey en jaque
function leavesKingInCheck(move, color) {
    const originalBoard = board.map(r => r.slice()); // Guardar tablero original
    const originalCastling = { ...castling };
    const originalEnPassant = enPassant;
    
    executeMove(move); // Ejecutar el movimiento
    
    const inCheck = isKingInCheck(color);
    
    // Restaurar estado (función UNMAKE simplificada para la UI)
    board = originalBoard;
    castling = originalCastling;
    enPassant = originalEnPassant;
    
    return inCheck;
}

function isKingInCheck(color) {
    let kr, kc;
    const kingPiece = color === 'w' ? 'K' : 'k';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === kingPiece) {
                kr = r; kc = c; break;
            }
        }
    }
    // La comprobación de enroque se realiza en el worker. Aquí solo se chequea el jaque simple.
    return isSquareAttacked({ r: kr, c: kc }, color);
}

// Verifica si una casilla está siendo atacada por el color opuesto
function isSquareAttacked(square, byColor) {
    const opponentColor = byColor === 'w' ? 'b' : 'w';
    const oppMoves = generatePseudoLegalMoves(opponentColor);
    return oppMoves.some(m => m.to.r === square.r && m.to.c === square.c);
}

// --- Inicia ---
initBoard();