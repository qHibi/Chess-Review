import {CLS,ICON_URL} from '../config.js';

/* A classification icon. With `size` (px) the wrapper gets class "ico" and the size is applied to the <img> itself through CSS
   (css/icons.css) - the PNGs are 512x512, so they must never be left at their natural size. Without `size` the caller's own
   class (e.g. the board "badge") does the sizing. If the PNG is missing, a coloured symbol is shown instead. */
export function iconNode(k,cls='',size){
  const d=document.createElement('span');
  d.className=((size?'ico ':'')+cls).trim();
  if(size)d.style.setProperty('--ico',size+'px');
  const img=new Image();img.alt=CLS[k].label;img.src=ICON_URL(k);
  if(size){img.width=size;img.height=size}
  img.onerror=()=>{const f=document.createElement('i');f.style.background=CLS[k].color;f.textContent=CLS[k].sym;d.replaceChildren(f)};
  d.appendChild(img);return d;
}
