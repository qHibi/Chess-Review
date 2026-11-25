import {S,MAIN} from '../state.js';
import {$} from '../util.js';
import {PIECE_URL} from '../config.js';

/* ---------- Player bars above / below the board: avatar, name, rating and (if the PGN has clock comments) the clock ----------
   The bottom bar is White unless the board is flipped. Clocks come from {[%clk h:mm:ss]} comments (MAIN.clocks, seconds). */
const AKEY='chess.avatars',mem={};
try{Object.assign(mem,JSON.parse(localStorage.getItem(AKEY)||'{}'))}catch(e){}
const pending=new Set();
const isChessCom=H=>/chess\.com/i.test((H.Site||'')+' '+(H.Link||''));
/* Chess.com has a public profile endpoint that gives the avatar picture. Lichess has none, so those players keep the piece tile. */
function avatarFor(name){
  const k=name.toLowerCase();
  if(k in mem)return mem[k]||null;
  if(!pending.has(k)){
    pending.add(k);
    fetch('https://api.chess.com/pub/player/'+encodeURIComponent(k)).then(r=>r.ok?r.json():null).then(j=>{
      mem[k]=(j&&j.avatar)||'';try{localStorage.setItem(AKEY,JSON.stringify(mem))}catch(e){}
      pending.delete(k);renderPlayers();
    }).catch(()=>{pending.delete(k)});
  }
  return null;
}
export function fmtClock(sec){
  if(sec==null)return'';
  sec=Math.max(0,sec);
  if(sec<10)return sec.toFixed(1).replace(/^/,'0:0');
  const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=Math.floor(sec%60);
  return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;
}
// seconds left for `col` after ply `idx` of the main line (null when the PGN has no clocks)
function clockOf(col,idx){
  const ck=MAIN.clocks;if(!ck||!ck.some((v,i)=>i>0&&v!=null))return null;
  for(let j=Math.min(idx,S.moves.length);j>0;j--)if(S.moves[j-1].color===col&&ck[j]!=null)return ck[j];
  return ck[0];
}
function fill(box,col,H,clock,active){
  const name=H[col==='w'?'White':'Black'],elo=H[col==='w'?'WhiteElo':'BlackElo'];
  box.hidden=!name&&clock==null;if(box.hidden)return;
  box.classList.toggle('active',!!active);
  let av=box.querySelector('.pav');
  if(!av){av=document.createElement('img');av.className='pav';av.alt='';box.prepend(av)}
  const url=name&&isChessCom(H)?avatarFor(name):null,want=url||PIECE_URL(col,'K');
  if(av.dataset.src!==want){av.dataset.src=want;av.src=want;av.classList.toggle('piece',!url);av.onerror=()=>{if(url){av.onerror=null;av.dataset.src='';av.classList.add('piece');av.src=PIECE_URL(col,'K')}}}
  let nm=box.querySelector('.pnm');if(!nm){nm=document.createElement('span');nm.className='pnm';box.append(nm)}
  nm.textContent=(name||(col==='w'?'White':'Black'))+(elo&&elo!=='?'?` (${elo})`:'');
  let ck=box.querySelector('.pck');if(!ck){ck=document.createElement('span');ck.className='pck';box.append(ck)}
  ck.hidden=clock==null;ck.textContent=fmtClock(clock);
  ck.classList.toggle('low',clock!=null&&clock<30);
}
export function renderPlayers(){
  const top=$('pbTop'),bot=$('pbBot');if(!top||!bot)return;
  const H=S.headers||{},main=S.line===MAIN&&!S.preview,idx=S.idx,turn=S.fens[idx]?S.fens[idx].split(' ')[1]:'w';
  const topCol=S.flip?'w':'b',botCol=S.flip?'b':'w';
  const ck=c=>main?clockOf(c,idx):null;
  fill(top,topCol,H,ck(topCol),main&&turn===topCol);
  fill(bot,botCol,H,ck(botCol),main&&turn===botCol);
}
