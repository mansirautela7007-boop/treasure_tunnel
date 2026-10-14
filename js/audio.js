/* Sound: every effect is synthesised with the Web Audio API (no audio files).
   Voice: the browser's built-in speech synthesis reads each line aloud. */

const Sound = (() => {
  let ctx = null, master, sfx, amb, on = true, ambTimer = null, drone = null;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = 0.7; sfx.connect(master);
    amb = ctx.createGain(); amb.gain.value = 0.0; amb.connect(master);
    startAmbience();
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
  };

  function startAmbience() {
    if (!ctx) return;
    amb.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.8);
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

  return {
    init, fx: new Proxy(fx, { get: (o, k) => (...a) => { try { o[k](...a); } catch (e) {} } }),
    get on() { return on; },
    toggle() { on = !on; if (ctx) amb.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.3); return on; },
  };
})();

const Voice = (() => {
  let on = true, voice = null;
  const synth = window.speechSynthesis;
  const VOICES = { wizard: { pitch: 0.75, rate: 0.92 }, explorer: { pitch: 1.35, rate: 1.02 }, narrator: { pitch: 1.0, rate: 0.95 } };

  function pick() {
    if (!synth) return;
    const v = synth.getVoices();
    voice = v.find(x => /en[-_]IN/i.test(x.lang)) || v.find(x => /en[-_]GB/i.test(x.lang)) || v.find(x => /^en/i.test(x.lang)) || null;
  }
  if (synth) { pick(); synth.onvoiceschanged = pick; }

  // Make integers sound right: "−7" → "negative 7", "(+7) − 4" → "positive 7 minus 4".
  function speakable(t) {
    return t.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
      .replace(/(^|[\s(])\+(\d+)/g, '$1positive $2')
      .replace(/(^|[\s(])[−-](\d+)/g, '$1negative $2')
      .replace(/\s[−-]\s/g, ' minus ').replace(/\s\+\s/g, ' plus ')
      .replace(/=\s*\?/g, 'equals what?').replace(/→/g, ', ').replace(/[()…]/g, ' ')
      .replace(/Hahaha/g, 'Ha ha ha').replace(/Wohoo/g, 'Woo hoo');
  }

  // Recorded ElevenLabs clips (assets/audio/<clip>.mp3). Falls back to browser speech if a file is missing.
  let clipEl = null;
  const CLIP = n => (window.AUDIO && window.AUDIO[n]) || `assets/audio/${n}.mp3`;
  function stopClip() { if (clipEl) { clipEl.onended = clipEl.onerror = null; clipEl.pause(); clipEl = null; } }

  function say(text, who = 'narrator', clip = null) {
    return new Promise(res => {
      const est = Math.min(9000, 900 + text.length * 62);
      stopClip();
      if (!on) { setTimeout(res, Math.min(est, 2600)); return; }
      if (clip) {
        const a = new Audio(CLIP(clip)); clipEl = a;
        let done = false; const fin = () => { if (!done) { done = true; res(); } };
        a.onended = fin;
        a.onerror = () => { if (clipEl === a) { clipEl = null; say(text, who).then(fin); } };
        if (synth) synth.cancel();
        const p = a.play(); if (p && p.catch) p.catch(() => a.onerror && a.onerror());
        setTimeout(fin, 15000);
        return;
      }
      if (!synth) { setTimeout(res, Math.min(est, 2600)); return; }
      synth.cancel();
      const u = new SpeechSynthesisUtterance(speakable(text));
      const p = VOICES[who] || VOICES.narrator;
      if (voice) u.voice = voice;
      u.pitch = p.pitch; u.rate = p.rate; u.volume = 1;
      let done = false; const fin = () => { if (!done) { done = true; res(); } };
      u.onend = fin; u.onerror = fin;
      setTimeout(fin, est + 2500); // some browsers never fire onend
      synth.speak(u);
    });
  }

  return {
    say, stop() { stopClip(); if (synth) synth.cancel(); },
    get on() { return on; },
    toggle() { on = !on; if (!on) { stopClip(); if (synth) synth.cancel(); } return on; },
  };
})();
