import {$} from './util.js';
import {PIECE,PIECE_URL} from './config.js';
import {render} from './ui/board.js';
import {attachPicker} from './ui/picker.js';

/* ---------- Appearance: site theme, board colours, pieces, border ---------- */
export function labelColor(hex){ // legible coordinate colour for a square colour
  const n=parseInt(hex.slice(1),16),f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};
  const L=.2126*f(n>>16)+.7152*f((n>>8)&255)+.0722*f(n&255);
  return L>.4?'rgba(0,0,0,.55)':'rgba(255,255,255,.75)';
}
export const lumOf=hex=>{const n=parseInt(hex.slice(1),16),f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(n>>16)+.7152*f((n>>8)&255)+.0722*f(n&255)};
export const SITE={
  dark:    {label:'Dark',     bg:'#1d2127',panel:'#272c34',line:'#363c46',text:'#eceff3',mute:'#9aa3b0',input:'#1b1f25',accent:'#F0C93F',scheme:'dark'},
  light:   {label:'Light',    bg:'#eceff3',panel:'#ffffff',line:'#d6dbe3',text:'#1d2127',mute:'#5d6673',input:'#f3f5f8',accent:'#C99700',scheme:'light'},
  midnight:{label:'Midnight', bg:'#0d1117',panel:'#161b22',line:'#30363d',text:'#e6edf3',mute:'#8b949e',input:'#0d1117',accent:'#58a6ff',scheme:'dark'},
  amoled:  {label:'Black',    bg:'#000000',panel:'#101012',line:'#27272b',text:'#f2f2f2',mute:'#8b8b92',input:'#000000',accent:'#ff9f1a',scheme:'dark'},
  forest:  {label:'Forest',   bg:'#16201a',panel:'#1f2d25',line:'#2f4438',text:'#e8f1ea',mute:'#93aa99',input:'#16201a',accent:'#6fcf7f',scheme:'dark'},
  ocean:   {label:'Ocean',    bg:'#0b1e2d',panel:'#11304a',line:'#1f4a6b',text:'#e3f1fb',mute:'#8fb2cc',input:'#0a1a27',accent:'#2fc4b2',scheme:'dark'},
  nord:    {label:'Nord',     bg:'#2e3440',panel:'#3b4252',line:'#4c566a',text:'#eceff4',mute:'#a3adbf',input:'#2b303b',accent:'#88c0d0',scheme:'dark'},
  dracula: {label:'Dracula',  bg:'#1e1f29',panel:'#282a36',line:'#44475a',text:'#f8f8f2',mute:'#9aa0b9',input:'#1b1c25',accent:'#bd93f9',scheme:'dark'},
  solar:   {label:'Solarized',bg:'#002b36',panel:'#073642',line:'#11485a',text:'#eee8d5',mute:'#93a1a1',input:'#00222b',accent:'#b58900',scheme:'dark'},
  sepia:   {label:'Sepia',    bg:'#efe6d4',panel:'#f8f1e1',line:'#dccfb4',text:'#3a2f20',mute:'#7a6a52',input:'#fcf7ea',accent:'#b0742a',scheme:'light'},
  rose:    {label:'Rose',     bg:'#fbeef0',panel:'#ffffff',line:'#f0d4d9',text:'#3a1f26',mute:'#8a5a66',input:'#fff6f7',accent:'#d6456b',scheme:'light'},
  mint:    {label:'Mint',     bg:'#e9f5ee',panel:'#ffffff',line:'#cfe6d8',text:'#17332a',mute:'#52725f',input:'#f4fbf7',accent:'#2e9e6b',scheme:'light'}
};
export const THEMES={   // board colours
  yellow: {label:'Yellow',light:'#FFFDF5',dark:'#F0C93F'},
  red:    {label:'Red',   light:'#FFE8DF',dark:'#D8392B'},
  orange: {label:'Orange',light:'#FFF1DC',dark:'#E9923A'},
  green:  {label:'Green', light:'#EAF6DE',dark:'#4FA65A'},
  mint:   {label:'Mint',  light:'#E9FBEF',dark:'#5CBF8A'},
  teal:   {label:'Teal',  light:'#E0F4F2',dark:'#2F9E94'},
  blue:   {label:'Blue',  light:'#E6F0FF',dark:'#3C78D8'},
  ice:    {label:'Ice',   light:'#EAF4FB',dark:'#7FA6C9'},
  purple: {label:'Purple',light:'#EFE7FA',dark:'#7C5CD6'},
  pink:   {label:'Pink',  light:'#FFE8F1',dark:'#D9638F'},
  lichess:{label:'Brown', light:'#F0D9B5',dark:'#B58863'},
  wood:   {label:'Wood',  light:'#EBD3A8',dark:'#A56B3A'},
  sand:   {label:'Sand',  light:'#F4EBD7',dark:'#C9A46B'},
  gray:   {label:'Gray',  light:'#EDEDED',dark:'#8A8F98'},
  dark:   {label:'Dark',  light:'#676767',dark:'#292929'}
};
export const BORDERS={none:['None',null],dark:['Dark','#14171c'],wood:['Wood','#6b4a2b'],gold:['Gold','#D4A82A'],white:['White','#f2f2f2'],
  gray:['Gray','#5b616b'],red:['Red','#B03A3A'],blue:['Blue','#2F5D9E'],green:['Green','#3F7D4E'],accent:['Accent','var(--accent)']};
export const PIECE_SETS=['cburnett','merida','alpha','pirouetti','chessnut','chess7','companion','fresca','kosal','leipzig','maestro','mpchess',
  'staunty','tatiana','celtic','fantasy','spatial','governor','gioco','horsey','libra','riohacha','shapes','caliente','california',
  'cardinal','anarcandy','dubrovny','icpieces','reillycraig','cooke','monarchy','kiwen-suwi','letter'];
const LOOK_KEY='chess.look';
export const LOOK={site:'dark',board:'yellow',piece:'cburnett',border:'none',custom:{light:'#ffffff',dark:'#7c5cd6'},bcol:'#8b5a2b',accent:null};
(function(){
  const hex=v=>/^#[0-9a-f]{6}$/i.test(v);
  try{
    const old=JSON.parse(localStorage.getItem('chess.boardTheme')||'null');           // earlier board-only setting
    if(old){if(old.id==='custom'||THEMES[old.id])LOOK.board=old.id;if(old.custom&&hex(old.custom.light)&&hex(old.custom.dark))LOOK.custom=old.custom}
    const s=JSON.parse(localStorage.getItem(LOOK_KEY)||'null');
    if(s){
      if(SITE[s.site])LOOK.site=s.site;
      if(s.board==='custom'||THEMES[s.board])LOOK.board=s.board;
      if(PIECE_SETS.includes(s.piece))LOOK.piece=s.piece;
      if(s.border==='custom'||BORDERS[s.border])LOOK.border=s.border;
      if(s.custom&&hex(s.custom.light)&&hex(s.custom.dark))LOOK.custom=s.custom;
      if(hex(s.bcol))LOOK.bcol=s.bcol;
      if(hex(s.accent))LOOK.accent=s.accent;
    }
  }catch(e){}
  PIECE.set=LOOK.piece;
})();
export function applyTheme(){
  const r=document.documentElement.style,st=SITE[LOOK.site],acc=LOOK.accent||st.accent;
  [['bg',st.bg],['panel',st.panel],['line',st.line],['text',st.text],['mute',st.mute],['input',st.input],['accent',acc],
   ['on-accent',lumOf(acc)>.35?'#1b1a14':'#ffffff']].forEach(([k,v])=>r.setProperty('--'+k,v));
  r.colorScheme=st.scheme;
  const c=LOOK.board==='custom'?LOOK.custom:THEMES[LOOK.board];
  r.setProperty('--light',c.light);r.setProperty('--dark',c.dark);
  r.setProperty('--co-l',labelColor(c.light));r.setProperty('--co-d',labelColor(c.dark));
  const bc=LOOK.border==='custom'?LOOK.bcol:BORDERS[LOOK.border][1];
  r.setProperty('--bw',bc?'8px':'0px');r.setProperty('--frame',bc||'transparent');
  const mark=(box,cur)=>document.querySelectorAll('#'+box+' .theme').forEach(b=>{const on=b.dataset.id===cur;b.classList.toggle('on',on);b.setAttribute('aria-checked',on)});
  mark('siteThemes',LOOK.site);mark('themes',LOOK.board);mark('borders',LOOK.border);
  const cs=document.querySelector('#themes .theme[data-id=custom] .sw');
  if(cs){cs.style.setProperty('--a',LOOK.custom.light);cs.style.setProperty('--b',LOOK.custom.dark)}
  const bs=document.querySelector('#borders .theme[data-id=custom] .sw');
  if(bs){bs.style.setProperty('--a',LOOK.bcol);bs.style.setProperty('--b',LOOK.bcol)}
  $('customRow').hidden=LOOK.board!=='custom';$('borderRow').hidden=LOOK.border!=='custom';
  $('colLight').value=LOOK.custom.light;$('colDark').value=LOOK.custom.dark;$('colBorder').value=LOOK.bcol;
  $('colAccent').value=acc.length===7?acc:'#f0c93f';
  $('selPieces').value=LOOK.piece;
  $('piecePrev').replaceChildren(...['wN','bQ','wK'].map(n=>{const i=new Image();i.crossOrigin='anonymous';i.src=PIECE_URL(n[0],n[1]);i.alt='';i.style.cssText='width:34px;height:34px';return i}));
 try{localStorage.setItem(LOOK_KEY,JSON.stringify(LOOK))}catch(e){}
  if(PIECE.set!==LOOK.piece){PIECE.set=LOOK.piece;render()}
}
export function buildThemes(){
  ['colAccent','colLight','colDark','colBorder'].forEach(attachPicker);
  const swatches=(boxId,items,pick)=>{
    const box=$(boxId);
    items.forEach(([id,label,a,b])=>{
      const btn=document.createElement('button');btn.type='button';btn.className='theme';btn.dataset.id=id;
      btn.setAttribute('role','radio');btn.title=label;
      btn.innerHTML='<span class="sw"><i></i><i></i><i></i><i></i></span><span></span>';
      btn.lastChild.textContent=label;
      btn.firstChild.style.setProperty('--a',a);btn.firstChild.style.setProperty('--b',b);
      btn.onclick=()=>{pick(id);applyTheme()};
      box.appendChild(btn);
    });
  };
  swatches('siteThemes',Object.entries(SITE).map(([id,t])=>[id,t.label,t.bg,t.accent]),id=>{LOOK.site=id;LOOK.accent=null});
  swatches('themes',[...Object.entries(THEMES).map(([id,t])=>[id,t.label,t.light,t.dark]),['custom','Custom',LOOK.custom.light,LOOK.custom.dark]],id=>{LOOK.board=id});
  swatches('borders',[...Object.entries(BORDERS).map(([id,[l,c]])=>[id,l,c||'transparent',c||'transparent']),['custom','Custom',LOOK.bcol,LOOK.bcol]],id=>{LOOK.border=id});
  $('selPieces').innerHTML=PIECE_SETS.map(p=>`<option value="${p}">${p.replace(/(^|-)(\w)/g,(m,a,b)=>(a?' ':'')+b.toUpperCase())}</option>`).join('');
  $('selPieces').onchange=e=>{LOOK.piece=e.target.value;applyTheme();$('piecePrev').replaceChildren(...['wN','bQ','wK'].map(n=>{const i=new Image();i.crossOrigin='anonymous';i.src=PIECE_URL(n[0],n[1]);i.alt='';i.style.cssText='width:34px;height:34px';return i}));
   };
  $('colLight').oninput=e=>{LOOK.custom.light=e.target.value;applyTheme()};
  $('colDark').oninput=e=>{LOOK.custom.dark=e.target.value;applyTheme()};
  $('colBorder').oninput=e=>{LOOK.bcol=e.target.value;applyTheme()};
  $('colAccent').oninput=e=>{LOOK.accent=e.target.value;applyTheme()};
  $('bResetAccent').onclick=()=>{LOOK.accent=null;applyTheme()};
  applyTheme();
}
