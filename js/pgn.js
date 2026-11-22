import {S,MAIN} from './state.js';
import {$,setStatus} from './util.js';
import {withOver} from './classification/classify.js';
import {render} from './ui/board.js';
import {renderMoves} from './ui/moves.js';
import {renderLines} from './ui/panels.js';
import {sfx} from './sound.js';
import {resetFx} from './ui/fx.js';
import {cancelAnalysis} from './analysis.js';

/* ---------- PGN parsing (handles chess.com / lichess exports) ---------- */
// Strips clock comments, {comments}, ;comments, (variations), $NAGs, !? marks, move numbers and results,
// then plays the moves one by one so odd formatting can't break the parser.
export function parsePgn(text){
  let t=text.replace(/\r/g,'');
  const second=t.search(/\n\s*\n\s*\[Event /);if(second>0)t=t.slice(0,second);
  const headers={};
  t=t.replace(/\[\s*(\w+)\s+"([^"]*)"\s*\]/g,(m,k,v)=>{headers[k]=v;return ' '});
  t=t.replace(/\{[^}]*\}/g,' ').replace(/;[^\n]*/g,' ');
  let prev;do{prev=t;t=t.replace(/\([^()]*\)/g,' ')}while(t!==prev);
  t=t.replace(/\$\d+/g,' ').replace(/…/g,'...').replace(/0-0-0/g,'O-O-O').replace(/0-0/g,'O-O');
  t=t.replace(/(^|\s)(1\s*-\s*0|0\s*-\s*1|1\/2\s*-\s*1\/2|\*)(?=\s|$)/g,' ');
  t=t.replace(/\b\d+\s*\.(\s*\.\.)?/g,' ');
  const toks=t.split(/\s+/).map(x=>x.replace(/[!?]+$/,'')).filter(x=>x&&!/^\.+$/.test(x)&&x!=='--');
  const g=new Chess();
  let startFen;
  if(headers.FEN){
    if(!g.load(headers.FEN))return{error:'The FEN header in this PGN is not valid.'};
    if(headers.FEN.split(' ').slice(0,4).join(' ')!==new Chess().fen().split(' ').slice(0,4).join(' '))startFen=g.fen();
  }
  for(let k=0;k<toks.length;k++){
    if(!g.move(toks[k],{sloppy:true}))return{error:`Illegal or unreadable move "${toks[k]}" (move ${k+1}).`};
  }
  return{moves:g.history({verbose:true}),startFen,headers};
}
export function loadPgn(){
  const r=parsePgn($('pgn').value);
  if(r.error){setStatus(r.error);sfx('error');return false}
  if(!r.moves.length){setStatus('No moves found in PGN.');sfx('error');return false}
  cancelAnalysis();
  S.lines=[MAIN];S.line=MAIN;S.sel=null;MAIN.todo=[];
  const key=r.moves.map(m=>m.san).join(' ')+'|'+(r.startFen||'');
  if(key!==S.pgnKey){S.over={};S.pgnKey=key;resetFx()}
  S.headers=r.headers||{};
  S.run++;S.moves=r.moves;S.startFen=r.startFen;S.P=[];S.cls=[];S.book=null;S.live=null;S.preview=null;S.done=false;
  S.bookOK=!r.startFen;S.idx=0;S.nextCls=1;
  const rep=new Chess(r.startFen);S.fens=[rep.fen()];
  r.moves.forEach(m=>{rep.move({from:m.from,to:m.to,promotion:m.promotion});S.fens.push(rep.fen())});
  for(const i in S.over)S.cls[i]=withOver(+i,null);
  renderMoves();render();renderLines();$('summaryCard').hidden=true;
  setStatus(`${r.moves.length} moves loaded.`);
  return true;
}
