import {S} from './state.js';
import {$,setStatus} from './util.js';
import {SF,MULTIPV} from './config.js';

export const POOL=[];
export const ENG={wasmOK:null,probe:null,fetching:null,found:null};
const isolated=()=>typeof crossOriginIsolated!=='undefined'&&crossOriginIsolated;
const exists=async u=>{try{return(await fetch(u,{method:'HEAD'})).ok}catch(e){return false}};
// Which of the self-hosted engine files exist (engine/ next to index.html)? Checked once.
const findLocal=()=>ENG.found||(ENG.found=Promise.all([exists(SF.dir+SF.full),exists(SF.dir+SF.lite)]).then(([full,lite])=>({full,lite})));
function getWasm(){   // CDN fallback: download the single-thread .wasm once, shared by every worker
  return ENG.fetching||(ENG.fetching=(async()=>{
    for(const base of SF.cdn){
      try{const r=await fetch(base+SF.single+'.wasm');if(r.ok)return{base,bytes:await r.arrayBuffer()}}catch(e){}
    }
    throw new Error('could not download it');
  })().catch(e=>{ENG.fetching=null;throw e}));
}
// Does the app currently expect a threaded engine? Then one worker with several threads beats several single-thread workers.
export const threadedLikely=()=>isolated()&&!!ENG.found&&ENG.foundNow&&(ENG.foundNow.full||ENG.foundNow.lite);
export class Engine{
  constructor(){
    this.busy=null;this.pending=null;this.ready=false;this.uci=false;this.failed=null;this.dead=false;this.label='';this.w=null;
    this.cfg={threads:1,hash:16};
    this.readyP=new Promise(r=>{this._ready=r});
    this.boot();
  }
  async boot(){
    if($('selEngine').value!=='asm'){
      if(ENG.probe)await ENG.probe.catch(()=>{});          // workers created together wait for the first one's verdict
      if(this.dead)return;
      if(ENG.wasmOK!==false){
        const p=this.bootWasm();if(!ENG.probe)ENG.probe=p;
        try{await p;return}
        catch(e){
          if(this.dead)return;
          ENG.wasmOK=false;this.drop();
          setStatus('WASM engine could not start ('+((e&&e.message)||e)+'). Using the classic engine…');
        }
      }
    }
    if(!this.dead)this.bootAsm();
  }
  attach(w){this.w=w;w.onmessage=ev=>this.onMsg(typeof ev.data==='string'?ev.data:'')}
  drop(){try{if(this.w)this.w.terminate()}catch(e){}this.w=null;this.busy=null;this.pending=null;this.ready=false;this.uci=false;this.failed=null}
  kill(){this.dead=true;this.drop()}
  // Poll until the engine has finished starting up (keeps asking "uci" until it answers).
  async waitReady(ms){
    const t0=Date.now();
    while(!this.ready){
      if(this.dead)return false;
      if(this.failed)throw new Error(this.failed);
      if(Date.now()-t0>ms)throw new Error('timed out');
      if(!this.uci&&this.w)this.w.postMessage('uci');
      await new Promise(r=>setTimeout(r,400));
    }
    return true;
  }
  threadsFor(){   // share the cores between the workers that are running
    const hw=navigator.hardwareConcurrency||4,n=Math.max(1,POOL.length);
    return Math.max(1,Math.min(SF.maxThreads,Math.floor((hw-1)/n)));
  }
  async bootWasm(){
    const found=await findLocal();ENG.foundNow=found;
    const plan=[];
    if(isolated()){
      if(found.full)plan.push({kind:'local',file:SF.full,label:'Stockfish 19',threads:true,hash:SF.hash.full,ms:SF.timeout.full});
      if(found.lite)plan.push({kind:'local',file:SF.lite,label:'Stockfish 19 lite',threads:true,hash:SF.hash.lite,ms:SF.timeout.lite});
    }
    plan.push({kind:'cdn',label:'Stockfish 19 lite',threads:false,hash:SF.hash.single,ms:SF.timeout.single});
    let last;
    for(const c of plan){
      if(this.dead)return;
      try{
        this.cfg={threads:c.threads?this.threadsFor():1,hash:c.hash};
        const ok=c.kind==='local'?await this.startLocal(c):await this.startCdn(c);
        if(ok===false)return;
        this.label=c.label+(this.cfg.threads>1?` · ${this.cfg.threads} threads`:'');
        ENG.wasmOK=true;return;
      }catch(e){last=e;console.warn('['+c.label+'] failed:',e&&e.message);this.drop()}
    }
    throw last||new Error('no engine could start');
  }
  // Self-hosted engine (engine/ next to index.html): a real same-origin Worker, so the build can start its own threads.
  async startLocal(c){
    setStatus(`Loading ${c.label}… (${c.file.includes('lite')?'small':'large, the first load can take a while'})`);
    const w=new Worker(SF.dir+c.file);
    this.attach(w);this.label=c.label;
    w.onerror=ev=>{this.failed=(ev&&ev.message)||'worker error';if(ev&&ev.preventDefault)ev.preventDefault()};
    return this.waitReady(c.ms);
  }
  // CDN engine (single thread): cross-origin scripts can't be Workers, so a blob worker imports it and is handed the .wasm bytes.
  async startCdn(c){
    setStatus('Loading '+c.label+'…');
    const {base,bytes}=await getWasm();
    if(this.dead)return false;
    const code='self.onmessage=function(e){var d=e.data;if(!d||!d.__init||self.__go)return;self.__go=1;'+
      'self.Module={wasmBinary:d.wasm,locateFile:function(p){return d.base+p}};importScripts(d.base+d.js)};';
    const url=URL.createObjectURL(new Blob([code],{type:'application/javascript'}));
    let w;
    try{w=new Worker(url+'#'+base+SF.single+'.wasm')}catch(e){w=new Worker(url)}   // some builds read the .wasm location from the hash
    this.attach(w);this.label=c.label;
    w.onerror=ev=>{this.failed=(ev&&ev.message)||'worker error';if(ev&&ev.preventDefault)ev.preventDefault()};
    const copy=bytes.slice(0);
    w.postMessage({__init:1,wasm:copy,base,js:SF.single+'.js'},[copy]);
    return this.waitReady(c.ms);
  }
  async bootAsm(){
    let src=SF.asm[SF.asm.length-1];
    for(const u of SF.asm){if(await exists(u)){src=u;break}}
    try{
      const blob=new Blob([`importScripts("${src}");`],{type:'application/javascript'});
      this.attach(new Worker(URL.createObjectURL(blob)));
    }catch(err){setStatus('Engine failed to start: '+err.message);return}
    this.label='classic';this.cfg={threads:1,hash:16};
    this.w.onerror=()=>setStatus('Engine error. Check your connection and reload.');
    this.send('uci');
  }
  send(c){if(this.w)this.w.postMessage(c)}
  onMsg(line){
    if(line==='uciok'&&!this.uci){
      this.uci=true;
      this.send('setoption name MultiPV value '+MULTIPV);
      if(this.cfg.threads>1)this.send('setoption name Threads value '+this.cfg.threads);
      this.send('setoption name Hash value '+this.cfg.hash);
      this.send('isready');
    }else if(line==='readyok'&&!this.ready){
      this.ready=true;this._ready();
      if(!S.batch&&!S.deep&&POOL.every(e=>e.ready))setStatus('Engine ready ('+this.label+(POOL.length>1?`, ${POOL.length} workers`:'')+').');
    }else if(line.startsWith('info')&&line.includes(' pv ')&&this.busy){
      if(/ (lower|upper)bound/.test(line))return;
      const j=this.busy,m=line.match(/multipv (\d+)/),k=m?+m[1]:1;
      const sc=line.match(/score (cp|mate) (-?\d+)/);if(!sc)return;
      const sign=j.turn==='w'?1:-1,raw=+sc[2];
      let v,mate=null;
      if(sc[1]==='mate'){mate=sign*raw;v=(raw>0?1:-1)*sign*(50-Math.min(Math.abs(raw),49))}
      else v=sign*raw/100;
      j.lines[k]={v,mate,pv:line.split(' pv ')[1].trim().split(' '),depth:+(line.match(/depth (\d+)/)||[0,0])[1]};
      if(j.onInfo)j.onInfo(arr(j));
    }else if(line.startsWith('bestmove')&&this.busy){
      const j=this.busy;this.busy=null;
      j.res({lines:arr(j),stopped:j.stopped});
      if(this.pending){const p=this.pending;this.pending=null;this.start(p)}
    }
  }
  halt(){if(this.pending){this.pending.res({lines:[],stopped:true});this.pending=null}if(this.busy){this.busy.stopped=true;this.send('stop')}}
  start(j){this.busy=j;this.send('position fen '+j.fen);this.send('go depth '+j.depth)}
  search(fen,depth,onInfo){
    return new Promise(res=>{
      const j={fen,depth,onInfo,res,lines:{},turn:fen.split(' ')[1],stopped:false};
      if(this.busy){
        if(this.pending)this.pending.res({lines:[],stopped:true});
        this.pending=j;this.busy.stopped=true;this.send('stop');
      }else this.start(j);
    });
  }
}
export const arr=j=>Object.keys(j.lines).sort((a,b)=>a-b).map(k=>j.lines[k]);
export function getPool(n){while(POOL.length<n)POOL.push(new Engine());return POOL.slice(0,n)}
export function workerCount(){
  const v=+$('selWorkers').value;if(v)return v;
  if(threadedLikely())return 1;                          // one threaded engine uses all the cores by itself
  return Math.max(1,Math.min(4,(navigator.hardwareConcurrency||4)-1));
}
export function terminal(fen){
  const c=new Chess(fen);
  if(c.in_checkmate())return[{v:c.turn()==='w'?-50:50,mate:0,pv:[]}];
  if(c.game_over())return[{v:0,mate:null,pv:[]}];
  return null;
}
