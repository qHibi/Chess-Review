# Analysis Board

Serve this folder over http (ES modules + openings.txt need it), e.g. `python3 -m http.server`, then open index.html.

- `index.html` markup only · `css/` one file per area · `openings.txt`, `images/moves/`
- `js/main.js` events + startup · `config.js` constants/settings (CFG holds all classification thresholds) · `state.js` · `util.js`
- `js/engine.js` Stockfish WASM/asm worker pool · `analysis.js` batch analysis + whole-game deepening · `live.js` variations/live engine · `derive.js` partial analysis
- `js/classification/` `classify.js` (Chesskit port), `winPercentage.js`, `pieces.js` (sacrifice/recapture helpers)
- `js/ui/` board, panels, moves, summary, menu (edit classification), picker (colour wheel), icons
- `js/nav.js` navigation + variations · `pgn.js` · `openings.js` · `theme.js` · `accuracy.js`

## What changed (v3)
- **Stockfish 19** (`stockfish@19.0.1`): `js/config.js` (`SF`, `ENGINE_DIR`) + `js/engine.js`. Engine files are loaded from `document.baseURI + 'engine/'`:
  `engine/stockfish-19.js` + `.wasm` (full, multi-threaded, ~94 MB), `engine/stockfish-19-lite.js` + `.wasm` (small, threaded). Copy them from the npm package's `bin/` folder
  (`npm pack stockfish@19.0.1`) or the v19.0.1 GitHub release. Missing files fall through: full -> lite -> lite single-thread from the CDN -> classic asm.
  GitHub's web uploader stops at 25 MB, so add the 94 MB wasm with git (hard limit 100 MB/file).
- **Threads** need cross-origin isolation: `coi-sw.js` (service worker) + `js/coi.js` add the headers; the first visit reloads once.
  With a threaded engine "Engines: Auto" uses one worker that gets all cores.
- **Move ratings** are driven by move accuracy (`CFG.accT` in `js/config.js`): Great >= 96 (critical find), Brilliant >= 80 (piece sacrifice), Best >= 90, Excellent >= 85, Good >= 80,
  Inaccuracy < 75, Mistake < 65, Blunder < 40. 75-80 is not covered by those rules and counts as Good (`goodFloor`). `CFG.blunder.gate` can re-enable the old "must throw away a win" rule.
- **Game rating**: accuracy + estimated rating per side, for the whole game and for opening / middlegame / endgame (`js/phase.js`, `js/ui/summary.js`, `js/accuracy.js`).
- **Import** from Lichess / Chess.com (`js/importer.js`, card in `index.html`). Both APIs are public: no API key needed.
