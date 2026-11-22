import {S} from './state.js';
import {$} from './util.js';

/* ---------- Two screens ----------
   "import": paste / import a game and start the analysis.   "analysis": the board, moves, engine lines and review.
   Going back to the import screen never stops a running analysis; loading another game does (see cancelAnalysis). */
export function showScreen(name){
  document.body.dataset.screen=name;
  const r=$('bResume');if(r)r.hidden=!(name==='import'&&S.moves&&S.moves.length);
  scrollTo(0,0);
}
export const screen=()=>document.body.dataset.screen;
