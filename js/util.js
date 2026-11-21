export const $=id=>document.getElementById(id);
export const setStatus=t=>{$('status').textContent=t};
export const uciOf=m=>m.from+m.to+(m.promotion||'');
export function fmt(l){
  if(!l)return'';
  if(l.mate!==null&&l.mate!==undefined)return l.mate===0?'#':(l.mate>0?'#':'-#')+Math.abs(l.mate);
  return(l.v>0?'+':'')+l.v.toFixed(1);
}
export function pvToSan(fen,pv,max=9){
  const c=new Chess(fen),out=[];
  for(const u of pv.slice(0,max)){
    const mv=c.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]});
    if(!mv)break;
    out.push({san:mv.san,fen:c.fen(),from:mv.from,to:mv.to,color:mv.color,num:c.history().length});
  }
  return out;
}
