import {S} from '../state.js';
import {$} from '../util.js';
import {CLS,PIECE_URL} from '../config.js';
import {iconNode} from './icons.js';
import {renderVerdict,renderBar} from './panels.js';
import {updateCursor} from './summary.js';
import {onSquare} from '../nav.js';

/* ---------- Render: board ---------- */
export function render(){
  const pv=S.preview,fen=pv?pv.fen:S.fens[S.idx];
  const ch=new Chess(fen),board=ch.board();
  const lm=(S.sel&&!pv)?ch.moves({verbose:true}).filter(m=>m.from===S.sel):[];
  const c=S.idx>0&&!pv?S.cls[S.idx]:null,mv=S.idx>0?S.moves[S.idx-1]:null;
  let from=null,to=null;
  if(pv){from=pv.from;to=pv.to}else if(mv){from=mv.from;to=mv.to}
  const el=$('board');el.replaceChildren();
  const fresh=S.idx!==S.rIdx||S.preview!==S.rPrev||S.line!==S.rLine;
  let anim=null;
  if(!pv&&!S.rPrev&&S.rIdx!==undefined&&S.rLine===S.line&&Math.abs(S.idx-S.rIdx)===1){
    const m=S.moves[Math.max(S.idx,S.rIdx)-1],fw=S.idx>S.rIdx;
    anim=fw?{from:m.from,to:m.to}:{from:m.to,to:m.from};
  }
  S.rIdx=S.idx;S.rPrev=S.preview;S.rLine=S.line;
  const colOf=n=>{const f='abcdefgh'.indexOf(n[0]),r=8-(+n[1]);return[S.flip?7-f:f,S.flip?7-r:r]};
  for(let r=0;r<8;r++)for(let f=0;f<8;f++){
    const rr=S.flip?7-r:r,ff=S.flip?7-f:f;
    const name='abcdefgh'[ff]+(8-rr),p=board[rr][ff];
    const sq=document.createElement('div');
    sq.className='sq '+((rr+ff)%2===0?'l':'d');
    const tgt=lm.find(m=>m.to===name);
    if(S.sel===name)sq.classList.add('sel');
    if(tgt)sq.classList.add(tgt.captured||tgt.flags.includes('e')?'cap':'dot');
    sq.onclick=ev=>onSquare(name,ev);
    if(c&&(name===from||name===to)){const h=document.createElement('div');h.className='hl';h.style.background=CLS[c.k].color;if(fresh)h.classList.add('fade');sq.appendChild(h)}
    else if(!c&&(name===from||name===to)){const h=document.createElement('div');h.className='hl';h.style.background='#7aa6ff';h.style.opacity='.35';if(fresh)h.classList.add('fade');sq.appendChild(h)}
    if(f===0){const t=document.createElement('span');t.className='co r';t.textContent=8-rr;sq.appendChild(t)}
    if(r===7){const t=document.createElement('span');t.className='co f';t.textContent='abcdefgh'[ff];sq.appendChild(t)}
    if(p){
      const img=new Image();img.crossOrigin='anonymous';img.className='pc';img.draggable=false;img.alt=p.color+p.type;
      img.src=PIECE_URL(p.color,p.type.toUpperCase());
      img.onerror=()=>{img.remove();const s=document.createElement('div');s.className='pc-fb';s.textContent={k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'}[p.type];sq.appendChild(s)};
      sq.appendChild(img);
      if(anim&&name===anim.to){
        const a=colOf(anim.from),b=colOf(anim.to);
        img.style.transform=`translate(${(a[0]-b[0])*100}%,${(a[1]-b[1])*100}%)`;
        requestAnimationFrame(()=>requestAnimationFrame(()=>{img.classList.add('sliding');img.style.transform=''}));
      }
    }
    if(c&&name===to){const bd=iconNode(c.k,'badge');if(fresh)bd.classList.add('pop');sq.appendChild(bd)}
    el.appendChild(sq);
  }
  document.querySelectorAll('.mvbtn').forEach(b=>b.classList.toggle('on',+b.dataset.i===S.idx&&+b.dataset.l===S.line.id));
  keepActiveVisible();
  renderVerdict(c,mv);
  if(fresh){const v=$('verdict');v.classList.remove('rise');void v.offsetWidth;v.classList.add('rise')}
  renderBar();updateCursor();
}
export function keepActiveVisible(){ // scroll only the move list, never the page
  const box=$('moves'),a=box.querySelector('.mvbtn.on');if(!a)return;
  const top=a.offsetTop,bot=top+a.offsetHeight;
  if(top<box.scrollTop)box.scrollTop=top-4;
  else if(bot>box.scrollTop+box.clientHeight)box.scrollTop=bot-box.clientHeight+4;
}
