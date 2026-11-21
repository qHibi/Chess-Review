import {S} from './state.js';
import {CFG} from './config.js';
import {uciOf} from './util.js';

// Partial analysis: if the played move is one of the engine's lines, the next position's evaluation and
// best reply are already in that line's PV, so no new search is needed.
export function derive(i){
  const A=S.P[i-1],mv=S.moves[i-1];if(!A||!A.length)return null;
  const played=uciOf(mv),L=A.find(l=>l.pv[0]===played);
  if(!L||L.pv.length<2)return null;
  const sg=mv.color==='w'?1:-1,m=L.mate;
  let nm=null,v=L.v;
  if(m!=null){nm=sg*m>0?m-sg:m;v=(nm>0?1:-1)*(50-Math.min(Math.abs(nm),49))}
  return[{v,mate:nm,pv:L.pv.slice(1),depth:Math.max(1,(L.depth||CFG.depth)-1),partial:true}];
}
