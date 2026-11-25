import {$} from './util.js';
import {CFG} from './config.js';
import {setBtn} from './ui/svg.js';
import {CP} from './ui/picker.js';
import {FX,setFx} from './ui/fx.js';
import {render} from './ui/board.js';
import {JOKES,jokeEnabled,setJoke,loadJokes} from './classification/jokes.js';

/* ---------- Settings dialog: Analysis (presets) and Appearance tabs ----------
   A preset sets the individual controls (which live in the "Custom" section); touching any of those controls switches to Custom. */
const PRESETS={
  fast:  {label:'Fast',   depth:8,  deepen:false, max:16, partial:true,  strict:1, engine:'asm',  info:'Depth 8, no extra passes, classic JavaScript engine. Starts instantly and works everywhere.'},
  normal:{label:'Normal', depth:14, deepen:true,  max:18, partial:true,  strict:1, engine:'auto', info:'Depth 14, then the whole game is searched again deeper, up to depth 18 (WebAssembly engine).'},
  deep:  {label:'Deep',   depth:18, deepen:true,  max:24, partial:false, strict:1, engine:'auto', info:'Depth 18 on every position, then deeper passes up to depth 24 (WebAssembly engine). Slow, most accurate.'},
};
const KEY='chess.analysis2';           // v2: Fast became the default preset
const IDS=['selDepth','selMax','chkDeepen','chkPartial','selStrict','selWorkers','selEngine'];
let preset='fast',applying=false;

const val=id=>{const e=$(id);return e.type==='checkbox'?e.checked:e.value};
function put(id,v,fire){
  const e=$(id),cb=e.type==='checkbox';
  if(cb?e.checked===!!v:String(e.value)===String(v))return;
  if(cb)e.checked=!!v;else e.value=String(v);
  if(fire)e.dispatchEvent(new Event('change'));
}
function readCFG(){
  CFG.depth=+val('selDepth');CFG.maxDepth=+val('selMax');CFG.deepen=val('chkDeepen');CFG.partial=val('chkPartial');CFG.strict=+val('selStrict');
}
function save(){
  try{localStorage.setItem(KEY,JSON.stringify({preset,vals:Object.fromEntries(IDS.map(i=>[i,val(i)]))}))}catch(e){}
}
function refresh(){
  document.querySelectorAll('#presets .preset').forEach(b=>{const on=b.dataset.preset===preset;b.classList.toggle('on',on);b.setAttribute('aria-checked',on)});
  $('advanced').hidden=preset!=='custom';
  const P=PRESETS[preset];
  $('presetInfo').textContent=P?P.info:'Pick every setting yourself.';
  const d=`depth ${CFG.depth}`+(CFG.deepen&&CFG.maxDepth>CFG.depth?` → ${CFG.maxDepth}`:'');
  setBtn($('presetChip'),'sliders',`${P?P.label:'Custom'} · ${d}`);
}
function applyPreset(id,fire=true){
  preset=id;const P=PRESETS[id];
  if(P){
    applying=true;
    put('selDepth',P.depth,fire);put('selMax',P.max,fire);put('chkDeepen',P.deepen,fire);put('chkPartial',P.partial,fire);
    put('selStrict',P.strict,fire);put('selWorkers',0,fire);put('selEngine',P.engine,fire);
    applying=false;
  }
  readCFG();refresh();save();
}

function open(tab){
  $('settings').hidden=false;showTab(tab||'analysis');
}
function close(){$('settings').hidden=true}
function showTab(t){
  document.querySelectorAll('#settings [data-tab]').forEach(b=>{const on=b.dataset.tab===t;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});
  document.querySelectorAll('#settings [data-tabpane]').forEach(p=>{p.hidden=p.dataset.tabpane!==t});
}

/* one switch per registered joke classification, generated from JOKES (default: all off) */
function buildJokes(){
  const box=$('jokeList');if(!box)return;
  box.innerHTML='';
  for(const j of JOKES){
    const row=document.createElement('label'),cb=document.createElement('input');
    cb.type='checkbox';cb.className='switch';cb.checked=jokeEnabled(j.id);
    cb.onchange=()=>{setJoke(j.id,cb.checked);document.dispatchEvent(new CustomEvent('jokes-changed'))};
    row.append(j.label+' ',cb);row.title=j.desc||'';
    box.append(row);
    if(j.desc){const h=document.createElement('div');h.className='hint';h.textContent=j.desc;box.append(h)}
  }
}
export function initSettings(){
  let saved=null;
  try{saved=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
  if(saved&&saved.vals&&(saved.preset==='custom'||PRESETS[saved.preset])){
    preset=saved.preset;
    if(preset==='custom')IDS.forEach(i=>{if(i in saved.vals)put(i,saved.vals[i],false)});
    else{applyPreset(preset,false)}
  }else applyPreset('fast',false);
  readCFG();refresh();

  document.querySelectorAll('#presets .preset').forEach(b=>b.onclick=()=>applyPreset(b.dataset.preset));
  IDS.forEach(i=>$(i).addEventListener('change',()=>{
    if(applying)return;
    preset='custom';readCFG();refresh();save();
  }));
  $('bSettings').onclick=()=>open('analysis');
  $('bSettings2').onclick=()=>open('analysis');
  try{FX.on=localStorage.getItem('chess.fx')!=='0'}catch(e){}
  $('chkFx').checked=FX.on;document.documentElement.classList.toggle('calm',!FX.on);
  $('chkFx').onchange=e=>{setFx(e.target.checked);render()};
  loadJokes();buildJokes();
  $('presetChip').onclick=()=>open('analysis');
  $('bCloseSet').onclick=close;
  document.querySelectorAll('#settings [data-tab]').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
  $('settings').addEventListener('pointerdown',e=>{if(e.target===$('settings'))close()});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!$('settings').hidden&&Date.now()-(CP.closedAt||0)>80)close();
  },true);
}
