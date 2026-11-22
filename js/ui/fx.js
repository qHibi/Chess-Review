import {S} from '../state.js';
import {$} from '../util.js';

/* ---------- Board effects ----------
   Only four moments get a special effect - everything is flat colour, no gradients or glows:
     brilliant    full-board blue flash + shake + blue ripples
     promotion    gold ripple + sparkles
     checkmate    every square the winning side uses against the king turns red: the checking line, the pieces that
                  support the checker, the pieces that cut off the king's escape squares and the pieces that pin a
                  defender to the king (the squares of the move just played are left alone). Then the mated king is
                  turned over and gets a "#" badge.
     stalemate    grey squares close in around the king one by one, then a "=" badge
   The effects sit UNDER the pieces and the classification badge (z-index in css/fx.css), so nothing hides them.
   The entrance animation plays once per effect per analysis; coming back to the move shows only the finished state.
   The layers are separate from the board squares, so the many re-renders during analysis never restart an animation. */
const FILES='abcdefgh';
const reduced=()=>!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
let seen=new Set(),cur='',st=null;
export function resetFx(){seen=new Set();cur='';st=null}        // new game / new analysis: every entrance may play once again

/* ---- small DOM helpers ---- */
const el=(cls,parent,style)=>{const e=document.createElement('div');e.className=cls;if(style)e.style.cssText=style;if(parent)parent.appendChild(e);return e};
const gone=e=>{e.addEventListener('animationend',()=>e.remove(),{once:true});return e};
const nameOf=(f,r)=>FILES[f]+(8-r);                                     // board coords (file, rank counted from the top) -> "e4"
const pos=n=>[FILES.indexOf(n[0]),8-(+n[1])];
const scr=(f,r)=>[S.flip?7-f:f,S.flip?7-r:r];                           // board coords -> screen column/row
const cellScr=(L,c,r,cls,delay)=>{
  const e=el('fx-sq '+cls,L,`left:${c*12.5}%;top:${r*12.5}%`);
  if(delay!=null)e.style.animationDelay=delay.toFixed(2)+'s';
  return e;
};
const cell=(L,name,cls,delay)=>{const[f,r]=pos(name),[c,rr]=scr(f,r);return cellScr(L,c,rr,cls,delay)};

/* ---- chess geometry (works on chess.js board(): board[0] is rank 8, board[r][f] = {type,color} or null) ---- */
const B_DIRS=[[1,1],[1,-1],[-1,1],[-1,-1]],R_DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
const N_OFF=[[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
const RING=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];       // the 8 neighbours, clockwise from "up"
const inb=(f,r)=>f>=0&&f<8&&r>=0&&r<8;

// Squares the piece on (f,r) attacks, each with the squares strictly between (for sliders).
// `ghost` is a square treated as empty, so a checking line carries on through the king (the square behind the king is covered too).
function reach(b,f,r,ghost){
  const p=b[r][f],t=p.type,out=[];
  const push=(x,y,path)=>out.push({f:x,r:y,path});
  if(t==='n'||t==='k'){(t==='n'?N_OFF:RING).forEach(([dx,dy])=>{if(inb(f+dx,r+dy))push(f+dx,r+dy,[])})}
  else if(t==='p'){const dy=p.color==='w'?-1:1;[-1,1].forEach(dx=>{if(inb(f+dx,r+dy))push(f+dx,r+dy,[])})}
  else{
    (t==='b'?B_DIRS:t==='r'?R_DIRS:RING).forEach(([dx,dy])=>{
      let x=f+dx,y=r+dy;const path=[];
      while(inb(x,y)){
        push(x,y,path.slice());
        if(b[y][x]&&!(ghost&&x===ghost[0]&&y===ghost[1]))break;
        path.push([x,y]);x+=dx;y+=dy;
      }
    });
  }
  return out;
}
// Could the piece on (f,r) move onto one of the squares in `set` ("f,r" strings) if it were not pinned?
function canGo(b,f,r,set){
  const p=b[r][f];
  if(p.type==='p'){
    const dy=p.color==='w'?-1:1,start=p.color==='w'?6:1;
    if(inb(f,r+dy)&&!b[r+dy][f]){
      if(set.has(f+','+(r+dy)))return true;
      if(r===start&&!b[r+2*dy][f]&&set.has(f+','+(r+2*dy)))return true;
    }
    return[-1,1].some(dx=>inb(f+dx,r+dy)&&b[r+dy][f+dx]&&b[r+dy][f+dx].color!==p.color&&set.has((f+dx)+','+(r+dy)));
  }
  return reach(b,f,r).some(m=>{const q=b[m.r][m.f];return set.has(m.f+','+m.r)&&!(q&&q.color===p.color)});
}

/* Everything the winning side is using against the mated king, as groups of squares (a piece's own square, then the squares
   its line passes over towards the target). kind 'src' = the attacking piece, 'lane' = a square it attacks on the way. */
export function mateLanes(ch){
  const b=ch.board(),loser=ch.turn(),win=loser==='w'?'b':'w';
  let K=null;const W=[];
  for(let r=0;r<8;r++)for(let f=0;f<8;f++){
    const p=b[r][f];if(!p)continue;
    if(p.type==='k'&&p.color===loser)K=[f,r];else if(p.color===win)W.push({f,r,type:p.type});
  }
  if(!K)return null;
  const at=(h,x,y)=>h.f===x&&h.r===y;
  const src=w=>({f:w.f,r:w.r,kind:'src'}),lane=([f,r])=>({f,r,kind:'lane'});
  const direct=W.map(w=>({w,hits:reach(b,w.f,w.r)}));
  const checkers=direct.filter(d=>d.hits.some(h=>at(h,K[0],K[1])));
  const ghosted=W.map(w=>({w,hits:reach(b,w.f,w.r,K)}));
  const groups=[];

  // 1. the checking line(s)
  checkers.forEach(d=>{const h=d.hits.find(h=>at(h,K[0],K[1]));groups.push([src(d.w),...h.path.map(lane)])});

  // 2. cutting the king off: every piece that covers one of its escape squares. A neighbouring square holding a white piece
  //    counts too - covering it is what stops the king capturing it, so this is also where a supporter of the checker shows up
  //    (a bishop behind a queen, say).
  RING.forEach(([dx,dy])=>{
    const x=K[0]+dx,y=K[1]+dy;if(!inb(x,y))return;
    const q=b[y][x];if(q&&q.color===loser)return;                     // its own piece already blocks that square
    ghosted.forEach(({w,hits})=>{
      const h=hits.find(h=>at(h,x,y));if(!h)return;
      groups.push([src(w),...h.path.map(lane),lane([x,y])]);
    });
  });

  // 3. pins: a defender that sits between a slider and the king and could otherwise have blocked or captured the checker
  if(checkers.length===1){
    const ck=checkers[0],kh=ck.hits.find(h=>at(h,K[0],K[1]));
    const resolve=new Set([ck.w.f+','+ck.w.r,...kh.path.map(([x,y])=>x+','+y)]);
    RING.forEach(([dx,dy])=>{
      let x=K[0]+dx,y=K[1]+dy,pin=null;const seq=[];
      while(inb(x,y)){
        const q=b[y][x];
        if(!q)seq.push([x,y]);
        else if(!pin){if(q.color!==loser)break;pin=[x,y];seq.push([x,y])}
        else{
          const diag=dx!==0&&dy!==0;
          if(q.color===win&&(q.type==='q'||q.type===(diag?'b':'r'))&&canGo(b,pin[0],pin[1],resolve))
            groups.push([{f:x,r:y,kind:'src'},...seq.slice().reverse().map(lane)]);
          break;
        }
        x+=dx;y+=dy;
      }
    });
  }
  return{king:K,groups};
}

/* ---- the effects ---- */
function shake(stage){stage.classList.remove('shake');void stage.offsetWidth;stage.classList.add('shake')}
function sparks(L,name,colors,n,dist){
  const[f,r]=pos(name),[c,rr]=scr(f,r);
  for(let i=0;i<n;i++){
    const a=Math.PI*2*i/n+Math.random()*.6,d=dist*(.65+Math.random()*.7);
    gone(el('fx-spark',L,`left:${(c+.5)*12.5}%;top:${(rr+.5)*12.5}%;--dx:${(Math.cos(a)*d).toFixed(0)}%;--dy:${(Math.sin(a)*d).toFixed(0)}%;background:${colors[i%colors.length]};animation-delay:${(Math.random()*.1).toFixed(2)}s`));
  }
}
function brilliant(low,top,stage,to){
  gone(el('fx-flash',low));
  [0,.14].forEach(d=>gone(cell(top,to,'fx-ring blue',d)));
  shake(stage);
}
function promotion(top,to){
  gone(cell(top,to,'fx-ring gold',0));
  sparks(top,to,['#fff2a8','#ffd23a','#ff9f1c'],14,900);
}
function mate(low,ch,a,mv){
  const m=mateLanes(ch);if(!m)return;
  const sq=new Map();let t0=0;
  m.groups.forEach(g=>{                                               // each line is drawn outward from its piece, one after another
    g.forEach((s,i)=>{
      const n=nameOf(s.f,s.r),e=sq.get(n);
      if(!e)sq.set(n,{kind:s.kind,t:t0+i*.07});else if(s.kind==='src')e.kind='src';
    });
    t0+=.12;
  });
  const kn=nameOf(m.king[0],m.king[1]);sq.delete(kn);
  sq.delete(mv.from);sq.delete(mv.to);                              // the move just played keeps its normal highlight and badge, untouched
  let last=0;sq.forEach(v=>{last=Math.max(last,v.t)});
  const k=last>1.2?1.2/last:1;                                        // never take longer than about 1.5 s in total
  sq.forEach((v,n)=>cell(low,n,'fx-red '+v.kind+(a?' a':''),a?v.t*k:null));
  const kt=last*k+.12;
  cell(low,kn,'fx-red king'+(a?' a':''),a?kt:null);
  st={kind:'mate',turn:true,king:kn,anim:a,kd:kt+.2,bd:kt+.65};
}
function stalemate(low,ch,a){
  const side=ch.turn(),b=ch.board();let K=null;
  for(let r=0;r<8;r++)for(let f=0;f<8;f++){const p=b[r][f];if(p&&p.type==='k'&&p.color===side)K=[f,r]}
  if(!K)return;
  const[c0,r0]=scr(K[0],K[1]);let n=0;
  RING.forEach(([dx,dy])=>{
    const c=c0+dx,r=r0+dy;if(c<0||c>7||r<0||r>7)return;
    cellScr(low,c,r,'fx-grey'+(a?' a':''),a?.1+n*.1:null);n++;
  });
  const kt=.1+n*.1+.1;
  cellScr(low,c0,r0,'fx-grey king'+(a?' a':''),a?kt:null);
  st={kind:'stale',turn:false,king:nameOf(K[0],K[1]),anim:a,kd:0,bd:kt+.35};
}

/* The king's own square belongs to the board, which render() rebuilds every time, so the turned king and its badge are
   put back on every call (without their entrance animation after the first). */
function decorate(){
  if(!st)return;
  const bd=$('board');if(!bd||!bd.children)return;
  const[f,r]=pos(st.king),[c,rr]=scr(f,r),sq=bd.children[rr*8+c];if(!sq)return;
  if(st.turn){
    const pc=sq.querySelector('img.pc,.pc-fb');
    if(pc){pc.classList.add(st.anim?'fx-king-turn':'fx-king-down');if(st.anim)pc.style.animationDelay=st.kd.toFixed(2)+'s'}
  }
  if(!sq.querySelector('.fx-badge')){
    const b=el('fx-badge '+st.kind+(st.anim?' a':''),sq);
    b.textContent=st.kind==='mate'?'#':'=';
    if(st.anim)b.style.animationDelay=st.bd.toFixed(2)+'s';
  }
  st.anim=false;
}

function build(low,top,stage,flipOnly,brill){
  low.replaceChildren();if(top)top.replaceChildren();stage.classList.remove('shake');st=null;
  const mv=S.moves[S.idx-1],fen=S.fens[S.idx];if(!mv||!fen)return;
  let ch;try{ch=new Chess(fen)}catch(e){return}
  const san=mv.san||'',quiet=reduced();
  const first=id=>{                                                  // true only the first time this effect is shown in this analysis
    const k=`${S.line.id}:${S.idx}:${id}`,a=!flipOnly&&!quiet&&!seen.has(k);
    seen.add(k);return a;
  };
  try{
    if(san.endsWith('#'))mate(low,ch,first('mate'),mv);
    else if(ch.in_stalemate())stalemate(low,ch,first('stale'));
    else{
      if(brill&&first('brilliant'))brilliant(low,top,stage,mv.to);
      if(san.includes('=')&&first('promo'))promotion(top,mv.to);
    }
  }catch(e){}
}

/* Called at the end of every board render. Nothing is drawn for engine-line previews or the start position. */
export function syncFx(){
  const low=$('fx'),top=$('fxtop'),stage=$('bstage');if(!low||!stage)return;
  if(!stage._fx){stage._fx=1;stage.addEventListener('animationend',e=>{if(e.target===stage)stage.classList.remove('shake')})}
  const pv=S.preview,idx=S.idx,c=(!pv&&idx>0)?S.cls[idx]:null;
  const brill=!!(c&&c.k==='brilliant');
  const key=(pv||idx<1)?'':`${S.line.id}:${idx}:${brill?1:0}`;
  const sig=key+'|'+(S.flip?1:0);
  if(sig!==cur){                                                     // unchanged -> leave running animations alone
    const flipOnly=!!key&&cur.split('|')[0]===key;
    cur=sig;
    if(key)build(low,top,stage,flipOnly,brill);
    else{low.replaceChildren();if(top)top.replaceChildren();stage.classList.remove('shake');st=null}
  }
  decorate();
}
