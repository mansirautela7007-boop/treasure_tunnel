TREASURE TUNNEL – Integers adventure (HTML, CSS, JavaScript)

Serve the folder over HTTP (e.g. python3 -m http.server) and open index.html; keep the folders together.
Start appears at once; every image and sound downloads quietly in the background (opened straight from disk,
file://, files simply load as they're needed).
For a single file you can share, use treasure_tunnel.html (everything is built in).

FILES
index.html        Page structure
css/style.css     All styles and micro-animations
js/manifest.js    Generated: every image and sound with its size (run tools/build.py; don't edit)
js/data.js        Every line of story and game script, levels and puzzles (edit text here)
js/preload.js     Fetches every asset in the background, in chunks in play order (no loading screen)
js/audio.js       Sound effects (made in the browser), music and voice-over playback
js/game.js        Game engine: story scenes, number line, keys, map mysteries, effects
js/editor.js      Layout editor (testing only)
assets/           Images (WebP); assets/audio holds the music and voice-over clips as Ogg Opus,
                  with the original .m4a/.mp3 kept for browsers that can't play Ogg Opus
tools/            convert_media.py (new art/audio to WebP/Ogg) and build.py (manifest + single file)

ADDING OR CHANGING ART AND AUDIO
- Put the file in assets/ (or assets/audio/) and refer to it by name only, without a path or extension.
- python3 tools/convert_media.py   converts .png/.jpg to WebP and .m4a/.mp3 to Ogg Opus, keeping a converted
                                   file only if it is smaller (needs: pip install pillow imageio-ffmpeg)
- python3 tools/build.py           regenerates js/manifest.js and treasure_tunnel.html (run after any change)

EDITING
- Change dialogue, equations or hints in js/data.js. answer = start + delta.
- Sign rules card (before each chamber's keys, and again after a 4th wrong try): signRules in each level in js/data.js.
- Menu button (top right) lets you jump to any chapter for testing.
- QA panel: tap the QA button (top right) or press Q to jump to any step of any chamber
  (intro, each key, map unlock, each map puzzle, path reveal). Auto-solve (or N) answers
  the current question or presses Next. Set QA_PANEL = false at the end of js/data.js before release.
- Layout editor: tap the pencil button (top right) or press E. Click anything to select it; drag to move,
  drag handles to resize, top dot to rotate, H / V to flip. Changes are saved in this browser and shown in
  the game. Copy JSON / Download JSON gives exact positions (1280x720 stage px) to hand to an AI.
  Set EDITOR = false at the end of js/data.js before release.
- Keyboard: digits, '-' for negative, Backspace, Enter = GO, arrows for direction, Enter/Space = next.

NOTES
- Every line has a recorded voice-over (RECORDED_VO in js/data.js); a line without one falls back to the browser's speech.
- Fonts (Lilita One, Baloo 2) load from Google Fonts; without internet a fallback font is used.
