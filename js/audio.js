/* Sound: every effect is synthesised with the Web Audio API (no audio files).
   Voice: the browser's built-in speech synthesis reads each line aloud. */

/* Clock: the pause button freezes the whole game. Every timer, interval and animation frame goes through it,
   so a paused game keeps each one's time left and carries on from there when it resumes. */
const Clock = (() => {
  const nT = setTimeout.bind(window), nC = clearTimeout.bind(window), nRAF = requestAnimationFrame.bind(window);
  const timers = new Map(), held = []; let paused = false, seq = 0, frozen = [];
  const arm = (id, t, ms) => { t.due = performance.now() + ms; t.h = nT(() => fire(id), ms); };
  function fire(id) { const t = timers.get(id); if (!t) return; if (t.rep) arm(id, t, t.ms); else timers.delete(id); t.fn(...t.args); }
  function add(fn, ms, args, rep) {
    const id = ++seq, t = { fn: typeof fn === 'function' ? fn : () => {}, args, ms: Math.max(rep ? 1 : 0, +ms || 0), rep };
    timers.set(id, t); if (paused) t.left = t.ms; else arm(id, t, t.ms); return id;
  }
  function clear(id) { const t = timers.get(id); if (t) { nC(t.h); timers.delete(id); } }
  window.setTimeout = (fn, ms, ...args) => add(fn, ms, args, false);
  window.setInterval = (fn, ms, ...args) => add(fn, ms, args, true);
  window.clearTimeout = window.clearInterval = clear;
  window.requestAnimationFrame = cb => nRAF(ts => { if (paused) held.push(cb); else cb(ts); });
  return {
    get paused() { return paused; },
    // `keep` is the element whose own animations carry on (the pause menu)
    pause(keep) {
      if (paused) return; paused = true; const now = performance.now();
      timers.forEach(t => { nC(t.h); t.left = Math.max(0, t.due - now); });
      frozen = document.getAnimations().filter(a => a.playState === 'running' && !(keep && keep.contains(a.effect && a.effect.target)));
      frozen.forEach(a => a.pause());
    },
    resume() {
      if (!paused) return; paused = false;
      timers.forEach((t, id) => arm(id, t, t.left));
      frozen.forEach(a => { try { a.play(); } catch (e) {} }); frozen = [];
      held.splice(0).forEach(cb => nRAF(cb));
    },
  };
})();

const Sound = (() => {
  let ctx = null, master, sfx, amb, mus, on = true, ambTimer = null, drone = null, music = null, musicWanted = false, ducked = false, held = false;
  const MUSIC_DEFAULT = 0.2, DUCK = 0.4; // music sits under the voice; it dips further while a line is spoken
  let musicVol = MUSIC_DEFAULT; // the QA panel's slider can change the volume

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    ctx.onstatechange = () => document.dispatchEvent(new Event('tt-sound'));
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = 0.7; sfx.connect(master);
    amb = ctx.createGain(); amb.gain.value = 0.0; amb.connect(master);
    mus = ctx.createGain(); mus.gain.value = 0; mus.connect(master);
    startAmbience();
    if (musicWanted) startMusic();
  }

  function tone(freq, dur, { type = 'sine', vol = 0.2, slide = null, delay = 0, attack = 0.005, out = null } = {}) {
    if (!ctx || !on) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out || sfx); o.start(t); o.stop(t + dur + 0.05);
  }

  function noise(dur, { vol = 0.2, freq = 800, q = 1, type = 'lowpass', sweep = null, delay = 0 } = {}) {
    if (!ctx || !on) return;
    const t = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfx); src.start(t); src.stop(t + dur + 0.02);
  }

  const notes = (list, step, opts) => list.forEach((f, i) => tone(f, opts.dur || 0.18, { ...opts, delay: (opts.delay || 0) + i * step }));

  const fx = {
    tap()     { tone(880, 0.06, { type: 'triangle', vol: 0.12 }); },
    pop()     { tone(520, 0.09, { vol: 0.16, slide: 900 }); },
    // character "voices": short, bouncy syllables while their words type out (wizard low and wobbly, explorer high and quick)
    talk(who) {
      const w = who === 'wizard';
      const base = w ? 170 + Math.random() * 70 : 380 + Math.random() * 140;
      tone(base, w ? 0.09 : 0.06, { type: w ? 'sawtooth' : 'square', vol: w ? 0.035 : 0.03, slide: base * (Math.random() < .5 ? 1.25 : .82), attack: .01 });
      tone(base * 2, w ? 0.07 : 0.05, { type: 'sine', vol: 0.04 });
    },
    step()    { noise(0.09, { vol: 0.35, freq: 380 }); tone(110, 0.09, { vol: 0.18, slide: 70 }); },
    count(n)  { tone(600 + Math.min(n, 15) * 40, 0.08, { type: 'triangle', vol: 0.09 }); },
    jump()    { tone(280, 0.18, { type: 'square', vol: 0.06, slide: 620 }); },
    key()     { notes([784, 988, 1175, 1568], 0.07, { type: 'triangle', vol: 0.16, dur: 0.25 });
                notes([2093, 2637], 0.05, { vol: 0.05, dur: 0.3, delay: 0.3 }); },
    wrong()   { tone(260, 0.32, { type: 'sine', vol: 0.22, slide: 120 }); tone(130, 0.3, { type: 'triangle', vol: 0.1, delay: 0.04 }); },
    thud()    { noise(0.2, { vol: 0.4, freq: 250 }); },
    poof()    { noise(0.45, { vol: 0.28, type: 'bandpass', freq: 400, sweep: 3200, q: 0.8 }); tone(500, 0.3, { vol: 0.08, slide: 1400, delay: 0.05 }); },
    whoosh()  { noise(0.35, { vol: 0.2, type: 'bandpass', freq: 300, sweep: 2000, q: 1.2 }); },
    coin()    { tone(988, 0.07, { type: 'square', vol: 0.06 }); tone(1319, 0.2, { type: 'square', vol: 0.06, delay: 0.07 }); },
    gem()     { tone(1568, 0.35, { vol: 0.12 }); tone(2093, 0.4, { vol: 0.08, delay: 0.06 }); },
    unlock()  { noise(0.06, { vol: 0.5, type: 'highpass', freq: 2000 }); noise(0.08, { vol: 0.4, type: 'highpass', freq: 1500, delay: 0.12 });
                notes([523, 659, 784, 1047], 0.08, { type: 'triangle', vol: 0.14, dur: 0.35, delay: 0.25 }); },
    reveal()  { tone(600, 0.6, { type: 'triangle', vol: 0.1, slide: 1400 });
                notes([1319, 1568, 1976, 2637], 0.06, { vol: 0.05, dur: 0.25, delay: 0.25 }); },
    fanfare() { notes([523, 659, 784], 0.12, { type: 'triangle', vol: 0.14, dur: 0.2 });
                tone(1047, 0.6, { type: 'triangle', vol: 0.16, delay: 0.36 });
                tone(523, 0.6, { type: 'square', vol: 0.04, delay: 0.36 }); },
    streak()  { notes([440, 554, 659, 880], 0.06, { type: 'sawtooth', vol: 0.05, dur: 0.15 }); noise(0.5, { vol: 0.15, type: 'bandpass', freq: 600, sweep: 2500, delay: 0.1 }); },
    creak()   { tone(90, 0.7, { type: 'sawtooth', vol: 0.05, slide: 160 }); },
    sparkle() { notes([1760, 2217, 2637], 0.05, { vol: 0.05, dur: 0.2 }); },
    // every key of a chamber collected: two party-popper cracks, a quick rising run and a shower of twinkles
    celebrate() { noise(0.1, { vol: 0.5, type: 'highpass', freq: 1800 }); noise(0.1, { vol: 0.42, type: 'highpass', freq: 2400, delay: 0.16 });
                  notes([523, 659, 784, 1047, 1319], 0.07, { type: 'triangle', vol: 0.14, dur: 0.22, delay: 0.08 });
                  tone(1568, 0.55, { type: 'triangle', vol: 0.12, delay: 0.45 });
                  notes([2093, 2637, 3136, 2637, 3520], 0.06, { vol: 0.045, dur: 0.18, delay: 0.5 }); },
  };

  function startAmbience() {
    if (!ctx) return;
    amb.gain.setTargetAtTime(on && !held ? 0.5 : 0, ctx.currentTime, 0.8);
    if (!drone) {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; lp.connect(amb);
      const g = ctx.createGain(); g.gain.value = 0.05; g.connect(lp);
      [55, 55.6, 82.4].forEach(f => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(g); o.start(); });
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.08; lg.gain.value = 0.025;
      lfo.connect(lg); lg.connect(g.gain); lfo.start();
      drone = g;
    }
    clearInterval(ambTimer);
    ambTimer = setInterval(() => {
      if (!on || Math.random() < 0.45) return;
      tone(1300 + Math.random() * 600, 0.12, { vol: 0.03, slide: 500, out: amb });
    }, 2600);
  }

  /* background music: "Treasure Hunter" by TAD (CC0, opengameart.org/content/treasure-hunter), bgm_treasure_hunter in the manifest.
     Played through Web Audio so the loop has no gap; the silence the encoder adds at each end is trimmed off.
     It starts once the preloader has it (no second download); if the local copy won't decode, the file itself is tried. */
  function musicLevel(t = 0.6) { if (ctx && mus) mus.gain.setTargetAtTime(on && musicWanted && !held ? musicVol * (ducked ? DUCK : 1) : 0, ctx.currentTime, t); }
  async function startMusic() {
    musicWanted = true;
    if (!ctx) return; // starts once sound is unlocked by the first tap
    musicLevel(1.2);
    if (music) return;
    music = 'loading';
    try {
      const decode = async url => ctx.decodeAudioData(await (await fetch(url)).arrayBuffer());
      const url = await Preload.get('bgm_treasure_hunter');
      const buf = await decode(url).catch(e => { if (Preload.isBlob(url)) return decode(Preload.original(url)); throw e; });
      const d = buf.getChannelData(0), loud = i => Math.abs(d[i]) > 0.002;
      let a = 0, b = d.length - 1;
      while (a < d.length && !loud(a)) a++;
      while (b > a && !loud(b)) b--;
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true; src.loopStart = a / buf.sampleRate; src.loopEnd = (b + 1) / buf.sampleRate;
      src.connect(mus); src.start(0, src.loopStart); music = src;
    } catch (e) { music = null; } // no music file: the game plays on without it
  }
  function duck(on_) { ducked = on_; musicLevel(on_ ? 0.15 : 0.8); }

  return {
    init, music: startMusic, duck,
    // leaving the tab or window silences every sound (music, ambience, effects); coming back resumes it
    // (a paused game stays quiet through hold())
    away(a) { if (!ctx) return; if (a) ctx.suspend(); else ctx.resume(); },
    get running() { return !!ctx && ctx.state === 'running'; },
    get musicVolume() { return musicVol; },
    set musicVolume(v) { musicVol = Math.max(0, Math.min(1, v)); musicLevel(0.05); },
    MUSIC_DEFAULT,
    fx: new Proxy(fx, { get: (o, k) => (...a) => { try { o[k](...a); } catch (e) {} } }),
    get on() { return on; },
    toggle() { on = !on; if (ctx) amb.gain.setTargetAtTime(on && !held ? 0.5 : 0, ctx.currentTime, 0.3); musicLevel(0.3); return on; },
    // the paused game: music and ambience fall silent (button taps still sound)
    hold(h) { held = !!h; if (ctx) amb.gain.setTargetAtTime(on && !held ? 0.5 : 0, ctx.currentTime, 0.15); musicLevel(0.15); },
  };
})();

const Voice = (() => {
  let on = true, voice = null;
  const synth = window.speechSynthesis;
  // each character gets their own voice: the wizard deep and slow, the explorer bright and quick
  const VOICES = { wizard: { pitch: 0.55, rate: 0.88 }, explorer: { pitch: 1.45, rate: 1.06 }, narrator: { pitch: 1.0, rate: 0.95 } };
  const byWho = {};

  function pick() {
    if (!synth) return;
    const v = synth.getVoices(), en = v.filter(x => /^en/i.test(x.lang));
    const named = re => en.find(x => re.test(x.name));
    voice = v.find(x => /en[-_]IN/i.test(x.lang)) || v.find(x => /en[-_]GB/i.test(x.lang)) || en[0] || null;
    // a male storyteller voice for the wizard, a young-sounding voice for the explorer (when the device has them)
    byWho.wizard = named(/Daniel|Rishi|Fred|Ralph|Google UK English Male|Male|David|George|Arthur/i) || voice;
    byWho.explorer = named(/Samantha|Karen|Moira|Tessa|Google US English|Female|Zira|Aria|Jenny/i) || voice;
    byWho.narrator = voice;
  }
  if (synth) { pick(); synth.onvoiceschanged = pick; }

  // Make integers sound right: "−7" → "negative 7", "(+7) − 4" → "positive 7 minus 4".
  function speakable(t) {
    return t.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
      .replace(/(^|[\s(])\+(\d+)/g, '$1positive $2')
      .replace(/(^|[\s(])[−-](\d+)/g, '$1negative $2')
      .replace(/\s[−-]\s/g, ' minus ').replace(/\s\+\s/g, ' plus ')
      .replace(/=\s*\?/g, 'equals what?').replace(/→/g, ', ').replace(/[()…]/g, ' ')
      .replace(/Hahaha/g, 'Ha ha ha').replace(/Wohoo/g, 'Woo hoo').replace(/Yayy/g, 'Yay');
  }

  // Recorded ElevenLabs clips (named in the manifest): the preloaded local copy when there is one.
  // Falls back to browser speech if a clip can't be played at all.
  let clipEl = null, cueTimers = [];
  const CLIP = n => Preload.url(n);
  // (a stopped clip's watchdog keeps running: it still finishes the line, so nothing waiting on it is left stuck)
  function stopClip() { if (clipEl) { clipEl.onended = clipEl.onerror = clipEl.ontimeupdate = null; clipEl.pause(); clipEl = null; } }
  function clearCues() { cueTimers.forEach(clearTimeout); cueTimers = []; }

  // cues: [{ word, fn }] — fn runs once when that word is spoken (first occurrence).
  // Speech reports words as it reaches them; without that (or with voice off) the moment is estimated
  // from where the word sits in the line; a recorded clip uses its playback position.
  function say(text, who = 'narrator', clip = null, cues = null) {
    // a line with a recorded voice-over always uses it (see RECORDED_VO in data.js)
    if (typeof RECORDED_VO !== 'undefined' && RECORDED_VO[text]) clip = RECORDED_VO[text];
    Sound.duck(true);
    return sayLine(text, who, clip, cues).finally(() => { if (!speaking) Sound.duck(false); });
  }
  let speaking = 0;
  function sayLine(text, who, clip, cues) {
    const me = ++speaking;
    return new Promise(res0 => {
      const res = () => { if (speaking === me) speaking = 0; res0(); };
      const est = Math.min(9000, 900 + text.length * 62);
      stopClip(); clearCues();
      const spoken = speakable(text), lower = spoken.toLowerCase();
      const pending = (cues || []).map(c => ({ ...c, at: Math.max(0, lower.search(new RegExp(`\\b${c.word.toLowerCase()}`))) }));
      const fire = c => { const i = pending.indexOf(c); if (i >= 0) { pending.splice(i, 1); c.fn(); } };
      const estimate = (ms, slack = 0) => pending.slice().forEach(c => cueTimers.push(setTimeout(() => fire(c), ms * c.at / Math.max(1, spoken.length) + slack)));
      if (!on) { estimate(Math.min(est, 2600)); setTimeout(res, Math.min(est, 2600)); return; }
      if (clip) {
        // a clip is a name, or { clip, start, end } for part of a recording; a list plays one after another
        const list = [].concat(clip).map(c => typeof c === 'string' ? { clip: c } : c);
        let done = false; const fin = () => { if (!done) { done = true; res(); } };
        const play = i => {
          const it = list[i], a = new Audio(CLIP(it.clip)); clipEl = a;
          if (it.start) { const seek = () => { a.currentTime = it.start; }; if (a.readyState >= 1) seek(); else a.addEventListener('loadedmetadata', seek, { once: true }); }
          // cues fire at their word's share of the part actually played (a trimmed clip is shorter than its file)
          const cueTick = () => { const s0 = it.start || 0, len = (it.end || a.duration) - s0; if (len > 0 && list.length === 1) pending.slice().forEach(c => { if ((a.currentTime - s0) / len >= c.at / spoken.length) fire(c); }); };
          a.ontimeupdate = cueTick; const cueT = setInterval(() => { if (clipEl !== a || a.ended) return clearInterval(cueT); if (!a.paused) cueTick(); }, 60);
          a.onended = () => { if (clipEl !== a) return; clearTimeout(a._dog); if (i + 1 < list.length) play(i + 1); else { pending.slice().forEach(fire); fin(); } };
          if (it.end) { const t = setInterval(() => { if (clipEl !== a) return clearInterval(t); if (a.currentTime >= it.end) { clearInterval(t); a.pause(); a.onended(); } }, 30); } // stop at the end of the part we want
          // watchdog: the line moves on even if the clip never reports its end, or was stopped (voice turned off
          // mid-line). 15 s until the clip's length is known, then its length plus 3 s; it runs on the game clock, so a
          // paused game doesn't trip it
          const arm = ms => { clearTimeout(a._dog); a._dog = setTimeout(() => { if (clipEl === a) { a.pause(); a.onended(); } else fin(); }, ms); };
          arm(15000);
          a.addEventListener('loadedmetadata', () => { const len = (it.end || a.duration) - (it.start || 0); if (isFinite(len) && len > 0) arm(len * 1000 + 3000); });
          // a local copy that won't play is retried once from the file itself; after that, the browser reads the line
          a.onerror = () => {
            if (clipEl !== a) return;
            if (!a._retried && Preload.isBlob(a.src)) { a._retried = true; a.src = Preload.original(a.src); const q = a.play(); if (q && q.catch) q.catch(() => a.onerror && a.onerror()); return; }
            clearTimeout(a._dog); clipEl = null; sayLine(text, who, null, null).then(fin);
          };
          const p = a.play(); if (p && p.catch) p.catch(() => a.onerror && a.onerror());
        };
        if (synth) synth.cancel();
        play(0);
        return;
      }
      if (!synth) { setTimeout(res, Math.min(est, 2600)); return; }
      synth.cancel(); synth.resume(); // never left stuck paused
      if (pending.length) estimate(est, 1200); // only used if this browser never reports word boundaries
      const p = VOICES[who] || VOICES.narrator, vv = byWho[who] || voice;
      let done = false, safety = null;
      const fin = () => { if (!done) { done = true; clearTimeout(safety); if (live === line) live = null; res(); } };
      // a line cut off by leaving the tab is said again from the start on coming back (see away)
      const line = {
        speak() {
          const u = new SpeechSynthesisUtterance(spoken);
          if (pending.length) u.onboundary = e => {
            if (e.name && e.name !== 'word') return;
            clearCues();
            const w = (lower.slice(e.charIndex).match(/^[a-z]+/) || [''])[0];
            pending.slice().forEach(c => { if (w === c.word.toLowerCase() || e.charIndex >= c.at) fire(c); });
          };
          if (vv) u.voice = vv;
          u.pitch = p.pitch; u.rate = p.rate; u.volume = 1;
          u.onend = u.onerror = () => { if (line.u === u) fin(); };
          line.u = u; clearTimeout(safety); safety = setTimeout(fin, est + 2500); // some browsers never fire onend
          synth.speak(u);
        },
        cut() { line.u = null; clearTimeout(safety); },
      };
      live = line; line.speak();
    });
  }

  // leaving the tab or window pauses a recorded clip and stops the browser's speech (Chrome's speech can stay stuck if
  // it's paused, which silences every later line); coming back resumes the clip and says the cut line again
  let live = null, cutLine = null, held = false;
  function away(a) {
    if (a) {
      // only a clip that was actually playing is paused and later resumed (a finished line is never replayed)
      if (clipEl && !clipEl.paused && !clipEl.ended) { clipEl.pause(); clipEl._tabPaused = true; }
      if (live && live.u) { cutLine = live; live.cut(); }
      if (synth && (synth.speaking || synth.pending || synth.paused)) synth.cancel();
    } else if (!held) wake(); // the pause menu is open: closing it carries on (resume)
  }
  function wake() {
    if (clipEl && clipEl._tabPaused) { clipEl._tabPaused = false; clipEl.play().catch(() => {}); }
    if (synth) synth.resume();
    if (cutLine) { const l = cutLine; cutLine = null; if (live === l) l.speak(); }
  }

  return {
    // the pause button: the line stops mid-word and carries on from there
    pause() { held = true; if (clipEl && !clipEl.paused && !clipEl.ended) { clipEl.pause(); clipEl._held = true; } if (synth && synth.speaking) synth.pause(); },
    resume() { held = false; if (clipEl && clipEl._held) { clipEl._held = false; clipEl.play().catch(() => {}); } if (synth && synth.paused) synth.resume(); wake(); },
    away,
    say, stop() { stopClip(); clearCues(); live = cutLine = null; if (synth) synth.cancel(); speaking = 0; Sound.duck(false); },
    get on() { return on; },
    toggle() { on = !on; if (!on) { stopClip(); if (synth) synth.cancel(); } return on; },
  };
})();
