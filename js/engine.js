import {S} from './state.js';
import {$,setStatus} from './util.js';
import {SF,MULTIPV} from './config.js';

/* a worker error, with the file and line, so a syntax error says which script it came from */
const errText=ev=>{
  if(!ev)return'worker error';
  const f=(ev.filename||'').split('/').slice(-2).join('/');
  return(ev.message||'worker error')+(f?` [${f}:${ev.lineno||0}]`:'');
};
export const POOL=[];
export const ENG={probe:null,found:null,fetching:{}};
const isolated=()=>typeof crossOriginIsolated!=='undefined'&&crossOriginIsolated;
const exists=async u=>{try{return(await fetch(u,{method:'HEAD'})).ok}catch(e){return false}};
/* Which Stockfish files exist in engine/ ? Checked once: {version: {threaded, single}} (a build counts when both its .js and .wasm are there). */
export const findLocal=()=>ENG.found||(ENG.found=Promise.all(SF.versions.map(async v=>{
  const has=async f=>(await exists(SF.dir+f))&&(await exists(SF.dir+f.replace(/\.js$/,'.wasm')));
  const [threaded,single]=await Promise.all([has(SF.lite(v)),has(SF.single(v))]);
  return[v,{threaded,single}];
})).then(Object.fromEntries));
function getWasm(v){   // CDN fallback (only versions listed in SF.cdn): download the single-thread .wasm once, shared by every worker
  const c=SF.cdn[v];if(!c)return Promise.reject(new Error('no CDN copy of Stockfish '+v));
  return ENG.fetching[v]||(ENG.fetching[v]=(async()=>{
    for(const base of c.bases){
      try{const r=await fetch(base+c.name+'.wasm');if(r.ok)return{base,bytes:await r.arrayBuffer(),name:c.name}}catch(e){}
    }
    throw new Error('could not download it');
  })().catch(e=>{ENG.fetching[v]=null;throw e}));
}
// Does the app currently expect a threaded engine? Then one worker with several threads beats several single-thread workers.
export const threadedLikely=()=>isolated()&&!!ENG.foundNow&&!!(ENG.foundNow[SF.ver]&&ENG.foundNow[SF.ver].threaded);
export class Engine{
  constructor(){
    this.busy=null;this.pending=null;this.ready=false;this.uci=false;this.failed=null;this.dead=false;this.label='';this.w=null;
    this.cfg={threads:1,hash:16};
    this.readyP=new Promise(r=>{this._ready=r});
    this.boot();
  }
  async boot(){
    if(ENG.probe)await ENG.probe.catch(()=>{});          // workers created together wait for the first one's verdict
    if(this.dead)return;
    const p=this.bootWasm();if(!ENG.probe)ENG.probe=p;
    try{await p}
    catch(e){
      if(this.dead)return;
      this.drop();
      setStatus('Stockfish '+SF.ver+' could not start ('+((e&&e.message)||e)+').');
    }
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
    const v=SF.ver,found=await findLocal();ENG.foundNow=found;
    const f=found[v]||{},plan=[];
    if(isolated()&&f.threaded)plan.push({kind:'local',file:SF.lite(v),label:'Stockfish '+v+' lite',threads:true,hash:SF.hash.lite,ms:SF.timeout.lite});
    if(f.single)plan.push({kind:'local',file:SF.single(v),label:'Stockfish '+v+' lite',threads:false,hash:SF.hash.single,ms:SF.timeout.single});
    if(SF.cdn[v])plan.push({kind:'cdn',label:'Stockfish '+v+' lite',threads:false,hash:SF.hash.single,ms:SF.timeout.single});
    if(!plan.length)throw new Error('engine/'+SF.lite(v)+' was not found');
    let last;
    for(const c of plan){
      if(this.dead)return;
      try{
        this.cfg={threads:c.threads?this.threadsFor():1,hash:c.hash};
        const ok=c.kind==='local'?await this.startLocal(c):await this.startCdn(c,v);
        if(ok===false)return;
        this.label=c.label+(this.cfg.threads>1?` · ${this.cfg.threads} threads`:'');
        return;
      }catch(e){last=e;console.warn('['+c.label+'] failed:',e&&e.message);this.drop()}
    }
    throw last||new Error('no engine could start');
  }
  // Self-hosted engine (engine/ next to index.html): a real same-origin Worker, so the build can start its own threads.
  async startLocal(c){
    setStatus(`Loading ${c.label}…`);
    const w=new Worker(SF.dir+c.file);
    this.attach(w);this.label=c.label;
    w.onerror=ev=>{this.failed=errText(ev);if(ev&&ev.preventDefault)ev.preventDefault()};
    return this.waitReady(c.ms);
  }
  // CDN engine (single thread): cross-origin scripts can't be Workers, so a blob worker imports it and is handed the .wasm bytes.
  async startCdn(c,v){
    setStatus('Loading '+c.label+'…');
    const {base,bytes,name}=await getWasm(v);
    if(this.dead)return false;
    const code='self.onmessage=function(e){var d=e.data;if(!d||!d.__init||self.__go)return;self.__go=1;'+
      'self.Module={wasmBinary:d.wasm,locateFile:function(p){return d.base+p}};importScripts(d.base+d.js)};';
    const url=URL.createObjectURL(new Blob([code],{type:'application/javascript'}));
    let w;
    try{w=new Worker(url+'#'+base+name+'.wasm')}catch(e){w=new Worker(url)}   // some builds read the .wasm location from the hash
    this.attach(w);this.label=c.label;
    w.onerror=ev=>{this.failed=errText(ev);if(ev&&ev.preventDefault)ev.preventDefault()};
    const copy=bytes.slice(0);
    w.postMessage({__init:1,wasm:copy,base,js:name+'.js'},[copy]);
    return this.waitReady(c.ms);
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
