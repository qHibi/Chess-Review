import {S} from '../state.js';
import {$,setStatus} from '../util.js';
import {CLS,ORDER,PIECE_URL} from '../config.js';
import {classifyAll,withOver} from '../classification/classify.js';
import {iconNode} from './icons.js';
import {svgIcon} from './svg.js';
import {renderMoves} from './moves.js';
import {renderSummary} from './summary.js';
import {render} from './board.js';
import {playMove} from '../nav.js';

/* ---------- Edit a move's classification (right-click / long-press in the move list) ---------- */
let ctxI=null,ctxAt=0;
export function closeMenu(){const m=$('ctx');m.hidden=true;m.classList.remove('promo');ctxI=null}
export function setOverride(i,k){
  if(S.batch){setStatus('Wait for the analysis to finish before editing classifications.');return}
  if(k)S.over[i]=k;else delete S.over[i];
  if(S.done)classifyAll();                       // re-derive everything so later "Miss" calls follow the edit
  else if(k)S.cls[i]=withOver(i,S.cls[i]);
  else delete S.cls[i];
  renderMoves();if(!$('summaryCard').hidden)renderSummary();render();
}
export function openMenu(i,x,y){
  const m=$('ctx');
  if(ctxI===i&&!m.hidden)return;
  m.replaceChildren();m.classList.remove('promo');ctxI=i;ctxAt=Date.now();
  const h=document.createElement('div');h.className='ctx-h';
  h.textContent=`Classify ${Math.ceil(i/2)}${i%2?'.':'…'} ${S.moves[i-1].san}`;m.appendChild(h);
  const item=(label,k,ic)=>{
    const b=document.createElement('button');b.type='button';b.className='ctx-i'+(k&&S.over[i]===k?' on':'');
    if(ic)b.appendChild(ic);
    b.appendChild(document.createTextNode(label));
    b.onclick=()=>{if(Date.now()-ctxAt<350)return;closeMenu();setOverride(i,k)};  // ignore the release of the long-press
    m.appendChild(b);
  };
  ORDER.forEach(k=>item(CLS[k].label,k,iconNode(k,'',18)));
  if(S.over[i])item('Reset to engine result',null,svgIcon('undo',18));
  m.hidden=false;
  const w=m.offsetWidth,hh=m.offsetHeight;
  m.style.left=Math.max(8,Math.min(x,innerWidth-w-8))+'px';
  m.style.top=Math.max(8,Math.min(y,innerHeight-hh-8))+'px';
}
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#ctx'))closeMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()},true);
addEventListener('resize',closeMenu);addEventListener('scroll',closeMenu,true);

const GLYPH={q:'♛',r:'♜',b:'♝',n:'♞'};
// Promotion picker: a row of piece icons (no text), like on Chess.com / Lichess.
export function askPromo(ev,cands){
  const m=$('ctx');m.replaceChildren();m.classList.add('promo');ctxI=-1;ctxAt=Date.now();
  const row=document.createElement('div');row.className='promo-row';row.setAttribute('role','group');row.setAttribute('aria-label','Promote to');
  [['q','Queen'],['r','Rook'],['b','Bishop'],['n','Knight']].forEach(([p,l])=>{
    const b=document.createElement('button');b.type='button';b.className='ctx-i promo-i';b.title=l;b.setAttribute('aria-label',l);
    const im=new Image();im.alt='';im.draggable=false;im.src=PIECE_URL(cands[0].color,p.toUpperCase());
    im.onerror=()=>{const g=document.createElement('span');g.className='promo-fb';g.textContent=GLYPH[p];im.replaceWith(g)};
    b.appendChild(im);
    b.onclick=()=>{closeMenu();S.sel=null;playMove(cands.find(x=>x.promotion===p))};
    row.appendChild(b);
  });
  m.appendChild(row);
  m.hidden=false;
  m.style.left=Math.max(8,Math.min(ev.clientX-20,innerWidth-m.offsetWidth-8))+'px';
  m.style.top=Math.max(8,Math.min(ev.clientY-20,innerHeight-m.offsetHeight-8))+'px';
}
