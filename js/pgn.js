import {S,MAIN} from './state.js';
import {$,setStatus} from './util.js';
import {withOver} from './classification/classify.js';
import {CLS} from './config.js';
import {render} from './ui/board.js';
import {renderMoves} from './ui/moves.js';
import {renderLines} from './ui/panels.js';
import {sfx} from './sound.js';
import {resetFx} from './ui/fx.js';
import {cancelAnalysis} from './analysis.js';

/* ---------- PGN parsing (handles chess.com / lichess exports) ----------
   Reads the movetext token by token: move numbers, results, (variations) and engine comments are skipped, but two things are kept per move:
     - clocks:  {[%clk 0:09:58.3]} -> seconds left for the mover after that move
     - nags:    "$1", "!", "??" ... -> a classification that overrides the engine's (see NAG below)
   Then plays the moves one by one so odd formatting can't break the parser. */
export const NAG={1:'great',3:'brilliant',2:'mistake',4:'blunder',6:'inaccuracy'};      // standard annotation glyphs: ! !! ? ?? ?!
const MARK={'!!':3,'!':1,'??':4,'?':2,'?!':6,'!?':5};
const TOK=/\{[^}]*\}|;[^\n]*|[()]|\$\d+|(?:1-0|0-1|1\/2-1\/2|\*)(?=\s|$)|\d+\s*\.(?:\s*\.\.)?|\.\.\.|[^\s(){};$]+/g;
const clkOf=c=>{const m=c.match(/%clk\s+(\d+):(\d+):(\d+(?:\.\d+)?)/);return m?(+m[1])*3600+(+m[2])*60+parseFloat(m[3]):null};
export function parsePgn(text){
  let t=text.replace(/\r/g,'');
  const second=t.search(/\n\s*\n\s*\[Event /);if(second>0)t=t.slice(0,second);
  const headers={};
  t=t.replace(/\[\s*(\w+)\s+"([^"]*)"\s*\]/g,(m,k,v)=>{headers[k]=v;return ' '});
  t=t.replace(/…/g,'...').replace(/0-0-0/g,'O-O-O').replace(/0-0/g,'O-O');
  const list=[];let depth=0,m;
  TOK.lastIndex=0;
  while((m=TOK.exec(t))){
    const x=m[0],last=list[list.length-1];
    if(x==='('){depth++;continue}
    if(x===')'){depth=Math.max(0,depth-1);continue}
    if(depth)continue;                                                   // variations are ignored
    if(x[0]==='{'||x[0]===';'){
      if(last){const c=clkOf(x);if(c!=null)last.clk=c;const k=x.match(/%cls\s+(\w+)/);if(k)last.cls=k[1].toLowerCase()}
      continue;
    }
    if(x[0]==='$'){if(last){const n=+x.slice(1);if(NAG[n])last.nag=n}continue}
    if(/^(1-0|0-1|1\/2-1\/2|\*)$/.test(x)||/^\d+\s*\./.test(x)||/^\.+$/.test(x)||x==='--')continue;
    const mk=x.match(/[!?]+$/);
    const san=x.replace(/[!?]+$/,'');if(!san)continue;
    const e={san};if(mk&&MARK[mk[0]])e.nag=MARK[mk[0]];
    list.push(e);
  }
  const g=new Chess();
  let startFen;
  if(headers.FEN){
    if(!g.load(headers.FEN))return{error:'The FEN header in this PGN is not valid.'};
    if(headers.FEN.split(' ').slice(0,4).join(' ')!==new Chess().fen().split(' ').slice(0,4).join(' '))startFen=g.fen();
  }
  for(let k=0;k<list.length;k++){
    if(!g.move(list[k].san,{sloppy:true}))return{error:`Illegal or unreadable move "${list[k].san}" (move ${k+1}).`};
  }
  const clocks=[],over={};
  const tc=(headers.TimeControl||'').match(/^(\d+)/);clocks[0]=tc?+tc[1]:null;                // both sides start with the base time
  list.forEach((e,k)=>{
    clocks[k+1]=e.clk!=null?e.clk:null;
    const c=e.cls&&CLS[e.cls]?e.cls:NAG[e.nag];if(c)over[k+1]=c;
  });
  return{moves:g.history({verbose:true}),startFen,headers,clocks,over};
}
export function loadPgn(){
  const r=parsePgn($('pgn').value);
  if(r.error){setStatus(r.error);sfx('error');return false}
  if(!r.moves.length){setStatus('No moves found in PGN.');sfx('error');return false}
  cancelAnalysis();
  S.lines=[MAIN];S.line=MAIN;S.sel=null;MAIN.todo=[];
  const key=r.moves.map(m=>m.san).join(' ')+'|'+(r.startFen||'');
  if(key!==S.pgnKey){S.over={};S.pgnKey=key;resetFx()}
  Object.assign(S.over,r.over||{});                    // classifications written in the PGN ($1, $3, ?? ...) replace the engine's
  MAIN.clocks=r.clocks||[];S.pgnText=$('pgn').value;
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
