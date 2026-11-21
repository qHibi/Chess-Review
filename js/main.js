import './coi.js';
import {S,MAIN,withLine} from './state.js';
import {$,setStatus} from './util.js';
import {CFG} from './config.js';
import {POOL,ENG,getPool} from './engine.js';
import {classifyAll} from './classification/classify.js';
import {buildThemes} from './theme.js';
import {loadOpenings} from './openings.js';
import {loadPgn} from './pgn.js';
import {analyze,resumeAll,syncPause} from './analysis.js';
import {resetAux} from './live.js';
import {go} from './nav.js';
import {render} from './ui/board.js';
import {renderMoves} from './ui/moves.js';
import {renderSummary} from './ui/summary.js';
import {initImport} from './importer.js';
import {initSettings} from './settings.js';
import {hydrateIcons} from './ui/svg.js';

/* ---------- Events ---------- */
$('bAnalyze').onclick=analyze;
$('pgn').onchange=()=>{if(!S.batch)loadPgn()};
$('selStrict').onchange=e=>{
  CFG.strict=+e.target.value;
  if(S.batch)return;
  S.lines.forEach(L=>{if(L.P.length>=2)withLine(L,classifyAll)});renderMoves();if(!$('summaryCard').hidden)renderSummary();render();
};
$('bStart').onclick=()=>go(0);
$('bPrev').onclick=()=>go(S.idx-1);
$('bNext').onclick=()=>go(S.idx+1);
$('bEnd').onclick=()=>go(S.moves.length);
$('bPause').onclick=()=>{
  S.paused=!S.paused;syncPause();
  if(S.paused){POOL.forEach(e=>e.halt());setStatus('Paused.')}else resumeAll();
};
$('chkDeepen').onchange=e=>{CFG.deepen=e.target.checked;if(!CFG.deepen&&S.deep){S.deep=false;S.paused=false;resumeAll();syncPause();setStatus('Stopped deepening.')}};
$('selEngine').onchange=()=>{        // switch engines: throw the old workers away and start over
  S.run++;S.batch=false;S.deep=false;S.paused=false;resumeAll();$('bAnalyze').disabled=false;$('prog').style.width='0';syncPause();
  POOL.splice(0).forEach(e=>e.kill());resetAux();
  ENG.wasmOK=null;ENG.probe=null;setStatus('Loading engine…');
  getPool(1);POOL[0].readyP.then(()=>{if(!S.batch&&!S.deep)setStatus('Engine ready ('+POOL[0].label+').')});
};
$('bFlip').onclick=()=>{S.flip=!S.flip;render()};
document.addEventListener('keydown',e=>{
  if(e.target.tagName==='TEXTAREA')return;
  if(e.key==='ArrowLeft')go(S.idx-1);
  else if(e.key==='ArrowRight')go(S.idx+1);
  else if(e.key==='ArrowUp')go(0);
  else if(e.key==='ArrowDown')go(S.moves.length);
  else if(e.key==='f'||e.key==='F'){S.flip=!S.flip;render()}
});

hydrateIcons();initSettings();buildThemes();loadOpenings();initImport();
S.fens=[new Chess().fen()];render();
getPool(1);
POOL[0].readyP.then(()=>{if(!S.batch&&!S.deep)setStatus('Engine ready ('+POOL[0].label+').')});
loadPgn();

// Handy for debugging in the browser console and for the test scripts.
window.__app={S,MAIN,POOL,CFG,ENG,classifyAll};
