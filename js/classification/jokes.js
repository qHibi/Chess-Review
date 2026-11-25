import {CLS,ORDER} from '../config.js';

/* ---------- Joke classifications ----------
   Extra, silly labels that sit on top of the normal ladder. They are OFF by default and each one can be switched on in
   Settings. To add one, push an entry onto JOKES below - nothing else in the app needs to change (the label shows up in the
   settings list, the summary, the move menu and the loader by itself).

     id     unique key (also the icon file name: images/moves/<id>.png is tried first, then the symbol)
     label  shown in the UI
     color  hex colour of the badge
     sym    short text used when there is no icon image
     desc   one line shown under the toggle in settings
     test   (m) => true when the move earns it. m is the move's context:
              m.i            ply index
              m.white        true if White moved
              m.before/after the mover's win% before / after the move (0-100, from the mover's point of view)
              m.k            the normal classification the move would get
              m.mv           the move ({san, from, to, ...})
              m.A / m.B      engine lines before / after the move
     Jokes are checked in order; the first one that matches wins. They never touch the normal classification logic. */
export const JOKES=[
  {id:'dogshit',label:'Dogshit',color:'#5D3209',sym:'XD',
   desc:'Throwing away a 100% winning position straight into a 0% one.',
   test:m=>m.before===100&&m.after===0},
];

const KEY='chess.jokes';
const on=new Set();                       // enabled joke ids (none by default)

for(const j of JOKES)CLS[j.id]={label:j.label,color:j.color,sym:j.sym};   // always known, so a saved override still draws

export const isJoke=k=>JOKES.some(j=>j.id===k);
export const jokeEnabled=id=>on.has(id);

/* keep ORDER (summary rows, move menu, loader counters) in step with the enabled jokes */
function syncOrder(){
  for(const j of JOKES){const at=ORDER.indexOf(j.id);if(at>=0)ORDER.splice(at,1)}
  for(const j of JOKES)if(on.has(j.id))ORDER.push(j.id);
}
export function setJoke(id,v){
  if(!JOKES.some(j=>j.id===id))return;
  v?on.add(id):on.delete(id);
  syncOrder();
  try{localStorage.setItem(KEY,JSON.stringify([...on]))}catch(e){}
}
export function loadJokes(){
  try{(JSON.parse(localStorage.getItem(KEY)||'[]')||[]).forEach(id=>{if(JOKES.some(j=>j.id===id))on.add(id)})}catch(e){}
  syncOrder();
}
/* the id of the first enabled joke this move earns, or null */
export function jokeFor(m){
  for(const j of JOKES)if(on.has(j.id)){try{if(j.test(m))return j.id}catch(e){}}
  return null;
}
