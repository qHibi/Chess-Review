import {S,MAIN,withLine} from './state.js';
import {$} from './util.js';
import {CFG} from './config.js';
import {Engine,ENG,POOL,terminal} from './engine.js';
import {classify,withOver} from './classification/classify.js';
import {derive} from './derive.js';
import {render} from './ui/board.js';
import {renderMoves} from './ui/moves.js';
import {renderBar,renderLines} from './ui/panels.js';
import {renderSummary} from './ui/summary.js';

/* Classify moves played in variations (or appended to the game) with a separate engine, and live-analyse the position on screen.
   Live analysis only runs for positions with no stored analysis; once the game is analysed the whole-game deepening improves every position. */
/* Classify moves played in variations (or appended to the game) with a separate engine. */
let auxChain=Promise.resolve();
export function queueLine(X){if(S.batch)return;auxChain=auxChain.then(()=>runLine(X)).catch(()=>{})}
export function flushLines(){S.lines.forEach(X=>{if(X.todo.length)queueLine(X)})}
export async function runLine(X){
  if(!S.lines.includes(X)||!X.todo.length)return;
  if(!ENG.aux)ENG.aux=new Engine();
  await ENG.aux.readyP;
  while(X.todo.length&&S.lines.includes(X)&&!S.batch){
    const k=X.todo[0];
    let r=withLine(X,()=>withOver(k,classify(k)));
    if(!r){
      for(const j of [k-1,k]){
        if(X.P[j]&&X.P[j].length)continue;
        let lines=terminal(X.fens[j]);
        if(!lines&&CFG.partial&&j>0&&X.P[j-1])lines=withLine(X,()=>derive(j));
        if(!lines){ // search the new position about as deep as the one before it, so the two evaluations are comparable
          const dA=j===k?((X.P[k-1]&&X.P[k-1][0]&&X.P[k-1][0].depth)||0):0;
          const res=await ENG.aux.search(X.fens[j],Math.min(18,Math.max(CFG.depth,dA)));lines=res.lines}
        if(!S.lines.includes(X))return;
        X.P[j]=lines;
        if(S.line===X&&S.idx===j){renderBar();renderLines()}
      }
      r=withLine(X,()=>withOver(k,classify(k)));
    }
    X.todo.shift();
    if(r)X.cls[k]=r;
    renderMoves();if(S.line===X)render();
    if(X===MAIN&&S.done&&!$('summaryCard').hidden)renderSummary();
  }
}

/* Live analysis: only for positions that have no stored analysis yet (before the game is analysed, or in a
   variation). Once the game is analysed, every position is improved by the game-wide deepening passes instead. */
export async function liveAnalyze(){
  const L=S.line,idx=S.idx,fen=S.fens[idx];
  const T=terminal(fen);
  if(T){S.live=T;renderBar();renderLines();return}
  if(L.P[idx]&&L.P[idx].length)return;
  if(S.batch||S.deep){                               // the main engines are busy: use the spare one, queued behind variation work
    const tok=++S.token;
    auxChain=auxChain.then(async()=>{
      if(tok!==S.token||(L.P[idx]&&L.P[idx].length))return;
      if(!ENG.aux)ENG.aux=new Engine();
      await ENG.aux.readyP;
      const r=await ENG.aux.search(fen,CFG.depth,lines=>{if(tok===S.token&&lines.length){S.live=lines;renderBar();renderLines()}});
      if(!r.stopped&&r.lines.length&&!(L.P[idx]&&L.P[idx].length)){L.P[idx]=r.lines;if(tok===S.token){S.live=null;renderBar();renderLines()}}
    }).catch(()=>{});
    return;
  }
  const eng=POOL[0];if(!eng||!eng.ready)return;
  const tok=++S.token;
  const r=await eng.search(fen,CFG.depth,lines=>{
    if(tok!==S.token||!lines.length)return;
    S.live=lines;renderBar();renderLines();
  });
  if(tok===S.token&&!r.stopped&&r.lines.length){L.P[idx]=r.lines;S.live=null;renderBar();renderLines()}
}
export function resetAux(){if(ENG.aux){ENG.aux.kill();ENG.aux=null}auxChain=Promise.resolve()}
