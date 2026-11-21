import {S} from './state.js';
import {BOOK,OPENINGS_URL} from './config.js';
import {uciOf} from './util.js';

/* ---------- Opening book (openings.txt) ----------
   A move is "book" while the game stays inside the openings file. Three lookups, cheapest first:
   exact move path (names a line), position (handles transpositions), and path prefix (the unnamed
   moves along the way to a named line). The last name seen is kept as the current opening. */
export const OPEN={path:new Map(),pos:new Map(),pre:new Set(),ok:false,p:null};
export const epdKey=f=>f.split(' ').slice(0,3).join(' ');   // board, turn, castling (en-passant field differs between tools)
export function loadOpenings(){
  if(OPEN.p)return OPEN.p;
  return OPEN.p=fetch(OPENINGS_URL).then(r=>{if(!r.ok)throw new Error('openings '+r.status);return r.text()}).then(txt=>{
    for(const raw of txt.split('\n')){
      const c=raw.replace(/\r$/,'').split('\t');
      if(c.length<5||c[0]==='eco')continue;
      const uci=c[3].trim().split(' '),hit={eco:c[0],name:c[1]};
      OPEN.path.set(uci.join(' '),hit);
      if(!OPEN.pos.has(epdKey(c[4])))OPEN.pos.set(epdKey(c[4]),hit);
      for(let k=1;k<=uci.length;k++)OPEN.pre.add(uci.slice(0,k).join(' '));
    }
    OPEN.ok=OPEN.path.size>0;
  }).catch(()=>{OPEN.ok=false});
}
export async function fetchBook(L=S.line){
  L.book=null;S.bookSrc='local';
  if(L.startFen)return;
  await loadOpenings();
  if(!OPEN.ok)return;                  // file missing: fall back to the small built-in list
  computeBook(L);S.bookSrc='openings';
}
export function computeBook(L){
  if(L.startFen||!OPEN.ok)return;
  const out=[],path=[];let name=null;
  for(let i=1;i<=L.moves.length;i++){
    path.push(uciOf(L.moves[i-1]));
    const key=path.join(' '),hit=OPEN.path.get(key)||OPEN.pos.get(epdKey(L.fens[i]));
    if(hit)name=hit.eco+' '+hit.name;
    const book=!!hit||OPEN.pre.has(key);
    out[i]={book,opening:name};
    if(!book)break;                    // left theory
  }
  L.book=out;
}
export function localBook(L,n){const seq=L.moves.slice(0,n).map(m=>m.san.replace(/[+#]/g,''));return BOOK.some(l=>l.length>=n&&seq.every((x,j)=>l[j]===x))}
export function bookLength(){ // how many leading moves are book (those positions need no engine search)
  if(S.startFen)return 0;
  if(S.book){let k=0;while(S.book[k+1]&&S.book[k+1].book)k++;return k}
  const seq=S.moves.map(m=>m.san.replace(/[+#]/g,''));
  let k=0;
  while(k<seq.length&&BOOK.some(l=>l.length>k&&seq.slice(0,k+1).every((x,j)=>l[j]===x)))k++;
  return k;
}
