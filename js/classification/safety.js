/* ---------- Piece safety, trapped pieces and counter-threats ----------
   Re-implemented from the behaviour of WintrChess's reporter utilities (shared/src/lib/reporter/utils: pieceSafety, attackers,
   dangerLevels, pieceTrapped), working on plain board arrays parsed from a FEN so it needs nothing but this file.
   Differences from WintrChess: a king only counts as an attacker when the capture is legal (the square is not defended),
   defenders must be able to recapture legally (a pinned defender does not count), and castling / en passant are not generated
   (they never decide whether a piece is safe or trapped).
   Board: b[r][f], r = 0 is rank 8, f = 0 is the a-file. A piece is {type, color, f, r}. */
export const VAL={p:1,n:3,b:3,r:5,q:9,k:100};
const FILES='abcdefgh';
export const sqName=(f,r)=>FILES[f]+(8-r);
const opp=c=>c==='w'?'b':'w';
const inb=(f,r)=>f>=0&&f<8&&r>=0&&r<8;
const KN=[[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
const KG=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
const DG=[[1,1],[1,-1],[-1,1],[-1,-1]],OR=[[1,0],[-1,0],[0,1],[0,-1]];

export function parse(fen){
  const[pp,turn]=fen.split(' ');
  const b=pp.split('/').map(row=>{const o=[];for(const c of row){if(/\d/.test(c))for(let i=0;i<+c;i++)o.push(null);else o.push({type:c.toLowerCase(),color:c===c.toUpperCase()?'w':'b'})}return o});
  return{b,turn};
}
const clone=P=>({b:P.b.map(r=>r.slice()),turn:P.turn});
const kingOf=(P,c)=>{for(let r=0;r<8;r++)for(let f=0;f<8;f++){const p=P.b[r][f];if(p&&p.type==='k'&&p.color===c)return{f,r}}return null};

/* every piece of colour `by` that attacks (f,r), geometry only (the square itself may hold anything) */
function geoAttackers(P,f,r,by){
  const b=P.b,out=[],add=(x,y)=>out.push({f:x,r:y,type:b[y][x].type,color:by});
  const py=by==='w'?r+1:r-1;
  [-1,1].forEach(dx=>{const x=f+dx;if(inb(x,py)){const p=b[py][x];if(p&&p.color===by&&p.type==='p')add(x,py)}});
  KN.forEach(([dx,dy])=>{const x=f+dx,y=r+dy;if(inb(x,y)){const p=b[y][x];if(p&&p.color===by&&p.type==='n')add(x,y)}});
  KG.forEach(([dx,dy])=>{const x=f+dx,y=r+dy;if(inb(x,y)){const p=b[y][x];if(p&&p.color===by&&p.type==='k')add(x,y)}});
  [[DG,'b'],[OR,'r']].forEach(([dirs,t])=>dirs.forEach(([dx,dy])=>{
    let x=f+dx,y=r+dy;
    while(inb(x,y)){
      const p=b[y][x];
      if(p){if(p.color===by&&(p.type===t||p.type==='q'))add(x,y);break}
      x+=dx;y+=dy;
    }
  }));
  return out;
}
export const isAttacked=(P,f,r,by)=>geoAttackers(P,f,r,by).length>0;
export const inCheck=(P,color)=>{const k=kingOf(P,color);return !!k&&isAttacked(P,k.f,k.r,opp(color))};

/* attackers whose capture on (f,r) is legal: it must not leave their own king in check (pins), and a king may only capture an undefended piece */
function legalAttackers(P,f,r,by){
  return geoAttackers(P,f,r,by).filter(a=>{
    const Q=clone(P),mover=Q.b[a.r][a.f];
    Q.b[a.r][a.f]=null;Q.b[r][f]=mover;
    return !inCheck(Q,by);
  });
}
/* attackers of a square, plus (transitive) the pieces lined up behind them (batteries / x-rays), found by lifting each attacker off the board */
export function attackersOn(P,f,r,by,transitive=true){
  const direct=legalAttackers(P,f,r,by);
  if(!transitive)return direct;
  const out=direct.slice(),seen=new Set(geoAttackers(P,f,r,by).map(a=>a.f+','+a.r)),stack=direct.map(a=>({a,P}));   // illegal (pinned) attackers stay out
  while(stack.length){
    const{a,P:Q}=stack.pop();
    if(a.type==='k')continue;                                       // a king cannot be at the front of a battery
    const R=clone(Q);R.b[a.r][a.f]=null;
    geoAttackers(R,f,r,by).forEach(x=>{
      const key=x.f+','+x.r;if(seen.has(key))return;
      seen.add(key);out.push(x);stack.push({a:x,P:R});
    });
  }
  return out;
}
/* pieces that could recapture on the square of `piece`: the cheapest attacker is imagined to have captured there (so it has left its
   own square), and whoever can legally take it back counts as a defender */
export function defendersOf(P,piece){
  const by=opp(piece.color),direct=attackersOn(P,piece.f,piece.r,by,false);
  if(!direct.length)return[];
  const low=direct.reduce((m,a)=>VAL[a.type]<VAL[m.type]?a:m);
  const Q=clone(P);Q.b[low.r][low.f]=null;Q.b[piece.r][piece.f]={type:low.type,color:by};
  return attackersOn(Q,piece.f,piece.r,piece.color,true);
}

/* ---- move generation (no castling / en passant) ---- */
function pseudo(P,f,r){
  const b=P.b,p=b[r][f],out=[];
  const push=(x,y)=>{const q=b[y][x];if(q&&q.color===p.color)return false;out.push({f0:f,r0:r,f:x,r:y,piece:p.type,color:p.color,captured:q?q.type:undefined,promotion:p.type==='p'&&(y===0||y===7)?'q':undefined});return !q};
  if(p.type==='p'){
    const dy=p.color==='w'?-1:1,start=p.color==='w'?6:1;
    if(inb(f,r+dy)&&!b[r+dy][f]){
      push(f,r+dy);
      if(r===start&&!b[r+2*dy][f])push(f,r+2*dy);
    }
    [-1,1].forEach(dx=>{if(inb(f+dx,r+dy)){const q=b[r+dy][f+dx];if(q&&q.color!==p.color)push(f+dx,r+dy)}});
  }else if(p.type==='n')KN.forEach(([dx,dy])=>{if(inb(f+dx,r+dy))push(f+dx,r+dy)});
  else if(p.type==='k')KG.forEach(([dx,dy])=>{if(inb(f+dx,r+dy))push(f+dx,r+dy)});
  else (p.type==='b'?DG:p.type==='r'?OR:KG).forEach(([dx,dy])=>{
    let x=f+dx,y=r+dy;
    while(inb(x,y)){if(!push(x,y))break;x+=dx;y+=dy}
  });
  return out;
}
export function applyMove(P,m){
  const Q=clone(P);
  Q.b[m.r][m.f]={type:m.promotion||m.piece,color:m.color};Q.b[m.r0][m.f0]=null;
  Q.turn=opp(m.color);return Q;
}
export function legalMoves(P,color,square){
  const out=[];
  for(let r=0;r<8;r++)for(let f=0;f<8;f++){
    const p=P.b[r][f];if(!p||p.color!==color)continue;
    if(square&&(square.f!==f||square.r!==r))continue;
    pseudo(P,f,r).forEach(m=>{if(!inCheck(applyMove(P,m),color))out.push(m)});
  }
  return out;
}
export const isMate=(P,color)=>inCheck(P,color)&&!legalMoves(P,color).length;
export const hasMateInOne=(P,color)=>legalMoves(P,color).some(m=>isMate(applyMove(P,m),opp(color)));

/* ---- safety ---- */
/* Is the piece safe where it stands? `played` (the move just made, optional) only matters for the exchange-sacrifice exception. */
export function isPieceSafe(P,piece,played){
  const by=opp(piece.color);
  const direct=attackersOn(P,piece.f,piece.r,by,false),att=attackersOn(P,piece.f,piece.r,by,true),def=defendersOf(P,piece);
  if(played&&played.captured&&piece.type==='r'&&VAL[played.captured]===VAL.n&&att.length===1&&def.length>0&&VAL[att[0].type]===VAL.n)return true;   // rook for a minor piece
  if(direct.some(a=>VAL[a.type]<VAL[piece.type]))return false;       // attacked by something cheaper
  if(att.length<=def.length)return true;                              // enough defenders
  const low=direct.reduce((m,a)=>!m||VAL[a.type]<VAL[m.type]?a:m,null);
  if(!low)return true;
  if(VAL[piece.type]<VAL[low.type]&&def.some(d=>VAL[d.type]<VAL[low.type]))return true;
  if(def.some(d=>d.type==='p'))return true;
  return false;
}
// pieces of `color` (no pawns, no king) that are not safe; after a capture, only pieces worth more than the captured one count
export function getUnsafePieces(P,color,played){
  const cap=played&&played.captured?VAL[played.captured]:0,out=[];
  for(let r=0;r<8;r++)for(let f=0;f<8;f++){
    const p=P.b[r][f];if(!p||p.color!==color||p.type==='p'||p.type==='k'||VAL[p.type]<=cap)continue;
    const piece={type:p.type,color,f,r};
    if(!isPieceSafe(P,piece,played))out.push(piece);
  }
  return out;
}

/* ---- danger levels: does a move leave the side that made it with a bigger problem than the piece it is dealing with? ---- */
const same=(a,b)=>a.from===b.from&&a.to===b.to;
// attacks on the acting side's own unsafe pieces that are worth at least as much as `piece` (the piece itself and any `skip` squares excluded)
function relativeAttacks(P,actor,piece,skip){
  const out=[];
  getUnsafePieces(P,actor).forEach(u=>{
    if(skip.some(s=>s.f===u.f&&s.r===u.r)||VAL[u.type]<VAL[piece.type])return;
    attackersOn(P,u.f,u.r,opp(actor),false).forEach(a=>out.push({from:sqName(a.f,a.r),to:sqName(u.f,u.r)}));
  });
  return out;
}
export function moveCreatesGreaterThreat(P,piece,m){
  const actor=m.color,before=relativeAttacks(P,actor,piece,[piece]),Q=applyMove(P,m);
  const after=relativeAttacks(Q,actor,piece,[piece,{f:m.f,r:m.r}]);
  if(after.some(a=>!before.some(x=>same(a,x))))return true;
  return VAL[piece.type]<VAL.q&&hasMateInOne(Q,opp(actor));
}
export function moveLeavesGreaterThreat(P,piece,m){
  const actor=m.color,Q=applyMove(P,m);
  if(relativeAttacks(Q,actor,piece,[piece,{f:m.f,r:m.r}]).length)return true;
  return VAL[piece.type]<VAL.q&&hasMateInOne(Q,opp(actor));
}
// the opponent's captures of `piece`
export const capturesOf=(P,piece)=>attackersOn(P,piece.f,piece.r,opp(piece.color),false).map(a=>({f0:a.f,r0:a.r,f:piece.f,r:piece.r,piece:a.type,color:a.color,captured:piece.type,promotion:undefined}));
// every way of taking the piece leaves its owner with a bigger counter-threat (mode "leaves"), or creates a new one ("creates")
export function hasDangerLevels(P,piece,moves,mode='leaves'){
  const fn=mode==='creates'?moveCreatesGreaterThreat:moveLeavesGreaterThreat;
  return moves.every(m=>fn(P,piece,m));
}

/* ---- trapped: unsafe where it stands and every legal move leads somewhere unsafe ---- */
export function isPieceTrapped(P,piece,dangerLevels=true){
  if(isPieceSafe(P,piece))return false;
  return legalMoves(P,piece.color,{f:piece.f,r:piece.r}).every(m=>{
    if(m.captured==='k')return false;
    if(dangerLevels&&moveCreatesGreaterThreat(P,piece,m))return true;
    return !isPieceSafe(applyMove(P,m),{type:m.promotion||piece.type,color:piece.color,f:m.f,r:m.r},m);
  });
}

export const toFen=P=>P.b.map(row=>{let s='',n=0;for(const p of row){if(!p)n++;else{if(n){s+=n;n=0}s+=p.color==='w'?p.type.toUpperCase():p.type}}return s+(n||'')}).join('/')+' '+P.turn;
/* Did the move give check with a piece other than the one that moved (the move uncovered a line)? `currFen` is the position after it.
   Castling is not counted. */
export function isDiscoveredCheck(currFen,mv){
  if(/[kq]/.test(mv.flags||''))return false;
  const P=parse(currFen),k=kingOf(P,P.turn);
  if(!k)return false;
  return geoAttackers(P,k.f,k.r,opp(P.turn)).some(a=>sqName(a.f,a.r)!==mv.to);
}

/* ---- material that is already pending in a position ----
   Every attacker / defender of a square, including pieces lined up behind others (x-ray), by plain geometry. */
function xray(P,f,r,by){
  const first=geoAttackers(P,f,r,by),out=first.slice(),seen=new Set(first.map(a=>a.f+','+a.r)),stack=first.map(a=>({a,P}));
  while(stack.length){
    const{a,P:Q}=stack.pop();
    if(a.type==='k')continue;
    const R=clone(Q);R.b[a.r][a.f]=null;
    geoAttackers(R,f,r,by).forEach(x=>{const k=x.f+','+x.r;if(seen.has(k))return;seen.add(k);out.push(x);stack.push({a:x,P:R})});
  }
  return out.map(a=>VAL[a.type]).sort((x,y)=>x-y);
}
// static exchange: what the side attacking a square nets by capturing there first and both sides recapturing with their cheapest piece
function see(target,att,def){
  const gain=[target];let occ=att[0],ai=1,di=0,d=0;
  for(;;){
    d++;gain[d]=occ-gain[d-1];                 // speculative: the piece now on the square gets taken
    const next=d%2?def[di++]:att[ai++];
    if(next===undefined)break;
    occ=next;
  }
  while(--d>0)gain[d-1]=-Math.max(-gain[d-1],gain[d]);
  return gain[0];
}
/* How much material the side to move in `fen` is already going to lose if the opponent just starts taking: the sum, over its pieces
   that can be captured profitably, of the exchange value. A piece that took a defended piece earlier and was never recaptured is the
   typical case. A later move must not be called a sacrifice just because the engine's line finishes that old exchange. */
export function pendingLoss(fen){
  const P=parse(fen),me=P.turn,foe=opp(me);let total=0;
  for(let r=0;r<8;r++)for(let f=0;f<8;f++){
    const p=P.b[r][f];if(!p||p.color!==me||p.type==='k')continue;
    const att=xray(P,f,r,foe);if(!att.length)continue;
    const g=see(VAL[p.type],att,xray(P,f,r,me));
    if(g>0)total+=g;
  }
  return total;
}
