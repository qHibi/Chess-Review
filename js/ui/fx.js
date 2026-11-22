import {S} from '../state.js';
import {$} from '../util.js';

/* ---------- Board effects ----------
   Flat colour only (no gradients or glows). Moments that get an effect:
     brilliant         full-board blue flash + shake + ripples
     promotion         gold wave up the pawn's path, ripples and sparkles
     checkmate         every square the winning side uses against the king turns red (checker, its supporters, pieces that cut
                       off escape squares, pieces that pin a defender), then a "#" badge on the king
     stalemate         grey squares close in around the king, then a "=" badge
     fork              orange lines from the forking piece to everything it attacks
     pin               purple line from the pinning piece through the pinned piece to what sits behind it
     discovered check  pink line from the piece that was uncovered to the king
   The effects sit UNDER the pieces and the classification badge (z-index in css/fx.css), so nothing hides them.
   Each plays once per analysis. Coming back to the move later shows nothing (the "#" / "=" badge stays). Settings >
   Appearance can switch them all off. The layers are separate from the board squares, so the many re-renders during
   analysis never restart an animation. */
const FILES='abcdefgh';
const reduced=()=>!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
export const FX={on:true};
let seen=new Set(),cur='',st=null;
export function setFx(on){FX.on=!!on;try{localStorage.setItem('chess.fx',on?'1':'0')}catch(e){}cur='';st=null}
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

/* ---- tactics of the move just played (position after the move) ---- */
const V={p:1,n:3,b:3,r:5,q:9,k:100};
const attackers=(b,color,f,r)=>{
  const out=[];
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){
    const p=b[y][x];if(!p||p.color!==color||(x===f&&y===r))continue;
    if(reach(b,x,y).some(h=>h.f===f&&h.r===r))out.push({f:x,r:y,type:p.type});
  }
  return out;
};
const S_=(f,r)=>({f,r,kind:'src'}),T_=(f,r)=>({f,r,kind:'tgt'}),L_=([f,r])=>({f,r,kind:'lane'});

// the moved piece attacks two or more enemy pieces that are worth winning (bigger than it, undefended, or the king), and is itself safe
export function forkOf(ch,mv){
  const b=ch.board(),[tf,tr]=pos(mv.to),p=b[tr][tf];
  if(!p||p.type==='k')return null;
  const me=p.color,foe=me==='w'?'b':'w',val=V[p.type];
  const hit=attackers(b,foe,tf,tr);
  if(hit.length){
    const low=Math.min(...hit.map(a=>V[a.type]));
    if(low<val||!attackers(b,me,tf,tr).length)return null;           // it can just be taken
  }
  const groups=[];
  reach(b,tf,tr).forEach(h=>{
    const q=b[h.r][h.f];if(!q||q.color!==foe||q.type==='p')return;
    if(q.type==='k'||V[q.type]>val||!attackers(b,foe,h.f,h.r).length)groups.push([S_(tf,tr),...h.path.map(L_),T_(h.f,h.r)]);
  });
  return groups.length>=2?{kind:'fork',groups}:null;
}
// the moved bishop / rook / queen pins an enemy piece against the king or a bigger piece
export function pinOf(ch,mv){
  const b=ch.board(),[tf,tr]=pos(mv.to),p=b[tr][tf];
  if(!p||!'brq'.includes(p.type))return null;
  const dirs=p.type==='b'?B_DIRS:p.type==='r'?R_DIRS:RING,groups=[];
  dirs.forEach(([dx,dy])=>{
    let x=tf+dx,y=tr+dy;const seq=[];let pin=null;
    while(inb(x,y)){
      const q=b[y][x];
      if(!q)seq.push(L_([x,y]));
      else if(!pin){if(q.color===p.color||q.type==='k')break;pin=[x,y,q];seq.push(T_(x,y))}
      else{
        if(q.color!==p.color&&'krq'.includes(q.type)&&V[q.type]>V[pin[2].type])groups.push([S_(tf,tr),...seq,T_(x,y)]);
        break;
      }
      x+=dx;y+=dy;
    }
  });
  return groups.length?{kind:'pin',groups}:null;
}
// check given by a piece other than the one that moved (the move uncovered it)
export function discoveredOf(ch,mv){
  if(!mv.san||!mv.san.endsWith('+')||/[kq]/.test(mv.flags||''))return null;
  const b=ch.board(),foe=ch.turn();let K=null;
  for(let r=0;r<8;r++)for(let f=0;f<8;f++){const p=b[r][f];if(p&&p.type==='k'&&p.color===foe)K=[f,r]}
  if(!K)return null;
  const groups=[];
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){
    const p=b[y][x];if(!p||p.color===foe||nameOf(x,y)===mv.to)continue;
    const h=reach(b,x,y).find(h=>h.f===K[0]&&h.r===K[1]);
    if(h)groups.push([S_(x,y),...h.path.map(L_),T_(K[0],K[1])]);
  }
  return groups.length?{kind:'disc',groups}:null;
}
export const tacticOf=(ch,mv)=>discoveredOf(ch,mv)||forkOf(ch,mv)||pinOf(ch,mv);

/* ---- the effects ----
   mode: 2 = play the entrance, 1 = draw the finished state (same visit, e.g. flipping the board), 0 = draw nothing */
const RANK={lane:0,src:1,tgt:2};
// Draw groups of squares, each group revealed outward from its first square. Returns when the last square appears.
function paint(low,groups,cls,mode,skip){
  const sq=new Map();let t0=0;
  groups.forEach(g=>{
    g.forEach((s,i)=>{
      const n=nameOf(s.f,s.r),e=sq.get(n);
      if(!e)sq.set(n,{kind:s.kind,t:t0+i*.035});else if(RANK[s.kind]>RANK[e.kind])e.kind=s.kind;
    });
    t0+=.05;
  });
  skip.forEach(n=>sq.delete(n));
  let last=0;sq.forEach(v=>{last=Math.max(last,v.t)});
  const k=last>.5?.5/last:1;                                         // the whole reveal takes at most about half a second
  if(mode)sq.forEach((v,n)=>cell(low,n,`${cls} ${v.kind}`+(mode===2?' a':''),mode===2?v.t*k:null));
  return last*k;
}
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
function promotion(low,top,mv){
  const[f0,r0]=pos(mv.from),[f1,r1]=pos(mv.to),n=Math.max(Math.abs(f1-f0),Math.abs(r1-r0));
  for(let i=0;i<=n;i++){                                             // a wave rises along the pawn's path
    const f=f0+Math.sign(f1-f0)*i,r=r0+Math.sign(r1-r0)*i,[c,rr]=scr(f,r);
    gone(cellScr(low,c,rr,'fx-wave',i*.07));
  }
  const d=n*.07;
  [d,d+.12,d+.24].forEach(t=>gone(cell(top,mv.to,'fx-ring gold',t)));
  sparks(top,mv.to,['#fff2a8','#ffd23a','#ff9f1c'],18,1000);
}
function tactic(low,top,t,mv,mode){
  const cls={fork:'fx-t fx-fork',pin:'fx-t fx-pin',disc:'fx-t fx-disc'}[t.kind];
  const end=paint(low,t.groups,cls,mode,[mv.from,mv.to]);
  if(mode===2){
    const seen_=new Set();
    t.groups.forEach(g=>{const e=g[g.length-1];if(t.kind==='disc'&&e.kind==='tgt'||t.kind!=='disc'){const n=nameOf(e.f,e.r);if(!seen_.has(n)){seen_.add(n);gone(cell(top,n,'fx-ring '+({fork:'orange',pin:'purple',disc:'pink'}[t.kind]),end*.6))}}});
  }
}
function mate(low,ch,mode,mv){
  const m=mateLanes(ch);if(!m)return;
  const kn=nameOf(m.king[0],m.king[1]);
  const end=paint(low,m.groups,'fx-red',mode,[kn,mv.from,mv.to]);
  if(mode)cell(low,kn,'fx-red king'+(mode===2?' a':''),mode===2?end+.05:null);
  st={kind:'mate',king:kn,anim:mode===2,bd:end+.25};
}
function stalemate(low,ch,mode){
  const side=ch.turn(),b=ch.board();let K=null;
  for(let r=0;r<8;r++)for(let f=0;f<8;f++){const p=b[r][f];if(p&&p.type==='k'&&p.color===side)K=[f,r]}
  if(!K)return;
  const[c0,r0]=scr(K[0],K[1]);let n=0;
  if(mode)RING.forEach(([dx,dy])=>{
    const c=c0+dx,r=r0+dy;if(c<0||c>7||r<0||r>7)return;
    cellScr(low,c,r,'fx-grey'+(mode===2?' a':''),mode===2?.05+n*.06:null);n++;
  });
  const kt=.05+n*.06+.05;
  if(mode)cellScr(low,c0,r0,'fx-grey king'+(mode===2?' a':''),mode===2?kt:null);
  st={kind:'stale',king:nameOf(K[0],K[1]),anim:mode===2,bd:kt+.25};
}

/* The king's square belongs to the board, which render() rebuilds every time, so the "#" / "=" badge is put back on every
   call (with its entrance animation only the first time). */
function decorate(){
  if(!st||!FX.on)return;
  const bd=$('board');if(!bd||!bd.children)return;
  const[f,r]=pos(st.king),[c,rr]=scr(f,r),sq=bd.children[rr*8+c];if(!sq)return;
  if(!sq.querySelector('.fx-badge')){
    const b=el('fx-badge '+st.kind+(st.anim?' a':''),sq);
    b.textContent=st.kind==='mate'?'#':'=';
    if(st.anim)b.style.animationDelay=st.bd.toFixed(2)+'s';
  }
  st.anim=false;
}

function build(low,top,stage,same,brill){
  low.replaceChildren();if(top)top.replaceChildren();stage.classList.remove('shake');st=null;
  const mv=S.moves[S.idx-1],fen=S.fens[S.idx];if(!mv||!fen)return;
  let ch;try{ch=new Chess(fen)}catch(e){return}
  const san=mv.san||'',quiet=reduced();
  const mode=id=>{                                                   // 2 first time, 1 same visit again, 0 shown before
    const k=`${S.line.id}:${S.idx}:${id}`,had=seen.has(k);seen.add(k);
    return !had?(quiet?1:2):same?1:0;
  };
  try{
    if(san.endsWith('#'))mate(low,ch,mode('mate'),mv);
    else if(ch.in_stalemate())stalemate(low,ch,mode('stale'));
    else{
      if(brill&&mode('brilliant')===2)brilliant(low,top,stage,mv.to);
      if(san.includes('=')){const m=mode('promo');if(m===2)promotion(low,top,mv)}
      else{const t=tacticOf(ch,mv);if(t)tactic(low,top,t,mv,mode(t.kind))}
    }
  }catch(e){}
}

/* Called at the end of every board render. Nothing is drawn for engine-line previews or the start position. */
export function syncFx(){
  const low=$('fx'),top=$('fxtop'),stage=$('bstage');if(!low||!stage)return;
  if(!stage._fx){stage._fx=1;stage.addEventListener('animationend',e=>{if(e.target===stage)stage.classList.remove('shake')})}
  const pv=S.preview,idx=S.idx,c=(!pv&&idx>0)?S.cls[idx]:null;
  const brill=!!(c&&c.k==='brilliant');
  const visit=(pv||idx<1||!FX.on)?'':`${S.line.id}:${idx}`;
  const sig=visit+'|'+(brill?1:0)+'|'+(S.flip?1:0);
  if(sig!==cur){                                                     // unchanged -> leave running animations alone
    const same=!!visit&&cur.split('|')[0]===visit;                   // still the same visit to this move (flip, or its class arrived)
    cur=sig;
    if(visit)build(low,top,stage,same,brill);
    else{low.replaceChildren();if(top)top.replaceChildren();stage.classList.remove('shake');st=null}
  }
  decorate();
}
