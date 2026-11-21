/* Winning chances, as in Lichess / Chesskit: win% = 50 + 50 * (2 / (1 + e^(-0.00368208 * centipawns)) - 1). */
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

// White's winning chances (0-100) for an engine line {v: pawns from White's view, mate: moves to mate or 0 when mated, null if none}
export function lineWin(l){
  if(l.mate!=null)return l.mate===0?(l.v>0?100:0):(l.mate>0?100:0);
  const cp=clamp(l.v*100,-1000,1000);
  return 50+50*(2/(1+Math.exp(-0.00368208*cp))-1);
}
// ...from the point of view of one side
export const winFor=(l,white)=>white?lineWin(l):100-lineWin(l);

// Accuracy (0-100) of one move from the mover's win% before and after it (Lichess formula incl. its +1 uncertainty bonus).
export const moveAccuracy=(wBefore,wAfter)=>clamp(103.1668*Math.exp(-0.04354*Math.max(0,wBefore-wAfter))-3.1669+1,0,100);
