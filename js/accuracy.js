import {lineWin,moveAccuracy} from './classification/winPercentage.js';

/* ---------- Accuracy ----------
   Same idea as Lichess: win% before and after each move -> a per-move accuracy, then a volatility-weighted
   mean blended with the harmonic mean so that a few big mistakes pull the score down properly. */
export function gameAccuracy(L){
  const n=L.moves.length,W=[];
  for(let i=0;i<=n;i++)W[i]=L.P[i]&&L.P[i].length?lineWin(L.P[i][0]):null;
  const first=W.find(x=>x!=null);
  for(let i=0;i<=n;i++)if(W[i]==null)W[i]=i===0||W[i-1]==null?(first==null?50:first):W[i-1];
  const win=Math.max(2,Math.min(8,Math.floor(n/10))),data={w:[],b:[]};
  for(let i=1;i<=n;i++){
    const m=L.moves[i-1],c=L.cls[i];
    const hasData=L.P[i-1]&&L.P[i-1].length&&L.P[i]&&L.P[i].length;
    let a;
    if(c&&c.k==='book'&&!hasData)a=100;
    else if(!hasData)continue;
    else{
      const sg=m.color==='w'?1:-1,wb=sg>0?W[i-1]:100-W[i-1],wa=sg>0?W[i]:100-W[i];
      a=moveAccuracy(wb,wa);
    }
    const lo=Math.max(0,i-Math.floor(win/2)),hi=Math.min(n,i+Math.ceil(win/2)),seg=W.slice(lo,hi+1);
    const mean=seg.reduce((x,y)=>x+y,0)/seg.length,sd=Math.sqrt(seg.reduce((x,y)=>x+(y-mean)*(y-mean),0)/seg.length);
    data[m.color].push({i,a,w:Math.max(.5,Math.min(12,sd))});
  }
  const out={W,data};
  for(const col of ['w','b'])out[col]=blendAcc(data[col]);
  return out;
}
// Volatility-weighted mean blended with the harmonic mean. d = [{a,w}]
export function blendAcc(d){
  if(!d.length)return null;
  const sw=d.reduce((x,y)=>x+y.w,0),wm=d.reduce((x,y)=>x+y.a*y.w,0)/sw,hm=d.length/d.reduce((x,y)=>x+1/Math.max(y.a,1),0);
  return{acc:(wm+hm)/2,n:d.length};
}
// Rough, tunable mapping from accuracy to a rating. It is an estimate, not a real Elo.
const RATE_PTS=[[30,100],[50,400],[65,800],[75,1200],[80,1500],[88,2000],[94,2500],[98,3000],[100,3650]];
export function ratingFromAcc(a){
  if(a==null)return null;
  for(let k=1;k<RATE_PTS.length;k++){
    const[x0,y0]=RATE_PTS[k-1],[x1,y1]=RATE_PTS[k];
    if(a<=x1)return Math.round((y0+(y1-y0)*(Math.max(a,x0)-x0)/(x1-x0))/50)*50;
  }
  return 3650;
}
export const accColor=a=>a>=90?'#26C2A3':a>=80?'#81B64C':a>=65?'#F7C631':a>=50?'#FFAE64':'#FB4834';
