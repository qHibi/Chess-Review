import {$} from './util.js';
import {CFG} from './config.js';
import {setBtn} from './ui/svg.js';
import {CP} from './ui/picker.js';

/* ---------- Settings dialog: Analysis (presets) and Appearance tabs ----------
   A preset sets the individual controls (which live in the "Custom" section); touching any of those controls switches to Custom. */
const PRESETS={
  fast:  {label:'Fast',   depth:10, deepen:false, max:16, partial:true,  strict:1, info:'Depth 10. A quick first look, no extra passes.'},
  normal:{label:'Normal', depth:14, deepen:true,  max:18, partial:true,  strict:1, info:'Depth 14, then the whole game is searched again deeper, up to depth 18.'},
  deep:  {label:'Deep',   depth:18, deepen:true,  max:24, partial:false, strict:1, info:'Depth 18 on every position, then deeper passes up to depth 24. Slow, most accurate.'},
};
const KEY='chess.analysis';
const IDS=['selDepth','selMax','chkDeepen','chkPartial','selStrict','selWorkers','selEngine'];
let preset='normal',applying=false;

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

export function initSettings(){
  let saved=null;
  try{saved=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
  if(saved&&saved.vals&&(saved.preset==='custom'||PRESETS[saved.preset])){
    preset=saved.preset;
    if(preset==='custom')IDS.forEach(i=>{if(i in saved.vals)put(i,saved.vals[i],false)});
    else{applyPreset(preset,false)}
    if(saved.vals.selEngine)put('selEngine',saved.vals.selEngine,false);   // the engine type isn't part of a preset
  }else applyPreset('normal',false);
  readCFG();refresh();

  document.querySelectorAll('#presets .preset').forEach(b=>b.onclick=()=>applyPreset(b.dataset.preset));
  IDS.forEach(i=>$(i).addEventListener('change',()=>{
    if(applying)return;
    if(i==='selEngine'){save();return}
    preset='custom';readCFG();refresh();save();
  }));
  $('bSettings').onclick=()=>open('analysis');
  $('presetChip').onclick=()=>open('analysis');
  $('bCloseSet').onclick=close;
  document.querySelectorAll('#settings [data-tab]').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
  $('settings').addEventListener('pointerdown',e=>{if(e.target===$('settings'))close()});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!$('settings').hidden&&Date.now()-(CP.closedAt||0)>80)close();
  },true);
}
