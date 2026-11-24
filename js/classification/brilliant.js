import {parse,getUnsafePieces,hasDangerLevels,capturesOf,isPieceTrapped,inCheck,sqName} from './safety.js';

/* ---------- WintrChess's Brilliant test (considerBrilliantClassification), working from the FENs before and after the move ----------
   After the move the mover must still have a piece that is not safe, and the move must not just be a retreat to safety,
   must not leave every such piece with a bigger counter-threat (then it is not really en prise), and must not be a case where
   all the loose pieces were already trapped. Promotions never count. `mv` is the chess.js move object. */
const cache=new Map();
export function unsafePieceBrilliant(prevFen,currFen,mv){
  const key=prevFen+'|'+mv.from+mv.to+(mv.promotion||'');
  if(cache.has(key))return cache.get(key);
  let r=false;
  try{r=compute(prevFen,currFen,mv)}catch(e){r=false}
  if(cache.size>4000)cache.clear();
  cache.set(key,r);return r;
}
function compute(prevFen,currFen,mv){
  if(mv.promotion)return false;
  const Pp=parse(prevFen),Pc=parse(currFen),color=mv.color;
  const played={captured:mv.captured};
  const prevUnsafe=getUnsafePieces(Pp,color);
  const unsafe=getUnsafePieces(Pc,color,played);
  if(!unsafe.length)return false;
  if(!inCheck(Pc,Pc.turn)&&unsafe.length<prevUnsafe.length)return false;            // it only moved a piece to safety
  if(unsafe.every(p=>hasDangerLevels(Pc,p,capturesOf(Pc,p))))return false;          // every capture lets the mover hit back harder
  const trapped=unsafe.filter(p=>isPieceTrapped(Pc,p));
  if(trapped.length===unsafe.length)return false;
  const prevTrapped=prevUnsafe.filter(p=>isPieceTrapped(Pp,p));
  if(prevTrapped.some(p=>sqName(p.f,p.r)===mv.from))return false;                    // the moved piece was already trapped
  if(trapped.length<prevTrapped.length)return false;
  return true;
}
