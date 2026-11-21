import {S,newLine} from './state.js';
import {uciOf} from './util.js';
import {OPEN,computeBook,localBook} from './openings.js';
import {render} from './ui/board.js';
import {renderMoves} from './ui/moves.js';
import {renderLines} from './ui/panels.js';
import {askPromo} from './ui/menu.js';
import {liveAnalyze,queueLine} from './live.js';
import {sfx,moveSfx} from './sound.js';

/* ---------- Navigation & variations ----------
   Every line (the game plus each variation) is a full move list with its own evaluations and classifications.
   S.line is the line on screen; S.moves / S.fens / S.P / S.cls always refer to it. */
const stepSfx=()=>{const k=S.idx;if(k>0)moveSfx(S.moves[k-1].san,S.fens[k]);else sfx('tick')};  // sound of the move now on screen
// silent: no sound (internal use). force: play even if the position did not change (clicking a move in the list).
export function go(i,silent,force){
  let L=S.line;const pL=L,pI=S.idx;i=Math.max(0,Math.min(L.moves.length,i));
  while(L.parent&&i<=L.fork)L=L.parent;          // stepping back past a fork returns to the parent line
  S.line=L;S.idx=Math.min(i,L.moves.length);S.preview=null;S.live=null;S.sel=null;
  if(!silent&&(force||L!==pL||S.idx!==pI))stepSfx();
  render();renderLines();liveAnalyze();
}
export function showLine(L,i){S.line=L;go(i,false,true)}
const prefixEq=(X,L,n)=>{for(let k=0;k<n;k++)if(uciOf(X.moves[k])!==uciOf(L.moves[k]))return false;return true};
export function playMove(mv){
  const L=S.line,i=S.idx,u=uciOf(mv);
  if(i<L.moves.length&&uciOf(L.moves[i])===u){go(i+1);return}                        // already in this line
  const same=S.lines.find(X=>X!==L&&X.moves.length>i&&uciOf(X.moves[i])===u&&prefixEq(X,L,i));
  if(same){showLine(same,i+1);return}                                                  // already in another variation
  const c=new Chess(L.fens[i]);c.move({from:mv.from,to:mv.to,promotion:mv.promotion});
  let T=L;
  if(i<L.moves.length){                                                                // branch off
    T=newLine({parent:L,fork:i,startFen:L.startFen,moves:L.moves.slice(0,i),fens:L.fens.slice(0,i+1),
               P:L.P.slice(0,i+1),cls:L.cls.slice(0,i+1)});
    for(const k in L.over)if(+k<=i)T.over[k]=L.over[k];
    T.bookOK=!T.startFen&&(i===0||localBook(T,i));
    S.lines.push(T);
  }
  T.moves.push(mv);T.fens.push(c.fen());T.todo.push(T.moves.length);
  if(!T.startFen&&OPEN.ok)computeBook(T);
  S.rLine=T;S.rIdx=i;                                                                  // so the move slides in
  S.line=T;S.idx=T.moves.length;S.preview=null;S.live=null;S.sel=null;
  moveSfx(mv.san,c.fen());
  renderMoves();render();renderLines();liveAnalyze();queueLine(T);
}
export function delLine(X){
  const dead=new Set([X]);let grew=true;
  while(grew){grew=false;S.lines.forEach(Y=>{if(!dead.has(Y)&&dead.has(Y.parent)){dead.add(Y);grew=true}})}
  S.lines=S.lines.filter(Y=>!dead.has(Y));
  if(dead.has(S.line)){S.line=X.parent;S.idx=Math.min(S.idx,X.fork)}
  S.sel=null;renderMoves();go(S.idx,true);
}
export function onSquare(sq,ev){
  if(S.preview){S.preview=null;S.sel=null;render();return}
  const ch=new Chess(S.fens[S.idx]);
  if(S.sel){
    const c=ch.moves({verbose:true}).filter(m=>m.from===S.sel&&m.to===sq);
    if(c.length){if(c[0].promotion){askPromo(ev,c);return}S.sel=null;playMove(c[0]);return}
  }
  const p=ch.get(sq);
  S.sel=(p&&p.color===ch.turn()&&S.sel!==sq)?sq:null;
  if(S.sel)sfx('select');
  render();
}
