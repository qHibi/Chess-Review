import {S,MAIN} from '../state.js';
import {$} from '../util.js';
import {CLS} from '../config.js';
import {iconNode} from './icons.js';
import {showLine,delLine} from '../nav.js';
import {openMenu} from './menu.js';

export function moveBtn(L,ply,label){
  const m=L.moves[ply-1],b=document.createElement('div');b.className='mvbtn';b.dataset.i=ply;b.dataset.l=L.id;
  const c=L.cls[ply];
  if(c){b.appendChild(iconNode(c.k,'',16));b.title=CLS[c.k].label+' ('+(c.after>0?'+':'')+c.after.toFixed(1)+')'}
  if(c&&c.custom){b.classList.add('edited');b.title=CLS[c.k].label+' (edited)'}
  if(label){const s=document.createElement('span');s.className='vn';s.textContent=label;b.appendChild(s)}
  b.appendChild(document.createTextNode(m.san));
  const menu=(x,y)=>{showLine(L,ply);openMenu(ply,x,y)};
  b.onclick=()=>{if(Date.now()<S.noClick)return;showLine(L,ply)};
  b.oncontextmenu=e=>{e.preventDefault();menu(e.clientX,e.clientY)};
  let t=null,sx=0,sy=0;                       // long-press for touch screens
  b.onpointerdown=e=>{
    if(e.pointerType==='mouse')return;
    sx=e.clientX;sy=e.clientY;clearTimeout(t);
    t=setTimeout(()=>{t=null;S.noClick=Date.now()+700;menu(sx,sy)},450);
  };
  b.onpointermove=e=>{if(t&&Math.hypot(e.clientX-sx,e.clientY-sy)>10){clearTimeout(t);t=null}};
  b.onpointerup=b.onpointercancel=b.onpointerleave=()=>{clearTimeout(t);t=null};
  return b;
}
export function renderMoves(){
  const box=$('moves'),keep=box.scrollTop;box.replaceChildren();
  MAIN.moves.forEach((m,k)=>{
    if(k%2===0){const n=document.createElement('div');n.className='num';n.textContent=(k/2+1)+'.';box.appendChild(n)}
    box.appendChild(moveBtn(MAIN,k+1));
    if(k===MAIN.moves.length-1&&k%2===0)box.appendChild(document.createElement('div'));
  });
  box.scrollTop=keep;
  const vb=$('vars');vb.replaceChildren();
  S.lines.slice(1).forEach(X=>{
    let depth=0;for(let P=X.parent;P&&P.parent;P=P.parent)depth++;
    const d=document.createElement('div');d.className='var';d.style.marginLeft=Math.min(depth,3)*12+'px';
    const h=document.createElement('div');h.className='var-h';
    const f=X.fork,lab=document.createElement('span');
    lab.textContent=f===0?'Variation from the start':`Variation after ${Math.ceil(f/2)}${f%2?'.':'…'} ${X.parent.moves[f-1].san}`;
    const x=document.createElement('button');x.type='button';x.textContent='×';x.title='Delete this variation';x.onclick=()=>delLine(X);
    h.append(lab,x);d.appendChild(h);
    const mm=document.createElement('div');mm.className='var-m';
    for(let p=f+1;p<=X.moves.length;p++)mm.appendChild(moveBtn(X,p,p%2?`${(p+1)/2}.`:(p===f+1?`${p/2}…`:'')));
    d.appendChild(mm);vb.appendChild(d);
  });
  document.querySelectorAll('.mvbtn').forEach(b=>b.classList.toggle('on',+b.dataset.i===S.idx&&+b.dataset.l===S.line.id));
}
