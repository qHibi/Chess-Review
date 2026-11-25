import {S,MAIN,withLine} from './state.js';
import {$,setStatus} from './util.js';
import {CFG} from './config.js';
import {showScreen} from './screens.js';
import {loadPgn} from './pgn.js';
import {classifyAll} from './classification/classify.js';
import {render} from './ui/board.js';
import {renderMoves} from './ui/moves.js';
import {renderLines} from './ui/panels.js';
import {renderSummary} from './ui/summary.js';
import {gameAccuracy} from './accuracy.js';

/* ---------- Saved analyses ----------
   Every finished analysis is kept in the browser (localStorage), newest first, so it can be reopened later without searching again.
   An entry holds the PGN, the engine lines for each position (shortened) and any classification overrides. */
const KEY='chess.saved',MAX=20,PV_KEEP=10;
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')||[]}catch(e){return[]}};
function write(list){
  for(let n=list.length;n>=1;n--){                                   // storage full: drop the oldest entries until it fits
    try{localStorage.setItem(KEY,JSON.stringify(list.slice(0,n)));return}catch(e){}
  }
}
const idOf=()=>S.pgnKey||'';
export const listSaved=()=>read();

export function saveCurrent(depth){
  if(!S.pgnText||!MAIN.moves.length||!idOf())return;
  const H=S.headers||{},ga=gameAccuracy(MAIN);
  const e={
    id:idOf(),pgn:S.pgnText,white:H.White||'White',black:H.Black||'Black',result:H.Result||'',
    wr:H.WhiteElo||'',br:H.BlackElo||'',date:Date.now(),depth:depth||CFG.depth,n:MAIN.moves.length,
    acc:[ga.w?ga.w.acc:null,ga.b?ga.b.acc:null],over:S.over||{},flip:!!S.flip,
    P:MAIN.P.map(ls=>ls&&ls.length?ls.map(l=>({v:+l.v.toFixed(3),m:l.mate==null?undefined:l.mate,d:l.depth,pv:(l.pv||[]).slice(0,PV_KEEP)})):null),
  };
  const list=read().filter(x=>x.id!==e.id);list.unshift(e);
  write(list.slice(0,MAX));
}
export function deleteSaved(id){write(read().filter(x=>x.id!==id))}

/* Reopen a saved analysis: load its PGN, put the stored lines back, classify (no engine needed) and go to the board. */
export function openSaved(id){
  const e=read().find(x=>x.id===id);if(!e)return false;
  $('pgn').value=e.pgn;
  if(!loadPgn())return false;
  Object.assign(S.over,e.over||{});                                  // keep manual changes, PGN-written ones are already in
  e.P.forEach((ls,i)=>{if(ls)MAIN.P[i]=ls.map(l=>({v:l.v,mate:l.m==null?null:l.m,depth:l.d,pv:l.pv}))});
  MAIN.todo=[];
  withLine(MAIN,classifyAll);MAIN.nextCls=MAIN.fens.length;S.done=true;S.flip=!!e.flip;
  showScreen('analysis');
  renderMoves();renderSummary();render();renderLines();
  setStatus(`Saved analysis opened (depth ${e.depth}).`);
  return true;
}
