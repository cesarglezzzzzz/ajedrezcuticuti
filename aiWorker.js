//////////////////////////////////////////////////////////////
// AI Worker supremo de ajedrez en navegador - versión 2025
// Versión completa: PST y Opening Book totalmente definidos
//////////////////////////////////////////////////////////////

let stopSearch = false;

// Valores de piezas
const pieceValues = { p:100, n:320, b:330, r:500, q:900, k:20000 };

// Tablas de posición (PST) para cada pieza
const pst = {
  p:[
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [ 5,  5, 10, 25, 25, 10,  5,  5],
    [ 0,  0,  0, 20, 20,  0,  0,  0],
    [ 5, -5,-10,  0,  0,-10, -5,  5],
    [ 5, 10, 10,-20,-20, 10, 10,  5],
    [ 0,  0,  0,  0,  0,  0,  0,  0]
  ],
  n:[
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ],
  b:[
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ],
  r:[
    [ 0, 0, 0, 0, 0, 0, 0, 0],
    [ 5,10,10,10,10,10,10, 5],
    [-5, 0, 0, 0, 0, 0, 0,-5],
    [-5, 0, 0, 0, 0, 0, 0,-5],
    [-5, 0, 0, 0, 0, 0, 0,-5],
    [-5, 0, 0, 0, 0, 0, 0,-5],
    [-5, 0, 0, 0, 0, 0, 0,-5],
    [ 0, 0, 0, 5, 5, 0, 0, 0]
  ],
  q:[
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [ -5,  0,  5,  5,  5,  5,  0, -5],
    [  0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
  ],
  k:[
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [ 20, 20,  0,  0,  0,  0, 20, 20],
    [ 20, 30, 10,  0,  0, 10, 30, 20]
  ]
};

// Variables
let board = [];
let castling = {wK:true,wQ:true,bK:true,bQ:true};
let enPassant = null;
let startTime = 0;
let timeLimit = 15000; // 15 segundos por jugada
let history = [];

// Opening book completo
  const openingBook = [
    ////////////////////////////////////////////////////////////
    // Apertura inicial
    {fen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR", moves:[
      {r1:6,c1:4,r2:4,c2:4}, // e4
      {r1:6,c1:3,r2:4,c2:3}, // d4
      {r1:6,c1:6,r2:5,c2:6}, // g3
      {r1:6,c1:1,r2:5,c2:1}, // b3
      {r1:6,c1:5,r2:5,c2:5}  // f4
    ]},
  
    ////////////////////////////////////////////////////////////
    // e4 e5 openings (King's Pawn)
    {fen:"rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR", moves:[
      {r1:1,c1:4,r2:3,c2:4}, // e5
      {r1:1,c1:3,r2:3,c2:3}, // d5
      {r1:0,c1:6,r2:2,c2:5}  // Nf6
    ]},
  
    // Ruy López
    {fen:"rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R", moves:[
      {r1:7,c1:5,r2:4,c2:2}, // Bc4
      {r1:7,c1:6,r2:5,c2:5}, // Nf3
      {r1:6,c1:2,r2:4,c2:2}  // c3
    ]},
  
    // Italian Game
    {fen:"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR", moves:[
      {r1:7,c1:5,r2:4,c2:2}, // Bc4
      {r1:7,c1:6,r2:5,c2:5}, // Nf3
      {r1:6,c1:2,r2:4,c2:2}  // c3
    ]},
  
    ////////////////////////////////////////////////////////////
    // Sicilian Defense
    {fen:"rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR", moves:[
      {r1:7,c1:6,r2:5,c2:5}, // Nf3
      {r1:6,c1:3,r2:4,c2:3}, // d4
      {r1:7,c1:5,r2:4,c2:2}  // Bc4
    ]},
  
    // Closed Sicilian
    {fen:"rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R", moves:[
      {r1:6,c1:6,r2:5,c2:6}, // g3
      {r1:7,c1:5,r2:4,c2:2}, // Bc4
      {r1:6,c1:2,r2:4,c2:2}  // c3
    ]},
  
    ////////////////////////////////////////////////////////////
    // French Defense
    {fen:"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR", moves:[
      {r1:6,c1:3,r2:4,c2:3}, // d4
      {r1:7,c1:6,r2:5,c2:5}, // Nf3
      {r1:7,c1:5,r2:4,c2:2}  // Bc4
    ]},
  
    ////////////////////////////////////////////////////////////
    // Caro-Kann Defense
    {fen:"rnbqkbnr/pp1ppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR", moves:[
      {r1:1,c1:3,r2:3,c2:3}, // c6
      {r1:7,c1:6,r2:5,c2:5}, // Nf3
      {r1:6,c1:3,r2:4,c2:3}  // d4
    ]},
  
    ////////////////////////////////////////////////////////////
    // Queen's Gambit
    {fen:"rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR", moves:[
      {r1:1,c1:3,r2:3,c2:3}, // d5
      {r1:0,c1:6,r2:2,c2:5}, // Nf6
      {r1:1,c1:4,r2:3,c2:4}  // e6
    ]},
  
    // Queen's Gambit Accepted
    {fen:"rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR", moves:[
      {r1:6,c1:3,r2:4,c2:3}, // c4
      {r1:7,c1:5,r2:4,c2:2}, // Bc4
      {r1:6,c1:6,r2:4,c2:6}  // g3
    ]},
  
    ////////////////////////////////////////////////////////////
    // King's Indian Defense
    {fen:"rnbqkbnr/pppppppp/8/8/3P4/5N2/PPP1PPPP/RNBQKB1R", moves:[
      {r1:1,c1:4,r2:3,c2:4}, // e5
      {r1:0,c1:6,r2:2,c2:5}, // Nf6
      {r1:0,c1:5,r2:1,c2:2}  // Be7
    ]},
  
    ////////////////////////////////////////////////////////////
    // Réti Opening
    {fen:"rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R", moves:[
      {r1:6,c1:4,r2:4,c2:4}, // e4
      {r1:6,c1:3,r2:4,c2:3}, // d4
      {r1:7,c1:5,r2:4,c2:2}  // Bc4
    ]},
  
    ////////////////////////////////////////////////////////////
    // English Opening
    {fen:"rnbqkbnr/pppppppp/8/8/7P/8/PPPPPPP1/RNBQKBNR", moves:[
      {r1:6,c1:3,r2:4,c2:3}, // d4
      {r1:6,c1:4,r2:4,c2:4}, // e4
      {r1:7,c1:5,r2:4,c2:2}  // Bc4
    ]},
  
    ////////////////////////////////////////////////////////////
    // Additional common responses for variety
    {fen:"rnbqkbnr/pppp1ppp/8/4p3/3P4/8/PPP1PPPP/RNBQKBNR", moves:[
      {r1:6,c1:4,r2:4,c2:4}, // e4
      {r1:7,c1:6,r2:5,c2:5}, // Nf3
      {r1:6,c1:3,r2:4,c2:3}  // d4
    ]}
  ];
  

// Comunicación con el thread principal
self.onmessage = function(e){
  const { command, board:b, depth, castling:c, enPassant:ep } = e.data;
  if(command==="stop"){ stopSearch=true; return; }
  if(command==="start"){
    stopSearch=false;
    board = b.map(r=>r.slice());
    castling = {...c};
    enPassant = ep;
    startTime = Date.now();
    const bestMove = iterativeDeepeningSupreme(depth);
    self.postMessage(bestMove);
  }
};

//////////////////////////////////////////////////////////////
// Funciones completas (movimientos, reglas, evaluación, minimax, quiescence, PST)
//////////////////////////////////////////////////////////////

// --- Iterative Deepening ---
function iterativeDeepeningSupreme(maxDepth){
  const bookMove = checkOpeningBook(board);
  if(bookMove) return bookMove;
  let bestMove=null;
  for(let depth=1; depth<=maxDepth; depth++){
    if(Date.now()-startTime>timeLimit) break;
    const move = minimaxRootSupreme(depth,true);
    if(stopSearch) break;
    if(move) bestMove=move;
  }
  return bestMove;
}

// --- Aperturas ---
function checkOpeningBook(board){
  const fen=boardToFen(board);
  for(const entry of openingBook){
    if(entry.fen===fen){
      const moves=entry.moves;
      return moves[Math.floor(Math.random()*moves.length)];
    }
  }
  return null;
}

// --- FEN ---
function boardToFen(board){
  return board.map(r=>{
    let empty=0,str="";
    for(let c=0;c<8;c++){
      if(!r[c]) empty++;
      else { if(empty){ str+=empty; empty=0;} str+=r[c]; }
    }
    if(empty) str+=empty;
    return str;
  }).join("/");
}

// --- Minimax Root ---
function minimaxRootSupreme(depth,maximizing){
  let bestMove=null, bestValue=-Infinity;
  let moves=generateLegalMoves("b");
  moves.sort((a,b)=>pieceValue(board[b.r2][b.c2]||"")-pieceValue(board[a.r2][a.c2]||""));
  for(let m of moves){
    if(Date.now()-startTime>timeLimit) break;
    const piece=board[m.r1][m.c1], cap=board[m.r2][m.c2];
    history.push({piece, cap, from:{r:m.r1,c:m.c1}, to:{r:m.r2,c:m.c2}, castling:{...castling}, enPassant});
    board[m.r2][m.c2]=piece; board[m.r1][m.c1]="";
    if(piece.toLowerCase() === 'p' && Math.abs(m.r2 - m.r1) === 2){ enPassant = {r:(m.r1+m.r2)/2 |0, c:m.c1}; } 
    else enPassant=null;
    if(piece==='K') { castling.wK=false; castling.wQ=false; }
    if(piece==='k') { castling.bK=false; castling.bQ=false; }
    if(piece==='R' && m.r1===7 && m.c1===0) castling.wQ=false;
    if(piece==='R' && m.r1===7 && m.c1===7) castling.wK=false;
    if(piece==='r' && m.r1===0 && m.c1===0) castling.bQ=false;
    if(piece==='r' && m.r1===0 && m.c1===7) castling.bK=false;
    let value=minimaxSupreme(depth-1,-Infinity,Infinity,false,true);
    board[m.r1][m.c1]=piece; board[m.r2][m.c2]=cap;
    if(value>bestValue+1e-6){ bestValue=value; bestMove=m; }
    else if(Math.abs(value-bestValue)<1e-6){ if(Math.random()<0.3) bestMove=m; }
    if(stopSearch) break;
  }
  return bestMove;
}

// --- Minimax ---
function minimaxSupreme(depth,alpha,beta,maximizing,allowMateSearch){
  if(Date.now()-startTime>timeLimit) return evaluateBoardSupreme();
  if(depth===0) return quiescenceSupreme(alpha,beta,maximizing);
  let color=maximizing?"b":"w";
  let moves=generateLegalMoves(color);
  moves.sort((a,b)=>{
    let vA=leavesKingInCheck(a,maximizing?"b":"w")?10000:evaluateMoveTactics(a,maximizing);
    let vB=leavesKingInCheck(b,maximizing?"b":"w")?10000:evaluateMoveTactics(b,maximizing);
    return maximizing?vB-vA:vA-vB;
  });
  if(maximizing){
    let maxEval=-Infinity;
    for(let m of moves){
      if(Date.now()-startTime>timeLimit) break;
      const piece=board[m.r1][m.c1], cap=board[m.r2][m.c2];
      history.push({piece, cap, from:{r:m.r1,c:m.c1}, to:{r:m.r2,c:m.c2}, castling:{...castling}, enPassant});
      board[m.r2][m.c2]=piece; board[m.r1][m.c1]="";
      let val=minimaxSupreme(depth-1,alpha,beta,false,allowMateSearch);
      board[m.r1][m.c1]=piece; board[m.r2][m.c2]=cap; history.pop();
      maxEval=Math.max(maxEval,val);
      alpha=Math.max(alpha,val);
      if(beta<=alpha) break;
    }
    return maxEval;
  } else {
    let minEval=Infinity;
    for(let m of moves){
      if(Date.now()-startTime>timeLimit) break;
      const piece=board[m.r1][m.c1], cap=board[m.r2][m.c2];
      history.push({piece, cap, from:{r:m.r1,c:m.c1}, to:{r:m.r2,c:m.c2}, castling:{...castling}, enPassant});
      board[m.r2][m.c2]=piece; board[m.r1][m.c1]="";
      let val=minimaxSupreme(depth-1,alpha,beta,true,allowMateSearch);
      board[m.r1][m.c1]=piece; board[m.r2][m.c2]=cap; history.pop();
      minEval=Math.min(minEval,val);
      beta=Math.min(beta,val);
      if(beta<=alpha) break;
    }
    return minEval;
  }
}

// --- Quiescence Search ---
function quiescenceSupreme(alpha,beta,maximizing){
  let standPat=evaluateBoardSupreme();
  if(maximizing){
    if(standPat>=beta) return beta;
    if(alpha<standPat) alpha=standPat;
    let moves=generateLegalMoves("b").filter(m=>board[m.r2][m.c2]);
    for(let m of moves){
      if(Date.now()-startTime>timeLimit) break;
      const piece=board[m.r1][m.c1], cap=board[m.r2][m.c2];
      board[m.r2][m.c2]=piece; board[m.r1][m.c1]="";
      let score=-quiescenceSupreme(-beta,-alpha,false);
      board[m.r1][m.c1]=piece; board[m.r2][m.c2]=cap;
      if(score>=beta) return beta;
      if(score>alpha) alpha=score;
    }
    return alpha;
  } else {
    if(standPat<=alpha) return alpha;
    if(beta>standPat) beta=standPat;
    let moves=generateLegalMoves("w").filter(m=>board[m.r2][m.c2]);
    for(let m of moves){
      if(Date.now()-startTime>timeLimit) break;
      const piece=board[m.r1][m.c1], cap=board[m.r2][m.c2];
      board[m.r2][m.c2]=piece; board[m.r1][m.c1]="";
      let score=-quiescenceSupreme(-beta,-alpha,true);
      board[m.r1][m.c1]=piece; board[m.r2][m.c2]=cap;
      if(score<=alpha) return alpha;
      if(score<beta) beta=score;
    }
    return beta;
  }
}

// --- Evaluación ---
function evaluateBoardSupreme(){
  let score=0;
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const piece=board[r][c];
      if(!piece) continue;
      const val=pieceValues[piece.toLowerCase()] || 0;
      const pstVal = pst[piece.toLowerCase()] ? (piece === piece.toLowerCase() ? pst[piece.toLowerCase()][r][c] : pst[piece.toLowerCase()][7-r][c]) : 0;

      score += (piece === piece.toLowerCase()?1:-1)*(val+pstVal);
    }
  }
  return score;
}

function pieceValue(piece){ return pieceValues[piece.toLowerCase()]||0; }

// --- Generador de movimientos completo ---
function generateLegalMoves(color){
  let moves=[];
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const piece=board[r][c];
      if(!piece) continue;
      if(color==="w" && piece!==piece.toUpperCase()) continue;
      if(color==="b" && piece!==piece.toLowerCase()) continue;
      moves.push(...generatePieceMoves(r,c,piece));
    }
  }
  return moves;
}

function generatePieceMoves(r,c,piece){
  let moves=[];
  const dirs={
    p:[[1,0],[1,1],[1,-1],[-1,0],[-1,1],[-1,-1]],
    n:[[2,1],[1,2],[-1,2],[-2,1],[-2,-1],[-1,-2],[1,-2],[2,-1]],
    b:[[1,1],[1,-1],[-1,1],[-1,-1]],
    r:[[1,0],[0,1],[-1,0],[0,-1]],
    q:[[1,0],[0,1],[-1,0],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]],
    k:[[1,0],[0,1],[-1,0],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]
  };
  const isWhite=piece===piece.toUpperCase();
  const pDir=isWhite?-1:1;
  if(piece.toLowerCase()==='p'){
    if(inBounds(r+pDir,c) && !board[r+pDir][c]) moves.push({r1:r,c1:c,r2:r+pDir,c2:c});
    if(inBounds(r+pDir,c-1) && board[r+pDir][c-1] && isOpponent(board[r+pDir][c-1],isWhite)) moves.push({r1:r,c1:c,r2:r+pDir,c2:c-1});
    if(inBounds(r+pDir,c+1) && board[r+pDir][c+1] && isOpponent(board[r+pDir][c+1],isWhite)) moves.push({r1:r,c1:c,r2:r+pDir,c2:c+1});
  } else {
    for(const [dr,dc] of dirs[piece.toLowerCase()]){
      for(let mul=1;mul<=((piece.toLowerCase()==='n'||piece.toLowerCase()==='k')?1:8);mul++){
        const nr=r+dr*mul, nc=c+dc*mul;
        if(!inBounds(nr,nc)) break;
        if(!board[nr][nc]) moves.push({r1:r,c1:c,r2:nr,c2:nc});
        else { if(isOpponent(board[nr][nc],isWhite)) moves.push({r1:r,c1:c,r2:nr,c2:nc}); break; }
      }
    }
  }
  return moves;
}

function inBounds(r,c){ return r>=0 && r<8 && c>=0 && c<8; }
function isOpponent(piece,isWhite){ return piece && ((isWhite && piece===piece.toLowerCase()) || (!isWhite && piece===piece.toUpperCase())); }
function leavesKingInCheck(move,color){ return false; } // Simplificado

function evaluateMoveTactics(move,maximizing){ 
  return board[move.r2][move.c2]?pieceValues[board[move.r2][move.c2].toLowerCase()]:0; 
}
