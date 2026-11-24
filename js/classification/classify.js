import {S} from '../state.js';
import {CFG,BOOK} from '../config.js';
import {uciOf} from '../util.js';
import {clamp,lineWin,moveAccuracy} from './winPercentage.js';
import {getIsPieceSacrifice,isSimplePieceRecapture} from './pieces.js';
import {unsafePieceBrilliant} from './brilliant.js';

/* ---------- Move classification ----------
   Port of Chesskit's getMovesClassification (GuillaumeSD/Chesskit, src/lib/engine/helpers/moveClassification.ts),
   which works on winning chances rather than centipawns. In order:
     Book (openings.txt) -> Forced -> mate delivered (Best) -> Splendid (shown as Brilliant) -> Perfect (shown as Great)
     -> Best (engine's top move) -> basic ladder by win% lost: Excellent / Good (Chesskit: Okay) / Inaccuracy / Mistake / Blunder.
   The rating ladder itself is driven by each move's accuracy (CFG.accT) rather than raw win% loss.
   Brilliant is a hybrid of Chesskit and WintrChess (WintrChess/wintrchess, shared/src/lib/reporter): the move must be accurate and the
   position still open (Chesskit), pass WintrChess's critical-move gate (see criticalMove below), and then either leave a piece
   that is genuinely loose (WintrChess's piece-safety test, js/classification/brilliant.js) or be the engine's top move with a
   real sacrifice on the principal variation (Chesskit's test). CFG.brilliantMode: 'hybrid' (default), 'chesskit' or 'wintr'.
   Differences: "Forced" uses the number of legal moves (partial analysis can leave a position with one stored line),
   Miss is an addition (Chesskit has none), and a Blunder needs a winning position to be thrown away (CFG.blunder). */
const isLosingOrAltWinning=(wAfter,wAlt,white)=>(white?wAfter<50:wAfter>50)||(white?wAlt>CFG.altWon:wAlt<100-CFG.altWon);

// WintrChess's isMoveCriticalCandidate: not already completely winning without this move (second-best line >= +7), not in a lost
// position, not a queen promotion, and not a move that had to be played to get out of check.
function criticalMove(i,A,B,sg,mv){
  const cp=l=>l&&l.mate==null?sg*l.v*100:null;
  const c=cp(A[1])!=null?cp(A[1]):(A[1]?null:cp(B[0]));
  if(c!=null&&c>=700)return false;
  if(sg*B[0].v<0)return false;
  if(mv.promotion==='q')return false;
  if(new Chess(S.fens[i-1]).in_check())return false;
  return true;
}
function isBrilliant(i,A,B,sg,mv,top,played){
  const mode=CFG.brilliantMode||'hybrid';
  const sac=()=>getIsPieceSacrifice(S.fens[i-1],played,B[0].pv);
  if(mode==='chesskit')return sac();
  if(!criticalMove(i,A,B,sg,mv))return false;
  if(unsafePieceBrilliant(S.fens[i-1],S.fens[i],mv))return true;
  return mode==='hybrid'&&top&&sac();
}
export function classify(i){
  const mv=S.moves[i-1],white=mv.color==='w',sg=white?1:-1;
  const A=S.P[i-1],B=S.P[i];
  const have=!!(A&&B&&A.length&&B.length);
  const s=CFG.strict,cl=x=>clamp(x,-10,10);
  const before=have?cl(sg*A[0].v):0,after=have?cl(sg*B[0].v):0;
  const played=uciOf(mv);
  let acc;
  const res=(k,extra)=>Object.assign({k,before,after,best:have?A[0]:null,acc},extra);

  // Book
  if(S.book){
    const b=S.book[i];
    if(b&&b.book)return res('book',{opening:b.opening});
  }else if(S.bookOK){
    const seq=S.moves.slice(0,i).map(m=>m.san.replace(/[+#]/g,''));
    if(BOOK.some(l=>l.length>=seq.length&&seq.every((x,k)=>l[k]===x)))return res('book');
    S.bookOK=false;
  }
  if(!have)return null;

  // Forced / mate delivered
  if(new Chess(S.fens[i-1]).moves().length===1)return res('forced');
  if(B[0].mate===0&&sg*B[0].v>0)return res('best');

  const wBefore=lineWin(A[0]),wAfter=lineWin(B[0]);
  const diff=(wAfter-wBefore)*sg;                                   // win% change for the mover
  const T=CFG.accT,top=played===A[0].pv[0];
  acc=top?100:moveAccuracy(white?wBefore:100-wBefore,white?wAfter:100-wAfter);   // the move's accuracy, 0-100
  const a=100-(100-acc)/s;                                          // strictness stretches / shrinks the gap to 100
  const alt=A.find(l=>l.pv[0]!==played);                           // best line that is not the played move
  const wAlt=alt?lineWin(alt):null;
  const open=wAlt!=null&&!isLosingOrAltWinning(wAfter,wAlt,white);

  // Brilliant: a real piece sacrifice from a move that is accurate enough
  if(open&&a>=T.brilliant&&isBrilliant(i,A,B,sg,mv,top,played))return res('brilliant');

  // Great: accurate, not a simple recapture, and it changed the outcome of the game or was the only good move
  if(open&&a>=T.great){
    const recap=i>1&&isSimplePieceRecapture(S.fens[i-2],[uciOf(S.moves[i-2]),played]);
    if(!recap){
      const changed=diff>CFG.swing&&((wBefore<50&&wAfter>50)||(wBefore>50&&wAfter<50));
      const onlyMove=(wAfter-wAlt)*sg>CFG.onlyMove;
      if(changed||onlyMove)return res('great');
    }
  }

  if(top)return res('best');

  // Ladder by move accuracy
  let k=a>=T.best?'best':a>=T.excellent?'excellent':a>=T.goodFloor?'good':a>=T.inaccuracy?'inaccuracy':a>=T.mistake?'mistake':'blunder';
  // Optional: a Blunder must throw away a winning position (+1.0 or better down to -2.0 or worse), otherwise it is a Mistake.
  if(k==='blunder'&&CFG.blunder.gate&&!(before>=CFG.blunder.before&&after<=CFG.blunder.after))k='mistake';

  // Miss: a win that slips away (the opponent just erred, or there was a forced mate) without the position being lost
  const wb=white?wBefore:100-wBefore,wa=white?wAfter:100-wAfter;
  const prev=S.cls[i-1],prevErr=!!prev&&['inaccuracy','mistake','blunder','miss'].includes(prev.k);
  if(['inaccuracy','mistake'].includes(k)&&prevErr&&wb>=CFG.miss.before&&wa>=CFG.miss.after)return res('miss');
  if(CFG.miss.mate&&['good','inaccuracy','mistake'].includes(k)&&A[0].mate!=null&&sg*A[0].mate>0&&!(B[0].mate!=null&&sg*B[0].mate>0)&&wa>=50)return res('miss');
  return res(k);
}
// Manual classification (set from the move list's context menu) wins over the engine's verdict.
export function withOver(i,r){
  const k=S.over[i];if(!k)return r;
  return Object.assign({before:0,after:0,best:null},r,{k,custom:true,opening:k==='book'&&r?r.opening:undefined});
}
export function classifyAll(){
  S.bookOK=!S.startFen;S.cls=[];
  // classify() copes with missing data itself (book moves need none, and it returns null otherwise),
  // so don't pre-filter on S.P: book moves are never searched and would lose their icons.
  for(let i=1;i<S.fens.length;i++){const r=withOver(i,classify(i));if(r)S.cls[i]=r}
}
