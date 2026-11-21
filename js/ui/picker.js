import {$} from '../util.js';

/* ---------- Colour picker: hue/saturation wheel + brightness ---------- */
const hsv2hex=(h,s,v)=>{
  const f=n=>{const k=(n+h/60)%6;return v-v*s*Math.max(0,Math.min(k,4-k,1))};
  return '#'+[f(5),f(3),f(1)].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('');
};
function hex2hsv(hex){
  const n=parseInt(hex.slice(1),16),r=(n>>16)/255,g=((n>>8)&255)/255,b=(n&255)/255;
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;
  if(d){h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;h=(h*60+360)%360}
  return{h,s:mx?d/mx:0,v:mx};
}
export const CP={el:null,h:0,s:0,v:1};
function cpSync(typing){
  const hex=hsv2hex(CP.h,CP.s,CP.v),pop=$('cpop'),W=$('cpWheel').clientWidth||200,c=W/2,a=CP.h*Math.PI/180;
  $('cpKnob').style.left=(c+Math.sin(a)*CP.s*c)+'px';$('cpKnob').style.top=(c-Math.cos(a)*CP.s*c)+'px';
  $('cpWheel').style.setProperty('--dim',1-CP.v);
  $('cpVal').value=Math.round(CP.v*100);$('cpVal').style.setProperty('--top',hsv2hex(CP.h,CP.s,1));
  pop.style.setProperty('--c',hex);if(!typing)$('cpHex').value=hex;
  if(CP.el){CP.el.value=hex;if(CP.el.oninput)CP.el.oninput({target:CP.el})}
}
function closePicker(){if(!$('cpop').hidden)CP.closedAt=Date.now();$('cpop').hidden=true;CP.el=null}
function openPicker(el){
  const pop=$('cpop');
  if(CP.el===el&&!pop.hidden){closePicker();return}
  Object.assign(CP,hex2hsv(el.value||'#ffffff'));CP.el=null;   // don't write back while we position things
  pop.hidden=false;
  const r=el.getBoundingClientRect(),w=pop.offsetWidth,h=pop.offsetHeight;
  pop.style.left=Math.max(8,Math.min(r.left,innerWidth-w-8))+'px';
  pop.style.top=Math.max(8,r.bottom+8+h>innerHeight-8?r.top-h-8:r.bottom+8)+'px';
  CP.el=el;
  const W=$('cpWheel').clientWidth,c=W/2,a=CP.h*Math.PI/180;
  $('cpKnob').style.left=(c+Math.sin(a)*CP.s*c)+'px';$('cpKnob').style.top=(c-Math.cos(a)*CP.s*c)+'px';
  $('cpWheel').style.setProperty('--dim',1-CP.v);$('cpVal').value=Math.round(CP.v*100);$('cpVal').style.setProperty('--top',hsv2hex(CP.h,CP.s,1));
  pop.style.setProperty('--c',el.value);$('cpHex').value=el.value;
}
export function attachPicker(id){
  const el=$(id);let val='#ffffff';
  Object.defineProperty(el,'value',{get:()=>val,set:v=>{val=v;el.style.setProperty('--c',v)},configurable:true});
  el.onclick=e=>{e.preventDefault();openPicker(el)};
}
(function(){
  const wheel=$('cpWheel');
  const pick=e=>{
    const r=wheel.getBoundingClientRect(),c=r.width/2,dx=e.clientX-r.left-c,dy=e.clientY-r.top-c;
    CP.s=Math.min(1,Math.hypot(dx,dy)/c);CP.h=(Math.atan2(dx,-dy)*180/Math.PI+360)%360;cpSync();
  };
  wheel.onpointerdown=e=>{wheel.setPointerCapture(e.pointerId);pick(e);wheel.onpointermove=pick};
  wheel.onpointerup=wheel.onpointercancel=()=>{wheel.onpointermove=null};
  $('cpVal').oninput=e=>{CP.v=+e.target.value/100;cpSync()};
  $('cpHex').oninput=e=>{
    let t=e.target.value.trim();if(t[0]!=='#')t='#'+t;
    if(/^#[0-9a-f]{6}$/i.test(t)){Object.assign(CP,hex2hsv(t.toLowerCase()));cpSync(true)}
  };
  $('cpDone').onclick=closePicker;
  document.addEventListener('pointerdown',e=>{if(!$('cpop').hidden&&!e.target.closest('#cpop')&&!e.target.closest('.cp'))closePicker()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closePicker()},true);
  addEventListener('resize',closePicker);
})();
