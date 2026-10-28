TREASURE TUNNEL – Integers adventure (HTML, CSS, JavaScript)

Open index.html in Chrome or Edge to play. Images load from the assets folder, so keep the folders together.
For a single file you can share, use treasure_tunnel.html (everything is built in).

FILES
index.html        Page structure
css/style.css     All styles and micro-animations
js/data.js        Every line of story and game script, levels and puzzles (edit text here)
js/audio.js       Sound effects (made in the browser), music and voice-over playback
js/game.js        Game engine: story scenes, number line, keys, map mysteries, effects
assets/           Your images (WebP); assets/audio holds the music and voice-over clips

EDITING
- Change dialogue, equations or hints in js/data.js. answer = start + delta.
- Menu button (top right) lets you jump to any chapter for testing.
- QA panel: tap the QA button (top right) or press Q to jump to any step of any chamber
  (intro, each key, map unlock, each map puzzle, path reveal, badge). Auto-solve (or N) answers
  the current question or presses Next. Set QA_PANEL = false at the end of js/data.js before release.
- Layout editor: tap the pencil button (top right) or press E. Click anything to select it; drag to move,
  drag handles to resize, top dot to rotate, H / V to flip. Changes are saved in this browser and shown in
  the game. Copy JSON / Download JSON gives exact positions (1280x720 stage px) to hand to an AI.
  Set EDITOR = false at the end of js/data.js before release.
- Keyboard: digits, '-' for negative, Backspace, Enter = GO, arrows for direction, Enter/Space = next.

NOTES
- Every line has a recorded voice-over (RECORDED_VO in js/data.js); a line without one falls back to the browser's speech.
- Fonts (Lilita One, Baloo 2) load from Google Fonts; without internet a fallback font is used.
