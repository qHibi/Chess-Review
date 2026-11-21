/* Button / UI icons: small inline SVGs (24x24 grid, stroke = currentColor), drawn in the style of the open-source
   Lucide/Feather sets (ISC / MIT licensed, free for any use). Brand marks (Lichess, Chess.com) are simplified
   drawings; to use the official artwork drop images/brands/lichess.svg and images/brands/chesscom.svg next to
   index.html and they are picked up automatically. */
const P={
  'skip-back':'<path d="M19 20 9 12l10-8z"/><path d="M5 19V5"/>',
  'skip-forward':'<path d="m5 4 10 8-10 8z"/><path d="M19 5v14"/>',
  'chevron-left':'<path d="m15 18-6-6 6-6"/>',
  'chevron-right':'<path d="m9 18 6-6-6-6"/>',
  'chevron-down':'<path d="m6 9 6 6 6-6"/>',
  'flip':'<path d="m7 15-4 4 4 4"/><path d="M3 19h14"/><path d="m17 9 4-4-4-4"/><path d="M21 5H7"/>',
  'refresh':'<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M8 16H3v5"/>',
  'play':'<path d="m6 3 14 9-14 9z"/>',
  'pause':'<path d="M8 4v16"/><path d="M16 4v16"/>',
  'zap':'<path d="M13 2 3 14h8l-1 8 10-12h-8z"/>',
  'gauge':'<path d="m12 14 4-4"/><path d="M3.3 19a10 10 0 1 1 17.4 0"/>',
  'microscope':'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6M8 11h6"/>',
  'sliders':'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1 14h6M9 8h6M17 16h6"/>',
  'settings':'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  'palette':'<circle cx="13.5" cy="6.5" r="1" fill="currentColor"/><circle cx="17.5" cy="10.5" r="1" fill="currentColor"/><circle cx="8.5" cy="7.5" r="1" fill="currentColor"/><circle cx="6.5" cy="12.5" r="1" fill="currentColor"/><path d="M12 22a10 10 0 1 1 10-10c0 3-2 4-4.5 4H15a2 2 0 0 0-1.4 3.4c.5.6.4 1.4-.1 1.9-.4.5-1 .7-1.5.7z"/>',
  'x':'<path d="M18 6 6 18M6 6l12 12"/>',
  'check':'<path d="M20 6 9 17l-5-5"/>',
  'download':'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  'search':'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  'undo':'<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
  'file-text':'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
  'book-open':'<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  'flag':'<path d="M4 22V4"/><path d="M4 4h13l-2.5 4.5L17 13H4"/>',
  'trophy':'<path d="M6 4h12v5a6 6 0 0 1-12 0z"/><path d="M6 6H3v1a4 4 0 0 0 4 4M18 6h3v1a4 4 0 0 1-4 4M12 15v4M8 21h8"/>',
  'link':'<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  'cpu':'<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 9h6v6H9zM9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4"/>',
  'repeat':'<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  'target':'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
};
// Lichess-style knight and a Chess.com-style pawn, simplified (filled)
const BRAND={
  lichess:'<path stroke="none" d="M7 21h12v-2.2H7zM8.2 18c.3-2.6 1.3-4.3 3-5.7-1.6-.2-4-.9-5-3.2-.8-1.9.2-3.7 1.4-4.4L7 3l2.1 1.5C10.3 3.5 12 3 13.6 3.2 17.6 3.8 20 7.3 19.6 11c-.3 2.6-1 4.6-1 7z"/><circle cx="12.4" cy="7.8" r=".9" fill="#222" stroke="none"/>',
  chesscom:'<g stroke="none"><circle cx="12" cy="6.6" r="3.3"/><path d="M9.4 10.6h5.2L16.4 17H7.6z"/><path d="M6 21.5v-2.8h12v2.8z"/></g>',
};
const BCOL={lichess:'#ffffff',chesscom:'#81B64C'};
const NS='http://www.w3.org/2000/svg';
export function svgIcon(name,size=18){
  const s=document.createElementNS(NS,'svg');
  s.setAttribute('viewBox','0 0 24 24');s.setAttribute('width',size);s.setAttribute('height',size);
  s.setAttribute('class','i');s.setAttribute('aria-hidden','true');
  const b=BRAND[name];
  if(b){s.setAttribute('fill','currentColor');if(BCOL[name])s.style.color=BCOL[name]}
  else{s.setAttribute('fill','none');s.setAttribute('stroke','currentColor');s.setAttribute('stroke-width','2');s.setAttribute('stroke-linecap','round');s.setAttribute('stroke-linejoin','round')}
  s.innerHTML=b||P[name]||'';
  if(b){   // use the official artwork if the user supplied it
    const im=new Image();im.src=`images/brands/${name}.svg`;
    im.onload=()=>{const i=document.createElement('img');i.src=im.src;i.alt='';i.width=size;i.height=size;i.className='i brand';s.replaceWith(i)};
  }
  return s;
}
// Put an icon (and optional label) into a button. Keeps any aria-label already there.
export function setBtn(el,name,label,size){
  el.replaceChildren(svgIcon(name,size||(label?16:18)));
  if(label!=null){const t=document.createElement('span');t.textContent=label;el.appendChild(t)}
  else if(!el.getAttribute('aria-label')&&el.title)el.setAttribute('aria-label',el.title.replace(/\s*\(.*\)/,''));
}
// <button data-icon="play"> ... </button>: icon goes in front of the existing text
export function hydrateIcons(root=document){
  root.querySelectorAll('[data-icon]').forEach(el=>{
    if(el.querySelector(':scope>svg.i,:scope>img.i'))return;
    const label=el.textContent.trim();
    if(label)el.textContent='';
    el.replaceChildren(svgIcon(el.dataset.icon,+el.dataset.size||(label?16:18)),...(label?[Object.assign(document.createElement('span'),{textContent:label})]:[]));
    if(!label&&!el.getAttribute('aria-label')&&el.title)el.setAttribute('aria-label',el.title.replace(/\s*\(.*\)/,''));
  });
}
