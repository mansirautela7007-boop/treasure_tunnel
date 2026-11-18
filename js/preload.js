/* Preloader: every image and sound in js/manifest.js is fetched in the background from the moment the page opens
   (no loading screen: Start is there at once, and a file not here yet is used from its own URL).
   - In chunks, in the order they're played: the cover (and its title line), then the story together with what
     every part shares (sprites, buttons, the music), chamber 1, chamber 2, chamber 3, the ending. A chunk is what that part's script (data.js)
     names: its pictures and the recordings of its lines (RECORDED_VO). Smallest first within a chunk; at most
     5 transfers at once. Jumping ahead (the menu, Back, QA) moves that part's chunk to the front: Preload.want().
   - Progress is counted in bytes as they stream in, weighted by each file's real size (from the manifest, refined by
     the server's Content-Length), and never goes backwards.
   - A finished file becomes a blob: URL, so "loaded" means it is local: ASSET() and the voice/music players take the
     blob from Preload.url(). If a blob ever fails to play or show, Preload.original() gives the file's own URL.
   - A file that fails, stalls (no data for 15 s) or can't be fetched at all (file://) still counts as done; it keeps
     its normal URL, so the game never waits on it.
   - The single-file build has everything inline (data: URLs in window.ASSETS / window.AUDIO): done at once.
   Audio is Ogg Opus where the browser plays it (Chrome, Edge, Firefox, recent Safari), else the original .m4a/.mp3. */
const Preload = (() => {
  const M = window.MANIFEST || { images: {}, audio: {} };
  const OGG = (() => { try { return !!new Audio().canPlayType('audio/ogg; codecs="opus"'); } catch (e) { return false; } })();
  const files = {}; // name → { url, bytes, got, inline, blob, done, waiters }
  for (const [name, [url, bytes]] of Object.entries(M.images))
    files[name] = { name, url, bytes, inline: window.ASSETS && window.ASSETS[name] };
  for (const [name, a] of Object.entries(M.audio)) {
    const [url, bytes] = OGG && a.ogg ? a.ogg : a.src || a.ogg;
    files[name] = { name, url, bytes, inline: window.AUDIO && window.AUDIO[name] };
  }
  const all = Object.values(files), listeners = [], byBlob = {};
  let shown = 0, finished = 0, resolveReady;
  const ready = new Promise(r => { resolveReady = r; });

  function report() {
    const want = all.reduce((s, f) => s + f.bytes, 0), got = all.reduce((s, f) => s + (f.done ? f.bytes : Math.min(f.got || 0, f.bytes)), 0);
    shown = Math.max(shown, want ? got / want : 1); // monotonic
    listeners.forEach(fn => fn(shown, finished, all.length));
  }
  function finish(f, blob) {
    if (f.done) return;
    f.done = true; finished++;
    if (blob) { f.blob = URL.createObjectURL(blob); byBlob[f.blob] = f.url; }
    (f.waiters || []).forEach(w => w(f.blob || f.inline || f.url)); f.waiters = null;
    report();
    if (finished === all.length) { shown = 1; listeners.forEach(fn => fn(1, finished, all.length)); resolveReady(); }
  }
  // one transfer: streamed so progress moves within big files; aborted if no data arrives for 15 s
  async function fetchOne(f) {
    const ctl = new AbortController(); let stall = setTimeout(() => ctl.abort(), 15000);
    const poke = () => { clearTimeout(stall); stall = setTimeout(() => ctl.abort(), 15000); };
    try {
      const res = await fetch(f.url, { signal: ctl.signal });
      if (!res.ok) throw new Error(`${res.status} ${f.url}`);
      const len = +res.headers.get('Content-Length');
      if (len > 0 && len !== f.bytes) { f.bytes = len; report(); } // the server's size is the exact one
      const type = res.headers.get('Content-Type') || '';
      let blob;
      if (res.body && res.body.getReader) {
        const reader = res.body.getReader(), parts = [];
        for (;;) {
          const { done, value } = await reader.read(); poke();
          if (done) break;
          parts.push(value); f.got = (f.got || 0) + value.length; report();
        }
        blob = new Blob(parts, { type });
      } else blob = await res.blob();
      finish(f, blob);
    } catch (e) {
      finish(f, null); // failed, stalled or blocked: the file keeps its own URL
    } finally { clearTimeout(stall); }
  }
  // chunks: each part of the game claims the files its script names (the earliest part wins a shared one);
  // whatever no part names (sprites, buttons, the music) is the shared chunk: needed from the story on, so it loads with it
  const uses = data => {
    const out = new Set();
    const walk = v => {
      if (typeof v === 'string') { if (files[v]) out.add(v); const clip = typeof RECORDED_VO !== 'undefined' && RECORDED_VO[v]; if (clip && files[clip]) out.add(clip); }
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(data); return out;
  };
  const levels = typeof LEVELS !== 'undefined' ? LEVELS : [];
  const parts = [['story', typeof STORY_INTRO !== 'undefined' && STORY_INTRO], ...levels.map((l, i) => [i, l]), ['end', [typeof STORY_END !== 'undefined' && STORY_END, typeof FINAL_BADGE !== 'undefined' && FINAL_BADGE]]];
  const RANK = { story: 1, end: 3 + levels.length }; levels.forEach((_, i) => { RANK[i] = 3 + i; });
  all.forEach(f => { f.part = f.name.startsWith('cover_') || f.name === 'vo_title' ? 'cover' : null; });
  for (const [part, data] of parts) uses(data).forEach(n => { if (!files[n].part) files[n].part = part; });
  all.forEach(f => { f.part = f.part ?? 'shared'; f.rank = f.part === 'cover' ? 0 : f.part === 'shared' ? 1 : RANK[f.part]; f.boost = 0; });
  let queue = [], boosts = 0;
  const order = () => queue.sort((a, b) => b.boost - a.boost || a.rank - b.rank || a.bytes - b.bytes);

  function start() {
    // inline files (single-file build) are already here
    all.filter(f => f.inline).forEach(f => finish(f, null));
    queue = all.filter(f => !f.done); order();
    if (!queue.length) { report(); return; }
    const worker = async () => { while (queue.length) await fetchOne(queue.shift()); };
    for (let i = 0; i < 5; i++) worker();
  }

  const api = {
    ogg: OGG,
    ready,
    // the player is about to play this part ('story', a chamber's index, 'end'): its chunk downloads next
    want(part) {
      const b = ++boosts; let n = 0;
      queue.forEach(f => { if (f.part === part || f.part === 'shared') { f.boost = b; n++; } });
      if (n) order();
    },
    partOf: name => files[name] && files[name].part,
    // which chunk each file is in, and each chunk's size (for testing)
    get chunks() { const c = {}; all.forEach(f => { const k = c[f.part] = c[f.part] || { files: 0, bytes: 0, done: 0 }; k.files++; k.bytes += f.bytes; k.done += f.done ? 1 : 0; }); return c; },
    get done() { return finished === all.length; },
    get progress() { return shown; },
    onProgress(fn) { listeners.push(fn); fn(shown, finished, all.length); },
    // the URL to use now: the local blob once fetched, the inline data in the single-file build, else the file
    url(name) { const f = files[name]; return f ? f.blob || f.inline || f.url : null; },
    // the same, once that file's preload has finished (or failed)
    get(name) { const f = files[name]; if (!f) return Promise.resolve(null); if (f.done) return Promise.resolve(api.url(name)); return new Promise(r => (f.waiters = f.waiters || []).push(r)); },
    // the file's own URL for a blob that failed (or for an asset name)
    original(urlOrName) { return byBlob[urlOrName] || (files[urlOrName] && files[urlOrName].url) || urlOrName; },
    isBlob: u => typeof u === 'string' && u.startsWith('blob:'),
  };
  start();
  return api;
})();
