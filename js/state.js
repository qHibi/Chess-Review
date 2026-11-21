/* App state. A "line" is the game or one variation; S.line is the one on screen and S.moves / S.fens / S.P / S.cls
   always read through to it. */
export const S={moves:[],fens:[],P:[],cls:[],idx:0,flip:false,batch:false,token:0,run:0,nextCls:1,preview:null,live:null,over:{},done:false,deep:false,noClick:0,headers:{}};
/* A "line" is the game or one variation: its own moves, positions, evaluations and classifications. */
let LID=1;
export const newLine=o=>Object.assign({id:LID++,moves:[],fens:[],P:[],cls:[],book:null,bookOK:true,nextCls:1,over:{},startFen:undefined,parent:null,fork:0,todo:[]},o);
export const MAIN=newLine({});
S.line=MAIN;S.lines=[MAIN];S.sel=null;S.paused=false;
['moves','fens','P','cls','book','bookOK','nextCls','over','startFen'].forEach(k=>
  Object.defineProperty(S,k,{get(){return S.line[k]},set(v){S.line[k]=v},enumerable:true,configurable:true}));
export const withLine=(L,fn)=>{const o=S.line;S.line=L;try{return fn()}finally{S.line=o}};
