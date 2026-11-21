import {S,MAIN} from '../state.js';
import {$} from '../util.js';
import {CLS,ORDER} from '../config.js';
import {gameAccuracy,accColor,blendAcc,ratingFromAcc} from '../accuracy.js';
import {phasesFor,PH_NAME} from '../phase.js';
import {iconNode} from './icons.js';
import {showLine} from '../nav.js';

function gauge(name,side,r){
  const R=34,C=2*Math.PI*R,d=document.createElement('div');d.className='gauge';
  const acc=r?r.acc:null,col=acc==null?'var(--line)':accColor(acc);
  d.innerHTML=`<svg viewBox="0 0 84 84" width="88" height="88" role="img" aria-label="${side} accuracy ${acc==null?'unknown':acc.toFixed(1)+' percent'}"><circle cx="42" cy="42" r="${R}" fill="none" stroke="var(--line)" stroke-width="7"/>`+
    `<circle cx="42" cy="42" r="${R}" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C*(acc==null?0:acc/100)} ${C}" transform="rotate(-90 42 42)"/>`+
    `<text x="42" y="48" text-anchor="middle" font-size="18" font-weight="700" fill="currentColor">${acc==null?'–':acc.toFixed(1)}</text></svg>`;
  const a=document.createElement('div');a.className='gn';a.textContent=name;a.title=name;
  const b=document.createElement('div');b.className='gs';b.textContent=side+' · accuracy'+(r?` · ${r.n} moves`:'');
  d.append(a,b);return d;
}
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
    const c=MAIN.cls[i];if(!c||!['brilliant','great','miss','mistake','blunder'].includes(c.k))continue;
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
// Accuracy and estimated rating for the whole game and for each phase, per side.
function renderScores(ga){
  const box=$('scores');box.replaceChildren();
  const ph=phasesFor(MAIN),rows=[['Whole game',null],[PH_NAME.open,'open'],[PH_NAME.mid,'mid'],[PH_NAME.end,'end']];
  const cell=(col,key)=>{
    const d=ga.data[col].filter(x=>!key||ph[x.i]===key),r=key?blendAcc(d):ga[col];
    return r?`${r.acc.toFixed(1)}% · ${ratingFromAcc(r.acc)}`:'–';
  };
  const sub=document.createElement('div');sub.className='sub';sub.textContent='Game rating (estimated)';
  const t=document.createElement('table');
  t.innerHTML='<tr><th></th><th>White</th><th>Black</th></tr>'+rows.map(([l,k])=>`<tr><td>${l}</td><td>${cell('w',k)}</td><td>${cell('b',k)}</td></tr>`).join('');
  const hint=document.createElement('div');hint.className='hint';hint.textContent='Accuracy · estimated rating. Phases are split by material and development.';
  box.append(sub,t,hint);
}
export function renderSummary(){
  const t=$('summary');t.replaceChildren();
  const ga=gameAccuracy(MAIN),H=S.headers||{};
  const ac=$('acc');ac.replaceChildren(gauge(H.White||'White','White',ga.w),gauge(H.Black||'Black','Black',ga.b));
  renderGraph(ga.W);renderScores(ga);
  const cnt={w:{},b:{}};
  MAIN.moves.forEach((m,k)=>{const c=MAIN.cls[k+1];if(c)cnt[m.color][c.k]=(cnt[m.color][c.k]||0)+1});
  const hd=document.createElement('tr');hd.innerHTML='<th></th><th>White</th><th>Black</th>';t.appendChild(hd);
  ORDER.forEach(k=>{
    if(!cnt.w[k]&&!cnt.b[k])return;
    const tr=document.createElement('tr');const td=document.createElement('td');
    const ic=iconNode(k,'',16);ic.style.marginRight='6px';
    td.appendChild(ic);td.appendChild(document.createTextNode(CLS[k].label));tr.appendChild(td);
    [cnt.w[k]||0,cnt.b[k]||0].forEach(n=>{const d=document.createElement('td');d.textContent=n;tr.appendChild(d)});
    t.appendChild(tr);
  });
  $('summaryCard').hidden=false;
  updateCursor();
}
