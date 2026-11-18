/* ===== Treasure Tunnel – game engine ===== */
(() => {
'use strict';

const $ = s => document.querySelector(s);
// art by name (js/manifest.js has the files): the preloaded local copy once it's here, else the file
const ASSET = n => Preload.url(n);
// a local copy that fails to show is swapped back to the file itself, once
document.addEventListener('error', e => {
  const el = e.target;
  if (el && el.tagName === 'IMG' && Preload.isBlob(el.src) && !el._retried) { el._retried = true; el.src = Preload.original(el.src); }
}, true);
const RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
let STEP = 112; // stone spacing, set per level in NL.build
const MIN = -25, MAX = 25;
const STAGE_W = 1280, STAGE_H = 720;
const stage = $('#stage');

/* One formatter for every number shown anywhere. */
const fmt = v => v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : '0';
const cls = v => v > 0 ? 'pos' : v < 0 ? 'neg' : 'zer';
const numHTML = v => `<span class="${cls(v)}">${fmt(v)}</span>`;

/* ---------- inline art ---------- */
// the key everywhere in the game: ui_key (upright, head at the top), set once the preloader has it
let KEY_SVG = '';
Preload.get('ui_key').then(url => { KEY_SVG = `<img class="keyart" src="${url}" alt="" draggable="false">`; });
const ICONS = {
  menu: `<svg viewBox="0 0 24 24" fill="#fff"><rect x="6" y="5" width="4" height="14" rx="1.5"/><rect x="14" y="5" width="4" height="14" rx="1.5"/></svg>`,
  back: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5l-7 7 7 7M4 12h16"/></svg>`,
};
const NARRATOR_AV = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#f6c84c"/><circle cx="50" cy="50" r="36" fill="#fff4cf" stroke="#8b4a12" stroke-width="5"/><polygon points="50,20 58,50 50,80 42,50" fill="#c0392b"/><polygon points="50,50 58,50 50,80 42,50" fill="#3b2412"/><circle cx="50" cy="50" r="5" fill="#8b4a12"/></svg>`);

function arrowSVG(w, h = 56, fill = '#FFD54A') {
  const head = 44, sh = h * 0.32;
  return `<svg viewBox="0 0 ${w} ${h}"><path d="M4 ${h / 2 - sh / 2} H${w - head} V5 L${w - 4} ${h / 2} L${w - head} ${h - 5} V${h / 2 + sh / 2} H4 Z" fill="${fill}" stroke="#7a4a00" stroke-width="5" stroke-linejoin="round"/></svg>`;
}

function badgeSVG(b) {
  const icons = {
    chest: `<rect x="68" y="104" width="84" height="44" rx="6" fill="#8b4513" stroke="#4a2200" stroke-width="5"/><path d="M68 106 q42 -40 84 0 z" fill="#a0522d" stroke="#4a2200" stroke-width="5"/><rect x="102" y="110" width="16" height="18" rx="3" fill="#ffd54a" stroke="#4a2200" stroke-width="3"/><circle cx="110" cy="72" r="9" fill="#fff6c8"/>`,
  };
  return `<svg viewBox="0 0 220 250"><path d="M62 170 L40 246 L72 228 L92 248 L104 176 Z" fill="${b.dark}"/><path d="M158 170 L180 246 L148 228 L128 248 L116 176 Z" fill="${b.dark}"/><circle cx="110" cy="110" r="96" fill="#ffd54a" stroke="#7a4a00" stroke-width="6"/><circle cx="110" cy="110" r="84" fill="none" stroke="#fff3b0" stroke-width="4" stroke-dasharray="6 9"/><circle cx="110" cy="110" r="72" fill="${b.color}" stroke="${b.dark}" stroke-width="6"/><ellipse cx="88" cy="70" rx="34" ry="16" fill="#fff" opacity=".25"/>${icons[b.icon] || ''}</svg>`;
}

// hidden key box: a wooden crate with gold corners and a glowing "?"
const KEYBOX_SVG = `<svg viewBox="0 0 100 100"><defs><linearGradient id="kbw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c98a4a"/><stop offset="1" stop-color="#8a4e1e"/></linearGradient></defs><rect x="6" y="8" width="88" height="86" rx="10" fill="url(#kbw)" stroke="#4a2408" stroke-width="5"/><path d="M8 36 H92 M8 66 H92" stroke="#6b3a12" stroke-width="4" opacity=".55"/><g fill="#ffd54a" stroke="#7a4a00" stroke-width="3"><path d="M6 20 V14 a6 6 0 0 1 6 -6 H24 V20 Z"/><path d="M94 20 V14 a6 6 0 0 0 -6 -6 H76 V20 Z"/><path d="M6 82 V88 a6 6 0 0 0 6 6 H24 V82 Z"/><path d="M94 82 V88 a6 6 0 0 1 -6 6 H76 V82 Z"/></g><text class="q" x="50" y="68" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="50" fill="#ffe680" stroke="#5a2e00" stroke-width="3">?</text><circle class="hole" cx="50" cy="52" r="15" fill="#2a1404" opacity="0"/></svg>`;

/* ---------- state ---------- */
const S = { gems: 0, levelGems: [0, 0, 0], streak: 0, level: 0 };

/* ---------- run control: one counter cancels every pending beat ---------- */
let RUN = 0;
const CANCEL = { cancelled: true };
const guard = r => { if (r !== RUN) throw CANCEL; };
const wait = ms => { const r = RUN; return new Promise(res => setTimeout(res, ms)).then(() => guard(r)); };
const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
const retrigger = (el, c) => { el.classList.remove(c); void el.offsetWidth; el.classList.add(c); };

/* ---------- stage scaling ---------- */
let scale = 1;
// the largest scale that fits the app area (the screen less any notch), refitted when the window, the device's
// orientation or the mobile browser's toolbars change the space
function fit() {
  const app = $('#app'), w = app.clientWidth || innerWidth, h = app.clientHeight || innerHeight;
  scale = Math.min(w / STAGE_W, h / STAGE_H);
  stage.style.setProperty('--s', scale);
}
addEventListener('resize', fit); addEventListener('orientationchange', fit);
if (window.visualViewport) visualViewport.addEventListener('resize', fit);
function stagePos(el) {
  const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
  return { x: (r.left + r.width / 2 - s.left) / scale, y: (r.top + r.height / 2 - s.top) / scale };
}

/* ---------- backgrounds ---------- */
let bgFlip = false, bgNow = '';
// the scene, blurred, also fills any space around the stage
// (a full address: a relative one inside a CSS variable would be read from the stylesheet's folder, not the page's)
const backdrop = name => { backdropNow = name; Preload.get(name).then(url => { if (backdropNow === name) document.body.style.setProperty('--backdrop', `url("${new URL(url, document.baseURI).href}")`); }); };
let backdropNow = '';
function setBg(name) {
  backdrop(name); // even for the same scene: the home screen swaps in the cover art around it
  if (bgNow === name) return; bgNow = name; stage.dataset.bg = name;
  const a = $(bgFlip ? '#bgA' : '#bgB'), b = $(bgFlip ? '#bgB' : '#bgA');
  bgFlip = !bgFlip;
  // the picture goes in once it's preloaded (at once in the game; on the cover, while loading, when it lands)
  Preload.get(name).then(url => { if (bgNow !== name) return; a.style.backgroundImage = `url(${url})`; a.classList.add('on'); b.classList.remove('on'); });
}

/* ---------- particles: a single animation loop ---------- */
const FX = (() => {
  const cv = $('#fx'), g = cv.getContext('2d'); let parts = [], motes = [];
  const COLORS = ['#FFD54A', '#FF8A3D', '#6CCBFF', '#B48CFF', '#3ED36B', '#FF5C8A', '#FFFFFF'];
  for (let i = 0; i < (RM ? 0 : 28); i++) motes.push({ x: Math.random() * STAGE_W, y: Math.random() * STAGE_H, r: 1 + Math.random() * 2.2, vx: -.1 + Math.random() * .2, vy: -.15 - Math.random() * .2, a: Math.random() * Math.PI * 2 });
  function star(x, y, r) { g.beginPath(); for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * .35 : r, a = i * Math.PI / 4; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
  function loop() {
    g.clearRect(0, 0, STAGE_W, STAGE_H);
    for (const m of motes) {
      m.x += m.vx; m.y += m.vy; m.a += .02; if (m.y < -5) { m.y = STAGE_H + 5; m.x = Math.random() * STAGE_W; }
      g.globalAlpha = .25 + .25 * Math.sin(m.a); g.fillStyle = '#ffe6a0'; g.beginPath(); g.arc(m.x, m.y, m.r, 0, 7); g.fill();
    }
    parts = parts.filter(p => p.life > 0);
    for (const p of parts) {
      p.life--; p.vy += p.gr; p.vx *= p.dr; p.vy *= p.dr; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      g.globalAlpha = Math.min(1, p.life / 25);
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.c;
      if (p.t === 'conf') { g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2 * (0.6 + 0.4 * Math.sin(p.life / 4))); }
      else if (p.t === 'coin') { g.beginPath(); g.ellipse(0, 0, p.s * Math.abs(Math.cos(p.life / 6)) + 1, p.s, 0, 0, 7); g.fill(); g.strokeStyle = '#a86a0a'; g.lineWidth = 2; g.stroke(); }
      else if (p.t === 'gem') { g.beginPath(); g.moveTo(0, -p.s); g.lineTo(p.s * .8, 0); g.lineTo(0, p.s); g.lineTo(-p.s * .8, 0); g.closePath(); g.fill(); }
      else { star(0, 0, p.s); }
      g.restore();
    }
    g.globalAlpha = 1;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  const add = o => parts.push(Object.assign({ rot: Math.random() * 6, vr: (Math.random() - .5) * .3, gr: .25, dr: .99, life: 120 }, o));
  return {
    confetti(size = 'small') {
      if (RM) return;
      const n = { small: 45, medium: 80, big: 140, huge: 230 }[size] || 45;
      for (let i = 0; i < n; i++) {
        const t = Math.random() < .12 ? 'coin' : Math.random() < .1 ? 'gem' : 'conf';
        add({ t, x: Math.random() * STAGE_W, y: -20 - Math.random() * 200, vx: (Math.random() - .5) * 4, vy: 2 + Math.random() * 4, s: t === 'conf' ? 10 + Math.random() * 8 : 8 + Math.random() * 5, c: t === 'coin' ? '#FFD54A' : t === 'gem' ? (Math.random() < .5 ? '#4FC3FF' : '#FF5C8A') : COLORS[i % COLORS.length], gr: .12, life: 170 + Math.random() * 60 });
      }
    },
    burst(x, y, n = 18, kind = 'star', power = 7) {
      for (let i = 0; i < (RM ? Math.min(n, 6) : n); i++) {
        const a = Math.random() * Math.PI * 2, v = power * (.4 + Math.random() * .8);
        add({ t: kind, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (kind === 'coin' ? 6 : 2), s: kind === 'star' ? 6 + Math.random() * 7 : 9 + Math.random() * 5, c: kind === 'star' ? (Math.random() < .5 ? '#FFF6C8' : '#FFD54A') : kind === 'coin' ? '#FFD54A' : '#4FC3FF', gr: kind === 'star' ? .05 : .35, dr: .96, life: 60 + Math.random() * 40 });
      }
    },
  };
})();

function puffs(x, y, n = 9) {
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div'); p.className = 'puff';
    const a = Math.PI + Math.random() * Math.PI; const d = 30 + Math.random() * 50;
    p.style.left = `${x - 11}px`; p.style.top = `${y - 11}px`;
    p.style.setProperty('--dx', `${Math.cos(a) * d}px`); p.style.setProperty('--dy', `${Math.sin(a) * d * .5}px`);
    $('#ui').appendChild(p); setTimeout(() => p.remove(), 800);
  }
}
function poofAt(x, y) {
  const c = document.createElement('div'); c.className = 'poofcloud'; c.style.left = `${x}px`; c.style.top = `${y}px`;
  $('#ui').appendChild(c); setTimeout(() => c.remove(), 900);
  FX.burst(x, y, 24, 'star', 8); Sound.fx.poof();
}
async function fly(svg, from, to, ms = 800, size = 60) {
  const el = document.createElement('div'); el.className = 'fly'; el.innerHTML = svg;
  el.style.width = el.style.height = `${size}px`; el.style.margin = `${-size / 2}px 0 0 ${-size / 2}px`;
  el.style.transitionDuration = `${ms}ms`;
  el.style.transform = `translate(${from.x}px, ${from.y}px)`;
  $('#ui').appendChild(el); await frame();
  el.style.transform = `translate(${to.x}px, ${to.y}px) scale(.75) rotate(360deg)`;
  await new Promise(r => setTimeout(r, ms)); el.remove();
}

/* ---------- toast ---------- */
function toast(text, small = false) {
  const t = $('#toast'); t.textContent = text; t.classList.toggle('small', small); retrigger(t, 'on');
}

/* ---------- speech bubble ---------- */
const WHO = { wizard: 'Wizard', explorer: 'Explorer', narrator: 'Narrator' };
function hideBubble() { $('#bubble').classList.remove('on', 'pop'); } // keeps its look while it fades out
// game lines are spoken only, never shown on screen (the script's on-screen text goes on the sign)
// narration: the narrator and the game's instructions are voice only (no box), in the narrator's voice
function speakOnly(who, text) { hideBubble(); if (!text) return Promise.resolve(); return Voice.say(text, 'narrator'); }
async function voiceOnly(who, text, clip = null) { const r = RUN; hideBubble(); if (!text) return; await Voice.say(text, 'narrator', clip); guard(r); }

/* character dialogue: a comic speech bubble whose tail points at the speaker. No voice, no Next: the text types
   out, stays up long enough to read, then the game moves on by itself.
   cues: [{ word, fn }] run when the typing reaches that word (used to bring in the Add / Subtract arrows). */
let typing = null;
const TAIL_SVG = '<svg class="tail" viewBox="-4 -6 56 62" aria-hidden="true"><path class="tf" d="M10 -6 C14 18 10 36 -2 52 C22 48 38 30 42 -6 Z"/>'
  + '<path class="ts" d="M10 0 C14 18 10 36 -2 52 C22 48 38 30 42 0"/></svg>';
// where the speaker stands, from where they're placed (not from the screen, so a character still popping in counts at full size)
function speakerRect(who) {
  const a = who === 'wizard' ? actors.wiz : actors.exp;
  if (a) { const w = a.h * .75; return { x: a.x - w / 2, y: a.y - a.h * .975, w, h: a.h }; }
  return who === 'explorer' && $('#nlWrap').classList.contains('on') && NL.exp ? stageRect(NL.exp) : null;
}
function stageRect(el) {
  const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
  return { x: (r.left - s.left) / scale, y: (r.top - s.top) / scale, w: r.width / scale, h: r.height / scale };
}
// try spots around the speaker (above, beside) at two widths; take the first that stays on screen and clear of the
// sign, the other character, the controls and the top buttons, else the one that covers least
// the narrowest width (up to max) that keeps the text on as few lines as at max, so the bubble hugs its line;
// never narrower than the name tag and the star on the top edge need
function fitTalk(b, max) {
  const tag = b.querySelector('.who'), min = Math.min(max, Math.max(200, tag.offsetLeft + tag.offsetWidth + 80));
  b.style.width = `${max}px`; const h = b.offsetHeight; let lo = min, hi = max;
  while (hi - lo > 2) { const mid = (lo + hi) >> 1; b.style.width = `${mid}px`; if (b.offsetHeight > h) lo = mid; else hi = mid; }
  b.style.width = `${hi}px`; return hi;
}
function placeTalk(b, who) {
  const r = speakerRect(who), tail = b.querySelector('.tail');
  b.classList.remove('tail-down', 'tail-left', 'tail-right', 'solo');
  Object.assign(b.style, { left: '', top: '', width: '', marginLeft: '' });
  if (!r) { b.classList.add('solo'); b.style.marginLeft = `${-fitTalk(b, 860) / 2}px`; return; } // nobody on screen: a bubble at the bottom with the speaker's portrait
  // a bubble beside the speaker: its tail (57px) ends just clear of the body; the small explorer on the number line needs more room
  const gap = !actors[who === 'wizard' ? 'wiz' : 'exp'] ? 50 : 40;
  const cx = r.x + r.w / 2, head = r.y + r.h * .1, top = r.y + r.h * .02; // top: the tip of the hat
  const other = speakerRect(who === 'wizard' ? 'explorer' : 'wizard');
  // things a bubble mustn't cover (only the top bar's buttons, not its empty width)
  const avoid = ['#tablet.on', '#dirPick.on', '#tray.on', '#btnPause', '#slots.on'].map(q => $(q)).filter(e => e && e.offsetParent).map(stageRect)
    .concat(stage.classList.contains('cast') ? [MAP_TUCKED, MAP_TUCKED] : []) // the map counts double: never cover it
    .concat([...document.querySelectorAll('#nl .nl-arrow, #nl .nl-arrow .lab')].map(stageRect)) // the direction arrows and their labels
    .concat($('#demoDir') && NL.exp ? [(e => ({ x: e.x - 150, y: e.y + e.h * .3, w: e.w + 300, h: 60 }))(stageRect(NL.exp))] : []) // the solved example's arrow, on either side of the explorer
    .concat($('#nlWrap').classList.contains('on') && NL.stone(0) ? [{ x: 0, y: stageRect(NL.stone(0)).y, w: STAGE_W, h: stageRect(NL.stone(0)).h }] : []) // the number line
    .concat(other ? [{ x: other.x + other.w * .12, y: other.y, w: other.w * .76, h: other.h }] : []).concat([{ x: r.x + r.w * .12, y: r.y, w: r.w * .76, h: r.h }]); // both characters' bodies
  const overlap = q => avoid.reduce((s, a) => s + Math.max(0, Math.min(q.x + q.w, a.x + a.w) - Math.max(q.x, a.x)) * Math.max(0, Math.min(q.y + q.h, a.y + a.h) - Math.max(q.y, a.y)), 0);
  const away = other ? (other.x + other.w / 2 > cx ? 'left' : 'right') : (cx > 640 ? 'left' : 'right');
  let best = null;
  for (const max of [430, 340]) {
    const w = fitTalk(b, max), h = b.offsetHeight;
    const above = { x: cx - w / 2, y: top - 62 - h, tail: 'down' }; // the tail (about 55px) ends just above the hat
    const cands = [above, { ...above, x: r.x + r.w * .55 - w * .2 }, { ...above, x: r.x + r.w * .45 - w * .8 },
      { x: away === 'left' ? r.x + r.w * .15 - gap - w : r.x + r.w * .85 + gap, y: head + 10, tail: away === 'left' ? 'right' : 'left' },
      { x: away === 'left' ? r.x + r.w * .85 + gap : r.x + r.w * .15 - gap - w, y: head + 10, tail: away === 'left' ? 'left' : 'right' },
      // beside the head but raised, so it clears a character standing lower down
      { x: away === 'left' ? r.x + r.w * .15 - gap - w : r.x + r.w * .85 + gap, y: head + 40 - h, tail: away === 'left' ? 'right' : 'left' },
      { x: away === 'left' ? r.x + r.w * .85 + gap : r.x + r.w * .15 - gap - w, y: head + 40 - h, tail: away === 'left' ? 'left' : 'right' },
      { x: away === 'left' ? r.x + r.w * .15 - gap - w : r.x + r.w * .85 + gap, y: 720, tail: away === 'left' ? 'right' : 'left' }]; // along the bottom, last resort
    for (const c of cands) {
      c.w = w; c.h = h;
      c.x = Math.max(12, Math.min(STAGE_W - 12 - w, c.x)); c.y = Math.max(12, Math.min(720 - 12 - h, c.y));
      if (c.tail === 'down' && c.y + h > top - 50) continue; // squeezed onto the head
      c.cost = overlap(c);
      if (!best || c.cost < best.cost) best = c;
      if (!c.cost) break;
    }
    if (best && !best.cost) break;
  }
  b.style.width = `${best.w}px`; b.style.left = `${best.x}px`; b.style.top = `${best.y}px`;
  b.classList.add(`tail-${best.tail}`);
  if (best.tail === 'down') tail.style.left = `${Math.max(26, Math.min(best.w - 70, cx - best.x - 20))}px`, tail.style.top = '';
  else { // a side tail: its base (13–45px down the tail box) stays on the straight part of the edge, clear of the rounded corners (≈42px)
    const lo = 29, hi = best.h - 87, want = Math.max(head + 30, best.y) - best.y;
    tail.style.top = `${hi >= lo ? Math.max(lo, Math.min(hi, want)) : best.h / 2 - 29}px`; tail.style.left = '';
  }
}
// while the characters talk on a map screen, the map is tucked up and smaller (see #stage.cast in the CSS): this is where it sits
const MAP_TUCKED = { x: 281, y: 20, w: 725, h: 432 };
// returns a promise that settles once the line has been typed and left up long enough to read
function showTalk(who, text, cues = null) {
  const b = $('#bubble'), txt = b.querySelector('.txt'), r = RUN;
  Voice.stop(); if (typing) { clearInterval(typing.t); typing.done(); }
  const spoken = Voice.say(text, who, null, cues); // the character speaks the line: their recording (RECORDED_VO), else the browser's voice; cues fire as the voice says the word
  if (!b.querySelector('.tail')) b.insertAdjacentHTML('beforeend', TAIL_SVG);
  b.className = `on comic ${who}`;
  b.querySelector('.av').src = who === 'wizard' ? ASSET('wizard_avatar') : who === 'explorer' ? ASSET('explorer_avatar') : NARRATOR_AV;
  b.querySelector('.who').textContent = WHO[who];
  const plain = text.replace(/<[^>]+>/g, ''), lower = plain.toLowerCase();
  txt.innerHTML = `<span class="ghost">${plain}</span>`; // full size first, so the bubble can be placed
  placeTalk(b, who); retrigger(b, 'pop'); Sound.fx.pop();
  const words = plain.split(/\s+/).length, hold = Math.min(6500, 1300 + words * 340); // reading time after the typing ends
  return new Promise(res => {
    let i = 0;
    const step = () => {
      i = Math.min(plain.length, i + 1);
      txt.innerHTML = `<span>${plain.slice(0, i)}</span><span class="ghost">${plain.slice(i)}</span>`; // the rest keeps its space
      if (i >= plain.length) { clearInterval(typing.t); txt.innerHTML = text; typing = null; Promise.all([spoken, new Promise(r => setTimeout(r, Voice.on ? 900 : hold))]) /* with voice off, the reading time */.then(() => setTimeout(res, 500)); } // moves on once the line has been said
    };
    typing = { t: setInterval(step, RM ? 1 : 28), done: res };
    step();
  }).then(() => guard(r));
}
async function talk(who, text, cues = null) { await showTalk(who, text, cues); }
function endTalk() { if ($('#bubble').classList.contains('comic')) hideBubble(); }
// the game part (key hunt, map puzzles) is marked on the stage
function setPlaying(on) { stage.classList.toggle('playing', on); }

/* ---------- waiting for the player ---------- */
let pending = { dial: null, dir: null, tapTarget: null };

/* ---------- HUD ---------- */
const HUD = {
  keys(n) { const s = $('#slots'); s.innerHTML = Array.from({ length: n }, () => `<div class="slot">${KEY_SVG}</div>`).join(''); s.classList.add('on'); },
  seals(n) { const s = $('#slots'); s.innerHTML = Array.from({ length: n }, () => `<div class="slot seal-slot">?</div>`).join(''); s.classList.add('on'); },
  fill(i) { const sl = $('#slots').children[i]; if (sl) { sl.classList.add('full'); if (sl.classList.contains('seal-slot')) sl.textContent = '★'; } },
  empty(i) { const sl = $('#slots').children[i]; if (sl) sl.classList.remove('full'); },
  slotPos(i) { return stagePos($('#slots').children[i]); },
  hide() { $('#slots').classList.remove('on'); },
};
// a first-try answer wins a gem (counted for the final screen)
function addGem() { S.gems++; S.levelGems[S.level]++; Sound.fx.gem(); }
function streakHit(firstTry) {
  if (!firstTry) { S.streak = 0; return; }
  S.streak++;
  if (S.streak % 3 === 0) {
    const n = S.streak; // the run as it stands now: 3, 6, 9… correct first tries in a row
    setTimeout(() => { toast(`On fire! ${n} in a row`, true); Sound.fx.streak(); $('#flare').classList.add('on'); setTimeout(() => $('#flare').classList.remove('on'), 1600); }, 1300);
  }
}

/* ---------- equation tablet ---------- */
const toInt = tok => parseInt(tok.replace(/[()]/g, '').replace('−', '-'), 10);
// '(+7) − 4 = ?' as coloured tokens (the sign and the sign rules card use the same)
const eqTokens = str => str.split(' ').map((tok, i) => {
  if (tok === '?') return `<span class="q">?</span>`;
  if (tok === '=' || tok === '+' || tok === '−') return `<span class="tok op" data-i="${i}">${tok}</span>`;
  return `<span class="tok ${cls(toInt(tok))}" data-i="${i}">${tok}</span>`;
}).join(' ');
const Tablet = {
  eq(str) {
    const t = $('#tablet'); t.className = 'on';
    t.innerHTML = eqTokens(str);
    this.fit();
  },
  // the sign glows while its line is spoken ("The next key is at…"), and the glow fades out when the line ends
  glow(said, onMap = false) {
    const t = $('#tablet'), off = () => { if (t.classList.contains('eq-hl')) { t.classList.remove('eq-hl'); retrigger(t, 'eq-out'); } };
    t.classList.remove('eq-out'); t.classList.add('eq-hl'); t.classList.toggle('eq-map', onMap); said.then(off, off);
  },
  solve(v) { const t = $('#tablet'); const q = t.querySelector('.q'); if (q) { q.outerHTML = numHTML(v); } t.classList.add('solved'); this.fit(); },
  // a fixed-size sign: shrink the text only when it would spill past the frame
  fit() {
    const t = $('#tablet'), kids = [...t.children];
    t.style.fontSize = '';
    if (!kids.length) return;
    const cs = getComputedStyle(t), room = t.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const need = Math.max(...kids.map(k => k.offsetLeft + k.offsetWidth)) - Math.min(...kids.map(k => k.offsetLeft));
    if (need > room) t.style.fontSize = `${(parseFloat(cs.fontSize) * room / need * .97).toFixed(1)}px`;
  },
  async pulseTokens() {
    const toks = [...$('#tablet').querySelectorAll('.tok')];
    const first = toks[0], second = toks.slice(1, 3);
    if (first) retrigger(first, 'hl'); await wait(1300);
    second.forEach(e => retrigger(e, 'hl'));
  },
  hide() { $('#tablet').className = ''; },
};

/* ---------- actors in the scene ---------- */
const actors = {};
function pulseClass(el, c, ms = 1000) {
  if (!el) return; retrigger(el, c); clearTimeout(el['_t' + c]);
  el['_t' + c] = setTimeout(() => el.classList.remove(c), ms);
}
function actor(id, o) {
  let a = actors[id]; const isNew = !a;
  const h = o.h || (a && a.h) || 380, w = h * .75;
  if (isNew) {
    const el = document.createElement('div'); el.className = 'actor'; el.dataset.actor = id;
    el.innerHTML = `<div class="shadow"></div><div class="bob"><img alt=""></div>`;
    $('#world').appendChild(el); a = actors[id] = { el, h, x: 0, y: 0 };
    el.style.transition = 'none';
  }
  a.h = h;
  const el = a.el; el.style.width = `${w}px`;
  if (o.ms) el.style.transition = `transform ${o.ms}ms ease-in-out, opacity .4s`;
  if (o.img) el.querySelector('img').src = ASSET(o.img);
  if (o.flip !== undefined) el.classList.toggle('flip', !!o.flip);
  if (o.cls !== undefined) ['idle', 'float', 'glowring'].forEach(c => el.classList.toggle(c, o.cls.split(' ').includes(c)));
  if (o.x !== undefined) { a.x = o.x; a.y = o.y; }
  el.style.transform = `translate(${a.x - w / 2}px, ${a.y - h * .975}px) scale(${o.scale || 1})`;
  if (o.enter) pulseClass(el, 'enter-pop', 700);
  if (isNew && !o.ms) requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transition = ''; }));
  if (o.opacity !== undefined) el.style.opacity = o.opacity;
  return el;
}
function actorAnim(id, c) { if (actors[id]) pulseClass(actors[id].el, c, 900); }
function removeActor(id) { const a = actors[id]; if (a) { a.el.remove(); delete actors[id]; } }
function clearActors() { Object.keys(actors).forEach(removeActor); }
function clearProps() { document.querySelectorAll('#world .prop').forEach(p => p.remove()); }
function prop(cls, css = {}, html = '') {
  const p = document.createElement('div'); p.className = `prop ${cls}`; p.innerHTML = html;
  Object.assign(p.style, css); $('#world').appendChild(p); return p;
}

/* ---------- the number line ---------- */
const NL = {
  pos: 0, top: 464, exp: null, h: 250,
  x: v => (v - MIN) * STEP + STEP / 2,
  build(lvl) {
    const nl = $('#nl'); nl.innerHTML = '';
    STEP = lvl.step || 112; this.h = lvl.explorerH || 250;
    this.top = Math.round(lvl.ledge * STAGE_H);
    $('#nlWrap').style.top = `${this.top}px`;
    nl.style.width = `${(MAX - MIN + 1) * STEP}px`;
    for (let v = MIN; v <= MAX; v++) {
      const s = document.createElement('div');
      s.className = `stone${v === 0 ? ' zero' : ''}${v % 5 === 0 ? ' mark show' : ''}`;
      s.dataset.v = v; s.style.left = `${this.x(v)}px`;
      s.innerHTML = `<span class="lbl">${v < 0 ? `−${-v}` : v}</span>`;
      nl.appendChild(s);
    }
    const ex = document.createElement('div'); ex.className = 'actor idle'; ex.id = 'nlExp';
    ex.innerHTML = `<div class="shadow"></div><div class="bob"><img alt="Explorer"></div>`;
    ex.style.width = `${this.h * .75}px`; nl.appendChild(ex); this.exp = ex;
    const c = document.createElement('div'); c.className = 'counter'; c.id = 'counter'; nl.appendChild(c);
    const k = document.createElement('div'); k.className = 'keyprize'; k.id = 'keyprize'; k.innerHTML = KEY_SVG; nl.appendChild(k);
    this.pose('explorer_idle'); this.place(0, true);
    $('#nlWrap').classList.remove('out'); $('#nlWrap').classList.add('on');
  },
  stone(v) { return $(`#nl .stone[data-v="${v}"]`); },
  pose(n) { if (this.exp) this.exp.querySelector('img').src = ASSET(n); },
  face(dir) { if (this.exp) this.exp.classList.toggle('flip', dir < 0); },
  jump() { pulseClass(this.exp, 'jump', 800); Sound.fx.jump(); },
  hop() { pulseClass(this.exp, 'hop', 450); },
  setStepMs(ms) { $('#nl').style.setProperty('--stepms', `${ms}ms`); this.exp.style.transition = `transform ${ms}ms ease-in-out`; },
  place(v, instant = false) {
    this.stone(this.pos)?.classList.remove('here');
    this.pos = v;
    this.stone(v)?.classList.add('here');
    const w = this.h * .75;
    if (instant) { this.exp.style.transition = 'none'; $('#nl').style.transition = 'none'; }
    this.exp.style.transform = `translate(${this.x(v) - w / 2}px, ${-this.h * .975 + 10}px)`;
    this.look(v);
    if (instant) { void this.exp.offsetWidth; this.exp.style.transition = ''; $('#nl').style.transition = ''; }
  },
  // the camera centres on number v (it can sit between stones)
  look(v) {
    const trackW = (MAX - MIN + 1) * STEP;
    const cam = Math.max(STAGE_W - trackW, Math.min(0, STAGE_W / 2 - this.x(v)));
    $('#nl').style.transform = `translateX(${cam}px)`;
  },
  // a gold tag over the answer stone shows its number (the 3rd-miss hint)
  tag(v) {
    let t = $('#answerTag');
    if (!t) { t = document.createElement('div'); t.id = 'answerTag'; t.className = 'answer-tag'; $('#nl').appendChild(t); }
    t.style.left = `${this.x(v)}px`; t.innerHTML = `<i>${KEY_SVG}</i>${fmt(v)}`; retrigger(t, 'on');
  },
  untag() { $('#answerTag')?.remove(); },
  async walk(from, delta, { count = true, trail = true, stepMs = RM ? 260 : 480 } = {}) {
    const dir = Math.sign(delta); if (!dir) return;
    this.face(dir); this.setStepMs(stepMs);
    const c = $('#counter');
    for (let i = 1; i <= Math.abs(delta); i++) {
      const v = from + dir * i;
      this.pose(i % 2 ? 'explorer_walk_1' : 'explorer_walk_2');
      this.place(v); Sound.fx.step();
      if (trail) this.stone(v)?.classList.add('trail');
      if (count) {
        c.style.left = `${this.x(v)}px`; c.innerHTML = `<small>${i === 1 ? 'Step' : 'Steps'}</small>${i}`;
        retrigger(c, 'on'); Sound.fx.count(i);
      }
      await wait(stepMs);
    }
    this.pose('explorer_idle');
    await wait(250);
    c.classList.remove('on');
  },
  async teleport(v) {
    const p = stagePos(this.exp); poofAt(p.x, p.y);
    this.exp.style.opacity = 0; await wait(250);
    this.place(v, true); this.face(1); this.pose('explorer_idle');
    await wait(200); this.exp.style.opacity = 1; pulseClass(this.exp, 'enter-pop', 700);
    await wait(350);
  },
  markStart(v) { const s = this.stone(v); if (s) s.classList.add('show', 'start'); },
  resetMarks() {
    document.querySelectorAll('#nl .stone').forEach(s => {
      s.classList.remove('trail', 'land', 'miss', 'pulse', 'start', 'correct');
      if (!s.classList.contains('mark')) s.classList.remove('show');
    });
    $('#keyprize').classList.remove('on', 'boxpop'); $('#keyBox')?.remove(); this.untag();
  },
  arrow(from, len, label, flipped = false, id = 'nlArrow') {
    let a = document.getElementById(id);
    if (!a) { a = document.createElement('div'); a.className = 'nl-arrow'; a.id = id; $('#nl').appendChild(a); }
    const w = len * STEP;
    a.style.left = `${this.x(from)}px`; a.style.width = `${w}px`;
    a.innerHTML = arrowSVG(w) + `<div class="lab">${label}</div>`;
    a.classList.remove('on'); a.classList.toggle('flipped', flipped);
    void a.offsetWidth; a.classList.add('on'); Sound.fx.whoosh();
    return a;
  },
  hideArrow() { document.querySelectorAll('#nl .nl-arrow').forEach(a => a.remove()); },
};

/* ---------- number pad ---------- */
const Dial = (() => {
  const tray = $('#tray'), disp = $('#display');
  let sign = 0, digits = '', resolver = null, idleT = null, idleFn = null, onTouch = null;
  tray.querySelector('.digits').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(d => `<button class="k" data-k="${d}" aria-label="${d}">${d}</button>`).join('');
  const value = () => digits === '' ? null : (sign < 0 ? -1 : 1) * parseInt(digits, 10);
  function render() {
    const v = value();
    tray.querySelectorAll('.sign').forEach(b => b.classList.toggle('sel', (b.dataset.k === '-' && sign < 0) || (b.dataset.k === '+' && sign > 0)));
    if (v === null) disp.innerHTML = `<span class="ph">${sign < 0 ? '<span class="neg">−</span>' : sign > 0 ? '<span class="pos">+</span>' : ''}?</span>`;
    else disp.innerHTML = numHTML(v);
    $('#btnGo').classList.toggle('ready', v !== null);
    const q = stage.classList.contains('map-scroll') && $('#tablet .q');
    if (q) { q.textContent = v === null ? `${sign < 0 ? '−' : sign > 0 ? '+' : ''}?` : fmt(v); Tablet.fit(); }
  }
  function resetIdle() {
    clearTimeout(idleT);
    if (resolver && idleFn) idleT = setTimeout(() => { if (resolver) idleFn(); resetIdle(); }, 16000);
  }
  function press(k) {
    if (!resolver) return;
    Sound.fx.tap(); disp.classList.remove('shake', 'good');
    if (onTouch) { const f = onTouch; onTouch = null; f(); }
    if (k === '-') sign = -1;
    else if (k === '+') sign = 1;
    else if (k === 'back') { if (digits) digits = digits.slice(0, -1); else sign = 0; }
    else if (k === 'go') {
      const v = value();
      if (v === null) { retrigger(disp, 'shake'); return; }
      const f = resolver; resolver = null; clearTimeout(idleT); f(v); return;
    } else if (/\d/.test(k)) {
      // a number without a sign is positive: + is added for you (tap − first for a negative number); 0 stays unsigned
      if (!sign && !(k === '0' && digits === '')) sign = 1;
      if (digits.length < 2) digits = (digits === '0' ? '' : digits) + k;
    }
    render(); resetIdle();
  }
  // the pressed look lasts a moment, then the key pops back up
  tray.addEventListener('click', e => { const b = e.target.closest('.k'); if (b) { pulseClass(b, 'press', 140); press(b.dataset.k); } });
  return {
    show() { tray.classList.add('on'); },
    hide() { tray.classList.remove('on'); resolver = null; clearTimeout(idleT); },
    clear() { sign = 0; digits = ''; disp.classList.remove('shake', 'good'); render(); },
    ask({ idle, touched } = {}) {
      const r = RUN; this.show(); idleFn = idle; onTouch = touched || null;
      return new Promise(res => { resolver = res; resetIdle(); }).then(v => { guard(r); return v; });
    },
    shake() { retrigger(disp, 'shake'); const q = $('#tablet .q'); if (q) retrigger(q, 'shake'); },
    good() { disp.classList.add('good'); },
    pulse() { retrigger(tray, 'pulse'); },
    key(k) { press(k); },
    get active() { return !!resolver; },
  };
})();

/* ---------- move pad: Left / Right walk the explorer one stone, JUMP answers ---------- */
const Mover = (() => {
  const pad = $('#dirPick');
  let resolver = null, start = 0, queue = 0, busy = false, jumpWanted = false, idleT = null, idleFn = null, foot = 0;
  function resetIdle() {
    clearTimeout(idleT);
    if (resolver && idleFn) idleT = setTimeout(() => { if (resolver) idleFn(); resetIdle(); }, 16000);
  }
  // trail and step counter from the start stone to where the explorer stands
  function showSteps() {
    document.querySelectorAll('#nl .stone.trail').forEach(s => s.classList.remove('trail'));
    const n = NL.pos - start, dir = Math.sign(n), c = $('#counter');
    for (let k = 1; k <= Math.abs(n); k++) NL.stone(start + dir * k)?.classList.add('trail');
    if (n) { c.style.left = `${NL.x(NL.pos)}px`; c.innerHTML = `<small>${Math.abs(n) === 1 ? 'Step' : 'Steps'}</small>${Math.abs(n)}`; c.classList.add('on'); }
    else c.classList.remove('on');
    pad.classList.toggle('moved', n !== 0);
  }
  async function pump() {
    if (busy) return; busy = true;
    const ms = RM ? 120 : 220;
    try {
      while (queue && resolver) {
        const d = Math.sign(queue); queue -= d;
        if (NL.pos + d < MIN || NL.pos + d > MAX) { queue = 0; break; }
        NL.hideArrow(); NL.face(d); NL.setStepMs(ms);
        NL.pose(foot++ % 2 ? 'explorer_walk_2' : 'explorer_walk_1');
        NL.place(NL.pos + d); Sound.fx.step(); Sound.fx.count(Math.abs(NL.pos - start) || 1);
        showSteps();
        await wait(ms);
      }
      NL.pose('explorer_idle');
    } catch (e) { if (e !== CANCEL) console.error(e); }
    busy = false;
    if (jumpWanted && resolver) { jumpWanted = false; finish(); }
  }
  function finish() { const f = resolver; resolver = null; clearTimeout(idleT); pad.classList.remove('on', 'moved'); f(NL.pos); }
  function press(dir) {
    if (!resolver) return;
    Sound.fx.tap(); resetIdle();
    if (dir === 'jump') { if (busy || queue) jumpWanted = true; else finish(); return; }
    queue += dir === 'left' ? -1 : 1; pump();
  }
  pad.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { pulseClass(b, 'press', 140); press(b.dataset.dir); } });
  return {
    ask(from, { idle } = {}) {
      const r = RUN; start = from; queue = 0; jumpWanted = false; idleFn = idle || null;
      showSteps(); pad.classList.add('on');
      return new Promise(res => { resolver = res; resetIdle(); }).then(v => { guard(r); return v; });
    },
    hide() { pad.classList.remove('on', 'moved'); resolver = null; queue = 0; jumpWanted = false; clearTimeout(idleT); },
    press,
    pulse() { retrigger(pad, 'pulse'); },
    solve(v) { if (resolver) { queue = v - NL.pos; jumpWanted = true; if (!busy && !queue) { jumpWanted = false; finish(); } else pump(); } },
    get active() { return !!resolver; },
  };
})();

/* ---------- keyboard ---------- */
addEventListener('keydown', e => {
  if (QA_PANEL && !e.metaKey && !e.ctrlKey && !e.altKey) {
    if (e.key === 'q' || e.key === 'Q') { e.preventDefault(); QA.toggle(); return; }
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); QA.auto(); return; }
    if (QA.isOpen) { if (e.key === 'Escape') QA.close(); return; }
  }
  if ($('#pause').classList.contains('on')) { if (e.key === 'Escape') closeMenu(); return; }
  if (Dial.active) {
    let k = null;
    if (/^\d$/.test(e.key)) k = e.key;
    else if (e.key === '-' || e.key === '_') k = '-';
    else if (e.key === '+' || e.key === '=') k = '+';
    else if (e.key === 'Backspace') k = 'back';
    else if (e.key === 'Enter') k = 'go';
    if (k) { e.preventDefault(); Dial.key(k); }
    return;
  }
  if (Mover.active) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); Mover.press(e.key === 'ArrowLeft' ? 'left' : 'right'); return; }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); Mover.press('jump'); return; }
  }
  if (e.key === 'Enter' || e.key === ' ') {
    if (pending.coach) { e.preventDefault(); pending.coach(); }
    else if (pending.tapTarget) { e.preventDefault(); pending.tapTarget(); }
  }
});

/* ---------- reset everything between chapters ---------- */
function resetUI() {
  Voice.stop(); Coach.end(); clearAnswerHand();
  pending = { dial: null, dir: null, tapTarget: null };
  Mover.hide();
  hideBubble(); Tablet.hide(); Dial.hide(); Dial.clear();
  ['#dirPick', '#hintArrow', '#flare'].forEach(s => $(s).classList.remove('on'));
  $('#toast').classList.remove('on');
  clearActors(); clearProps(); $('#nlWrap').classList.remove('on', 'out'); $('#nl').innerHTML = '';
  HUD.hide();
  document.querySelectorAll('.fly, .puff, .poofcloud').forEach(e => e.remove());
  ['#final', '#title', '#signRules'].forEach(s => $(s).classList.remove('on', 'out'));
  stage.classList.remove('theme-cavern', 'map-ui', 'map-scroll', 'path-art', 'playing', 'stones-lava', 'cast', 'cast-now'); $('#scroll').classList.remove('unroll'); $('#pathArt').classList.remove('unroll');
  $('#pathArt').classList.remove('glow', 'faint'); $('#pathArt .pa-hand')?.classList.remove('on'); $('#pathArt .pa-token').classList.remove('on'); $('#pathArt .pa-lit').setAttribute('d', '');
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
}

/* ===================================================================== */
/*                               STORY                                    */
/* ===================================================================== */

// the treasure chest (assets/chest_open_sheet.webp: 36 frames in a 6 × 6 grid, closed → open → glowing)
function chestSprite() { const c = prop('chestsprite', { left: '440px', top: '86px' }); c.id = 'chest'; chestFrame(c, 0); return c; }
function chestFrame(c, f) { c.style.backgroundPosition = `${(f % 6) * 20}% ${Math.floor(f / 6) * 20}%`; }
function chestPoint(c, fx, fy) { const r = stageRect(c); return { x: r.x + r.w * fx, y: r.y + r.h * fy }; }
async function chestFrames(c, a, b, ms, onFrame) { for (let f = a; f <= b; f++) { chestFrame(c, f); onFrame && onFrame(f); await wait(ms); } }
function chestLoop(c, a, b, ms) { const r = RUN; let f = a; const t = setInterval(() => { if (r !== RUN || !c.isConnected) return clearInterval(t); chestFrame(c, f); f = f >= b ? a : f + 1; }, ms); }

const SCENES = {
  async hook() {
    prop('lightbeam on', {});
    actor('exp', { img: 'explorer_idle', x: 303, y: 597, h: 280, cls: 'idle', enter: true });
  },
  async lostMap() {
    actor('exp', { img: 'explorer_idle', x: 230, y: 600, h: 340, cls: 'idle' });
    Sound.fx.whoosh(); puffs(480, 530); puffs(850, 480, 6); puffs(1110, 520, 6);
  },
  async worried() {
    actor('exp', { img: 'explorer_worried', x: 420, y: 640, h: 480, cls: 'idle' });
  },
  async wizardAppears() {
    actor('exp', { img: 'explorer_worried', x: 319, y: 630, h: 336, cls: 'idle' });
    poofAt(921, 400); await wait(250);
    actor('wiz', { img: 'wizard_laugh', x: 921, y: 641, h: 507, cls: 'idle', enter: true });
    await wait(500); Sound.fx.sparkle();
  },
  async ready() {
    actor('exp', { img: 'explorer_thumbsup', x: 319, y: 630, h: 336, cls: 'idle glowring' });
    actor('wiz', { img: 'wizard_point', x: 921, y: 641, h: 507, cls: 'idle' }); actorAnim('exp', 'hop');
  },
  async readyWizard() {
    actor('exp', { img: 'explorer_point', x: 319, y: 630, h: 336, cls: 'idle' });
    actor('wiz', { img: 'wizard_explain', x: 921, y: 641, h: 507, cls: 'idle' });
  },
  /* ending */
  async praise() {
    actor('exp', { img: 'explorer_idle', x: 360, y: 650, h: 336, cls: 'idle' });
    poofAt(930, 420); await wait(250);
    actor('wiz', { img: 'wizard_laugh', x: 930, y: 655, h: 500, cls: 'idle', enter: true });
  },
  async title() {
    actor('exp', { img: 'explorer_thumbsup', x: 360, y: 650, h: 336, cls: 'idle glowring' });
    actor('wiz', { img: 'wizard_proud', x: 930, y: 655, h: 500, cls: 'idle' });
    actorAnim('exp', 'jump'); Sound.fx.fanfare(); FX.burst(360, 360, 40, 'star', 9);
  },
  async goTreasure() {
    actor('exp', { img: 'explorer_point', x: 360, y: 650, h: 336, cls: 'idle' });
    actor('wiz', { img: 'wizard_point', x: 930, y: 655, h: 500, cls: 'idle' });
    prop('lightbeam on', {});
  },
  async run() {
    removeActor('wiz'); clearProps(); endTalk(); // nothing in front of the explorer as he runs in
    const beam = prop('lightbeam', {}); requestAnimationFrame(() => beam.classList.add('on'));
    // the explorer runs into the tunnel: the running-from-behind sprite (assets/explorer_run_sheet.webp, 36 frames, 6 × 6)
    // plays while he gets smaller and further away
    const el = actor('exp', { img: 'explorer_run_back', x: 640, y: 700, h: 440 });
    el.classList.add('runsheet');
    const r = RUN; let f = 0;
    const t = setInterval(() => { if (r !== RUN || !el.isConnected) return clearInterval(t); el.querySelector('.bob').style.backgroundPosition = `${(f % 6) * 20}% ${Math.floor(f / 6) * 20}%`; f = (f + 1) % 36; }, 69);
    await wait(100);
    actor('exp', { x: 640, y: 380, scale: .35, ms: RM ? 400 : 3200 });
    for (let i = 0; i < 7; i++) { Sound.fx.step(); await wait(380); }
    clearInterval(t); el.classList.remove('runsheet'); el.querySelector('.bob').style.backgroundPosition = '';
  },
  async found() {
    clearActors(); clearProps();
    const c = chestSprite();
    actor('exp', { img: 'explorer_point', x: 280, y: 690, h: 380, cls: 'idle', enter: true });
    await wait(500); retrigger(c, 'wiggle'); Sound.fx.sparkle(); FX.burst(640, 260, 30, 'star', 6);
  },
  async open() {
    const c = $('#chest') || chestSprite(); endTalk(); // the screen is clear for the keys
    actor('exp', { img: 'explorer_point', x: 280, y: 690, h: 380, cls: 'idle' });
    // every key collected in the game (5 per chamber) appears in an arc, then flies into the lock one after another
    const n = LEVELS.reduce((s, l) => s + l.keys.length, 0), lock = chestPoint(c, .5, .52), keys = [];
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (1.08 + .84 * i / (n - 1)), k = prop('endkey', { left: `${lock.x + Math.cos(a) * 330 - 24}px`, top: `${lock.y + 90 + Math.sin(a) * 250 - 24}px` }, KEY_SVG);
      keys.push(k); Sound.fx.count(i); await wait(70);
    }
    await wait(500);
    for (const k of keys) {
      const from = stagePos(k); k.remove();
      fly(KEY_SVG, from, lock, 520, 46); setTimeout(() => { Sound.fx.coin(); retrigger(c, 'clink'); }, 500);
      await wait(150);
    }
    await wait(700);
    // the lock turns and the lid opens (sprite: 36 frames, 6 × 6), then the treasure keeps glowing
    Sound.fx.unlock(); actor('exp', { img: 'explorer_thumbsup' }); actorAnim('exp', 'jump');
    await chestFrames(c, 0, 35, 84, f => { if (f === 12) { Sound.fx.creak(); } if (f === 16) { Sound.fx.fanfare(); FX.burst(lock.x, lock.y - 60, 40, 'coin', 12); FX.burst(lock.x, lock.y - 60, 30, 'gem', 10); FX.confetti('huge'); for (let i = 0; i < 6; i++) setTimeout(() => Sound.fx.coin(), i * 140); } });
    chestLoop(c, 18, 35, 84);
  },
};

async function playScenes(list) {
  for (const sc of list) {
    if (sc.bg) setBg(sc.bg);
    if (sc.scene !== 'open') clearProps();
    await SCENES[sc.scene]();
    if (!sc.text) { await wait(400); continue; } // a scene with no line plays straight through
    if (sc.who === 'narrator') { await voiceOnly('narrator', sc.text, sc.clip); await wait(500); continue; }
    await talk(sc.who, sc.text);
  }
  endTalk();
}

async function runStory() {
  QA.at('story'); reached('story'); Preload.want('story'); // this part's files download next (js/preload.js)
  await playScenes(STORY_INTRO); // how to play is taught inside Chamber 1, key 1 (Coach)
}


/* ===================================================================== */
/*                               LEVELS                                   */
/* ===================================================================== */
function wizardOnLedge(img, enter = false) {
  return actor('wiz', { img, x: 1110, y: NL.top + 46, h: 330, cls: 'idle', enter });
}

async function teach(L) {
  const lvl = LEVELS[L];
  for (const t of lvl.teach) {
    Tablet.hide(); // the rule is told in the speech bubble only, not on the hanging sign
    if (t.type === 'zero') {
      NL.place(0, true); NL.stone(0).classList.add('pulse'); NL.hop();
      // the wizard appears on the right ledge to explain the rule
      if (!actors.wiz) { poofAt(1110, NL.top - 150); await wait(250); wizardOnLedge('wizard_explain', true); }
    } else if (t.type === 'arrows') {
      NL.stone(0).classList.remove('pulse');
      // each arrow appears at the end of its sentence, as the voice says "right", then "left"
      let live = true;
      const said = showTalk(t.who, t.text, [
        { word: 'right', fn: () => { if (live) { NL.face(1); NL.arrow(0, 3, 'Add', false, 'nlArrowAdd'); } } },
        { word: 'left', fn: () => { if (live) { NL.face(-1); NL.arrow(0, 3, 'Subtract', true); } } },
      ]);
      await said; live = false; NL.hideArrow(); NL.face(1); continue;
    } else if (t.type === 'confused') {
      NL.place(0, true); NL.pose('explorer_confused'); NL.hop();
    } else if (t.type === 'wizardIn') { // the wizard poofs in laughing and speaks first; the explorer looks on, puzzled
      NL.place(0, true); NL.pose('explorer_confused'); NL.hop();
      poofAt(1110, NL.top - 150); await wait(250); wizardOnLedge('wizard_laugh', true); await wait(350);
    } else if (t.type === 'wizard') {
      NL.pose('explorer_worried');
      const p = { x: 1110, y: NL.top - 150 }; poofAt(p.x, p.y); await wait(250);
      wizardOnLedge('wizard_laugh', true);
    } else if (t.type === 'flip') {
      NL.pose('explorer_idle'); wizardOnLedge('wizard_explain');
      const fromLeft = t.from === 'left';
      // both directions stay on the line: the usual one as the wizard says "right"/"left", the twist at "change"
      let live = true;
      const said = showTalk(t.who, t.text, [
        { word: fromLeft ? 'left' : 'right', fn: () => { if (live) { NL.face(fromLeft ? -1 : 1); NL.arrow(0, 3, fromLeft ? 'Subtract' : 'Add', fromLeft, 'nlArrowUsual'); } } },
        { word: 'change', fn: () => { if (live) { Sound.fx.sparkle(); NL.face(fromLeft ? 1 : -1); NL.arrow(0, 3, fromLeft ? 'Subtract a negative' : 'Add a negative', !fromLeft); } } },
      ]);
      await said; live = false; continue;
    } else if (t.type === 'understand') {
      wizardOnLedge('wizard_proud');
      NL.pose('explorer_point'); NL.face(t.from === 'left' ? -1 : 1);
      const said = showTalk(t.who, t.text);
      await wait(1600); NL.face(t.to === 'left' ? -1 : 1); NL.hop(); Sound.fx.pop();
      await said; NL.hideArrow(); continue;
    }
    if (t.pose) { NL.pose(t.pose); NL.hop(); }
    await talk(t.who, t.text);
  }
  endTalk(); NL.hideArrow(); NL.stone(0)?.classList.remove('pulse');
  if (actors.wiz) { const p = stagePos(actors.wiz.el); poofAt(p.x, p.y); removeActor('wiz'); }
  NL.pose('explorer_idle'); NL.face(1);
}

/* ---------- guided tutorial: a short, playful spotlight on only the controls a child must use.
   Chamber 1 key 1: the arrows, then JUMP. Chamber 1 map puzzle 1: + / −, the number, then CHECK. ---------- */
const Coach = (() => {
  let box = null, targets = [], track = 0, side = false, handEl = null, last = '', fadeT = null;
  function rectOf(el) {
    let r = el.getBoundingClientRect();
    // a wrapper with no box of its own (the keypad's number keys sit straight in the keypad grid): use the area its buttons cover
    if (!r.width && !r.height && el.children.length) {
      const rs = [...el.children].map(c => c.getBoundingClientRect());
      const l = Math.min(...rs.map(q => q.left)), t = Math.min(...rs.map(q => q.top));
      r = { left: l, top: t, width: Math.max(...rs.map(q => q.right)) - l, height: Math.max(...rs.map(q => q.bottom)) - t };
    }
    const s = stage.getBoundingClientRect();
    return { x: (r.left - s.left) / scale, y: (r.top - s.top) / scale, w: r.width / scale, h: r.height / scale };
  }
  const union = () => {
    const rs = targets.map(rectOf), x = Math.min(...rs.map(r => r.x)), y = Math.min(...rs.map(r => r.y));
    return { x, y, w: Math.max(...rs.map(r => r.x + r.w)) - x, h: Math.max(...rs.map(r => r.y + r.h)) - y };
  };
  // wait until the controls stop moving (the sign drops in on its ropes, the pads slide up), so the spotlight never
  // opens on a spot they are only passing through and never trails after them; gives up after maxMs
  async function settled(maxMs = 1200) {
    let prev = '', same = 0;
    for (const t0 = performance.now(); performance.now() - t0 < maxMs;) {
      await new Promise(res => requestAnimationFrame(res));
      const u = union(), k = [u.x, u.y, u.w, u.h].map(Math.round).join();
      if (k !== prev) { prev = k; same = 0; } else if (++same >= 4) return;
    }
  }
  function build() {
    box = document.createElement('div'); box.id = 'coach';
    box.innerHTML = '<div class="co-block"></div>'
      + '<div class="co-ring"><i class="co-star s1">★</i><i class="co-star s2">★</i><i class="co-star s3">✦</i></div>'
      + '<div class="co-hand" aria-hidden="true"><i class="co-ripple"></i>👆</div>'
      + '<div class="co-card" hidden><p></p></div>'; // no caption: the spotlight and the hand show what to do
    stage.appendChild(box);
    // everything outside the spotlight is blocked; a tap on a highlighted control goes through to it
    box.querySelector('.co-block').addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      const blk = e.currentTarget; blk.style.pointerEvents = 'none';
      const hit = document.elementFromPoint(e.clientX, e.clientY); blk.style.pointerEvents = '';
      const b = hit && hit.closest('button');
      if (b && targets.some(el => el.contains(b))) b.click();
    });
  }
  function place() {
    if (!targets.length || !box) return;
    const r = union(), pad = 12, ring = box.querySelector('.co-ring'), card = box.querySelector('.co-card'), hand = box.querySelector('.co-hand');
    const he = typeof handEl === 'function' ? handEl() : handEl, hr = he ? rectOf(he) : r; // the hand points at the control to press next
    // only when something moved: rewriting the same place every frame would keep restarting the glide
    const key = [r.x, r.y, r.w, r.h, hr.x, hr.y, hr.w, hr.h].map(v => Math.round(v * 2)).join();
    if (key === last) return; last = key;
    Object.assign(ring.style, { left: `${r.x - pad}px`, top: `${r.y - pad}px`, width: `${r.w + pad * 2}px`, height: `${r.h + pad * 2}px` });
    hand.style.left = `${hr.x + hr.w / 2}px`; hand.style.top = `${hr.y + hr.h - 8}px`;
    const cw = side ? 340 : 400, ch = 96;
    card.style.width = `${cw}px`;
    if (side) { // beside the control, so the equation above it stays in view
      const left = r.x - pad - 22 - cw >= 8;
      Object.assign(card.style, { left: `${left ? r.x - pad - 22 - cw : r.x + r.w + pad + 22}px`, top: `${Math.max(16, Math.min(720 - ch - 16, r.y + r.h / 2 - ch / 2))}px` });
    } else { // above the control
      Object.assign(card.style, { left: `${Math.max(16, Math.min(STAGE_W - cw - 16, r.x + r.w / 2 - cw / 2))}px`, top: `${Math.max(16, r.y - pad - 28 - ch)}px` });
    }
  }
  // one step: spotlight `els`, show `text` and say `voice`, until `until()` is true (the child really uses the control).
  // `stop` (a promise) ends it early, e.g. when auto-solve answers.
  async function step(els, text, voice, { until, stop = null, beside = false, hand = null, before = null }) {
    const r = RUN;
    targets = [].concat(els).filter(Boolean); if (!targets.length) return;
    if (!box) build();
    clearTimeout(fadeT); // a step straight after a cheer: the spotlight stays up and glides on
    track++; await settled(); guard(r); // the last step's follow stops; the ring holds still until the new controls are
    const ring = box.querySelector('.co-ring'), handIco = box.querySelector('.co-hand');
    // first appearance (or after it has faded out): the ring is put straight on the control and pops in;
    // while it is up, it glides on to the next control instead of popping again
    const fresh = !box.classList.contains('on') && +getComputedStyle(box).opacity < .05;
    const handBack = box.classList.contains('no-hand') && hand !== false; // the hand reappears where it's needed, not sliding over
    side = beside; handEl = hand; box.classList.toggle('no-hand', hand === false); // hand false: spotlight only
    box.querySelector('.co-card p').textContent = text;
    last = '';
    const snap = fresh ? [ring, handIco] : handBack ? [handIco] : [];
    snap.forEach(e => e.classList.add('snap')); place(); void box.offsetWidth; snap.forEach(e => e.classList.remove('snap'));
    box.classList.add('on');
    if (fresh) { retrigger(box.querySelector('.co-card'), 'pop'); retrigger(ring, 'pop'); Sound.fx.pop(); }
    // follows its control every frame (the keypad and the sign can still be sliding in)
    const me = ++track, follow = () => { if (track !== me || !targets.length) return; place(); requestAnimationFrame(follow); };
    requestAnimationFrame(follow);
    // no spoken tip: the script has none; the spotlight and the hand show what to do
    let poll = null;
    const done = new Promise(res => { poll = setInterval(() => { if (RUN !== r || until()) res('done'); }, 100); });
    const how = await Promise.race(stop ? [done, stop] : [done]);
    clearInterval(poll); guard(r);
    if (how === 'done') { // a little cheer for getting it right
      const u = union(); FX.burst(u.x + u.w / 2, u.y + u.h / 2, 18, 'star', 7); Sound.fx.sparkle();
      // the spotlight stays up through the cheer, so a next step glides on from here; with no next step it fades out
      clearTimeout(fadeT); fadeT = setTimeout(() => box.classList.remove('on'), 650);
      await wait(400); guard(r);
    }
  }
  function end() { clearTimeout(fadeT); track++; targets = []; if (box) box.classList.remove('on'); }
  return { step, end };
})();

// Chamber 1, key 1: walk with the arrows, then JUMP
// each line plays out in full before the next; the control it names is spotlit while it is said
async function coachKeyMoves(it, ans, asked) {
  const pad = $('#dirPick'), arrows = [pad.querySelector('[data-dir="left"]'), pad.querySelector('[data-dir="right"]')], jump = pad.querySelector('[data-dir="jump"]');
  let over = false; const stop = asked.then(() => { over = true; return 'stop'; });
  const said = line => { const p = voiceOnly('wizard', line); p.catch(() => {}); return Promise.race([p.then(() => 'stop', () => 'stop'), stop]); };
  const hand = arrows[it.delta > 0 ? 1 : 0];
  await Coach.step(arrows, '', '', { until: () => false, stop: said(it.coachArrows), hand });
  if (!over && NL.pos !== ans) await Coach.step(arrows, '', '', { until: () => NL.pos === ans, stop, hand });
  if (!over && Mover.active) {
    const jumpSaid = said(it.coachJump);
    await Coach.step(jump, '', '', { until: () => !Mover.active, stop });
    if (!over) await jumpSaid; // the jump line finishes before the key is found
  }
  Coach.end();
}
// Chamber 1, map puzzle 1, before the keypad is used: the puzzle on its own, then "Check the puzzle." with only the
// puzzle spotlit (at least 2.5 s), then the keypad comes up and is spotlit through "Write the correct answer."
async function coachPuzzleIntro(m) {
  const r = RUN, ended = p => p.then(() => 'stop', () => 'stop');
  await wait(1000);
  const look = voiceOnly('wizard', m.coachLook); look.catch(() => {});
  await Coach.step($('#tablet'), '', '', { until: () => false, stop: Promise.all([ended(look), ended(wait(2500))]).then(() => 'stop'), hand: false });
  guard(r); Dial.show(); await wait(350);
  const write = voiceOnly('wizard', m.coachWrite); write.catch(() => {});
  await Coach.step($('#tray'), '', '', { until: () => false, stop: ended(write), hand: false });
  guard(r);
}
// Chamber 1, map puzzle 1: the keypad
async function coachKeypad(m, ans, asked, before = null) {
  const tray = $('#tray'), stop = asked.then(() => 'stop'), need = String(Math.abs(ans)).length;
  const typed = () => ($('#display').textContent.match(/\d/g) || []).length;
  if (ans < 0) await Coach.step([...tray.querySelectorAll('.sign')], 'Pick − first!', 'First, tap minus!', { until: () => !!tray.querySelector('.sign.sel'), stop, beside: true, hand: tray.querySelector('.sign[data-k="-"]'), before });
  if (Dial.active) await Coach.step(tray.querySelector('.digits'), 'Now tap the number!', 'Now tap the number!', { ...(ans > 0 ? { before } : {}), until: () => typed() >= need, stop, beside: true, hand: () => tray.querySelector(`.k[data-k="${String(Math.abs(ans))[Math.min(typed(), need - 1)]}"]`) });
  if (Dial.active) await Coach.step(tray.querySelector('.k.go'), 'Tap CHECK! ✅', 'Now tap check!', { until: () => !Dial.active, stop, beside: true });
  Coach.end();
}

// a solved example (Chambers 2 and 3, first key), reasoned out by the explorer: where he stands, which way the operation
// would usually go, why the negative turns him round; he turns on his stone while the pad is shown but locked.
// Then the player taps the arrow stone by stone, and JUMP.
async function solvedExample(it, ans) {
  const d = it.demo, pad = $('#dirPick'), dir = Math.sign(it.delta), body = NL.exp.querySelector('.bob');
  const toks = [...$('#tablet').querySelectorAll('.tok')], [first, op, second] = toks;
  const btn = k => pad.querySelector(`[data-dir="${k}"]`), way = v => btn(v > 0 ? 'right' : 'left');
  const hl = (...els) => { document.querySelectorAll('.demo-hl').forEach(e => e.classList.remove('demo-hl')); els.forEach(e => e && e.classList.add('demo-hl')); };
  // the explorer turns: a quick squash through side-on, then he faces the new way
  const turn = async to => { pulseClass(body, 'turning', 400); await wait(RM ? 60 : 180); NL.face(to); await wait(RM ? 60 : 200); };
  // the small arrow beside him, on the side he means to go
  const aim = (arrow, v) => { arrow.classList.toggle('back', v < 0); arrow.style.left = `${NL.x(it.start) + v * 105}px`; };
  pad.classList.add('on', 'demo');
  // 1. where he stands
  hl(first); NL.stone(it.start)?.classList.add('show'); NL.face(1); NL.pose('explorer_idle'); NL.hop();
  await talk('explorer', d.start);
  // 2. the operation's usual way (the opposite of where he'll end up): he turns and leans that way, the arrow and its button glow
  hl(op, way(-dir)); NL.pose('explorer_confused'); pulseClass(body, 'think', 1400);
  const arrow = document.createElement('div'); arrow.className = 'demo-dir'; arrow.id = 'demoDir'; arrow.innerHTML = arrowSVG(84, 48, '#FFB52E');
  aim(arrow, -dir); arrow.style.top = `${-NL.h * .45}px`; $('#nl').appendChild(arrow);
  const talking = talk('explorer', d.sub);
  await wait(RM ? 200 : 700); await turn(-dir); if (d.subPose) NL.pose(d.subPose); body.classList.add('lean'); arrow.classList.add('on'); Sound.fx.whoosh();
  await talking;
  // 3. the negative sign: he's surprised, the arrow swings round, he turns and points the other way. He stays on his stone.
  if (second && d.flipHl !== 'token') second.innerHTML = second.textContent.replace('−', '<b class="sign">−</b>');
  hl(d.flipHl === 'token' ? second : second?.querySelector('.sign'), way(dir)); body.classList.remove('lean'); NL.pose('explorer_worried'); pulseClass(NL.exp, 'shake', 450);
  const flipping = talk('explorer', d.flip);
  await wait(RM ? 300 : 1100); aim(arrow, dir); Sound.fx.whoosh();
  await wait(RM ? 100 : 350); await turn(dir); NL.pose('explorer_point'); body.classList.add('lean');
  await flipping;
  // 4. the player walks him: only that arrow button works, a hand taps on it, one stone per tap; then (after the jump line) JUMP
  hl(); arrow.remove(); body.classList.remove('lean'); NL.pose('explorer_idle');
  await talk('explorer', d.walk);
  pad.classList.remove('demo'); stage.classList.add('demo-walk');
  while (true) {
    const asked = Mover.ask(it.start); let over = false; asked.then(() => { over = true; });
    const stop = asked.then(() => 'stop');
    await Coach.step(way(dir), '', '', { until: () => NL.pos === ans, stop, hand: way(dir) });
    if (!over && d.jump) { // on the answer: the stone and the sign show it, JUMP glows while he says so
      Coach.end(); NL.stone(ans)?.classList.add('land', 'show'); Tablet.solve(ans); hl(btn('jump')); NL.pose('explorer_thumbsup');
      await talk('explorer', d.jump); hl(); NL.pose('explorer_idle');
    }
    if (!over) await Coach.step(btn('jump'), '', '', { until: () => !Mover.active, stop });
    Coach.end();
    if (await asked === ans) break;
    NL.resetMarks(); NL.markStart(it.start); await NL.teleport(it.start); // went past it: back to the start and walk again
  }
  stage.classList.remove('demo-walk'); endTalk();
}

async function keyHunt(L, from = 0) {
  const lvl = LEVELS[L];
  HUD.keys(lvl.keys.length);
  for (let i = 0; i < from; i++) HUD.fill(i);
  setPlaying(true);
  if (lvl.keysIntro && from === 0) { if (lvl.signOnlyWithOst) Tablet.hide(); await voiceOnly('wizard', lvl.keysIntro); }
  for (let i = from; i < lvl.keys.length; i++) {
    const it = lvl.keys[i], ans = it.start + it.delta;
    let tries = 0;
    QA.at(`${L}:keys:${i}`, it.delta > 0 ? 'right' : 'left', ans);
    // a question can bring its own background and stones; the next one goes back to the chamber's
    setBg(it.bg || lvl.bg); stage.classList.toggle('stones-lava', (it.stones || lvl.stones) === 'lava');
    NL.resetMarks(); Tablet.eq(it.eq);
    if (NL.pos !== it.start) await NL.teleport(it.start); else NL.face(1);
    NL.markStart(it.start);
    // a solved example: the explorer reasons it out aloud, the player walks him and jumps, then they're on their own
    if (it.demo) { await solvedExample(it, ans); await keySuccess(L, i, it, ans, false); continue; }
    // the guided first question doesn't wait for the whole question to be read: the controls come up straight away
    const questionVO = voiceOnly('wizard', it.vo); questionVO.catch(() => {});
    Tablet.glow(questionVO);
    // the guided question: only the equation is spotlit while it is read; the arrows come after
    if (it.coach) await Coach.step($('#tablet'), '', '', { until: () => false, stop: questionVO.then(() => 'stop', () => 'stop'), hand: false });
    await wait(300); // the controls come up with the equation
    while (true) {
      const asked = Mover.ask(it.start, {
        idle: () => { speakOnly('wizard', it.idle); Mover.pulse(); NL.hop(); },
      });
      if (it.coach && tries === 0) await coachKeyMoves(it, ans, asked);
      const v = await asked;
      if (v === ans) break;
      tries++;
      await wrongKey(it, v, tries, ans);
      if (tries === 4) await signRules(L, it); // the 4th miss: the sign rule behind this question, walked through
      if (tries >= 4) answerHand(NL.stone(ans)); // the 4th miss: show where the key is
    }
    await keySuccess(L, i, it, ans, tries === 0);
  }
  setPlaying(false); stage.classList.toggle('stones-lava', lvl.stones === 'lava');
}

// after the 4th wrong try a tapping hand points at the answer (key game: the right stone; map: the next key to press)
function answerHand(el) {
  document.querySelectorAll('.answer-hand').forEach(h => { if (h.parentElement !== el) h.remove(); });
  if (!el || el.querySelector(':scope > .answer-hand')) return;
  el.insertAdjacentHTML('beforeend', '<div class="answer-hand" aria-hidden="true"><i></i><b>👆</b></div>');
}
function clearAnswerHand() { document.querySelectorAll('.answer-hand').forEach(h => h.remove()); }
// map: follows what has been typed — the − key first for a negative answer, then each digit, then CHECK (✕ to undo a wrong digit)
function guideKeypad(ans) {
  const r = RUN, want = String(Math.abs(ans)), tray = $('#tray');
  const t = setInterval(() => {
    if (r !== RUN || !Dial.active) { clearInterval(t); clearAnswerHand(); return; }
    const shown = $('#display').textContent.replace(/\s/g, ''), neg = /^[−-]/.test(shown), typed = (shown.match(/\d/g) || []).join('');
    let k;
    if (ans < 0 && !neg) k = typed ? 'back' : '-';
    else if (ans >= 0 && neg) k = 'back';
    else if (!want.startsWith(typed)) k = 'back';
    else if (typed.length < want.length) k = want[typed.length];
    else k = 'go';
    answerHand(tray.querySelector(k === 'go' ? '.k.go' : k === 'back' ? '.k.back' : `.k[data-k="${k}"]`));
  }, 150);
}

async function wrongKey(it, v, tries, ans) {
  const rung = Math.min(tries, 3);
  S.streak = 0; Sound.fx.wrong(); $('#counter').classList.remove('on');
  NL.stone(v)?.classList.add('miss', 'show');
  NL.pose('explorer_confused'); NL.jump();
  await wait(450); const p = stagePos(NL.exp); puffs(p.x, p.y + 110); Sound.fx.thud();
  await voiceOnly('wizard', it.wrong[rung - 1]);
  // back to the start stone to try again
  NL.resetMarks(); NL.markStart(it.start);
  await NL.teleport(it.start);
  const right = it.delta > 0;
  if (rung === 2) NL.arrow(it.start, 2, right ? 'Move right' : 'Move left', !right);
  if (rung === 3) {
    const dir = Math.sign(it.delta), c = $('#counter');
    // the camera shows the start and the answer together when they fit, otherwise it follows the count
    const fits = Math.abs(it.delta) * STEP <= STAGE_W - 260, mid = it.start + it.delta / 2;
    if (fits) NL.look(mid);
    for (let k = 1; k <= Math.abs(it.delta); k++) {
      if (!fits) NL.look(it.start + dir * k);
      const s = NL.stone(it.start + dir * k); s?.classList.add('trail');
      c.style.left = `${NL.x(it.start + dir * k)}px`; c.innerHTML = `<small>Step</small>${k}`; retrigger(c, 'on'); Sound.fx.count(k);
      await wait(RM ? 200 : 380);
    }
    c.classList.remove('on');
    NL.stone(ans)?.classList.add('pulse', 'show'); NL.tag(ans); Sound.fx.sparkle();
  }
  NL.pose('explorer_idle'); NL.face(1);
}

async function keySuccess(L, i, it, ans, firstTry) {
  clearAnswerHand(); Mover.hide(); NL.hideArrow(); NL.untag(); $('#counter').classList.remove('on');
  Tablet.solve(ans);
  const s = NL.stone(ans); s.classList.remove('pulse'); s.classList.add('land', 'show', 'correct'); // the answer stone lights up green and stays lit
  { const p = stagePos(s); FX.burst(p.x, p.y, 16, 'star', 6); }
  NL.pose('explorer_jump_key'); NL.jump();
  const k = $('#keyprize'), last = i === LEVELS[L].keys.length - 1;
  if (LEVELS[L].keyBox) {
    // the hidden box sits where the explorer's head reaches at the top of the jump
    const box = document.createElement('div'); box.className = 'keybox'; box.id = 'keyBox';
    // art: rays and halo behind, the crate on top (a drawn box if the art is missing)
    if (stage.classList.contains('has-ui_keybox')) { box.classList.add('art'); box.innerHTML = '<i class="kb-rays"></i><i class="kb-halo"></i><i class="kb-art"></i>'; }
    else box.innerHTML = KEYBOX_SVG;
    box.style.left = `${NL.x(ans)}px`; $('#nl').appendChild(box);
    await wait(RM ? 100 : 200); // the head reaches the (now lower) box a little sooner
    box.classList.add('hit'); Sound.fx.thud(); Sound.fx.pop();
    const bp = stagePos(box); FX.burst(bp.x, bp.y, 18, 'star', 6);
    await wait(180);
    k.style.left = `${NL.x(ans) + 82}px`; retrigger(k, 'boxpop'); k.classList.add('on'); Sound.fx.key();
    box.classList.add('open');
  } else { Sound.fx.key(); k.style.left = `${NL.x(ans) + 100}px`; retrigger(k, 'on'); }
  const p = stagePos(NL.exp); FX.burst(p.x, p.y - 60, 30, 'star', 8);
  toast(it.cele, it.cele.length < 8); FX.confetti(it.size);
  if (firstTry) addGem();
  if (!it.demo) streakHit(firstTry); // the explorer's own solved example doesn't count for or against the player
  await wait(1000);
  k.classList.remove('on');
  const r = RUN; await fly(KEY_SVG, stagePos(k), HUD.slotPos(i), 800, 70); guard(r);
  HUD.fill(i); Sound.fx.coin();
  if (last) { // every key collected: a little party, and the full key tray bounces key by key
    Sound.fx.celebrate(); FX.confetti('huge');
    document.querySelectorAll('#slots .slot').forEach((s, n) => setTimeout(() => pulseClass(s, 'bump', 600), n * 90));
  }
  NL.pose('explorer_thumbsup');
  if (it.demo) { NL.jump(); await talk('explorer', it.demo.done); endTalk(); } // the solved example ends on the explorer handing over
  else await voiceOnly('wizard', it.found || `Correct! You found it. The explorer reached ${numHTML(ans)}. The key is right here.`);
  await wait(600); // the next key question, or the map, follows on its own
  NL.pose('explorer_idle');
}

function showHintArrow(dir) {
  const a = $('#hintArrow'); a.innerHTML = arrowSVG(110, 62);
  const t = $('#tablet').getBoundingClientRect(), s = stage.getBoundingClientRect();
  const left = (t.left - s.left) / scale, right = (t.right - s.left) / scale;
  a.className = `on ${dir}`;
  a.style.left = dir === 'right' ? `${right + 16}px` : `${left - 126}px`;
  a.style.setProperty('--nx', dir === 'right' ? '12px' : '-12px');
  Sound.fx.whoosh();
}

async function mysteries(L, from = 0) {
  const lvl = LEVELS[L], pa = lvl.pathArt;
  setupPathArt(L); $('#pathArt').classList.add('faint'); litTo(pa, from);
  if (from === 0 && lvl.mapIntro.some(l => !l.vo)) await castIn();
  if (from === 0) for (const line of lvl.mapIntro) { // vo: an instruction, voice only
    if (line.exp && actors.exp) { actor('exp', { img: line.exp }); actorAnim('exp', 'shake'); } // exp: the explorer's face as the line starts
    await (line.vo ? voiceOnly(line.who, line.text) : talk(line.who, line.text));
  }
  castOut(); // the characters from the unlock scene step away before the puzzles start
  HUD.seals(lvl.mysteries.length); // the puzzle tray comes in with the puzzles (the unlock screen shows no tray)
  setPlaying(true);
  for (let j = 0; j < from; j++) HUD.fill(j);
  for (let j = from; j < lvl.mysteries.length; j++) {
    const m = lvl.mysteries[j], ans = m.start + m.delta;
    let tries = 0;
    QA.at(`${L}:map:${j}`, null, ans);
    if (j > from) await wait(600); // let the newly lit path stay on screen a moment
    stage.classList.add('map-scroll'); setBg(lvl.bg); Sound.fx.whoosh(); await wait(250); // the puzzle comes up on the scroll
    Dial.clear(); Tablet.eq(m.eq); $('#hintArrow').classList.remove('on');
    Tablet.glow(wait(2800), true); // the new puzzle's equation glows as long as a key question's does ("The next key is at.")
    // the keypad comes up with the equation; the puzzle is read out while the player can already answer
    let puzzleVO = null;
    if (m.vo) { puzzleVO = voiceOnly('wizard', m.vo); puzzleVO.catch(() => {}); } else hideBubble();
    if (m.coach) await coachPuzzleIntro(m);
    Dial.show();
    while (true) {
      const asked = Dial.ask({
        idle: () => { speakOnly('wizard', m.idle); Dial.pulse(); },
        touched: () => { $('#hintArrow').classList.remove('on'); },
      });
      if (m.coach && tries === 0) await coachKeypad(m, ans, asked, puzzleVO);
      const v = await asked;
      if (v === ans) break;
      tries++; S.streak = 0;
      Dial.shake(); Sound.fx.wrong();
      const rung = Math.min(tries, 3);
      speakOnly('wizard', m.wrong[rung - 1]);
      if (rung === 2) showHintArrow(m.delta > 0 ? 'right' : 'left');
      if (rung === 3) await Tablet.pulseTokens(); // the equation's numbers pulse
      await wait(300);
      Dial.clear();
      if (tries === 4) await signRules(L, m); // the 4th miss: the sign rule behind this puzzle, walked through
      if (tries >= 4) guideKeypad(ans); // the 4th miss: the hand shows which keys to press
    }
    // solved
    clearAnswerHand(); Dial.good(); Tablet.solve(ans); Sound.fx.reveal();
    // the keypad fades out on the scroll first, then the scroll goes (it never jumps to another place mid-fade)
    await wait(900); Dial.hide(); await wait(RM ? 60 : 360); stage.classList.remove('map-scroll'); await wait(500);
    litTo(pa, j + 1); retrigger($('#pathArt .pa-lit'), 'flash');
    HUD.fill(j);
    const sp = artPoint(pa, pa.route[pathCut(pa, j + 1)]); FX.burst(sp.x, sp.y, j === 3 ? 40 : 22, 'star', j === 3 ? 10 : 7);
    toast(j === 3 ? '4/4 SOLVED!' : `${j + 1}/4 SOLVED`, true); FX.confetti(j === 3 ? 'medium' : 'small');
    if (tries === 0) addGem();
    streakHit(tries === 0);
    $('#hintArrow').classList.remove('on');
    await voiceOnly('wizard', m.correct);
    await wait(500);
  }
  Dial.hide(); setPlaying(false);
}

// the route art on the scroll: sized to its own shape, 760 wide, centred on the paper (top 145, 491 tall)
function setupPathArt(L) {
  const pa = LEVELS[L].pathArt, art = $('#pathArt');
  art.querySelector('.pa-img').style.backgroundImage = `url(${ASSET(pa.img)})`;
  const ah = 760 * pa.h / pa.w; art.style.height = `${ah}px`; art.style.top = `${145 + (491 - ah) / 2}px`;
  art.querySelector('.pa-token').style.backgroundImage = `url(${ASSET('explorer_avatar')})`;
  const svg = art.querySelector('svg'), d = pa.route.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ');
  svg.setAttribute('viewBox', `0 0 ${pa.w} ${pa.h}`);
  svg.querySelector('.pa-glow').setAttribute('d', d); svg.querySelector('.pa-hit').setAttribute('d', d);
  $('#nlWrap').classList.remove('on', 'out'); setBg(LEVELS[L].bg);
  stage.classList.add('map-ui', 'path-art');
  return pa;
}
// light the route up to the end of section k of 4 (k = 0 → nothing lit)
const pathCut = (pa, k) => Math.round((pa.route.length - 1) * k / 4);
function litTo(pa, k) {
  const pts = pa.route.slice(0, pathCut(pa, k) + 1);
  $('#pathArt .pa-lit').setAttribute('d', k ? pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ') : '');
}
// stage position of a point on the route art
function artPoint(pa, [x, y]) {
  const r = $('#pathArt').getBoundingClientRect(), s = stage.getBoundingClientRect(), k = s.width / STAGE_W;
  return { x: (r.left - s.left + x / pa.w * r.width) / k, y: (r.top - s.top + y / pa.h * r.height) / k };
}

// the map scenes' cast: the explorer and the wizard in the bottom corners, in front of the scroll
// (sizes and spots from the layout editor, 21 Oct). who: which of them to bring in.
async function castIn(who = ['exp', 'wiz'], expImg = 'explorer_idle') {
  stage.classList.add('cast');
  if (who.includes('exp') && !actors.exp) actor('exp', { img: expImg, x: 97.5, y: 860.9, h: 476.4, cls: 'idle', enter: true });
  if (who.includes('wiz') && !actors.wiz) { await wait(300); poofAt(1115, 560); await wait(250); actor('wiz', { img: 'wizard_explain', x: 1114.7, y: 883.8, h: 597, cls: 'idle', enter: true }); }
  await wait(600);
}
function castOut() {
  for (const id of ['wiz', 'exp']) if (actors[id]) { const p = stagePos(actors[id].el); poofAt(p.x, p.y); removeActor(id); }
  endTalk(); stage.classList.remove('cast');
}
// map unlock: the path art, dimmed (route still hidden), flies in and unrolls while the lines play
const unlockLines = L => ({ ...UNLOCK, ...(LEVELS[L].unlock || {}) }); // a chamber's own lines over the defaults
async function unlock(L) {
  const UNLOCK = unlockLines(L);
  const from = $('#slots').classList.contains('on') ? stagePos($('#slots')) : { x: STAGE_W - 140, y: 60 };
  // the chamber fades away first (number line, explorer, sign and the key tray, which this screen doesn't show),
  // then the map flies in out of where the keys were
  Tablet.hide(); $('#slots').classList.remove('on'); $('#nlWrap').classList.add('out');
  await wait(RM ? 80 : 450);
  const pa = setupPathArt(L); litTo(pa, 0); $('#pathArt').classList.add('faint');
  if (UNLOCK.explorer || UNLOCK.wizard) stage.classList.add('cast', 'cast-now'); // someone will talk: unroll it already tucked up, no jump later
  ['#scroll', '#pathArt'].forEach(q => {
    const e = $(q); flyIn(e, from); e.classList.add('late'); retrigger(e, 'unroll');
    e.addEventListener('animationend', () => e.classList.remove('unroll', 'late'), { once: true });
  });
  Sound.fx.whoosh(); // the rolled-up map flies in…
  await wait(RM ? 300 : 700); Sound.fx.creak(); // …lands and unrolls
  await wait(900); Sound.fx.sparkle(); stage.classList.remove('cast-now');
  // whoever has a line in the script steps in front of the map and says it; with no lines the map just shows a moment
  const cast = [UNLOCK.explorer && 'exp', UNLOCK.wizard && 'wiz'].filter(Boolean);
  if (!cast.length) { await wait(1600); return; }
  await castIn(cast, UNLOCK.wizard ? 'explorer_idle' : 'explorer_thumbsup');
  if (UNLOCK.wizard) await talk('wizard', UNLOCK.wizard);
  if (UNLOCK.explorer) { actor('exp', { img: 'explorer_thumbsup' }); actorAnim('exp', 'hop'); await talk('explorer', UNLOCK.explorer); }
}

// el flies in from point `from` (stage px): small and tilted, it lands where it already sits
function flyIn(el, from, ms = RM ? 300 : 700) {
  const b = el.getBoundingClientRect(), st = stage.getBoundingClientRect(), cs = getComputedStyle(el);
  const c = { x: (b.left + b.width / 2 - st.left) / scale, y: (b.top + b.height / 2 - st.top) / scale };
  const [ox, oy] = cs.transformOrigin.split(' ').map(parseFloat), o = { x: el.offsetLeft + ox, y: el.offsetTop + oy };
  const s = .12, a = -18 * Math.PI / 180, dx = c.x - o.x, dy = c.y - o.y;
  // the centre lands on `from`: t = from − o − R·s·(c − o)
  const tx = from.x - o.x - s * (Math.cos(a) * dx - Math.sin(a) * dy), ty = from.y - o.y - s * (Math.sin(a) * dx + Math.cos(a) * dy);
  el.animate([
    { translate: `${tx}px ${ty}px`, scale: `${s}`, rotate: '-18deg', opacity: 0 },
    { offset: .2, opacity: 1 },
    { translate: '0px 0px', scale: '1', rotate: '0deg', opacity: 1 },
  ], { duration: ms, easing: 'cubic-bezier(.3,.9,.35,1.05)' });
}

// the revealed route as its own illustration: the dashed path glows, a tap sends the explorer along it
async function revealed(L) {
  const lvl = LEVELS[L], rv = lvl.revealed, art = $('#pathArt'), tok = art.querySelector('.pa-token');
  const pa = setupPathArt(L);
  art.classList.remove('faint'); litTo(pa, 4);
  const at = ([x, y]) => { tok.style.left = `${x / pa.w * 100}%`; tok.style.top = `${y / pa.h * 100}%`; };
  Sound.fx.reveal();
  await wait(500);
  FX.confetti('huge'); Sound.fx.fanfare(); toast(rv.ost, true);
  if (rv.wizard) { // only where the script has a line here
    await castIn(['exp', 'wiz'], 'explorer_thumbsup');
    await talk('wizard', rv.wizard);
    castOut(); // out of the way of the route
  } else await wait(1200);
  art.classList.add('glow');
  // a tapping hand on the start of the route shows where to tap
  let hand = art.querySelector('.pa-hand');
  if (!hand) { hand = document.createElement('div'); hand.className = 'pa-hand'; hand.innerHTML = '<i></i><b>👆</b>'; art.appendChild(hand); }
  hand.style.left = `${pa.route[0][0] / pa.w * 100}%`; hand.style.top = `${pa.route[0][1] / pa.h * 100}%`; hand.classList.add('on');
  const r = RUN, hit = art.querySelector('.pa-hit');
  await new Promise(res => {
    const go = () => { hit.removeEventListener('click', go); pending.tapTarget = null; clearInterval(t); res(); };
    hit.addEventListener('click', go); pending.tapTarget = go;
    const t = setInterval(() => { if (r !== RUN) { clearInterval(t); return; } speakOnly('wizard', rv.idle); }, 14000);
  });
  guard(r);
  Sound.fx.tap(); Voice.stop(); art.classList.remove('glow'); hand.classList.remove('on');
  at(pa.route[0]); tok.classList.add('on'); await wait(400);
  for (let k = 1; k < pa.route.length; k++) { at(pa.route[k]); if (k % 2) Sound.fx.step(); await wait(RM ? 120 : 260); }
  const p = stagePos(tok); FX.burst(p.x, p.y, 30, 'star', 8); Sound.fx.sparkle();
  if (rv.explorer) await castIn(['exp'], 'explorer_point');
  if (rv.explorer) await talk('explorer', rv.explorer); endTalk(); // only where the script has an explorer line
  castOut();
  await wait(400);
}

/* ---------- sign rules: a short visual explanation, each rule with an example walked on a little number line.
   Before a chamber's keys: that chamber's rules (signRules in data.js). After the 4th wrong try: the rule behind the
   question glows, and the player's own question is walked through last. A tap on a row plays it again. ---------- */
const signOf = tok => /[−-]/.test(tok) ? '−' : '+';
// '(+7) − 4 = ?' → '+−+': the first number's sign, the operation, the second number's sign
const signKey = eq => { const [a, op, b] = eq.split(' '); return signOf(a) + op + signOf(b); };
const signsHTML = k => [k[0], k[2]].map(s => `(<span class="${s === '−' ? 'neg' : 'pos'}">${s}</span>)`).join(` ${k[1]} `);
// the rule a question follows: this chamber's first, then earlier ones; else one with the same operation and second sign
function ruleFor(L, eq) {
  const k = signKey(eq), all = LEVELS.slice(0, L + 1).map(l => l.signRules || []).reverse().flat();
  return all.find(r => signKey(r.eq) === k) || all.find(r => signKey(r.eq).slice(1) === k.slice(1)) || null;
}
function srRow(x) {
  const [a, op, b] = x.eq.split(' '), start = toInt(a), delta = (op === '+' ? 1 : -1) * toInt(b), ans = start + delta;
  let lo = Math.min(start, ans) - 1, hi = Math.max(start, ans) + 1;
  if (lo > 0 && lo <= 3) lo = 0; if (hi < 0 && hi >= -3) hi = 0; // 0 shows when it is close by
  let cells = '';
  for (let v = lo; v <= hi; v++) cells += `<i class="sr-cell${v === 0 ? ' zero' : ''}" data-v="${v}"><span class="${cls(v)}">${fmt(v)}</span></i>`;
  return `<div class="sr-row${x.focus ? ' focus' : ''}${x.mine ? ' mine' : ''}" data-start="${start}" data-delta="${delta}">`
    + `<div class="sr-signs">${x.mine ? '<small>Your puzzle</small>' : ''}${signsHTML(signKey(x.eq))}</div>`
    + `<div class="sr-what"><b>${x.move}</b><span>${x.text}</span></div>`
    + `<div class="sr-ex"><div class="sr-eq">${eqTokens(x.eq)} <span class="op">=</span> <span class="sr-ans">?</span></div>`
    + `<div class="sr-line${hi - lo > 13 ? ' tight' : ''}" style="--n:${hi - lo + 1}">${cells}<i class="sr-arrow"></i></div></div>`
    + `${x.focus ? '<em class="sr-tag">Like your puzzle!</em>' : ''}</div>`;
}
// one row's example: start stone, then the arrow grows a stone at a time, then the answer lights up
async function playRow(el) {
  const me = el._run = (el._run || 0) + 1, live = () => el._run === me && el.isConnected;
  const start = +el.dataset.start, delta = +el.dataset.delta, ans = start + delta, dir = Math.sign(delta), n = Math.abs(delta);
  const cells = [...el.querySelectorAll('.sr-cell')], lo = +cells[0].dataset.v, w = 100 / cells.length, cell = v => cells[v - lo];
  const arrow = el.querySelector('.sr-arrow'), ms = RM ? 90 : Math.max(150, Math.min(320, 2400 / n)), at = (start - lo + .5) * w;
  cells.forEach(c => c.classList.remove('st', 'hl', 'land')); el.classList.remove('done');
  el.querySelector('.sr-ans').innerHTML = '?';
  arrow.classList.remove('on'); arrow.classList.toggle('back', dir < 0); arrow.style.transition = 'none'; arrow.style.width = '0';
  arrow.style.left = dir > 0 ? `${at}%` : 'auto'; arrow.style.right = dir < 0 ? `${100 - at}%` : 'auto';
  void arrow.offsetWidth; arrow.style.transition = ''; arrow.style.setProperty('--srms', `${ms}ms`);
  el.classList.add('playing'); cell(start).classList.add('st'); Sound.fx.pop();
  await wait(RM ? 100 : 450); if (!live()) return;
  arrow.classList.add('on');
  for (let k = 1; k <= n; k++) {
    arrow.style.width = `${k * w}%`; cell(start + dir * k).classList.add('hl'); Sound.fx.count(k);
    await wait(ms); if (!live()) return;
  }
  cell(ans).classList.add('land'); el.querySelector('.sr-ans').innerHTML = numHTML(ans); Sound.fx.coin();
  el.classList.remove('playing'); el.classList.add('done');
  await wait(RM ? 100 : 380);
}
async function signRules(L, puzzle = null) {
  const r = RUN, box = $('#signRules'), list = box.querySelector('.sr-list'), btn = $('#btnRules');
  const rows = (LEVELS[L].signRules || []).map(x => ({ ...x }));
  if (puzzle) {
    const match = ruleFor(L, puzzle.eq), i = match ? rows.findIndex(x => x.eq === match.eq) : -1;
    if (i >= 0) rows[i].focus = true; else if (match) rows.unshift({ ...match, focus: true });
    const n = Math.abs(puzzle.delta), way = puzzle.delta > 0 ? 'right' : 'left';
    rows.push({ eq: puzzle.eq.replace(/ = \?$/, ''), mine: true, move: `Move ${way}`, text: `Start at ${fmt(puzzle.start)} and take ${n} step${n === 1 ? '' : 's'} ${way}.` });
  }
  if (!rows.length) return;
  box.querySelector('h2').textContent = puzzle ? 'Let’s look at the rule!' : 'Sign rules';
  box.querySelector('.sr-sub').textContent = puzzle ? 'Your puzzle works like the glowing rule. Watch, then try again!' : 'Watch which way each sign moves you. Tap a rule to see it again.';
  list.innerHTML = rows.map(srRow).join('');
  btn.textContent = puzzle ? 'Try again' : 'Let’s go!'; btn.classList.remove('on');
  box.classList.remove('out'); box.classList.add('on'); Sound.fx.whoosh();
  const els = [...list.children];
  els.forEach(el => el.addEventListener('click', () => { Sound.fx.tap(); playRow(el).catch(() => {}); }));
  await wait(RM ? 100 : 450 + els.length * 120); // the rows slide in one after another
  for (const el of els) await playRow(el);
  btn.classList.add('on'); Sound.fx.sparkle();
  await new Promise(res => {
    const go = () => { btn.onclick = null; pending.tapTarget = null; res(); };
    btn.onclick = () => { btn.blur(); Sound.fx.tap(); go(); }; pending.tapTarget = go;
  });
  guard(r);
  box.classList.add('out'); await wait(RM ? 60 : 280);
  box.classList.remove('on', 'out');
}

// a level can start at any step (used by the QA panel); i = which key or map puzzle
const STEPS = ['teach', 'keys', 'unlock', 'map', 'reveal'];
async function runLevel(L, step = 'teach', i = 0) {
  const from = STEPS.indexOf(step), lvl = LEVELS[L];
  S.level = L; S.levelGems[L] = 0; reached(String(L)); Preload.want(L);
  QA.at(`${L}:${step}:${i}`); // where the player is from the start, even while the step's intro lines play (back counts on it)
  resetUI();
  stage.classList.toggle('theme-cavern', lvl.theme === 'cavern');
  stage.classList.toggle('stones-lava', lvl.stones === 'lava'); // a chamber can use the lava stones throughout
  $('#dirPick .jump .t').textContent = lvl.submit || 'JUMP!';
  setBg(lvl.bg); NL.build(lvl);
  if (L > 0 && from === 0) { toast(lvl.name, true); Sound.fx.whoosh(); await wait(1200); }
  if (from <= 0) { QA.at(`${L}:teach:0`); await teach(L); await signRules(L); } // the sign rules, with examples, before the keys
  if (from <= 1) await keyHunt(L, from === 1 ? i : 0);
  if (from === 2) { HUD.keys(lvl.keys.length); lvl.keys.forEach((_, k) => HUD.fill(k)); }
  if (from <= 2) { QA.at(`${L}:unlock:0`); await unlock(L); }
  if (from <= 3) await mysteries(L, from === 3 ? i : 0);
  if (from >= 4) { HUD.seals(lvl.mysteries.length); lvl.mysteries.forEach((_, k) => HUD.fill(k)); }
  if (from <= 4) { QA.at(`${L}:reveal:0`); await revealed(L); }
}

async function runEnding() {
  resetUI(); QA.at('end'); reached('end'); Preload.want('end');
  await playScenes(STORY_END);
  const f = $('#final');
  f.querySelector('.badge-art').innerHTML = badgeSVG(FINAL_BADGE);
  f.querySelector('.final-stats').innerHTML = `All 3 map pieces found and the treasure is yours!<br>Gems found on first try: <b>${S.gems}</b> of 27`;
  hideBubble(); f.classList.add('on'); Sound.fx.fanfare(); FX.confetti('huge');
}

/* ---------- chapters ---------- */
async function goChapter(c, step = 'teach', i = 0) {
  if (Clock.paused) closeMenu();
  RUN++; resetUI(); S.streak = 0; // a run of right answers carries on from chamber to chamber
  try {
    if (c === 'story') { S.gems = 0; await runStory(); c = 0; }
    if (c === 'howto') { c = 0; step = 'keys'; i = 0; } // how to play = the guided first key
    if (c === 'end') { await runEnding(); return; }
    for (let L = +c; L < LEVELS.length; L++) await (L === +c ? runLevel(L, step, i) : runLevel(L));
    await runEnding();
  } catch (e) { if (e !== CANCEL) console.error(e); }
}

/* ---------- menu & toggles ---------- */
function paintToggles() {
  $('#pause [data-act="sound"]').textContent = `Sound: ${Sound.on ? 'on' : 'off'}`;
  $('#pause [data-act="voice"]').textContent = `Voice: ${Voice.on ? 'on' : 'off'}`;
}
$('#btnPause').innerHTML = ICONS.menu;
$('#btnPause').addEventListener('click', () => { Sound.fx.tap(); pauseGame(); });
// back (top left): one step back — the previous key or map puzzle, the chamber's intro, the chamber before, the story;
// from the story, the home screen. Steps are the ones the QA panel jumps to (QA.at marks where the player is).
const STEP_LIST = ['story', ...LEVELS.flatMap((lvl, L) => [`${L}:teach:0`, ...lvl.keys.map((_, i) => `${L}:keys:${i}`), `${L}:unlock:0`,
  ...lvl.mysteries.map((_, i) => `${L}:map:${i}`), `${L}:reveal:0`]), 'end'];
function stepBack() {
  const k = STEP_LIST.indexOf(QA.cur);
  if (k <= 0) { showTitle(); return; } // the story (or anything unknown): back to the home screen
  const [L, step, i] = STEP_LIST[k - 1].split(':');
  goChapter(step ? +L : L, step, +i || 0);
}
$('#btnBack').innerHTML = ICONS.back;
$('#btnBack').addEventListener('click', () => { $('#btnBack').blur(); Sound.fx.tap(); stepBack(); });
// pause freezes the story or game exactly where it is (timers, animations, the voice, the music); closing the menu carries on
// the menu's chapter list offers only what the player has already reached (the story, each chamber, the treasure),
// remembered in this browser so it survives a reload
const played = new Set((() => { try { return JSON.parse(localStorage.getItem('tt-played')) || []; } catch (e) { return []; } })());
function reached(c) {
  if (played.has(c)) return; played.add(c);
  try { localStorage.setItem('tt-played', JSON.stringify([...played])); } catch (e) {}
}
function paintChapters() {
  const btns = [...document.querySelectorAll('#pause [data-go]')];
  btns.forEach(b => { b.hidden = !played.has(b.dataset.go); });
  const any = btns.some(b => !b.hidden);
  $('#pause h3').hidden = !any; $('#pause .chapters').hidden = !any;
}
function pauseGame() {
  if (Clock.paused) return;
  paintChapters();
  Voice.pause(); Sound.hold(true); Clock.pause($('#pause')); stage.classList.add('paused'); $('#pause').classList.add('on');
}
function closeMenu() {
  $('#pause').classList.remove('on');
  if (!Clock.paused || autoPaused) return; // away (another tab, or an upright phone): it carries on when they're back
  stage.classList.remove('paused'); Clock.resume(); Sound.hold(false); Voice.resume();
}
// leaving the tab or the window pauses the game on the spot (timers, animations, voice, music, effects);
// coming back carries on from there. A game already paused from the menu stays paused until the menu is closed.
let away = false, autoPaused = false, focused = true;
function setAway(a) {
  if (a === away) return; away = a;
  if (a) { Voice.away(true); Sound.away(true); if (!Clock.paused) { autoPaused = true; Clock.pause(); } }
  else { if (autoPaused) { autoPaused = false; Clock.resume(); } Sound.away(false); Voice.away(false); }
}
// a phone held upright shows the "turn sideways" message (same query as #rotate in the CSS): the game waits behind it
const ROTATE_Q = matchMedia('(orientation: portrait) and (max-width: 600px)');
const checkAway = () => setAway(document.hidden || !focused || ROTATE_Q.matches);
document.addEventListener('visibilitychange', checkAway);
addEventListener('blur', () => { focused = false; checkAway(); });
addEventListener('focus', () => { focused = true; checkAway(); });
ROTATE_Q.addEventListener('change', checkAway);
$('#pause').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) { if (e.target.id === 'pause') closeMenu(); return; }
  Sound.fx.tap();
  if (b.dataset.act === 'resume') closeMenu();
  if (b.dataset.act === 'sound') { Sound.toggle(); paintToggles(); }
  if (b.dataset.act === 'voice') { Voice.toggle(); paintToggles(); }
  if (b.dataset.go !== undefined) { closeMenu(); goChapter(b.dataset.go); }
});

/* ---------- dev buttons (the QA panel's) sit at the bottom left ---------- */
function devButton(btn) {
  let d = $('#devBtns');
  if (!d) { d = document.createElement('div'); d.id = 'devBtns'; stage.appendChild(d); }
  d.prepend(btn); stage.classList.add('has-dev');
}

/* ---------- QA panel: jump to any step, auto-solve ---------- */
const QA = (() => {
  let cur = '', dir = null, ans = null, open = false, box = null;
  const NAMES = { story: 'Story', howto: 'How to play', end: 'Treasure ending', teach: 'Intro', keys: 'Key', unlock: 'Unlock map', map: 'Map puzzle', reveal: 'Path reveal' };
  function label(id) {
    if (!id) return 'Title screen';
    const [L, step, i] = id.split(':');
    if (!step) return NAMES[L];
    const n = step === 'keys' || step === 'map' ? ` ${+i + 1}` : '';
    return `Chamber ${+L + 1} · ${NAMES[step]}${n}`;
  }
  const chip = (id, text, title = '') => `<button class="qa-chip" data-qa="${id}"${title ? ` title="${title}"` : ''}>${text}</button>`;
  function build() {
    box = document.createElement('div'); box.id = 'qa';
    box.innerHTML = `<button id="qaBtn" aria-label="Open QA panel">QA</button>
      <aside id="qaPanel" role="dialog" aria-label="QA panel">
        <header><div><b>QA panel</b><small id="qaNow"></small></div><button id="qaClose" aria-label="Close QA panel">✕</button></header>
        <button id="qaAuto">Auto-solve / Next <kbd>N</kbd></button>
        <label class="qa-vol">Music <input id="qaMusic" type="range" min="0" max="100" step="1"> <output id="qaMusicVal"></output></label>
        <section><h4>Story</h4><div class="qa-row">${chip('story', 'Intro story')}${chip('0:keys:0', 'How to play')}${chip('end', 'Treasure ending')}</div></section>
        ${LEVELS.map((lvl, L) => `<section><h4>Chamber ${L + 1} · ${lvl.name}</h4>
          <div class="qa-row">${chip(`${L}:teach:0`, 'Intro')}</div>
          <div class="qa-row"><span>Keys</span>${lvl.keys.map((k, i) => chip(`${L}:keys:${i}`, i + 1, k.eq.replace(' = ?', ''))).join('')}</div>
          <div class="qa-row">${chip(`${L}:unlock:0`, 'Unlock map')}</div>
          <div class="qa-row"><span>Map</span>${lvl.mysteries.map((m, i) => chip(`${L}:map:${i}`, i + 1, m.eq.replace(' = ?', ''))).join('')}</div>
          <div class="qa-row">${chip(`${L}:reveal:0`, 'Path reveal')}</div></section>`).join('')}
        <p class="qa-tip"><kbd>Q</kbd> open or close · <kbd>N</kbd> auto-solve · <kbd>Esc</kbd> close</p>
      </aside>`;
    document.body.appendChild(box);
    devButton($('#qaBtn'));
    $('#qaBtn').addEventListener('click', () => api.toggle());
    $('#qaClose').addEventListener('click', () => api.close());
    $('#qaAuto').addEventListener('click', () => api.auto());
    // music volume, remembered on this device while testing (the game's own default is Sound.MUSIC_DEFAULT)
    const vol = $('#qaMusic'), showVol = () => { $('#qaMusicVal').textContent = `${vol.value}%`; };
    try { const v = localStorage.getItem('tt-music-vol'); if (v !== null) Sound.musicVolume = +v / 100; } catch (e) {}
    vol.value = Math.round(Sound.musicVolume * 100); showVol();
    vol.addEventListener('input', () => {
      Sound.init(); Sound.music(); Sound.musicVolume = vol.value / 100; showVol();
      try { localStorage.setItem('tt-music-vol', vol.value); } catch (e) {}
    });
    $('#qaPanel').addEventListener('click', e => {
      const b = e.target.closest('[data-qa]'); if (!b) return;
      const [L, step, i] = b.dataset.qa.split(':');
      Sound.init(); Sound.fx.tap(); closeMenu(); api.close();
      goChapter(step ? +L : L, step, +i || 0);
    });
    paint();
  }
  function paint() {
    if (!box) return;
    $('#qaNow').textContent = `Now: ${label(cur)}`;
    box.querySelectorAll('[data-qa]').forEach(b => b.classList.toggle('cur', b.dataset.qa === cur));
  }
  const api = {
    get isOpen() { return open; },
    get cur() { return cur; },
    get label() { return label(cur); },
    at(id, d = null, a = null) { cur = id; dir = d; ans = a; paint(); },
    toggle() { open ? api.close() : api.open(); },
    open() { if (!box) return; open = true; box.classList.add('on'); Voice.stop(); },
    close() { if (!box) return; open = false; box.classList.remove('on'); },
    // answer whatever the game is waiting for, or press its Next/Continue button
    auto() {
      Sound.init();
      if (Mover.active && ans !== null) { Mover.solve(ans); return; }
      if (Dial.active && ans !== null) {
        Dial.clear(); if (ans) Dial.key(ans < 0 ? '-' : '+');
        String(Math.abs(ans)).split('').forEach(d => Dial.key(d)); Dial.key('go'); return;
      }
      if (pending.coach) { pending.coach(); return; }
      if (pending.tapTarget) { pending.tapTarget(); return; }
      toast('Nothing to solve yet. Wait for the animation.', true);
    },
  };
  if (QA_PANEL) build();
  return api;
})();

/* ---------- title ---------- */
/* ---------- cover page ---------- */
// cover art (cover_* in the manifest), each piece shown as soon as the preloader has it; the logo and button images
// also shape their light sweeps
document.querySelectorAll('#title [data-asset]').forEach(img => Preload.get(img.dataset.asset).then(url => {
  img.onload = () => img.classList.add('in');
  img.src = url;
  const shine = img.parentElement.querySelector('.cv-shine'); if (shine) shine.style.setProperty('--mask', `url("${url}")`);
}));
// floating embers rising out of the tunnel
$('#title .cv-motes').innerHTML = Array.from({ length: 26 }, (_, i) => {
  const x = 120 + Math.random() * 1040, d = 7 + Math.random() * 7, delay = -Math.random() * d, s = 3 + Math.random() * 5, drift = (Math.random() - .5) * 120;
  return `<i style="left:${x.toFixed(0)}px;width:${s.toFixed(1)}px;height:${s.toFixed(1)}px;--drift:${drift.toFixed(0)}px;animation-duration:${d.toFixed(1)}s;animation-delay:${delay.toFixed(1)}s"></i>`;
}).join('');
function showTitle() {
  if (Clock.paused) closeMenu();
  $('#title').classList.remove('go'); $('#warp').classList.remove('on', 'open'); // a Start dive cut short
  RUN++; resetUI(); setBg('bg_entrance'); backdrop('cover_bg'); QA.at(''); // the cover's own art around the stage
  retrigger($('#title'), 'on'); // replays the entrance each time the cover opens
  coverMusic();
}
// background music starts with the first tap or key (browsers block sound before that) and loops for the whole game
// if the browser held sound back, the first tap or key anywhere starts the music (and the cover's title voice)
const startMusic = () => { Sound.init(); Sound.music(); coverVoice(); removeEventListener('pointerdown', startMusic, true); removeEventListener('keydown', startMusic, true); };
addEventListener('pointerdown', startMusic, true); addEventListener('keydown', startMusic, true);
// the cover tries to play music straight away; if the browser holds it back, a hint asks for a tap
// the cover starts the music and says the game's name as soon as it opens (browsers that block sound until
// the first interaction get both on the first tap or key instead)
let coverVoiced = false, titleAt = 0;
const sayTitle = (delay = 0) => {
  titleAt = Date.now() + delay;
  setTimeout(() => { if ($('#title').classList.contains('on')) Voice.say('Treasure Tunnel!', 'narrator', 'vo_title'); }, delay);
};
function coverVoice() {
  if (coverVoiced || !$('#title').classList.contains('on') || !Sound.running) return;
  coverVoiced = true; sayTitle(900);
}
document.addEventListener('tt-sound', coverVoice);
function coverMusic() { coverVoiced = false; Sound.init(); Sound.music(); setTimeout(coverVoice, 300); }
// every tap on the cover (away from Start) says the title again, for anyone who missed it;
// a tap just as the first title line is starting doesn't repeat it
$('#title').addEventListener('click', e => {
  if (e.target.closest('#btnStart') || !$('#title').classList.contains('on')) return;
  Sound.init(); Sound.music();
  if (Date.now() - titleAt < 1200) return;
  coverVoiced = true; sayTitle();
});
// Start: a burst of gold, then the camera dives into the tunnel (#title.go in the CSS); the screen fills with the
// tunnel's light, and that light opens like an iris on the story
$('#title .cv-burst').innerHTML = '<b></b>' + Array.from({ length: 18 }, (_, i) =>
  `<i style="--a:${(i * 20 + Math.random() * 12).toFixed(0)}deg;--d:${(150 + Math.random() * 130).toFixed(0)}px;--t:${(Math.random() * .08).toFixed(2)}s"></i>`).join('');
$('#btnStart').addEventListener('click', () => {
  const title = $('#title'), warp = $('#warp');
  if (title.classList.contains('go')) return;
  $('#btnStart').blur();
  Sound.init(); Sound.music(); Sound.fx.fanfare(); Voice.stop();
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches, run = RUN;
  title.classList.add('go');
  setTimeout(() => Sound.fx.whoosh(), 250);
  setTimeout(() => { if (RUN === run) warp.classList.add('on'); }, calm ? 0 : 1150);
  setTimeout(() => {
    if (RUN !== run) return;
    Sound.fx.reveal(); title.classList.remove('on', 'go');
    warp.classList.replace('on', 'open'); setTimeout(() => warp.classList.remove('open'), 900);
    goChapter('story');
  }, calm ? 300 : 1550);
});

/* ---------- optional UI art: used when the file exists, drawn in CSS otherwise ---------- */
['ui_platform', 'ui_equation_sign', 'ui_controls', 'ui_scroll', 'ui_key_sign', 'ui_key_digit', 'ui_key_delete', 'ui_btn_check_text', 'ui_keybox', 'ui_platform_lava', 'chest_open_sheet', 'explorer_run_sheet', 'ui_btn_pause', 'ui_btn_back'].forEach(n => {
  Preload.get(n).then(url => {
    const img = new Image();
    img.onload = () => { stage.style.setProperty(`--a-${n}`, `url("${img.src}")`); stage.classList.add(`has-${n}`); };
    img.onerror = () => { if (Preload.isBlob(img.src)) img.src = Preload.original(img.src); }; // the local copy failed: the file
    img.src = url;
  });
});

/* ---------- boot (every image and sound is fetched in the background by js/preload.js) ---------- */
fit(); paintToggles(); showTitle();
checkAway(); // opened in a background tab or on an upright phone: it starts once it is looked at, sideways
if (document.fonts) document.fonts.ready.then(() => Tablet.fit()); // re-fit once the game font has loaded
window.__tt = { goChapter, devButton, ctx: () => ({ step: QA.cur, label: QA.label, bg: bgNow }) };
})();
