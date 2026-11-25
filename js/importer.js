import {S} from './state.js';
import {listSaved,deleteSaved,openSaved} from './saved.js';
import {$} from './util.js';
import {POOL} from './engine.js';
import {loadPgn} from './pgn.js';
import {analyze} from './analysis.js';
import {render} from './ui/board.js';

/* ---------- Import from Lichess / Chess.com ----------
   Both APIs are public and send CORS headers, so no API key is needed.
   (A Lichess token would only be needed for private games or higher rate limits.) */
const PAGE=15,KEEP=150;                                  // games per click, and how many are kept in the browser per site

async function lichessGames(user,cursor){
  const until=cursor&&cursor.until?`&until=${cursor.until}`:'';
  const r=await fetch(`https://lichess.org/api/games/user/${encodeURIComponent(user)}?max=${PAGE}&pgnInJson=true&clocks=true${until}`,{headers:{Accept:'application/x-ndjson'}});
  if(r.status===404)throw new Error('Lichess user not found.');
  if(!r.ok)throw new Error('Lichess returned '+r.status+'.');
  const games=(await r.text()).split('\n').filter(Boolean).map(l=>JSON.parse(l)).map(g=>({
    pgn:g.pgn,
    white:(g.players.white.user&&g.players.white.user.name)||'Anonymous',wr:g.players.white.rating,
    black:(g.players.black.user&&g.players.black.user.name)||'Anonymous',br:g.players.black.rating,
    result:g.winner?(g.winner==='white'?'1-0':'0-1'):'½-½',kind:g.speed,date:g.createdAt}));
  const last=games[games.length-1];
  return{games,cursor:{until:last?last.date-1:0},more:games.length>=PAGE};     // next page: everything older than the oldest one so far
}
async function lichessById(id){
  const r=await fetch(`https://lichess.org/game/export/${id}?clocks=true`);
  if(!r.ok)throw new Error('Lichess game not found.');
  return r.text();
}
/* Chess.com only lists monthly archives (newest last). The cursor is {archives, ai: which month, skip: games already taken from it}. */
async function chesscomGames(user,cursor){
  let archives,ai=0,skip=0;
  if(cursor&&cursor.archives){({archives,ai,skip}=cursor)}
  else{
    const ar=await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(user.toLowerCase())}/games/archives`);
    if(ar.status===404)throw new Error('Chess.com user not found.');
    if(!ar.ok)throw new Error('Chess.com returned '+ar.status+'.');
    archives=(await ar.json()).archives.slice().reverse();               // newest month first
  }
  const out=[];
  while(out.length<PAGE&&ai<archives.length){
    const r=await fetch(archives[ai]);
    if(!r.ok){ai++;skip=0;continue}
    const list=(await r.json()).games.filter(g=>g.pgn).reverse();
    const take=list.slice(skip,skip+PAGE-out.length);
    take.forEach(g=>out.push({pgn:g.pgn,white:g.white.username,wr:g.white.rating,black:g.black.username,br:g.black.rating,
      result:g.white.result==='win'?'1-0':g.black.result==='win'?'0-1':'½-½',kind:g.time_class,date:g.end_time*1000}));
    skip+=take.length;
    if(skip>=list.length){ai++;skip=0}
  }
  return{games:out,cursor:{archives,ai,skip},more:ai<archives.length};
}
const FETCH={lichess:lichessGames,chesscom:chesscomGames};

/* ---------- Saved lists ----------
   The fetched game lists (and the PGN box) are kept in the browser's localStorage so they are still there when the visitor comes back.
   (Real cookies are limited to ~4 KB and are sent with every request, far too small for PGNs.) */
const CACHE='chess.impCache',DRAFT='chess.pgnDraft';
function readCache(){try{return JSON.parse(localStorage.getItem(CACHE)||'{}')||{}}catch(e){return{}}}
function writeCache(c){
  try{localStorage.setItem(CACHE,JSON.stringify(c))}
  catch(e){                                                  // storage full: keep fewer games and retry once
    try{Object.values(c).forEach(v=>{if(v&&v.games)v.games=v.games.slice(0,40)});localStorage.setItem(CACHE,JSON.stringify(c))}catch(e2){}
  }
}

let loadTok=0;
async function loadAndAnalyze(pgn,user,white){
  const t=++loadTok;                                    // only the most recent click may start an analysis
  $('pgn').value=pgn.trim();
  if(!loadPgn())return;
  S.flip=!!(user&&white&&white.toLowerCase()!==user.toLowerCase());render();
  if(POOL[0])await POOL[0].readyP;                      // a big engine may still be loading
  if(t!==loadTok)return;
  analyze();
}

const HINT={
  lichess:{ph:'Lichess username or game link',msg:'No API key needed. Lists the latest games (with a Load more button), or paste a game link.'},
  chesscom:{ph:'Chess.com username',msg:'No API key needed. Lists the latest games (with a Load more button).'},
};
export function initImport(){
  const msg=t=>{$('impMsg').textContent=t};
  let src='pgn',cur=null;                                   // cur = {user, games, cursor, more} for the visible site list
  function show(){
    $('impList').replaceChildren();
    if(!cur)return;
    const me=cur.user.toLowerCase();
    cur.games.forEach(g=>{
      const isW=g.white.toLowerCase()===me,isB=g.black.toLowerCase()===me;
      const won=(isW&&g.result==='1-0')||(isB&&g.result==='0-1'),lost=(isW&&g.result==='0-1')||(isB&&g.result==='1-0');
      const b=document.createElement('button');b.type='button';b.className='imp-g'+(won?' win':lost?' loss':'');
      const l=document.createElement('span'),r=document.createElement('small');
      l.textContent=`${g.white} (${g.wr||'?'}) vs ${g.black} (${g.br||'?'}) `;
      const res=document.createElement('b');res.textContent=g.result;l.appendChild(res);
      r.textContent=`${g.kind} · ${new Date(g.date).toLocaleDateString()}`;
      b.append(l,r);
      b.onclick=()=>{msg('Loaded. Analyzing…');loadAndAnalyze(g.pgn,cur.user,g.white)};
      $('impList').appendChild(b);
    });
    $('impMore').hidden=!(cur.more&&cur.games.length);
  }
  function save(){const c=readCache();if(cur){c[src]={user:cur.user,games:cur.games.slice(0,KEEP),cursor:cur.cursor,more:cur.more&&cur.games.length<KEEP}}writeCache(c)}
  function restore(){
    const c=readCache()[src];
    cur=c&&c.games&&c.games.length?c:null;
    if(cur){
      try{if(!$('impUser').value)$('impUser').value=cur.user}catch(e){}
      show();msg(`${cur.games.length} saved games for ${cur.user}. Pick one, or load more.`);
    }else{$('impMore').hidden=true;$('impList').replaceChildren();msg(HINT[src].msg)}
  }
  /* Saved analyses: finished games kept in the browser, reopened instantly without searching again */
  function showSaved(){
    const box=$('savedList');box.replaceChildren();
    const list=listSaved();
    $('savedMsg').textContent=list.length?`${list.length} saved ${list.length===1?'analysis':'analyses'}. Open one to see it again without re-analyzing.`:'Nothing saved yet. Finished analyses show up here.';
    list.forEach(e=>{
      const b=document.createElement('div');b.className='imp-g saved';b.tabIndex=0;b.setAttribute('role','button');
      const l=document.createElement('span'),r=document.createElement('small'),x=document.createElement('button');
      l.textContent=`${e.white}${e.wr?' ('+e.wr+')':''} vs ${e.black}${e.br?' ('+e.br+')':''} `;
      const res=document.createElement('b');res.textContent=e.result;l.appendChild(res);
      const acc=e.acc&&e.acc[0]!=null&&e.acc[1]!=null?` · ${e.acc[0].toFixed(0)}% / ${e.acc[1].toFixed(0)}% acc.`:'';
      r.textContent=`${e.n} moves · depth ${e.depth}${acc} · ${new Date(e.date).toLocaleDateString()}`;
      x.type='button';x.className='sv-del';x.textContent='×';x.title='Delete this saved analysis';x.setAttribute('aria-label','Delete');
      x.onclick=ev=>{ev.stopPropagation();deleteSaved(e.id);showSaved()};
      const open=()=>{if(!openSaved(e.id)){$('savedMsg').textContent='Could not open that analysis.'}};
      b.onclick=open;b.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();open()}};
      const t=document.createElement('div');t.className='sv-t';t.append(l,r);b.append(t,x);box.appendChild(b);
    });
  }
  function pick(s){
    src=s;
    document.querySelectorAll('#importCard .tab').forEach(b=>{const on=b.dataset.src===s;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});
    $('importCard').querySelector('[data-pane=pgn]').hidden=s!=='pgn';
    $('importCard').querySelector('[data-pane=site]').hidden=!HINT[s];
    $('importCard').querySelector('[data-pane=saved]').hidden=s!=='saved';
    if(HINT[s]){$('impUser').placeholder=HINT[s].ph;restore()}
    if(s==='saved')showSaved();
    try{localStorage.setItem('chess.impSrc',s)}catch(e){}
  }
  document.querySelectorAll('#importCard .tab').forEach(b=>b.onclick=()=>pick(b.dataset.src));
  try{
    $('impUser').value=localStorage.getItem('chess.impUser')||'';
    const d=localStorage.getItem(DRAFT);if(d&&!$('pgn').value.trim())$('pgn').value=d;
    const s=localStorage.getItem('chess.impSrc');if(s&&(HINT[s]||s==='saved'))pick(s);else pick('pgn');
  }catch(e){pick('pgn')}
  $('pgn').addEventListener('input',()=>{try{localStorage.setItem(DRAFT,$('pgn').value)}catch(e){}});

  async function go(){
    const raw=$('impUser').value.trim();
    if(!raw){msg('Enter a username first.');return}
    try{localStorage.setItem('chess.impUser',raw)}catch(e){}
    const link=raw.match(/lichess\.org\/(?:game\/export\/)?([A-Za-z0-9]{8})/);
    $('impGo').disabled=true;$('impMore').disabled=true;msg('Loading…');
    try{
      if(link){await loadAndAnalyze(await lichessById(link[1]));msg('Game loaded.');return}
      const r=await FETCH[src](raw);
      if(!r.games.length){cur=null;show();msg('No games found for '+raw+'.');return}
      cur={user:raw,games:r.games,cursor:r.cursor,more:r.more};
      show();save();msg('Pick a game to analyze.');
    }catch(e){msg((e&&e.message)||'Could not load games.')}
    finally{$('impGo').disabled=false;$('impMore').disabled=false}
  }
  async function more(){
    if(!cur||!cur.more)return;
    $('impGo').disabled=true;$('impMore').disabled=true;const was=$('impMore').textContent;$('impMore').textContent='Loading…';
    try{
      const r=await FETCH[src](cur.user,cur.cursor);
      const seen=new Set(cur.games.map(g=>g.pgn));
      cur.games=cur.games.concat(r.games.filter(g=>!seen.has(g.pgn)));
      cur.cursor=r.cursor;cur.more=r.more&&r.games.length>0;
      show();save();msg(`${cur.games.length} games${cur.more?'':' (that is all of them)'}. Pick one to analyze.`);
    }catch(e){msg((e&&e.message)||'Could not load more games.')}
    finally{$('impGo').disabled=false;$('impMore').disabled=false;$('impMore').textContent=was}
  }
  $('impGo').onclick=go;
  $('impMore').onclick=more;
  $('impUser').onkeydown=e=>{if(e.key==='Enter')go()};
}
