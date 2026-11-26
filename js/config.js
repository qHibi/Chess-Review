export const PIECE = {set:'cburnett'};   // any set in lichess-org/lila public/piece (changed by the theme picker)
export const PIECE_URL = (c,p)=>`https://cdn.jsdelivr.net/gh/lichess-org/lila@master/public/piece/${PIECE.set}/${c}${p}.svg`;
export const ICON_FILE = {miss:'missed'};   // the image for "miss" is missed.png
export const ICON_URL  = k=>`./images/moves/${ICON_FILE[k]||k.toLowerCase()}.png`;
/* ---------- Stockfish ----------
   Only the LITE builds are used, hosted by you in  document.baseURI + 'engine/'  (same origin, so the threaded build can run).
   For each version V (19, 18 ...) the app looks for these files and offers the versions it finds in Settings:
     engine/stockfish-V-lite.js + stockfish-V-lite.wasm                lite, multi-threaded (needs a cross-origin-isolated page, coi-sw.js provides it)
     engine/stockfish-V-lite-single.js + stockfish-V-lite-single.wasm  lite, single thread (works anywhere; used when the page is not isolated)
   Only version 19 may fall back to a CDN copy (single thread). There is NO fallback to old JavaScript engines (Stockfish 10 was far too weak).
   To add a version, drop its files in engine/ and add its number to SF.versions. */
export const ENGINE_DIR = new URL('engine/', document.baseURI ? document.baseURI : 'localhost:8000').href;
export const SF = {
  versions: ['19', '18'],
  ver: '19',                                   // the selected version (Settings -> Engine version)
  dir: ENGINE_DIR,
  lite:   v => `stockfish-${v}-lite.js`,
  single: v => `stockfish-${v}-lite-single.js`,
  asm:    v => `stockfish-${v}-asm.js`,         // plain-JavaScript build (no WebAssembly), only used when Engine type is set to JavaScript
  mode: 'wasm',                                // 'wasm' (default) or 'js'
  cdn: {                                       // CDN copies (single thread), only for versions listed here
    '19': {name: 'stockfish-19-lite-single', bases: [
      'https://cdn.jsdelivr.net/npm/stockfish@19.0.1/bin/',
      'https://cdn.jsdelivr.net/npm/stockfish@19.0.1/src/',
      'https://unpkg.com/stockfish@19.0.1/bin/',
    ]},
  },
  hash: {lite: 64, single: 32},   // MB
  maxThreads: 8,
  timeout: {lite: 90000, single: 45000},
};
export const MULTIPV = 3;
export const OPENINGS_URL = 'openings.txt';  // tab-separated: eco, name, pgn, uci, epd (put it next to index.html)

export const CLS = {
  brilliant:  {label:'Brilliant',  color:'#26C2A3', sym:'!!'},
  great:      {label:'Great',      color:'#749BBF', sym:'!'},
  best:       {label:'Best',       color:'#81B64C', sym:'★'},
  excellent:  {label:'Excellent',  color:'#81B64C', sym:'✓'},
  good:       {label:'Good',       color:'#C6E8A0', sym:'✓'},
  inaccuracy: {label:'Inaccuracy', color:'#F7C631', sym:'?!'},
  miss:       {label:'Miss',       color:'#FF7769', sym:'×'},
  mistake:    {label:'Mistake',    color:'#FFAE64', sym:'?'},
  blunder:    {label:'Blunder',    color:'#FB4834', sym:'??'},
  book:       {label:'Book',       color:'#D5A47D', sym:'B'},
  forced:     {label:'Forced',     color:'#81B64C', sym:'→'}
  // joke classifications register themselves from classification/jokes.js
};
export const ORDER=['brilliant','great','best','excellent','good','book','forced','inaccuracy','miss','mistake','blunder'];

/* Small opening book (SAN prefixes). A move is "book" while the game follows one of these lines. */
export const BOOK = `e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3
e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8
e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O a6
e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6
e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4 Ba6
e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Nc6 O-O Be7
e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5 b5
e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7
e4 e5 f4 exf4 Nf3 g5 h4 g4 Ne5 Nf6 Bc4 d5 exd5 Bd6 d4 Nh5 Nc3
e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O O-O-O
e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 Nc3 Bg7 Be3 Nf6 Bc4 O-O Bb3 d6 f3
e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7 Be3 a6 Be2 Nf6 O-O Bb4
e4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6
e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 Bg4 Be2 e6 O-O Nc6
e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 O-O Bd3 Nbc6 Qh5
e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7 Bd3 c5 c3 Nc6 Ne2 cxd4 cxd4 f6 exf6 Nxf6 O-O Bd6
e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6 Bf4 Qa5+
e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 cxd4 Nxd4 Ne7
e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5 Bd2 e6 Nd5
e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O Bd3 Na6
e4 g6 d4 Bg7 Nc3 d6 Be3 a6
d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6 cxd5 Nxd5 Bxe7 Qxe7 Nxd5 exd5 Rc1 Be6
d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O Nbd7 Qe2 Bg6
d4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 Qe2 b5 Bb3 Bb7 Rd1 Nbd7
d4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O Nc6 a3 Bxc3 bxc3 dxc4 Bxc4 Qc7
d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7
d4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Be3 Qa5 Qd2 Bg4
d4 Nf6 Nf3 e6 Bg5 c5 e3 Qb6 Nbd2 Nc6 c3 d6
d4 Nf6 Bg5 Ne4 Bf4 c5 f3 Qa5+ c3 Nf6 dxc5
c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nb6 O-O Be7 a3 O-O b4
c4 c5 Nf3 Nf6 Nc3 Nc6 g3 g6 Bg2 Bg7 O-O O-O d4 cxd4 Nxd4 d6
Nf3 d5 g3 Nf6 Bg2 e6 O-O Be7 d3 O-O Nbd2 c5 e4 Nc6 Re1
Nf3 Nf6 c4 g6 Nc3 Bg7 e4 d6 d4 O-O Be2 e5 O-O`
  .split('\n').map(l=>l.trim().split(' '));

/* ---------- Settings ----------
   Move classification follows Chesskit (GuillaumeSD/Chesskit, moveClassification.ts): every number is a change in
   winning chances (win%, 0-100) for the side that moved. See js/classification/classify.js. */
export const CFG={
  brilliantMode:'sacrifice',   // 'sacrifice' (real sacrifice, see classify.js) | 'hybrid' | 'chesskit' | 'wintr' (loose-piece test only)
  stalemate:{before:40,after:45,minPiece:3},   // stalemate sacrifice: mover was at most `before` win%, the move holds at least `after` win%, and the piece given up is worth `minPiece`+
  brilliantMinWin:60,          // a sacrifice that does not lead to mate must leave the mover at least this win% (60 is about +1.0)
  depth:12, strict:1, partial:true, deepen:true, maxDepth:20,
  /* Move classes are decided by the move's accuracy (0-100), computed from the win% lost (see winPercentage.js moveAccuracy).
     The Strictness dropdown stretches or shrinks the gap to 100. */
  accT:{
    great:96,        // Great: >= 96 and a critical find (changed the outcome, or the only good move, not a simple recapture)
    brilliant:80,    // Brilliant: >= 80 and a real piece sacrifice
    best:90,         // Best: >= 90 (the engine's top move is always Best)
    excellent:85,    // Excellent: >= 85
    good:80,         // Good: >= 80
    goodFloor:75,    // 75-80 is not covered by the rules above, so it counts as Good. Set to 80 to make it an Inaccuracy.
    inaccuracy:65,   // Inaccuracy: below 75 (goodFloor) and >= 65
    mistake:40,      // Mistake: below 65 and >= 40;  Blunder: below 40
  },
  swing:10,            // Great: the move changed the outcome by at least this much win%...
  onlyMove:10,         // ...or it beat the next-best move by at least this much
  altWon:97,           // the alternative was already completely winning: nothing special about the move
  blunder:{gate:false, before:1, after:-2},   // gate:true = a Blunder also needs +1.0 before and -2.0 or worse after (pawns); otherwise Mistake
  miss:{before:60, after:35, mate:true},   // Miss: you were clearly better (win%) after the opponent erred, or had a forced mate, and let it slip
};
