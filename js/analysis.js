import {S,MAIN,withLine} from './state.js';
import {$,setStatus} from './util.js';
import {CFG} from './config.js';
import {setBtn} from './ui/svg.js';
import {POOL,getPool,workerCount,terminal} from './engine.js';
import {showScreen} from './screens.js';
import {classifyAll,classify,withOver} from './classification/classify.js';
import {derive} from './derive.js';
import {fetchBook,bookLength} from './openings.js';
import {loadPgn} from './pgn.js';
import {render} from './ui/board.js';
import {renderMoves} from './ui/moves.js';
import {renderBar,renderLines} from './ui/panels.js';
import {renderSummary} from './ui/summary.js';
import {flushLines,liveAnalyze} from './live.js';
import {sfx} from './sound.js';
import {resetFx} from './ui/fx.js';

/* ---------- Game analysis ----------
   analyze(): every position of the game at CFG.depth (several workers, segments of the game each), classifying as data arrives.
   deepen(): then whole-game passes at depth+1, +2, ... re-classifying after each complete pass. */
export function advance(){ // classify moves in order as soon as their data exists
  let ch=false;
  while(S.nextCls<S.fens.length){
    const r=withOver(S.nextCls,classify(S.nextCls));if(!r)break;
    S.cls[S.nextCls++]=r;ch=true;
  }
  return ch;
}
/* Pause / resume for the whole-game passes. A halted search comes back "stopped" and is simply retried. */
const waiters=[];
export const resumeAll=()=>{while(waiters.length)waiters.pop()()};
async function searchGate(w,fen,depth,run){
  for(;;){
    if(S.run!==run)return null;
    if(S.paused){await new Promise(r=>waiters.push(r));continue}
    const r=await w.search(fen,depth);
    if(S.run!==run)return null;
    if(!r.stopped)return r.lines;
  }
}
/* Stop whatever analysis is running and put every flag back, so a new game can start cleanly (importing again before the
   last analysis finished used to leave S.batch set and the app stuck). Searches in flight come back "stopped" and their loops exit. */
export function cancelAnalysis(){
  S.run++;S.batch=false;S.deep=false;S.paused=false;resumeAll();
  POOL.forEach(e=>e.halt());
  $('prog').style.width='0';syncPause();
}
export function syncPause(){const on=S.batch||S.deep;$('bPause').hidden=!on;setBtn($('bPause'),S.paused?'play':'pause',S.paused?'Resume':'Pause')}
const bookNote=()=>'Book: '+(S.bookSrc==='openings'?'openings.txt':'built-in list (openings.txt not found)');
export async function analyze(){
  if(!POOL[0]||!POOL[0].ready){setStatus('Engine is still loading…');return}
  if(!loadPgn())return;                                   // also cancels any analysis that is still running
  showScreen('analysis');
  const run=++S.run;S.batch=true;syncPause();
  sfx('start');resetFx();                               // every board effect may play once again for this analysis
  setStatus('Checking opening book…');
  const M=MAIN;
  await fetchBook(M);
  if(S.run!==run)return;                                  // another game was loaded meanwhile
  const n=M.fens.length,bl=withLine(M,bookLength),start=Math.min(bl,n-1),total=n-start;
  const nW=Math.max(1,Math.min(workerCount(),total));
  const pool=getPool(nW);await Promise.all(pool.map(e=>e.readyP));
  if(S.run!==run)return;
  let done=0;
  withLine(M,advance);renderMoves();render();
  async function segment(w,a,b){
    for(let i=a;i<=b;i++){
      if(S.run!==run)return;
      let lines=terminal(M.fens[i]);
      if(!lines&&CFG.partial&&i>a)lines=withLine(M,()=>derive(i));
      if(!lines){lines=await searchGate(w,M.fens[i],CFG.depth,run);if(lines===null)return}
      if(S.run!==run)return;
      M.P[i]=lines;done++;
      $('prog').style.width=(done/total*100)+'%';
      setStatus(`Analyzing… ${done}/${total}`+(nW>1?` · ${nW} workers`:''));
      const had=S.line===M?M.cls[S.idx]:null;
      if(withLine(M,advance))renderMoves();
      if(S.line===M&&(i===S.idx||M.cls[S.idx]!==had)){render();renderLines()}   // keep the current view up to date
    }
  }
  const size=Math.ceil(total/nW),jobs=[];
  for(let k=0;k<nW;k++){const a=start+k*size,b=Math.min(n-1,a+size-1);if(a<=b)jobs.push(segment(pool[k],a,b))}
  await Promise.all(jobs);
  if(S.run!==run)return;
  S.batch=false;
  withLine(M,classifyAll);M.nextCls=M.fens.length;S.done=true;
  setStatus('Analysis complete at depth '+CFG.depth+'. '+bookNote()+'.');
  sfx('done');
  renderMoves();renderSummary();render();renderLines();flushLines();
  $('prog').style.width='0';syncPause();
  deepen(run);liveAnalyze();                          // (book positions have no stored search yet)
}

/* Whole-game iterative deepening: when the analysis is done, search the game again from the first position to
   the last at depth+1, re-classify, then do it again at depth+2, and so on until the max depth or you pause.
   Classifications are only recomputed once a pass is complete, so every move is judged on evaluations of the same depth. */
export async function deepen(run){
  const M=MAIN;
  if(!CFG.deepen||CFG.depth>=CFG.maxDepth||S.run!==run)return;
  S.deep=true;syncPause();
  const nW=Math.max(1,Math.min(workerCount(),M.fens.length)),pool=getPool(nW);
  await Promise.all(pool.map(e=>e.readyP));
  const todo=[];for(let i=0;i<M.fens.length;i++)if(M.P[i]&&M.P[i].length&&!terminal(M.fens[i]))todo.push(i);
  let d=CFG.depth;                                  // deepest depth that has been completed for the whole game
  while(S.run===run&&S.deep&&d<CFG.maxDepth&&todo.length){
    const nd=d+1;let next=0,done=0;
    const tell=()=>{$('prog').style.width=(done/todo.length*100)+'%';setStatus(`Deepening to depth ${nd}… ${done}/${todo.length}`+(S.paused?' (paused)':''))};
    tell();
    await Promise.all(pool.map(async w=>{
      while(S.run===run&&S.deep){
        const j=next++;if(j>=todo.length)return;
        const i=todo[j],lines=await searchGate(w,M.fens[i],nd,run);
        if(lines===null)return;
        if(lines.length)M.P[i]=lines;
        done++;tell();
        if(S.line===M&&S.idx===i&&!S.preview){S.live=null;renderBar();renderLines()}
      }
    }));
    if(S.run!==run||!S.deep)break;                  // cancelled mid-pass: keep the last complete classification
    d=nd;
    withLine(M,classifyAll);                       // the pass is complete: re-judge every move
    renderMoves();renderSummary();render();renderLines();
    $('prog').style.width='0';
  }
  if(S.run!==run)return;
  $('prog').style.width='0';
  S.deep=false;S.paused=false;syncPause();
  setStatus(`Analysis complete at depth ${d}. ${bookNote()}.`);
  liveAnalyze();
}
