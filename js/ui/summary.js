import {S,MAIN} from '../state.js';
import {$} from '../util.js';
import {CLS,ORDER,PIECE_URL} from '../config.js';
import {isJoke} from '../classification/jokes.js';
import {gameAccuracy,accColor,blendAcc,ratingFromAcc} from '../accuracy.js';
import {phasesFor} from '../phase.js';
import {iconNode} from './icons.js';
import {showLine} from '../nav.js';

const SVGNS='http://www.w3.org/2000/svg';
const svgEl=(t,at)=>{const e=document.createElementNS(SVGNS,t);for(const k in at)e.setAttribute(k,at[k]);return e};
function renderGraph(W){
  const svg=$('graph'),n=MAIN.moves.length;svg.replaceChildren();
  if(n<1)return;
  const w=300,h=70,x=i=>i/n*w,y=v=>h*(1-v/100);
  svg.appendChild(svgEl('rect',{x:0,y:0,width:w,height:h,rx:4,fill:'#2b2f36'}));
  let d=`M0 ${h}`;W.forEach((v,i)=>{d+=` L${x(i).toFixed(1)} ${y(v).toFixed(1)}`});d+=` L${w} ${h} Z`;
  svg.appendChild(svgEl('path',{d,fill:'#e8e8e8'}));
  svg.appendChild(svgEl('line',{x1:0,x2:w,y1:h/2,y2:h/2,stroke:'#888','stroke-width':.6,'stroke-dasharray':'3 3'}));
  for(let i=1;i<=n;i++){
    const c=MAIN.cls[i];if(!c||!(['brilliant','great','miss','mistake','blunder'].includes(c.k)||isJoke(c.k)))continue;
    svg.appendChild(svgEl('circle',{cx:x(i).toFixed(1),cy:y(W[i]).toFixed(1),r:2.8,fill:CLS[c.k].color,stroke:'#111','stroke-width':.6}));
  }
  svg.appendChild(svgEl('line',{id:'gcur',x1:0,x2:0,y1:0,y2:h,stroke:'var(--accent)','stroke-width':1.5}));
  svg.onclick=e=>{const r=svg.getBoundingClientRect();showLine(MAIN,Math.max(0,Math.min(n,Math.round((e.clientX-r.left)/r.width*n))))};
  updateCursor();
}
export function updateCursor(){
  const g=document.getElementById('gcur'),n=MAIN.moves.length;if(!g||!n)return;
  const x=(Math.min(S.idx,n)/n*300).toFixed(1);g.setAttribute('x1',x);g.setAttribute('x2',x);
  g.style.display=S.line===MAIN?'':'none';
}
/* ---------- Review card (Game Review layout): graph, players, accuracy, rating, move counts, per-phase grades ----------
   Columns are: label | White | icon | Black, so every row lines up. */
const PHASES=[['open','Opening'],['mid','Middlegame'],['end','Endgame']];
const el=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e};
// accuracy of a phase -> the classification icon that stands for it
const gradeOf=a=>a>=92?'best':a>=80?'excellent':a>=65?'good':a>=50?'inaccuracy':a>=35?'mistake':'blunder';
function row(label,w,m,b,cls){
  const r=el('div','sr '+(cls||''));
  r.append(el('div','sl',label));
  [w,m,b].forEach((x,i)=>{const c=el('div','sc '+['w','m','b'][i]);if(x!=null)c.append(x);r.appendChild(c)});
  return r;
}
const box=(txt,side)=>el('div','sbox '+side,txt);
export function renderSummary(){
  const ga=gameAccuracy(MAIN),H=S.headers||{},ph=phasesFor(MAIN);
  renderGraph(ga.W);
  const body=$('sumBody');body.replaceChildren();
  let n=0;const add=r=>{r.style.setProperty('--i',n++);body.appendChild(r)};

  const who=(c,name)=>{const d=el('div','who'),im=document.createElement('img');im.src=PIECE_URL(c,'K');im.alt='';im.className='av '+c;d.append(im,el('span','nm',name));d.title=name;return d};
  add(row('Players',who('w',H.White||'White'),null,who('b',H.Black||'Black'),'players'));
  add(row('Accuracy',box(ga.w?ga.w.acc.toFixed(1):'–','w'),null,box(ga.b?ga.b.acc.toFixed(1):'–','b'),'boxes'));
  add(row('Game Rating',box(ga.w?String(ratingFromAcc(ga.w.acc)):'–','w'),null,box(ga.b?String(ratingFromAcc(ga.b.acc)):'–','b'),'boxes'));

  const cnt={w:{},b:{}};
  MAIN.moves.forEach((m,k)=>{const c=MAIN.cls[k+1];if(c)cnt[m.color][c.k]=(cnt[m.color][c.k]||0)+1});
  body.appendChild(el('hr','sdiv'));
  ORDER.forEach(k=>{
    const num=c=>{const v=cnt[c][k]||0,e=el('b','num',String(v));e.style.color=CLS[k].color;if(!v)e.classList.add('zero');return e};
    const ic=iconNode(k,'',26);
    const r=row(CLS[k].label,num('w'),ic,num('b'),'count');r.querySelector('.sl').style.color='var(--text)';add(r);
  });

  body.appendChild(el('h3','sadv','Advanced Stats'));
  const stat=(col,key)=>{const d=ga.data[col].filter(x=>ph[x.i]===key),r=blendAcc(d);return r?r.acc:null};
  PHASES.forEach(([key,name])=>{
    const cell=c=>{
      const a=stat(c,key);if(a==null)return el('span','none','–');
      const w=el('span','grade');w.append(iconNode(gradeOf(a),'',26));w.title=Math.round(a)+'% accuracy';
      w.append(el('small','',Math.round(a)+'%'));return w;
    };
    add(row(name,cell('w'),null,cell('b'),'phase'));
  });
  body.appendChild(el('div','hint','Ratings are rough estimates from accuracy, not real Elo. Phases are split by material and development; each icon grades the phase accuracy.'));
  $('summaryCard').hidden=false;
  updateCursor();
}
