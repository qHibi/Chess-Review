import {S} from '../state.js';
import {$} from '../util.js';

/* ---------- Board effects ----------
   A transparent layer (#fx) sits on top of the board and shows effects for the move on screen:
     brilliant  blue flash + shake + sparks        great      blue ripple
     blunder    red vignette + small shake         mistake / miss   orange / red ripple
     check      red ripples on the king            checkmate  the attacking line(s) drawn onto the king + a red badge
     stalemate  grey squares closing in around the king      promotion  gold sparkle burst
   Every effect has an animated entrance and a still "end state" (glow, line, grey squares...).
   The entrance plays once per effect per analysis; whenever you come back to that move only the end state is drawn.
   The layer is separate from the board squares, so the many re-renders during analysis never restart an animation. */
const FILES='abcdefgh',NS='http://www.w3.org/2000/svg';
const reduced=()=>!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
let seen=new Set(),cur='';
export function resetFx(){seen=new Set();cur=''}          // new game / new analysis: every entrance may play once again

/* ---- small DOM helpers ---- */
const el=(tag,cls,parent,style)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(style)e.style.cssText=style;if(parent)parent.appendChild(e);return e};
const sv=(tag,attrs,parent)=>{const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e};
const gone=e=>{e.addEventListener('animationend',()=>e.remove(),{once:true});return e};
const colRow=n=>{const f=FILES.indexOf(n[0]),r=8-(+n[1]);return[S.flip?7-f:f,S.flip?7-r:r]};   // square name -> screen column/row
const cell=(L,c,r,cls)=>el('div','fx-sq '+cls,L,`left:${c*12.5}%;top:${r*12.5}%`);
const sq=(L,name,cls)=>{const[c,r]=colRow(name);return cell(L,c,r,cls)};
const ctr=n=>{const[c,r]=colRow(n);return[c*100+50,r*100+50]};                                // centre in the 800x800 SVG space
const D=(e,s)=>{e.style.animationDelay=s+'s';return e};

/* ---- chess helpers ---- */
function kingOf(ch,color){
  const b=ch.board();
  for(let r=0;r<8;r++)for(let f=0;f<8;f++){const p=b[r][f];if(p&&p.type==='k'&&p.color===color)return FILES[f]+(8-r)}
  return null;
}
// every piece of `color` that attacks `target`, with the squares in between (for sliders)
function attackers(ch,target,color){
  const b=ch.board(),tf=FILES.indexOf(target[0]),tr=8-(+target[1]),out=[];
  for(let r=0;r<8;r++)for(let f=0;f<8;f++){
    const p=b[r][f];if(!p||p.color!==color)continue;
    const dx=tf-f,dy=tr-r,ax=Math.abs(dx),ay=Math.abs(dy),t=p.type;let ok=false;const path=[];
    if(t==='n')ok=(ax===1&&ay===2)||(ax===2&&ay===1);
    else if(t==='k')ok=Math.max(ax,ay)===1;
    else if(t==='p')ok=ax===1&&dy===(color==='w'?-1:1);
    else{
      const diag=ax===ay&&ax>0,line=(dx===0||dy===0)&&ax+ay>0;
      ok=t==='b'?diag:t==='r'?line:(diag||line);
      if(ok){
        const sx=Math.sign(dx),sy=Math.sign(dy);let x=f+sx,y=r+sy;
        while(x!==tf||y!==tr){if(b[y][x]){ok=false;break}path.push(FILES[x]+(8-y));x+=sx;y+=sy}
      }
    }
    if(ok)out.push({sq:FILES[f]+(8-r),type:t,path});
  }
  return out;
}

/* ---- effect pieces ---- */
const glow=(L,name,cls)=>sq(L,name,'fx-glow '+cls);                                  // still end-state ring on a square
const ripple=(L,name,cls,delays)=>delays.forEach(d=>gone(D(sq(L,name,'fx-ripple '+cls),d)));
function sparks(L,name,colors,n,dist){
  const[c,r]=colRow(name);
  for(let i=0;i<n;i++){
    const a=Math.PI*2*i/n+Math.random()*.6,d=dist*(.65+Math.random()*.7);
    gone(el('div','fx-spark',L,`left:${(c+.5)*12.5}%;top:${(r+.5)*12.5}%;--dx:${(Math.cos(a)*d).toFixed(0)}%;--dy:${(Math.sin(a)*d).toFixed(0)}%;background:${colors[i%colors.length]};animation-delay:${(Math.random()*.1).toFixed(2)}s`));
  }
}
function shake(stage,small){
  stage.classList.remove('shake','shake-s');void stage.offsetWidth;stage.classList.add(small?'shake-s':'shake');
}
function svgLayer(L){return sv('svg',{class:'fx-svg',viewBox:'0 0 800 800',preserveAspectRatio:'none'},L)}
function badge(g,name,fill,kind,a,delay){
  const[c,r]=colRow(name),x=c*100+80,y=r*100+20;
  const b=sv('g',{class:'fx-badge'+(a?' a':'')},g);if(a)b.style.animationDelay=delay+'s';
  sv('circle',{cx:x,cy:y,r:18,fill,stroke:'#fff','stroke-width':3},b);
  const ln=(x1,y1,x2,y2)=>sv('line',{x1,y1,x2,y2,stroke:'#fff','stroke-width':4,'stroke-linecap':'round'},b);
  if(kind==='x'){ln(x-7,y-7,x+7,y+7);ln(x+7,y-7,x-7,y+7)}                 // checkmate
  else{ln(x-8,y-4.5,x+8,y-4.5);ln(x-8,y+4.5,x+8,y+4.5)}                   // stalemate: "="
}

const FX={
  brilliant(L,o,a){
    glow(L,o.mv.to,'brilliant');
    if(!a)return;
    const[c,r]=colRow(o.mv.to);
    gone(el('div','fx-wash',L));
    gone(el('div','fx-flash',L,`background:radial-gradient(circle at ${(c+.5)*12.5}% ${(r+.5)*12.5}%,rgba(255,255,255,.98) 0,rgba(120,205,255,.85) 14%,rgba(35,120,255,.55) 40%,rgba(35,120,255,0) 75%)`));
    ripple(L,o.mv.to,'blue',[0,.13,.26]);
    sparks(L,o.mv.to,['#ffffff','#8fdcff','#2e8bff'],16,1100);
    shake(o.stage,false);
  },
  great(L,o,a){
    glow(L,o.mv.to,'great');
    if(!a)return;
    ripple(L,o.mv.to,'blue',[0,.18]);
    sparks(L,o.mv.to,['#cfe6ff','#749BBF'],8,700);
  },
  blunder(L,o,a){
    glow(L,o.mv.to,'blunder');
    if(!a)return;
    gone(el('div','fx-vig',L));
    ripple(L,o.mv.to,'red',[0]);
    shake(o.stage,true);
  },
  mistake(L,o,a){
    glow(L,o.mv.to,o.c.k);                      // "mistake" (orange) or "miss" (red)
    if(!a)return;
    ripple(L,o.mv.to,o.c.k==='miss'?'red':'orange',[0]);
  },
  check(L,o,a){
    const k=kingOf(o.ch,o.ch.turn());if(!k)return;
    sq(L,k,'fx-check');
    if(a)ripple(L,k,'red',[0,.2]);
  },
  promo(L,o,a){
    if(!a)return;
    ripple(L,o.mv.to,'gold',[0,.15]);
    sparks(L,o.mv.to,['#fff2a8','#ffd23a','#ff9f1c'],14,900);
  },
  mate(L,o,a){
    const loser=o.ch.turn(),k=kingOf(o.ch,loser);if(!k)return;
    const atk=attackers(o.ch,k,loser==='w'?'b':'w');
    sq(L,k,'fx-mate-king'+(a?' a':''));                               // king glow sits under the line
    const g=svgLayer(L),kc=ctr(k);
    atk.forEach((t,n)=>{
      const A=ctr(t.sq);let pts=[A];
      if(t.type==='n'){                                              // knights: long leg first, then the short one
        const dx=kc[0]-A[0],dy=kc[1]-A[1];
        pts.push(Math.abs(dx)>Math.abs(dy)?[kc[0],A[1]]:[A[0],kc[1]]);
      }
      pts.push(kc);
      t.path.forEach((p,i)=>{                                        // squares the attack passes over
        const[c,r]=colRow(p);
        const rc=sv('rect',{x:c*100,y:r*100,width:100,height:100,class:'fx-path'+(a?' a':'')},g);
        if(a)rc.style.animationDelay=(.1+i*.08)+'s';
      });
      const last=pts[pts.length-1],prev=pts[pts.length-2];           // stop short of the king and finish with an arrow head
      let ux=last[0]-prev[0],uy=last[1]-prev[1];const len=Math.hypot(ux,uy)||1;ux/=len;uy/=len;
      const tip=[last[0]-ux*26,last[1]-uy*26],bc=[tip[0]-ux*38,tip[1]-uy*38],px=-uy,py=ux;
      pts=pts.slice(0,-1).concat([[bc[0]+ux*2,bc[1]+uy*2]]);
      sv('circle',{cx:A[0],cy:A[1],r:46,class:'fx-ring'+(a?' a':'')},g);
      const pl=sv('polyline',{points:pts.map(p=>p.join(',')).join(' '),class:'fx-line'+(a?' a':''),pathLength:1},g);
      if(a)pl.style.animationDelay=(.2+n*.1)+'s';
      const ar=sv('polygon',{points:[tip,[bc[0]+px*26,bc[1]+py*26],[bc[0]-px*26,bc[1]-py*26]].map(p=>p.join(',')).join(' '),class:'fx-arrow'+(a?' a':'')},g);
      if(a)ar.style.animationDelay=(.62+n*.1)+'s';
    });
    badge(g,k,'#e53935','x',a,.85);
    if(a){ripple(L,k,'red',[.6,.85]);}
  },
  stalemate(L,o,a){
    const k=kingOf(o.ch,o.ch.turn());if(!k)return;
    const[c0,r0]=colRow(k);
    const ring=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];     // clockwise from the top
    let n=0;
    ring.forEach(([dx,dy])=>{
      const c=c0+dx,r=r0+dy;if(c<0||c>7||r<0||r>7)return;
      const e=cell(L,c,r,'fx-grey'+(a?' a':''));
      if(a)e.style.animationDelay=(.1+n*.1)+'s';
      n++;
    });
    const kg=cell(L,c0,r0,'fx-grey-king'+(a?' a':''));
    if(a)kg.style.animationDelay=(.1+n*.1+.1)+'s';
    const g=svgLayer(L);
    badge(g,k,'#8b8f98','eq',a,.1+n*.1+.35);
  },
};

/* Called at the end of every board render. Draws the effects for the move on screen (nothing for engine-line previews). */
export function syncFx(){
  const layer=$('fx'),stage=$('bstage');if(!layer||!stage)return;
  if(!stage._fx){stage._fx=1;stage.addEventListener('animationend',e=>{if(e.target===stage)stage.classList.remove('shake','shake-s')})}
  const pv=S.preview,idx=S.idx,c=(!pv&&idx>0)?S.cls[idx]:null;
  const key=(pv||idx<1)?'':`${S.line.id}:${idx}:${c?c.k:''}`;
  const sig=key+'|'+(S.flip?1:0);
  if(sig===cur)return;                                           // nothing changed: leave running animations alone
  const flipOnly=cur.split('|')[0]===key;
  cur=sig;
  layer.replaceChildren();stage.classList.remove('shake','shake-s');
  if(!key)return;
  const mv=S.moves[idx-1],fen=S.fens[idx];if(!mv||!fen)return;
  const ch=new Chess(fen),san=mv.san||'',ids=[];
  if(san.endsWith('#'))ids.push('mate');
  else if(ch.in_stalemate())ids.push('stalemate');
  else if(san.endsWith('+'))ids.push('check');
  if(san.includes('='))ids.push('promo');
  if(c){const k=c.k;if(k==='brilliant'||k==='great'||k==='blunder')ids.push(k);else if(k==='mistake'||k==='miss')ids.push('mistake')}
  const base=`${S.line.id}:${idx}:`,quiet=reduced();
  ids.forEach(id=>{
    const a=!flipOnly&&!quiet&&!seen.has(base+id);
    seen.add(base+id);
    try{FX[id](layer,{ch,mv,c,san,stage},a)}catch(e){}
  });
}
