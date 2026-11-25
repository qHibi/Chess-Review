import {$} from './util.js';
import {CFG,SF} from './config.js';
import {findLocal} from './engine.js';
import {setBtn} from './ui/svg.js';
import {CP} from './ui/picker.js';
import {FX,setFx} from './ui/fx.js';
import {render} from './ui/board.js';
import {JOKES,jokeEnabled,setJoke,loadJokes} from './classification/jokes.js';

/* ---------- Settings dialog: Analysis (presets) and Appearance tabs ----------
   A preset sets the individual controls (which live in the "Custom" section); touching any of those controls switches to Custom. */
const PRESETS={
  fast:  {label:'Fast',   depth:8,  deepen:false, max:16, partial:true,  strict:1, info:'Depth 8, no extra passes. Starts quickly.'},
  normal:{label:'Normal', depth:14, deepen:true,  max:18, partial:true,  strict:1, info:'Depth 14, then the whole game is searched again deeper, up to depth 18 (WebAssembly engine).'},
  deep:  {label:'Deep',   depth:18, deepen:true,  max:24, partial:false, strict:1, info:'Depth 18 on every position, then deeper passes up to depth 24 (WebAssembly engine). Slow, most accurate.'},
};
const KEY='chess.analysis2';           // v2: Fast became the default preset
const IDS=['selDepth','selMax','chkDeepen','chkPartial','selStrict','selWorkers'];
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
    put('selStrict',P.strict,fire);put('selWorkers',0,fire);
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
/* Engine version picker: lists SF.versions, greys out the ones whose files are not in engine/ (checked automatically) */
const VKEY='chess.sfver';
function initVersions(){
  const sel=$('selVersion');if(!sel)return;
  try{const v=localStorage.getItem(VKEY);if(v&&SF.versions.includes(v))SF.ver=v}catch(e){}
  sel.innerHTML='';
  SF.versions.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent='Stockfish '+v;sel.append(o)});
  sel.value=SF.ver;
  sel.addEventListener('change',()=>{SF.ver=sel.value;try{localStorage.setItem(VKEY,SF.ver)}catch(e){}info()});
  let found={};
  const info=()=>{
    const f=found[SF.ver];
    $('verInfo').textContent=!f?'Looking for engine files…':(f.threaded||f.single)?`Stockfish ${SF.ver} lite from engine/${f.threaded?' (multi-threaded where the page allows it)':' (single thread)'}.`
      :SF.cdn[SF.ver]?`engine/${SF.lite(SF.ver)} not found: using the CDN copy (single thread).`:`engine/${SF.lite(SF.ver)} not found. Add stockfish-${SF.ver}-lite.js and .wasm to engine/.`;
  };
  info();
  findLocal().then(r=>{
    found=r;
    [...sel.options].forEach(o=>{const f=r[o.value];const ok=f&&(f.threaded||f.single)||SF.cdn[o.value];o.disabled=!ok;o.textContent='Stockfish '+o.value+(f&&(f.threaded||f.single)?'':SF.cdn[o.value]?' (CDN)':' (not in engine/)')});
    const usable=v=>{const f=r[v];return f&&(f.threaded||f.single)};
    if(!usable(SF.ver)&&!SF.cdn[SF.ver]){const alt=SF.versions.find(usable);if(alt){sel.value=alt;sel.dispatchEvent(new Event('change'))}}
    info();
  });
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
  loadJokes();buildJokes();initVersions();
  $('presetChip').onclick=()=>open('analysis');
  $('bCloseSet').onclick=close;
  document.querySelectorAll('#settings [data-tab]').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
  $('settings').addEventListener('pointerdown',e=>{if(e.target===$('settings'))close()});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!$('settings').hidden&&Date.now()-(CP.closedAt||0)>80)close();
  },true);
}
