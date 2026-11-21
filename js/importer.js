import {S} from './state.js';
import {$} from './util.js';
import {POOL} from './engine.js';
import {loadPgn} from './pgn.js';
import {analyze} from './analysis.js';
import {render} from './ui/board.js';

/* ---------- Import from Lichess / Chess.com ----------
   Both APIs are public and send CORS headers, so no API key is needed.
   (A Lichess token would only be needed for private games or higher rate limits.) */
const MAX=15;

async function lichessGames(user){
  const r=await fetch(`https://lichess.org/api/games/user/${encodeURIComponent(user)}?max=${MAX}&pgnInJson=true&clocks=false`,{headers:{Accept:'application/x-ndjson'}});
  if(r.status===404)throw new Error('Lichess user not found.');
  if(!r.ok)throw new Error('Lichess returned '+r.status+'.');
  return(await r.text()).split('\n').filter(Boolean).map(l=>JSON.parse(l)).map(g=>({
    pgn:g.pgn,
    white:(g.players.white.user&&g.players.white.user.name)||'Anonymous',wr:g.players.white.rating,
    black:(g.players.black.user&&g.players.black.user.name)||'Anonymous',br:g.players.black.rating,
    result:g.winner?(g.winner==='white'?'1-0':'0-1'):'½-½',kind:g.speed,date:g.createdAt}));
}
async function lichessById(id){
  const r=await fetch(`https://lichess.org/game/export/${id}?clocks=false`);
  if(!r.ok)throw new Error('Lichess game not found.');
  return r.text();
}
async function chesscomGames(user){
  const ar=await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(user.toLowerCase())}/games/archives`);
  if(ar.status===404)throw new Error('Chess.com user not found.');
  if(!ar.ok)throw new Error('Chess.com returned '+ar.status+'.');
  const archives=(await ar.json()).archives.slice().reverse(),out=[];   // newest month first
  for(const url of archives){
    if(out.length>=MAX)break;
    const r=await fetch(url);if(!r.ok)continue;
    for(const g of(await r.json()).games.slice().reverse()){
      if(!g.pgn)continue;
      out.push({pgn:g.pgn,white:g.white.username,wr:g.white.rating,black:g.black.username,br:g.black.rating,
        result:g.white.result==='win'?'1-0':g.black.result==='win'?'0-1':'½-½',kind:g.time_class,date:g.end_time*1000});
      if(out.length>=MAX)break;
    }
  }
  return out;
}

async function loadAndAnalyze(pgn,user,white){
  $('pgn').value=pgn.trim();
  if(!loadPgn())return;
  S.flip=!!(user&&white&&white.toLowerCase()!==user.toLowerCase());render();
  if(POOL[0])await POOL[0].readyP;                      // a big engine may still be loading
  analyze();
}

const HINT={
  lichess:{ph:'Lichess username or game link',msg:'No API key needed. Lists the 15 latest games, or paste a game link.'},
  chesscom:{ph:'Chess.com username',msg:'No API key needed. Lists the 15 latest games.'},
};
export function initImport(){
  const msg=t=>{$('impMsg').textContent=t};
  let src='pgn';
  function pick(s){
    src=s;
    document.querySelectorAll('#importCard .tab').forEach(b=>{const on=b.dataset.src===s;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});
    $('importCard').querySelector('[data-pane=pgn]').hidden=s!=='pgn';
    $('importCard').querySelector('[data-pane=site]').hidden=s==='pgn';
    if(s!=='pgn'){$('impUser').placeholder=HINT[s].ph;msg(HINT[s].msg);$('impList').replaceChildren()}
    try{localStorage.setItem('chess.impSrc',s)}catch(e){}
  }
  document.querySelectorAll('#importCard .tab').forEach(b=>b.onclick=()=>pick(b.dataset.src));
  try{$('impUser').value=localStorage.getItem('chess.impUser')||'';const s=localStorage.getItem('chess.impSrc');if(s&&s!=='pgn'&&HINT[s])pick(s);else pick('pgn')}catch(e){pick('pgn')}
  async function go(){
    const raw=$('impUser').value.trim();
    if(!raw){msg('Enter a username first.');return}
    try{localStorage.setItem('chess.impUser',raw)}catch(e){}
    $('impList').replaceChildren();
    const link=raw.match(/lichess\.org\/(?:game\/export\/)?([A-Za-z0-9]{8})/);
    $('impGo').disabled=true;msg('Loading…');
    try{
      if(link){await loadAndAnalyze(await lichessById(link[1]));msg('Game loaded.');return}
      const games=src==='lichess'?await lichessGames(raw):await chesscomGames(raw);
      if(!games.length){msg('No games found for '+raw+'.');return}
      msg('Pick a game to analyze.');
      games.forEach(g=>{
        const me=raw.toLowerCase(),isW=g.white.toLowerCase()===me,isB=g.black.toLowerCase()===me;
        const won=(isW&&g.result==='1-0')||(isB&&g.result==='0-1'),lost=(isW&&g.result==='0-1')||(isB&&g.result==='1-0');
        const b=document.createElement('button');b.type='button';b.className='imp-g'+(won?' win':lost?' loss':'');
        const l=document.createElement('span'),r=document.createElement('small');
        l.textContent=`${g.white} (${g.wr||'?'}) vs ${g.black} (${g.br||'?'}) `;
        const res=document.createElement('b');res.textContent=g.result;l.appendChild(res);
        r.textContent=`${g.kind} · ${new Date(g.date).toLocaleDateString()}`;
        b.append(l,r);
        b.onclick=()=>{msg('Loaded. Analyzing…');loadAndAnalyze(g.pgn,raw,g.white)};
        $('impList').appendChild(b);
      });
    }catch(e){msg((e&&e.message)||'Could not load games.')}
    finally{$('impGo').disabled=false}
  }
  $('impGo').onclick=go;
  $('impUser').onkeydown=e=>{if(e.key==='Enter')go()};
}
