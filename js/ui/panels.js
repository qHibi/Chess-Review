import {S} from '../state.js';
import {$,fmt,pvToSan} from '../util.js';
import {CLS} from '../config.js';
import {isJoke} from '../classification/jokes.js';
import {iconNode} from './icons.js';
import {render} from './board.js';
import {phasesFor,PH_NAME} from '../phase.js';
import {moveSfx} from '../sound.js';

export function renderVerdict(c,mv){
  const v=$('verdict');v.replaceChildren();
  if(S.preview){v.textContent='Previewing engine line. Use ← → to return to the game.';return}
  if(!mv){v.textContent=S.moves.length?'Start position':'Paste a PGN and press Analyze.';return}
  if(!c){v.textContent=mv.san+(S.line.todo.includes(S.idx)?' · classifying…':'');return}
  v.appendChild(iconNode(c.k,'',26));
  const t=document.createElement('div');
  const info=CLS[c.k];
  let txt=`<b>${mv.san}</b> is ${/^[aeiou]/i.test(info.label)?'an':'a'} ${info.label.toLowerCase()}`;
  if((['inaccuracy','mistake','blunder','miss','good','excellent'].includes(c.k)||isJoke(c.k))&&c.best&&c.best.pv[0]){
    const bs=pvToSan(S.fens[S.idx-1],[c.best.pv[0]],1)[0];
    if(bs)txt+=` · best was <b>${bs.san}</b>`;
  }
  const ph=phasesFor(S.line)[S.idx];if(ph)txt+=` · ${PH_NAME[ph]}`;
  if(c.opening)txt+=` · ${c.opening}`;
  if(c.custom)txt+=' · <i>edited</i>';
  t.innerHTML=txt;v.appendChild(t);
}
export function curLines(){return S.live||S.P[S.idx]||[]}
export function renderBar(){
  const L=curLines();const bar=$('evalbar');bar.classList.toggle('flip',S.flip);
  if(!L.length){$('evalwhite').style.height='50%';$('evtop').textContent='';$('evbot').textContent='';return}
  const v=Math.max(-12,Math.min(12,L[0].v));
  const pct=50+50*(2/(1+Math.exp(-.45*v))-1);
  $('evalwhite').style.height=pct+'%';
  const t=fmt(L[0]).replace('+','');
  $('evtop').textContent=L[0].v<0?t.replace('-',''):'';
  $('evbot').textContent=L[0].v>=0?t:'';
}
export function renderLines(){
  const box=$('lines');box.replaceChildren();
  const L=curLines();
  if(!L.length){box.innerHTML='<div class="hint">No analysis yet.</div>';return}
  const fen=S.fens[S.idx];
  const d=(L[0].depth?` · depth ${L[0].depth}`:'');
  $('linesTitle').textContent='Engine lines'+d;
  L.forEach(l=>{
    const row=document.createElement('div');row.className='line';
    const ev=document.createElement('div');ev.className='ev '+(l.v>=0?'w':'b');ev.textContent=fmt(l);row.appendChild(ev);
    const mv=document.createElement('div');mv.className='mv';
    const seq=pvToSan(fen,l.pv);
    let num=parseInt(fen.split(' ')[5])||1;let col=fen.split(' ')[1];
    seq.forEach((m,k)=>{
      if(col==='w'||k===0){const n=document.createElement('span');n.className='n';n.textContent=col==='w'?num+'.':num+'…';mv.appendChild(n)}
      const s=document.createElement('span');s.textContent=m.san;
      s.onclick=()=>{S.preview={fen:m.fen,from:m.from,to:m.to};moveSfx(m.san,m.fen);render()};
      mv.appendChild(s);
      if(col==='b')num++;col=col==='w'?'b':'w';
    });
    row.appendChild(mv);box.appendChild(row);
  });
}
