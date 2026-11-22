import {S,MAIN} from '../state.js';
import {$} from '../util.js';
import {CLS,ORDER} from '../config.js';
import {lineWin} from '../classification/winPercentage.js';
import {iconNode} from './icons.js';

/* ---------- Analysis overlay ----------
   Sits on top of the site while a game is being analyzed: a live evaluation graph and a count of every move classification
   so far, for both sides. The graph only draws positions that have been analyzed: each run of neighbouring analyzed
   positions is one connected piece, and a run stops where the next position has no result yet (the engines work on several
   stretches of the game at once, so the gaps close up as it goes). It closes itself when the analysis is done. */
const NS='http://www.w3.org/2000/svg';
let rows=null,raf=0,dismissed=false,timer=0,pct=0,done=false;
const el=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e};

function buildTable(){
  const t=$('ldTbl');t.replaceChildren();rows={};
  const H=S.headers||{};
  const hd=el('div','ld-r ld-h');
  hd.append(el('span'),el('span','ld-n',(H.White||'White').slice(0,14)),el('span','ld-n',(H.Black||'Black').slice(0,14)));
  t.appendChild(hd);
  ORDER.forEach(k=>{
    const r=el('div','ld-r'),lab=el('span','ld-l');
    lab.append(iconNode(k,'',20),el('span','',CLS[k].label));
    const w=el('b','ld-c zero','0'),b=el('b','ld-c zero','0');
    r.style.setProperty('--c',CLS[k].color);r.append(lab,w,b);t.appendChild(r);
    rows[k]={w,b,vw:0,vb:0};
  });
}
// win% (white's view) of each position: the engine result, 50 for book positions that have no search, null = not analyzed yet
function values(){
  const n=MAIN.moves.length,v=[];
  for(let i=0;i<=n;i++){
    const P=MAIN.P[i];
    if(P&&P.length)v[i]=lineWin(P[0]);
    else{const c=MAIN.cls[i];v[i]=i===0||(c&&c.k==='book')?50:null}
  }
  return v;
}
function svg(tag,at){const e=document.createElementNS(NS,tag);for(const k in at)e.setAttribute(k,at[k]);return e}
function drawGraph(){
  const g=$('ldGraph');g.replaceChildren();
  const n=MAIN.moves.length;if(n<1)return;
  const w=300,h=170,pad=5,x=i=>pad+i/n*(w-2*pad),y=v=>h-pad-v/100*(h-2*pad),val=values();
  g.appendChild(svg('rect',{x:0,y:0,width:w,height:h,rx:6,fill:'#20242b'}));
  g.appendChild(svg('line',{x1:pad,x2:w-pad,y1:h/2,y2:h/2,stroke:'#59616e','stroke-width':.7,'stroke-dasharray':'3 3'}));
  const runs=[];let cur=null;
  val.forEach((v,i)=>{if(v==null){cur=null;return}if(!cur){cur=[];runs.push(cur)}cur.push([x(i),y(v)])});
  const fmt=p=>p[0].toFixed(1)+' '+p[1].toFixed(1);
  val.forEach((v,i)=>{if(v==null&&i%Math.max(1,Math.round(n/60))===0)g.appendChild(svg('circle',{cx:x(i).toFixed(1),cy:h-pad-1,r:1,fill:'#59616e'}))});   // pending positions
  runs.forEach((r,k)=>{
    const last=r[r.length-1],first=r[0];
    if(r.length>1){
      g.appendChild(svg('path',{d:`M${first[0].toFixed(1)} ${h-pad} L${r.map(fmt).join(' L')} L${last[0].toFixed(1)} ${h-pad} Z`,fill:'#e6e8eb',opacity:.92}));
      g.appendChild(svg('path',{d:`M${r.map(fmt).join(' L')}`,fill:'none',stroke:'#F0C93F','stroke-width':1.6,'stroke-linejoin':'round'}));
    }
    [first,last].forEach(p=>g.appendChild(svg('circle',{cx:p[0].toFixed(1),cy:p[1].toFixed(1),r:2.6,fill:'#F0C93F',stroke:'#20242b','stroke-width':1})));
    if(!done&&last[0]<w-pad-1)g.appendChild(svg('circle',{class:'ld-pulse',cx:last[0].toFixed(1),cy:last[1].toFixed(1),r:2.6,fill:'none',stroke:'#F0C93F','stroke-width':1.5}));
  });
}
function paint(){
  raf=0;if($('loader').hidden)return;
  drawGraph();
  const cnt={w:{},b:{}};let n=0;
  MAIN.moves.forEach((m,k)=>{const c=MAIN.cls[k+1];if(c){cnt[m.color][c.k]=(cnt[m.color][c.k]||0)+1;n++}});
  ORDER.forEach(k=>{
    const r=rows[k];if(!r)return;
    [['w','vw'],['b','vb']].forEach(([c,vk])=>{
      const v=cnt[c][k]||0,e=r[c];
      if(v!==r[vk]){r[vk]=v;e.textContent=v;e.classList.toggle('zero',!v);e.classList.remove('bump');void e.offsetWidth;e.classList.add('bump')}
    });
  });
  $('ldPct').textContent=Math.round(pct)+'%';$('ldBar').style.width=pct+'%';
  $('ldSub').textContent=`${(S.headers&&S.headers.White)||'White'} vs ${(S.headers&&S.headers.Black)||'Black'} · ${n}/${MAIN.moves.length} moves classified`;
}
const schedule=()=>{if(!raf)raf=requestAnimationFrame(paint)};

export function openLoader(){
  clearTimeout(timer);dismissed=false;done=false;pct=0;
  const L=$('loader');L.classList.remove('out');L.hidden=false;
  $('ldTitle').textContent='Analyzing game';
  buildTable();paint();
}
export function updateLoader(p){if(dismissed)return;pct=Math.max(pct,Math.min(100,p));schedule()}
export function finishLoader(){
  if(dismissed||$('loader').hidden)return;
  done=true;pct=100;$('ldTitle').textContent='Analysis complete';paint();
  clearTimeout(timer);
  timer=setTimeout(()=>{$('loader').classList.add('out');timer=setTimeout(()=>{$('loader').hidden=true},260)},900);
}
export function hideLoader(instant){
  clearTimeout(timer);
  if(!instant)dismissed=true;
  const L=$('loader');if(L.hidden)return;
  if(instant){L.hidden=true;return}
  L.classList.add('out');timer=setTimeout(()=>{L.hidden=true},200);
}
