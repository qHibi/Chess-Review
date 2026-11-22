import {$} from './util.js';
import {setBtn} from './ui/svg.js';

/* ---------- Sound effects ----------
   Moves use the Chess.com sound files, loaded straight from their CDN: move-self, capture, castle, promote, move-check and
   game-end (checkmate / stalemate / draw), plus notify for "analysis complete". One sound per move, picked in moveSfx().
   If a file can't be loaded (offline, blocked, format not supported) the same sound is synthesised with the Web Audio API instead.
   Small UI sounds (clicks, toggles, piece selection, errors) are always synthesised.
   Browsers keep audio locked until the person has interacted with the page, so nothing plays before the first click / key press.
   Settings (on/off + volume) are remembered in localStorage and edited in Settings > Sound; M mutes from anywhere. */
const KEY='chess.sound';
const ST={on:true,vol:0.8};
let ctx=null,master=null,noiseBuf=null,armed=false;
const last={};

const BASE='https://images.chesscomfiles.com/chess-themes/sounds/';
const webm=(()=>{try{return !!new Audio().canPlayType('audio/webm; codecs="opus"')}catch(e){return false}})();
const URLS={
  move:'_MP3_/default/move-self.mp3',capture:'_MP3_/default/capture.mp3',castle:'_MP3_/default/castle.mp3',
  promote:'_MP3_/default/promote.mp3',check:'_MP3_/default/move-check.mp3',notify:'_MP3_/default/notify.mp3',
  end:webm?'_WEBM_/default/game-end.webm':'_MP3_/default/game-end.mp3',     // browsers without WebM try the MP3 twin
};
const FILE_OF={move:'move',capture:'capture',castle:'castle',promote:'promote',check:'check',notify:'notify',done:'notify',mate:'end',draw:'end'};
const AUD={},bad=new Set();
function audioFor(key){
  if(AUD[key])return AUD[key];
  try{
    const a=new Audio(BASE+URLS[key]);a.preload='auto';
    a.addEventListener('error',()=>bad.add(key));
    AUD[key]=a;return a;
  }catch(e){bad.add(key);return null}
}
// true if the file was started (or is on its way); false means "use the synthesised fallback"
function playFile(key,onFail){
  if(bad.has(key))return false;
  const base=audioFor(key);if(!base)return false;
  try{
    const a=base.cloneNode();a.volume=Math.min(1,gainOf(ST.vol));
    const p=a.play();
    if(p&&p.catch)p.catch(err=>{if(err&&err.name==='NotSupportedError'){bad.add(key);onFail()}});
    return true;
  }catch(e){return false}
}

function load(){
  try{
    const s=JSON.parse(localStorage.getItem(KEY)||'null');
    if(s){ST.on=s.on!==false;if(typeof s.vol==='number'&&s.vol>=0&&s.vol<=1)ST.vol=s.vol}
  }catch(e){}
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(ST))}catch(e){}}
const gainOf=v=>v*v;                                  // perceptual-ish volume curve

function ac(){
  if(ctx)return ctx;
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return null;
  try{ctx=new AC()}catch(e){return null}
  const comp=ctx.createDynamicsCompressor();          // keeps stacked sounds from clipping
  comp.threshold.value=-10;comp.knee.value=12;comp.ratio.value=8;comp.attack.value=.002;comp.release.value=.12;
  master=ctx.createGain();master.gain.value=gainOf(ST.vol);
  master.connect(comp);comp.connect(ctx.destination);
  const n=ctx.sampleRate;noiseBuf=ctx.createBuffer(1,n,n);
  const d=noiseBuf.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
  return ctx;
}

/* ---- building blocks ---- */
function env(g,t,vol,atk,dur){
  g.gain.setValueAtTime(.0001,t);
  g.gain.linearRampToValueAtTime(vol,t+atk);
  g.gain.exponentialRampToValueAtTime(.0001,t+dur);
}
function tone(t,{f=440,f2=null,type='sine',vol=.3,atk=.004,dur=.12}){
  const o=ctx.createOscillator(),g=ctx.createGain();
  o.type=type;o.frequency.setValueAtTime(f,t);
  if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  env(g,t,vol,atk,Math.max(dur,atk+.005));
  o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.05);
}
function noise(t,{vol=.3,dur=.05,type='bandpass',f=1500,q=1,atk=.002}){
  const s=ctx.createBufferSource(),fl=ctx.createBiquadFilter(),g=ctx.createGain();
  s.buffer=noiseBuf;fl.type=type;fl.frequency.value=f;fl.Q.value=q;
  env(g,t,vol,atk,Math.max(dur,atk+.005));
  s.connect(fl);fl.connect(g);g.connect(master);
  s.start(t,Math.random()*.4);s.stop(t+dur+.05);
}

/* ---- pieces: a wooden "tock" (pitch p, volume v) ---- */
const tap=(t,p=1,v=1)=>{
  tone(t,{f:210*p,f2:95*p,vol:.7*v,atk:.002,dur:.11});                    // body
  tone(t,{f:430*p,f2:180*p,type:'triangle',vol:.22*v,atk:.001,dur:.05});  // wood overtone
  noise(t,{vol:.55*v,dur:.035,f:2200*p,q:.9});                            // contact click
};
const thud=(t,p=1,v=1)=>{
  tone(t,{f:160*p,f2:60*p,vol:.8*v,atk:.002,dur:.16});
  tone(t,{f:340*p,f2:120*p,type:'triangle',vol:.25*v,dur:.07});
  noise(t,{vol:.8*v,dur:.07,f:1700*p,q:.7});
  noise(t,{vol:.35*v,dur:.12,type:'lowpass',f:900*p,q:.5});
};

const SOUNDS={
  move:t=>tap(t),
  capture:t=>{thud(t);tap(t+.045,1.15,.55)},
  castle:t=>{tap(t,1,.9);tap(t+.11,.85,.9)},
  promote:t=>{
    tap(t,1.05,.8);
    [523.25,659.25,783.99,1046.5].forEach((f,i)=>tone(t+.09+i*.065,{f,type:'triangle',vol:.22,dur:.24}));
  },
  check:t=>{
    tone(t,{f:740,type:'triangle',vol:.26,dur:.09});
    tone(t+.085,{f:988,type:'triangle',vol:.26,dur:.15});
  },
  notify:t=>SOUNDS.check(t),
  mate:t=>{
    tone(t,{f:98,f2:49,vol:.7,dur:.5});
    [392,330,262].forEach((f,i)=>tone(t+.04+i*.16,{f,type:'triangle',vol:.25,dur:.42}));
  },
  draw:t=>{
    tone(t,{f:392,vol:.22,dur:.3});
    tone(t+.16,{f:330,vol:.22,dur:.4});
  },
  start:t=>{
    tone(t,{f:440,type:'triangle',vol:.2,dur:.12});
    tone(t+.09,{f:660,type:'triangle',vol:.22,dur:.2});
  },
  done:t=>{
    [523.25,659.25,783.99,1046.5].forEach((f,i)=>{
      const d=i===3?.55:.22;
      tone(t+i*.09,{f,vol:.2,dur:d});
      tone(t+i*.09,{f:f*2,vol:.05,dur:d*.8});
    });
  },
  select:t=>{
    tone(t,{f:1100,f2:900,vol:.12,dur:.035});
    noise(t,{vol:.1,dur:.02,f:3000,q:1});
  },
  tick:t=>{
    tone(t,{f:620,f2:480,type:'triangle',vol:.14,dur:.05});
    noise(t,{vol:.08,dur:.02,f:2400,q:1});
  },
  click:t=>{
    noise(t,{vol:.18,dur:.02,f:2800,q:1.2});
    tone(t,{f:700,f2:520,vol:.1,dur:.03});
  },
  on:t=>{
    tone(t,{f:520,f2:780,vol:.16,dur:.07});
    tone(t+.05,{f:780,f2:1040,vol:.12,dur:.08});
  },
  off:t=>{
    tone(t,{f:780,f2:520,vol:.16,dur:.07});
    tone(t+.05,{f:520,f2:360,vol:.12,dur:.08});
  },
  error:t=>{
    tone(t,{f:180,f2:140,type:'triangle',vol:.3,dur:.12});
    tone(t+.13,{f:160,f2:120,type:'triangle',vol:.3,dur:.16});
  },
};

/* Play a named sound. Silent until the first user gesture, when muted, or when nothing can play.
   Names with a file play that file; if it can't load, the synthesised version plays instead. */
function synth(name){
  const fn=SOUNDS[name];if(!fn)return;
  const c=ac();if(!c)return;
  if(c.state==='suspended')c.resume().catch(()=>{});
  try{fn(c.currentTime+.005)}catch(e){}
}
function fire(name){
  const now=performance.now();
  if(now-(last[name]||0)<18)return;                    // holding an arrow key must not stack identical sounds
  last[name]=now;
  const file=FILE_OF[name];
  if(file&&playFile(file,()=>synth(name)))return;
  synth(name);
}
export function sfx(name,delay=0){
  if(!ST.on||!armed)return;
  if(delay>0){setTimeout(()=>{if(ST.on)fire(name)},delay*1000);return}
  fire(name);
}

/* The sound for one move, worked out from its SAN ("Nxe5+", "O-O", "e8=Q#") and the position after it.
   One sound per move, most important first: checkmate / stalemate / draw > check > promotion > castling > capture > move. */
export function moveSfx(san,fenAfter){
  const s=san||'';let n=null;
  if(s.endsWith('#'))n='mate';
  else if(fenAfter){
    try{const c=new Chess(fenAfter);if(c.game_over()&&!c.in_checkmate())n='draw'}catch(e){}
  }
  if(!n)n=s.endsWith('+')?'check':s.includes('=')?'promote':/^O-O/.test(s)?'castle':s.includes('x')?'capture':'move';
  sfx(n);
}

/* ---------- Setup: unlock, UI sounds, settings controls ---------- */
const NAV=new Set(['bStart','bPrev','bNext','bEnd']);     // the board-navigation buttons play move sounds instead of a click
function setOn(on,quiet){
  ST.on=!!on;save();paint();
  if(!quiet&&ST.on)sfx('on');
}
function setVol(v){
  ST.vol=Math.max(0,Math.min(1,v));save();paint();
  if(master)master.gain.setTargetAtTime(gainOf(ST.vol),ctx.currentTime,.01);
}
function paint(){
  const b=$('bSound'),sw=$('chkSound'),rg=$('rngVol');
  if(b){setBtn(b,ST.on?'volume':'volume-x');b.setAttribute('aria-pressed',String(ST.on));b.title='Sound effects '+(ST.on?'on':'off')+' (M)'}
  if(sw)sw.checked=ST.on;
  if(rg){rg.value=Math.round(ST.vol*100);rg.style.setProperty('--v',rg.value+'%');rg.disabled=!ST.on}
}
export function initSound(){
  load();
  Object.keys(URLS).forEach(audioFor);          // start fetching the files right away
  const unlock=()=>{
    armed=true;
    const c=ac();if(c&&c.state==='suspended')c.resume().catch(()=>{});
    if(c&&c.state==='running')['pointerdown','touchend','click','keydown'].forEach(ev=>removeEventListener(ev,unlock,true));
  };
  ['pointerdown','touchend','click','keydown'].forEach(ev=>addEventListener(ev,unlock,true));

  const b=$('bSound'),sw=$('chkSound'),rg=$('rngVol');
  if(b)b.onclick=()=>setOn(!ST.on,true);               // the generic click below confirms "on" audibly
  if(sw)sw.onchange=()=>setOn(sw.checked,true);        // ...and the generic switch sound does the same here
  if(rg){
    rg.oninput=()=>setVol(+rg.value/100);
    rg.onchange=()=>sfx('move');                       // let the person hear the new level
  }
  paint();

  document.addEventListener('click',e=>{
    const t=e.target.closest&&e.target.closest('button');
    if(!t||t.disabled||NAV.has(t.id)||t.closest('#ctx'))return;
    sfx('click');
  });
  document.addEventListener('change',e=>{
    const t=e.target;if(!t||!t.matches)return;
    if(t.matches('input.switch'))sfx(t.checked?'on':'off');
    else if(t.matches('select'))sfx('click');
  });
  document.addEventListener('keydown',e=>{
    if((e.key==='m'||e.key==='M')&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!/^(INPUT|TEXTAREA|SELECT)$/.test((e.target&&e.target.tagName)||'')){
      setOn(!ST.on);
    }
  });
}
