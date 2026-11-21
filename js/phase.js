/* Opening / middlegame / endgame, per move.
   Position rules (as in Lichess's divider, simplified): endgame once 6 or fewer minor/major pieces remain on the board,
   middlegame once 10 or fewer remain or either back rank is thinned out. Book moves are always opening, and a game never
   goes back to an earlier phase. */
export const PH_NAME={open:'Opening',mid:'Middlegame',end:'Endgame'};
const ORD={open:0,mid:1,end:2};
export function phaseOfFen(fen){
  const rows=fen.split(' ')[0].split('/');
  let mm=0;for(const ch of rows.join(''))if(/[nbrqNBRQ]/.test(ch))mm++;
  const cnt=(row,re)=>(row.match(re)||[]).length;
  const sparse=cnt(rows[7],/[A-Z]/g)<4||cnt(rows[0],/[a-z]/g)<4;
  if(mm<=6)return'end';
  if(mm<=10||sparse)return'mid';
  return'open';
}
// out[i] = phase in which move i (1-based) was played
export function phasesFor(L){
  const out=[];let cur='open';
  for(let i=1;i<=L.moves.length;i++){
    const c=L.cls[i];
    let p=(c&&c.k==='book')?'open':phaseOfFen(L.fens[i-1]);
    if(ORD[p]<ORD[cur])p=cur;
    cur=p;out[i]=p;
  }
  return out;
}
