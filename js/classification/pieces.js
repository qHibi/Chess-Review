/* Board helpers for the Splendid (Brilliant) and Perfect (Great) checks, ported from Chesskit's lib/chess. */
const VAL={p:1,n:3,b:3,r:5,q:9,k:0};
const toMove=u=>({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]||undefined});

// White's material minus Black's (kings excluded)
export function materialDifference(fen){
  let d=0;
  for(const row of new Chess(fen).board())for(const p of row)if(p&&p.type!=='k')d+=(p.color==='w'?1:-1)*VAL[p.type];
  return d;
}

/* Is the played move a real piece sacrifice? Play it plus the engine's best continuation (an even number of plies),
   cancel out captures that were answered by a capture of the same piece type, and see whether the mover ends up
   down in material. Pawn-only exchanges don't count, and a quiet move after the first one ends the sequence. */
export function getIsPieceSacrifice(fen,played,pv){
  if(!pv||pv.length<1)return false;
  const game=new Chess(fen),whiteToPlay=game.turn()==='w',start=materialDifference(fen);
  const moves=[played,...pv];
  if(moves.length%2===1)moves.pop();
  let quiet=1;
  const taken={w:[],b:[]};
  for(const u of moves){
    const m=game.move(toMove(u));
    if(!m)return false;
    if(m.captured){taken[m.color].push(m.captured);quiet=1}
    else{quiet--;if(quiet<0)break}
  }
  for(const p of taken.w.slice()){
    const j=taken.b.indexOf(p);
    if(j>=0){taken.b.splice(j,1);taken.w.splice(taken.w.indexOf(p),1)}
  }
  if(Math.abs(taken.w.length-taken.b.length)<=1&&taken.w.concat(taken.b).every(p=>p==='p'))return false;
  const diff=materialDifference(game.fen())-start;
  return (whiteToPlay?diff:-diff)<0;
}

/* Two plies from `fen`: one side captures on a square and the other immediately recaptures a piece of the same value
   there. That is just a trade, so the recapture is not a "find". */
export function isSimplePieceRecapture(fen,[u1,u2]){
  const game=new Chess(fen),a=toMove(u1),b=toMove(u2);
  if(a.to!==b.to)return false;
  const m1=game.move(a);if(!m1||!m1.captured)return false;
  const m2=game.move(b);if(!m2||!m2.captured)return false;
  return VAL[m1.captured]===VAL[m2.captured];
}
