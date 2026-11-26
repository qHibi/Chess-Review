import './coi.js';
import {S,MAIN,withLine} from './state.js';
import {$,setStatus} from './util.js';
import {CFG} from './config.js';
import {POOL,ENG,getPool} from './engine.js';
import {classifyAll} from './classification/classify.js';
import {buildThemes} from './theme.js';
import {loadOpenings} from './openings.js';
import {loadPgn} from './pgn.js';
import {analyze,resumeAll,syncPause,cancelAnalysis} from './analysis.js';
import {showScreen,screen} from './screens.js';
import {hideLoader} from './ui/loader.js';
import {resetAux} from './live.js';
import {go} from './nav.js';
import {render} from './ui/board.js';
import {renderMoves} from './ui/moves.js';
import {renderSummary} from './ui/summary.js';
import {initImport} from './importer.js';
import {initSettings} from './settings.js';
import {initSound} from './sound.js';
import {hydrateIcons} from './ui/svg.js';

/* ---------- Events ---------- */
$('bAnalyze').onclick=analyze;
$('bNew').onclick=()=>showScreen('import');
$('bResume').onclick=()=>{showScreen('analysis');render()};
$('selStrict').onchange=e=>{
  CFG.strict=+e.target.value;
  if(S.batch)return;
  S.lines.forEach(L=>{if(L.P.length>=2)withLine(L,classifyAll)});renderMoves();if(!$('summaryCard').hidden)renderSummary();render();
};
document.addEventListener('jokes-changed',()=>{        // a joke classification was switched on / off
  if(S.batch)return;
  S.lines.forEach(L=>{if(L.P.length>=2)withLine(L,classifyAll)});renderMoves();if(!$('summaryCard').hidden)renderSummary();render();
});
$('bStart').onclick=()=>go(0);
$('bPrev').onclick=()=>go(S.idx-1);
$('bNext').onclick=()=>go(S.idx+1);
$('bEnd').onclick=()=>go(S.moves.length);
$('bPause').onclick=()=>{
  S.paused=!S.paused;syncPause();
  if(S.paused){POOL.forEach(e=>e.halt());setStatus('Paused.')}else resumeAll();
};
$('ldPause').onclick=()=>$('bPause').onclick();
$('ldHide').onclick=()=>hideLoader();
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('loader').hidden&&$('settings').hidden)hideLoader()});
$('chkDeepen').onchange=e=>{CFG.deepen=e.target.checked;if(!CFG.deepen&&S.deep){S.deep=false;S.paused=false;resumeAll();syncPause();setStatus('Stopped deepening.')}};
['selVersion','selMode'].forEach(id=>$(id).addEventListener('change',()=>{        // switch engine version: throw the old workers away and start over
  cancelAnalysis();
  POOL.splice(0).forEach(e=>e.kill());resetAux();
  ENG.probe=null;setStatus('Loading engine…');
  getPool(1);POOL[0].readyP.then(()=>{if(!S.batch&&!S.deep)setStatus('Engine ready ('+POOL[0].label+').')});
}));
$('bFlip').onclick=()=>{S.flip=!S.flip;render()};
document.addEventListener('keydown',e=>{
  if(screen()!=='analysis'||/^(TEXTAREA|INPUT|SELECT)$/.test(e.target.tagName))return;
  if(e.key==='ArrowLeft')go(S.idx-1);
  else if(e.key==='ArrowRight')go(S.idx+1);
  else if(e.key==='ArrowUp')go(0);
  else if(e.key==='ArrowDown')go(S.moves.length);
  else if(e.key==='f'||e.key==='F'){S.flip=!S.flip;render()}
});

hydrateIcons();initSettings();initSound();buildThemes();loadOpenings();initImport();
S.fens=[new Chess().fen()];render();
getPool(1);
POOL[0].readyP.then(()=>{if(!S.batch&&!S.deep)setStatus('Engine ready ('+POOL[0].label+').')});
loadPgn();

// Handy for debugging in the browser console and for the test scripts.
window.__app={S,MAIN,POOL,CFG,ENG,classifyAll};
