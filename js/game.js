/* ===== Treasure Tunnel – game engine ===== */
(() => {
'use strict';

const $ = s => document.querySelector(s);
const ASSET = n => (window.ASSETS && window.ASSETS[n]) || `assets/${n}.webp`;
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
// the key everywhere in the game: assets/ui_key.webp (upright, head at the top)
const KEY_SVG = `<img class="keyart" src="${ASSET('ui_key')}" alt="" draggable="false">`;
const GEM_SVG = `<svg viewBox="0 0 100 100"><polygon points="18,36 34,14 66,14 82,36 50,90" fill="#4fc3ff" stroke="#0b4f7a" stroke-width="5" stroke-linejoin="round"/><polygon points="18,36 82,36 50,90" fill="#2a9fe0"/><polygon points="34,14 50,36 66,14" fill="#c8f3ff"/><polygon points="18,36 34,14 50,36" fill="#8fdcff"/><polygon points="50,36 66,14 82,36" fill="#6fd0ff"/><polygon points="30,40 44,40 50,74" fill="#bff0ff" opacity=".6"/></svg>`;
const PADLOCK_SVG = `<svg viewBox="0 0 130 150"><defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a0"/><stop offset=".55" stop-color="#e8a92a"/><stop offset="1" stop-color="#a86a0a"/></linearGradient></defs><g class="shackle"><path d="M32 72 V46 a33 33 0 0 1 66 0 V72" fill="none" stroke="#6d737c" stroke-width="18" stroke-linecap="round"/><path d="M32 72 V46 a33 33 0 0 1 66 0 V72" fill="none" stroke="#c9ced6" stroke-width="8" stroke-linecap="round"/></g><rect x="10" y="64" width="110" height="80" rx="16" fill="url(#lg)" stroke="#6b3d00" stroke-width="5"/><circle cx="65" cy="96" r="11" fill="#4a2800"/><rect x="60" y="100" width="10" height="24" rx="4" fill="#4a2800"/><circle cx="24" cy="78" r="4" fill="#fff6c8"/><circle cx="106" cy="78" r="4" fill="#fff6c8"/></svg>`;
const ICONS = {
  sound: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z" fill="#fff"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>`,
  soundOff: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z" fill="#fff"/><path d="M17 9l5 6M22 9l-5 6"/></svg>`,
  voice: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v10H9l-5 4z" fill="rgba(255,255,255,.2)"/><path d="M8 9h8M8 12h5"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="#fff"><rect x="6" y="5" width="4" height="14" rx="1.5"/><rect x="14" y="5" width="4" height="14" rx="1.5"/></svg>`,
  replay: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg>`,
};
const NARRATOR_AV = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#f6c84c"/><circle cx="50" cy="50" r="36" fill="#fff4cf" stroke="#8b4a12" stroke-width="5"/><polygon points="50,20 58,50 50,80 42,50" fill="#c0392b"/><polygon points="50,50 58,50 50,80 42,50" fill="#3b2412"/><circle cx="50" cy="50" r="5" fill="#8b4a12"/></svg>`);

function arrowSVG(w, h = 56, fill = '#FFD54A') {
  const head = 44, sh = h * 0.32;
  return `<svg viewBox="0 0 ${w} ${h}"><path d="M4 ${h / 2 - sh / 2} H${w - head} V5 L${w - 4} ${h / 2} L${w - head} ${h - 5} V${h / 2 + sh / 2} H4 Z" fill="${fill}" stroke="#7a4a00" stroke-width="5" stroke-linejoin="round"/></svg>`;
}

function badgeSVG(b) {
  const icons = {
    both: `<path d="M60 112 h100" stroke="#fff" stroke-width="10" stroke-linecap="round"/><path d="M60 112 l18 -16 M60 112 l18 16 M160 112 l-18 -16 M160 112 l-18 16" stroke="#fff" stroke-width="10" stroke-linecap="round"/>`,
    left: `<path d="M150 112 h-86 M64 112 l22 -20 M64 112 l22 20" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><text x="128" y="96" font-family="Lilita One" font-size="34" fill="#fff">+(−)</text>`,
    right: `<path d="M70 112 h86 M156 112 l-22 -20 M156 112 l-22 20" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><text x="52" y="96" font-family="Lilita One" font-size="34" fill="#fff">−(−)</text>`,
    chest: `<rect x="68" y="104" width="84" height="44" rx="6" fill="#8b4513" stroke="#4a2200" stroke-width="5"/><path d="M68 106 q42 -40 84 0 z" fill="#a0522d" stroke="#4a2200" stroke-width="5"/><rect x="102" y="110" width="16" height="18" rx="3" fill="#ffd54a" stroke="#4a2200" stroke-width="3"/><circle cx="110" cy="72" r="9" fill="#fff6c8"/>`,
  };
  return `<svg viewBox="0 0 220 250"><path d="M62 170 L40 246 L72 228 L92 248 L104 176 Z" fill="${b.dark}"/><path d="M158 170 L180 246 L148 228 L128 248 L116 176 Z" fill="${b.dark}"/><circle cx="110" cy="110" r="96" fill="#ffd54a" stroke="#7a4a00" stroke-width="6"/><circle cx="110" cy="110" r="84" fill="none" stroke="#fff3b0" stroke-width="4" stroke-dasharray="6 9"/><circle cx="110" cy="110" r="72" fill="${b.color}" stroke="${b.dark}" stroke-width="6"/><ellipse cx="88" cy="70" rx="34" ry="16" fill="#fff" opacity=".25"/>${icons[b.icon] || ''}</svg>`;
}

// hidden key box: a wooden crate with gold corners and a glowing "?"
const KEYBOX_SVG = `<svg viewBox="0 0 100 100"><defs><linearGradient id="kbw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c98a4a"/><stop offset="1" stop-color="#8a4e1e"/></linearGradient></defs><rect x="6" y="8" width="88" height="86" rx="10" fill="url(#kbw)" stroke="#4a2408" stroke-width="5"/><path d="M8 36 H92 M8 66 H92" stroke="#6b3a12" stroke-width="4" opacity=".55"/><g fill="#ffd54a" stroke="#7a4a00" stroke-width="3"><path d="M6 20 V14 a6 6 0 0 1 6 -6 H24 V20 Z"/><path d="M94 20 V14 a6 6 0 0 0 -6 -6 H76 V20 Z"/><path d="M6 82 V88 a6 6 0 0 0 6 6 H24 V82 Z"/><path d="M94 82 V88 a6 6 0 0 1 -6 6 H76 V82 Z"/></g><text class="q" x="50" y="68" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="50" fill="#ffe680" stroke="#5a2e00" stroke-width="3">?</text><circle class="hole" cx="50" cy="52" r="15" fill="#2a1404" opacity="0"/></svg>`;
const CHEST_SVG = `<svg viewBox="0 0 300 260" overflow="visible"><g class="burst">${Array.from({ length: 12 }, (_, i) => `<path d="M150 140 L${150 + 230 * Math.cos(i * Math.PI / 6 - .1)} ${140 + 230 * Math.sin(i * Math.PI / 6 - .1)} L${150 + 230 * Math.cos(i * Math.PI / 6 + .1)} ${140 + 230 * Math.sin(i * Math.PI / 6 + .1)} Z" fill="rgba(255,225,120,.35)"/>`).join('')}</g><ellipse cx="150" cy="250" rx="130" ry="12" fill="rgba(0,0,0,.4)"/><rect x="30" y="130" width="240" height="118" rx="14" fill="#8b4513" stroke="#3a1a00" stroke-width="7"/><rect x="30" y="160" width="240" height="14" fill="#e8a92a" stroke="#3a1a00" stroke-width="4"/><rect x="58" y="130" width="22" height="118" fill="#e8a92a" stroke="#3a1a00" stroke-width="4"/><rect x="220" y="130" width="22" height="118" fill="#e8a92a" stroke="#3a1a00" stroke-width="4"/><g class="coins"><circle cx="110" cy="128" r="16" fill="#ffd54a" stroke="#a86a0a" stroke-width="4"/><circle cx="150" cy="120" r="18" fill="#ffe27a" stroke="#a86a0a" stroke-width="4"/><circle cx="190" cy="128" r="16" fill="#ffd54a" stroke="#a86a0a" stroke-width="4"/><polygon points="128,110 140,96 152,110 140,126" fill="#ff4d6d" stroke="#7a0020" stroke-width="3"/><polygon points="166,112 176,100 186,112 176,124" fill="#4fc3ff" stroke="#0b4f7a" stroke-width="3"/></g><g class="lid"><path d="M30 132 V96 Q150 18 270 96 V132 Z" fill="#a0522d" stroke="#3a1a00" stroke-width="7" stroke-linejoin="round"/><path d="M58 128 V86 M242 128 V86" stroke="#e8a92a" stroke-width="20"/><path d="M58 128 V86 M242 128 V86" stroke="#3a1a00" stroke-width="4" opacity=".4"/><rect x="132" y="112" width="36" height="38" rx="6" fill="#ffd54a" stroke="#3a1a00" stroke-width="5"/><circle cx="150" cy="128" r="6" fill="#3a1a00"/></g></svg>`;

/* ---------- map geometry (map image is 1200 × 800) ---------- */
const MAP = {
  pieces: [
    'polygon(0 0, 37% 0, 35.5% 12%, 37.5% 26%, 35% 41%, 38% 56%, 36% 72%, 38.5% 86%, 36.5% 100%, 0 100%)',
    'polygon(37% 0, 72% 0, 70.5% 14%, 72% 28%, 69.5% 44%, 63% 50%, 58% 57%, 56.5% 70%, 54% 84%, 55.5% 100%, 36.5% 100%, 38.5% 86%, 36% 72%, 38% 56%, 35% 41%, 37.5% 26%, 35.5% 12%)',
    'polygon(72% 0, 100% 0, 100% 100%, 55.5% 100%, 54% 84%, 56.5% 70%, 58% 57%, 63% 50%, 69.5% 44%, 72% 28%, 70.5% 14%)',
  ],
  lockAt: [[220, 410], [640, 330], [930, 560]],
  routes: [
    [[211, 289], [330, 250], [430, 215], [540, 250], [656, 281]],
    [[656, 281], [590, 370], [540, 470], [660, 540], [812, 516]],
    [[812, 516], [870, 585], [935, 565], [978, 510], [1012, 462]],
  ],
};
const segPath = (a, b, k) => {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  const off = (k % 2 ? -1 : 1) * 26;
  return `M${a[0]} ${a[1]} Q${mx - dy / L * off} ${my + dx / L * off} ${b[0]} ${b[1]}`;
};

/* ---------- state ---------- */
const S = { gems: 0, levelGems: [0, 0, 0], streak: 0, level: 0, piecesOpen: 0, pathsOpen: [0, 0, 0] };

/* ---------- run control: one counter cancels every pending beat ---------- */
let RUN = 0;
const CANCEL = { cancelled: true };
const guard = r => { if (r !== RUN) throw CANCEL; };
const wait = ms => { const r = RUN; return new Promise(res => setTimeout(res, ms)).then(() => guard(r)); };
const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
const retrigger = (el, c) => { el.classList.remove(c); void el.offsetWidth; el.classList.add(c); };

/* ---------- stage scaling ---------- */
let scale = 1;
function fit() {
  scale = Math.min(innerWidth / STAGE_W, innerHeight / STAGE_H);
  stage.style.setProperty('--s', scale);
}
addEventListener('resize', fit);
function stagePos(el) {
  const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
  return { x: (r.left + r.width / 2 - s.left) / scale, y: (r.top + r.height / 2 - s.top) / scale };
}

/* ---------- backgrounds ---------- */
let bgFlip = false, bgNow = '';
function setBg(name) {
  if (bgNow === name) return; bgNow = name; stage.dataset.bg = name;
  const a = $(bgFlip ? '#bgA' : '#bgB'), b = $(bgFlip ? '#bgB' : '#bgA');
  a.style.backgroundImage = `url(${ASSET(name)})`; a.classList.add('on'); b.classList.remove('on'); bgFlip = !bgFlip;
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
let lastLine = { who: 'narrator', text: '' };
function bubble(who, text, mode = 'bottom', speak = true, clip = null, cues = null) {
  const b = $('#bubble');
  b.className = `on ${mode} ${who}`;
  b.querySelector('.av').src = who === 'wizard' ? ASSET('wizard_avatar') : who === 'explorer' ? ASSET('explorer_avatar') : NARRATOR_AV;
  b.querySelector('.who').textContent = WHO[who];
  b.querySelector('.txt').innerHTML = text;
  retrigger(b, 'pop');
  lastLine = { who, text, clip };
  return speak ? Voice.say(text, who, clip, cues) : Promise.resolve();
}
async function say(who, text, mode = 'bottom') { const r = RUN; await bubble(who, text, mode); guard(r); }
function bubbleText(text) { $('#bubble .txt').innerHTML = text; }
function hideBubble() { $('#bubble').className = ''; }
// game lines are spoken only, never shown on screen (the script's on-screen text goes on the sign)
// narration: the narrator and the game's instructions are voice only (no box), in the narrator's voice
function speakOnly(who, text) { hideBubble(); lastLine = { who: 'narrator', text }; return Voice.say(text, 'narrator'); }
async function voiceOnly(who, text, clip = null) { const r = RUN; hideBubble(); lastLine = { who: 'narrator', text, clip }; await Voice.say(text, 'narrator', clip); guard(r); }

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
function placeTalk(b, who) {
  const r = speakerRect(who), tail = b.querySelector('.tail');
  b.classList.remove('tail-down', 'tail-left', 'tail-right', 'solo');
  Object.assign(b.style, { left: '', top: '', width: '', marginLeft: '' });
  if (!r) { b.classList.add('solo'); return; } // nobody on screen: a bubble at the bottom with the speaker's portrait
  const cx = r.x + r.w / 2, head = r.y + r.h * .1;
  const other = speakerRect(who === 'wizard' ? 'explorer' : 'wizard');
  // things a bubble mustn't cover (only the top bar's buttons, not its empty width)
  const avoid = ['#tablet.on', '#dirPick.on', '#tray.on', '#btnPause', '#btnHelp', '#slots.on'].map(q => $(q)).filter(e => e && e.offsetParent).map(stageRect)
    .concat(stage.classList.contains('cast') ? [MAP_TUCKED, MAP_TUCKED] : []) // the map counts double: never cover it
    .concat([...document.querySelectorAll('#nl .nl-arrow, #nl .nl-arrow .lab')].map(stageRect)) // the direction arrows and their labels
    .concat($('#nlWrap').classList.contains('on') && NL.stone(0) ? [{ x: 0, y: stageRect(NL.stone(0)).y, w: STAGE_W, h: stageRect(NL.stone(0)).h }] : []) // the number line
    .concat(other ? [other] : []).concat([{ x: r.x + r.w * .15, y: r.y, w: r.w * .7, h: r.h }]);
  const overlap = q => avoid.reduce((s, a) => s + Math.max(0, Math.min(q.x + q.w, a.x + a.w) - Math.max(q.x, a.x)) * Math.max(0, Math.min(q.y + q.h, a.y + a.h) - Math.max(q.y, a.y)), 0);
  const away = other ? (other.x + other.w / 2 > cx ? 'left' : 'right') : (cx > 640 ? 'left' : 'right');
  let best = null;
  for (const w of [430, 340]) {
    b.style.width = `${w}px`; const h = b.offsetHeight;
    const above = { x: cx - w / 2, y: head - 30 - h, tail: 'down' };
    const cands = [above, { ...above, x: r.x + r.w * .55 - w * .2 }, { ...above, x: r.x + r.w * .45 - w * .8 },
      { x: away === 'left' ? r.x + r.w * .15 - 40 - w : r.x + r.w * .85 + 40, y: head + 10, tail: away === 'left' ? 'right' : 'left' },
      { x: away === 'left' ? r.x + r.w * .85 + 40 : r.x + r.w * .15 - 40 - w, y: head + 10, tail: away === 'left' ? 'left' : 'right' },
      // beside the head but raised, so it clears a character standing lower down
      { x: away === 'left' ? r.x + r.w * .15 - 40 - w : r.x + r.w * .85 + 40, y: head + 40 - h, tail: away === 'left' ? 'right' : 'left' },
      { x: away === 'left' ? r.x + r.w * .85 + 40 : r.x + r.w * .15 - 40 - w, y: head + 40 - h, tail: away === 'left' ? 'left' : 'right' },
      { x: away === 'left' ? r.x + r.w * .15 - 40 - w : r.x + r.w * .85 + 40, y: 720, tail: away === 'left' ? 'right' : 'left' }]; // along the bottom, last resort
    for (const c of cands) {
      c.w = w; c.h = h;
      c.x = Math.max(12, Math.min(STAGE_W - 12 - w, c.x)); c.y = Math.max(12, Math.min(720 - 12 - h, c.y));
      if (c.tail === 'down' && c.y + h > head - 18) continue; // squeezed onto the head
      c.cost = overlap(c);
      if (!best || c.cost < best.cost) best = c;
      if (!c.cost) break;
    }
    if (best && !best.cost) break;
  }
  b.style.width = `${best.w}px`; b.style.left = `${best.x}px`; b.style.top = `${best.y}px`;
  b.classList.add(`tail-${best.tail}`);
  if (best.tail === 'down') tail.style.left = `${Math.max(26, Math.min(best.w - 70, cx - best.x - 20))}px`, tail.style.top = '';
  else tail.style.top = `${Math.max(18, Math.min(best.h - 60, Math.max(head + 30, best.y) - best.y))}px`, tail.style.left = '';
}
// while the characters talk on a map screen, the map is tucked up and smaller (see #stage.cast in the CSS): this is where it sits
const MAP_TUCKED = { x: 281, y: 20, w: 725, h: 432 };
// returns a promise that settles once the line has been typed and left up long enough to read
function showTalk(who, text, cues = null) {
  const b = $('#bubble'), txt = b.querySelector('.txt'), r = RUN;
  Voice.stop(); if (typing) { clearInterval(typing.t); typing.done(); }
  const spoken = Voice.say(text, who); // the character speaks the line in their own voice
  if (!b.querySelector('.tail')) b.insertAdjacentHTML('beforeend', TAIL_SVG);
  b.className = `on comic ${who}`;
  b.querySelector('.av').src = who === 'wizard' ? ASSET('wizard_avatar') : who === 'explorer' ? ASSET('explorer_avatar') : NARRATOR_AV;
  b.querySelector('.who').textContent = WHO[who];
  lastLine = { who, text };
  const plain = text.replace(/<[^>]+>/g, ''), lower = plain.toLowerCase();
  txt.innerHTML = `<span class="ghost">${plain}</span>`; // full size first, so the bubble can be placed
  placeTalk(b, who); retrigger(b, 'pop'); Sound.fx.pop();
  const pending = (cues || []).map(c => ({ ...c, at: Math.max(0, lower.search(new RegExp(`\\b${c.word.toLowerCase()}`))) }));
  const words = plain.split(/\s+/).length, hold = Math.min(6500, 1300 + words * 340); // reading time after the typing ends
  return new Promise(res => {
    let i = 0;
    const step = () => {
      i = Math.min(plain.length, i + 1);
      txt.innerHTML = `<span>${plain.slice(0, i)}</span><span class="ghost">${plain.slice(i)}</span>`; // the rest keeps its space
      pending.slice().forEach(c => { if (i >= c.at) { pending.splice(pending.indexOf(c), 1); c.fn(); } });
      if (i >= plain.length) { clearInterval(typing.t); txt.innerHTML = text; typing = null; Promise.all([spoken, new Promise(r => setTimeout(r, Voice.on ? 900 : hold))]) /* with voice off, the reading time */.then(() => setTimeout(res, 500)); } // moves on once the line has been said
    };
    typing = { t: setInterval(step, RM ? 1 : 28), done: res };
    step();
  }).then(() => guard(r));
}
async function talk(who, text, cues = null) { await showTalk(who, text, cues); }
function endTalk() { if ($('#bubble').classList.contains('comic')) hideBubble(); }
$('#btnReplay').innerHTML = ICONS.replay;
$('#btnReplay').addEventListener('click', e => { e.stopPropagation(); Sound.fx.tap(); Voice.say(lastLine.text, lastLine.who, lastLine.clip); });
$('#btnHelp').addEventListener('click', e => {
  e.stopPropagation(); Sound.fx.tap();
  if (LEVELS[S.level] && LEVELS[S.level].helpRules) { toggleRules(); return; }
  retrigger($('#bubble'), 'pop'); Voice.say(lastLine.text, lastLine.who, lastLine.clip);
});
// the ? button belongs to the game part (key hunt, map puzzles) only
function setPlaying(on) { stage.classList.toggle('playing', on); if (!on) toggleRules(false); }
// ? opens a dropdown of every direction rule under the button; × closes it
function toggleRules(open = !$('#rulesDrop').classList.contains('on')) {
  const d = $('#rulesDrop'), b = $('#btnHelp');
  if (open) {
    d.innerHTML = LEVELS.flatMap(l => l.rule).map(([s, w, dir]) => `<div class="rc"><b>${s}</b> ${w} → ${dir === 'left' ? '◀ left' : 'right ▶'}</div>`).join('');
    const r = b.getBoundingClientRect(), st = stage.getBoundingClientRect(), k = st.width / STAGE_W;
    // the notch (140px in) sits under the button; the panel hangs just below it
    d.style.left = `${(r.left + r.width / 2 - st.left) / k - 140}px`; d.style.top = `${(r.bottom - st.top) / k + 14}px`;
  }
  d.classList.toggle('on', open);
  b.textContent = open ? '×' : '?'; b.classList.toggle('active', open);
  b.setAttribute('aria-label', open ? 'Close the rules' : 'Show the rules');
}

/* ---------- waiting for the player ---------- */
let pending = { next: null, cont: null, dial: null, dir: null, tapTarget: null };
function nextTap() {
  const r = RUN;
  $('#bubble').classList.add('has-next');
  return new Promise(res => { pending.next = res; }).then(() => {
    $('#bubble').classList.remove('has-next'); $('#tapHint').style.opacity = 0; Voice.stop(); guard(r);
  });
}
function fireNext() { if (pending.next) { const f = pending.next; pending.next = null; Sound.fx.tap(); f(); } }
$('#btnNext').addEventListener('click', e => { e.stopPropagation(); if (typing) { typing.finish(); return; } fireNext(); });
// no tap-anywhere: lines move on with a Next button only

function cont(label = 'Continue', corner = false) {
  const r = RUN, b = $('#btnContinue');
  b.textContent = label; b.classList.toggle('corner', corner); b.classList.add('on');
  return new Promise(res => { pending.cont = res; }).then(() => { b.classList.remove('on'); Voice.stop(); guard(r); });
}
$('#btnContinue').addEventListener('click', () => { if (pending.cont) { const f = pending.cont; pending.cont = null; Sound.fx.tap(); f(); } });

/* ---------- HUD ---------- */
const HUD = {
  keys(n) { const s = $('#slots'); s.innerHTML = Array.from({ length: n }, () => `<div class="slot">${KEY_SVG}</div>`).join(''); s.classList.add('on'); },
  seals(n) { const s = $('#slots'); s.innerHTML = Array.from({ length: n }, () => `<div class="slot seal-slot">?</div>`).join(''); s.classList.add('on'); },
  fill(i) { const sl = $('#slots').children[i]; if (sl) { sl.classList.add('full'); if (sl.classList.contains('seal-slot')) sl.textContent = '★'; } },
  empty(i) { const sl = $('#slots').children[i]; if (sl) sl.classList.remove('full'); },
  slotPos(i) { return stagePos($('#slots').children[i]); },
  hide() { $('#slots').classList.remove('on'); $('#levelName').classList.remove('on'); },
  level(text) { const l = $('#levelName'); l.textContent = text; l.classList.add('on'); },
};
$('#gems .gem-ico').innerHTML = GEM_SVG;
function setGems() { $('#gemCount').textContent = S.gems; }
async function addGem(from) {
  S.gems++; S.levelGems[S.level]++;
  if ($('#gems').offsetParent) await fly(GEM_SVG, from, stagePos($('#gems .gem-ico')), 700, 46);
  setGems(); retrigger($('#gems'), 'bump'); Sound.fx.gem();
}
function streakHit(firstTry) {
  if (!firstTry) { S.streak = 0; return; }
  S.streak++;
  if (S.streak % 3 === 0) {
    setTimeout(() => { toast('On fire! 3 in a row', true); Sound.fx.streak(); $('#flare').classList.add('on'); setTimeout(() => $('#flare').classList.remove('on'), 1600); }, 1300);
  }
}

/* ---------- equation tablet ---------- */
const Tablet = {
  eq(str) {
    const t = $('#tablet'); t.className = 'on';
    t.innerHTML = str.split(' ').map((tok, i) => {
      if (tok === '?') return `<span class="q">?</span>`;
      if (tok === '=' || tok === '+' || tok === '−') return `<span class="tok op" data-i="${i}">${tok}</span>`;
      const v = parseInt(tok.replace(/[()]/g, '').replace('−', '-'), 10);
      return `<span class="tok ${cls(v)}" data-i="${i}">${tok}</span>`;
    }).join(' ');
    this.fit();
  },
  rule(html) { const t = $('#tablet'); t.className = 'on rule'; t.innerHTML = html; this.fit(); },
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

/* ---------- rule chip ---------- */
function setRules(L) {
  const rows = LEVELS.slice(0, L + 1).flatMap(l => l.rule);
  $('#ruleChip').innerHTML = rows.map(([s, w, d]) => `<div class="rc"><b>${s}</b> ${w} → ${d === 'left' ? '◀ left' : 'right ▶'}</div>`).join('');
  $('#ruleChip').classList.add('on');
}

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
    $('#nlWrap').classList.add('on');
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
    const trackW = (MAX - MIN + 1) * STEP;
    const cam = Math.max(STAGE_W - trackW, Math.min(0, STAGE_W / 2 - this.x(v)));
    $('#nl').style.transform = `translateX(${cam}px)`;
    if (instant) { void this.exp.offsetWidth; this.exp.style.transition = ''; $('#nl').style.transition = ''; }
  },
  screenX(v) { const m = /translateX\((-?[\d.]+)px\)/.exec($('#nl').style.transform); return this.x(v) + (m ? +m[1] : 0); },
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
  showLabel(v) { this.stone(v)?.classList.add('show'); },
  resetMarks() {
    document.querySelectorAll('#nl .stone').forEach(s => {
      s.classList.remove('trail', 'land', 'miss', 'pulse', 'start', 'correct');
      if (!s.classList.contains('mark')) s.classList.remove('show');
    });
    $('#keyprize').classList.remove('on', 'boxpop'); $('#keyBox')?.remove();
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
      // a number needs its sign first (only 0 has none): tapping a digit before + or − nudges the sign keys
      if (!sign && !(k === '0' && digits === '')) { retrigger(disp, 'shake'); tray.querySelectorAll('.sign').forEach(b => retrigger(b, 'nudge')); return; }
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
    else if (pending.next) { e.preventDefault(); fireNext(); }
    else if (pending.cont) { e.preventDefault(); $('#btnContinue').click(); }
    else if (pending.tapTarget) { e.preventDefault(); pending.tapTarget(); }
  }
});

/* ---------- map ---------- */
const MapView = {
  st: { x: 0, y: 0, s: .5 },
  build() {
    const pc = $('#mapPieces'); pc.innerHTML = '';
    MAP.pieces.forEach((poly, i) => {
      const d = document.createElement('div'); d.className = `mpiece p${i + 1}`; d.dataset.i = i;
      d.style.backgroundImage = `url(${ASSET('map')})`; d.style.clipPath = poly; d.style.webkitClipPath = poly;
      pc.appendChild(d);
    });
    const svg = $('#mapPaths'); let h = '';
    MAP.routes.forEach((rt, L) => {
      for (let k = 0; k < 4; k++) h += `<path class="seg" data-l="${L}" data-k="${k}" d="${segPath(rt[k], rt[k + 1], k)}"/>`;
    });
    svg.innerHTML = h;
    this.refresh();
  },
  refresh() {
    document.querySelectorAll('.mpiece').forEach((p, i) => p.classList.toggle('locked', i >= S.piecesOpen));
    document.querySelectorAll('#mapPaths .seg').forEach(s => {
      const L = +s.dataset.l, k = +s.dataset.k;
      s.classList.toggle('on', k < S.pathsOpen[L]);
    });
  },
  place(x, y, s, instant = false) {
    const m = $('#mapView'); this.st = { x, y, s };
    if (instant) m.style.transition = 'none';
    m.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
    if (instant) { void m.offsetWidth; m.style.transition = ''; }
  },
  toStage([px, py]) { return { x: this.st.x + px * this.st.s, y: this.st.y + py * this.st.s }; },
  show() { $('#mapView').classList.add('on'); },
  hide() { $('#mapView').classList.remove('on'); $('#mapSeals').innerHTML = ''; $('#mapToken').classList.remove('on'); $('#mapPaths').classList.remove('allglow'); document.querySelectorAll('.padlock').forEach(p => p.remove()); },
  seals(L) {
    const box = $('#mapSeals'); box.innerHTML = '';
    MAP.routes[L].slice(1).forEach(([x, y], k) => {
      const s = document.createElement('div'); s.className = 'seal'; s.textContent = '?';
      s.style.left = `${x}px`; s.style.top = `${y}px`; box.appendChild(s);
      setTimeout(() => { s.classList.add('on'); Sound.fx.pop(); }, 250 * k);
    });
  },
  seal(k) { return $('#mapSeals').children[k]; },
  padlock(L) {
    const p = document.createElement('div'); p.className = 'padlock'; p.innerHTML = PADLOCK_SVG;
    p.style.left = `${MAP.lockAt[L][0]}px`; p.style.top = `${MAP.lockAt[L][1]}px`;
    $('#mapView').appendChild(p); return p;
  },
  token(pt, on = true) {
    const t = $('#mapToken'); t.style.backgroundImage = `url(${ASSET('explorer_avatar')})`;
    t.style.left = `${pt[0]}px`; t.style.top = `${pt[1]}px`; t.classList.toggle('on', on);
  },
};

/* ---------- reset everything between chapters ---------- */
function resetUI() {
  Voice.stop(); Coach.end();
  pending = { next: null, cont: null, dial: null, dir: null, tapTarget: null };
  Mover.hide();
  hideBubble(); Tablet.hide(); Dial.hide(); Dial.clear();
  ['#dirPick', '#btnContinue', '#demo', '#miniLine', '#hintArrow', '#ruleChip', '#flare'].forEach(s => $(s).classList.remove('on'));
  $('#toast').classList.remove('on'); $('#tapHint').style.opacity = 0;
  clearActors(); clearProps(); $('#nlWrap').classList.remove('on'); $('#nl').innerHTML = '';
  MapView.hide(); HUD.hide();
  document.querySelectorAll('.fly, .puff, .poofcloud').forEach(e => e.remove());
  ['#badgeModal', '#final', '#title'].forEach(s => $(s).classList.remove('on'));
  S.streak = 0; stage.classList.remove('theme-cavern', 'map-ui', 'map-scroll', 'path-art', 'unlock-scroll', 'playing', 'stones-lava', 'cast'); toggleRules(false);
  $('#pathArt').classList.remove('glow', 'faint'); $('#pathArt .pa-hand')?.classList.remove('on'); $('#pathArt .pa-token').classList.remove('on'); $('#pathArt .pa-lit').setAttribute('d', '');
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
}

/* ===================================================================== */
/*                               STORY                                    */
/* ===================================================================== */
function mapScrap(x, y, w, rot, piece) {
  const offs = [[0, 0], [-170, -40], [-340, -110]];
  const p = prop('scrap', { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${w * .68}px`, backgroundImage: `url(${ASSET('map')})`,
    backgroundSize: `${w * 3}px ${w * 2}px`, backgroundPosition: `${offs[piece][0] * w / 170}px ${offs[piece][1] * w / 170}px`,
    clipPath: 'polygon(4% 8%, 30% 0, 52% 6%, 78% 0, 100% 10%, 95% 40%, 100% 70%, 92% 100%, 60% 94%, 34% 100%, 8% 92%, 0 60%, 6% 34%)', transform: `rotate(${rot}deg)` });
  p.style.setProperty('--r2', `${rot + 3}deg`);
  return p;
}

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
    actor('exp', { img: 'explorer_idle', x: 360, y: 640, h: 440, cls: 'idle' });
    poofAt(930, 420); await wait(250);
    actor('wiz', { img: 'wizard_laugh', x: 930, y: 640, h: 460, cls: 'idle', enter: true });
  },
  async title() {
    actor('exp', { img: 'explorer_thumbsup', x: 360, y: 640, h: 440, cls: 'idle glowring' });
    actor('wiz', { img: 'wizard_proud', x: 930, y: 640, h: 460, cls: 'idle' });
    actorAnim('exp', 'jump'); Sound.fx.fanfare(); FX.burst(360, 360, 40, 'star', 9);
  },
  async goTreasure() {
    actor('exp', { img: 'explorer_point', x: 360, y: 640, h: 440, cls: 'idle' });
    actor('wiz', { img: 'wizard_point', x: 930, y: 640, h: 460, cls: 'idle' });
    prop('lightbeam on', {});
  },
  async run() {
    removeActor('wiz'); clearProps();
    const beam = prop('lightbeam', {}); requestAnimationFrame(() => beam.classList.add('on'));
    actor('exp', { img: 'explorer_run_back', x: 640, y: 700, h: 440 });
    await wait(100);
    actor('exp', { x: 640, y: 380, scale: .35, ms: RM ? 400 : 3200 });
    for (let i = 0; i < 7; i++) { Sound.fx.step(); await wait(380); }
  },
  async found() {
    clearActors(); clearProps();
    const c = prop('chest', { left: '490px', top: '120px' }, CHEST_SVG); c.id = 'chest';
    actor('exp', { img: 'explorer_point', x: 270, y: 690, h: 440, cls: 'idle', enter: true });
    await wait(500); retrigger(c, 'wiggle'); Sound.fx.sparkle(); FX.burst(640, 260, 30, 'star', 6);
  },
  async open() {
    let c = $('#chest'); if (!c) { c = prop('chest', { left: '490px', top: '120px' }, CHEST_SVG); c.id = 'chest'; }
    actor('exp', { img: 'explorer_jump_key', x: 270, y: 690, h: 440, cls: 'idle' });
    Sound.fx.creak(); await wait(500);
    c.classList.add('open'); Sound.fx.fanfare(); actorAnim('exp', 'jump');
    FX.burst(640, 250, 40, 'coin', 12); FX.burst(640, 250, 30, 'gem', 10); FX.confetti('huge');
    for (let i = 0; i < 6; i++) { setTimeout(() => Sound.fx.coin(), i * 140); }
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
  QA.at('story');
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
      // each arrow appears as the voice says its word ("add", then "subtract")
      let live = true;
      const said = showTalk(t.who, t.text, [
        { word: 'add', fn: () => { if (live) { NL.face(1); NL.arrow(0, 3, 'Add', false, 'nlArrowAdd'); } } },
        { word: 'subtract', fn: () => { if (live) { NL.face(-1); NL.arrow(0, 3, 'Subtract', true); } } },
      ]);
      await said; live = false; NL.hideArrow(); NL.face(1); continue;
    } else if (t.type === 'confused') {
      NL.place(0, true); NL.pose('explorer_confused'); NL.hop();
    } else if (t.type === 'wizard') {
      NL.pose('explorer_worried');
      const p = { x: 1110, y: NL.top - 150 }; poofAt(p.x, p.y); await wait(250);
      wizardOnLedge('wizard_laugh', true);
    } else if (t.type === 'flip') {
      NL.pose('explorer_idle'); wizardOnLedge('wizard_explain');
      const said = showTalk(t.who, t.text);
      const fromLeft = t.from === 'left';
      NL.face(fromLeft ? -1 : 1);
      // both directions stay on the line, like Chamber 1: the usual one, then the twist
      NL.arrow(0, 3, fromLeft ? 'Subtract' : 'Add', fromLeft, 'nlArrowUsual'); await wait(2400);
      Sound.fx.sparkle(); await wait(1200);
      NL.face(fromLeft ? 1 : -1);
      NL.arrow(0, 3, fromLeft ? 'Subtract a negative' : 'Add a negative', !fromLeft);
      await said; continue;
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
  let box = null, targets = [], track = null, side = false, handEl = null;
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
  function build() {
    box = document.createElement('div'); box.id = 'coach';
    box.innerHTML = '<div class="co-block"></div>'
      + '<div class="co-ring"><i class="co-star s1">★</i><i class="co-star s2">★</i><i class="co-star s3">✦</i></div>'
      + '<div class="co-hand" aria-hidden="true"><i class="co-ripple"></i>👆</div>'
      + `<div class="co-card" role="status"><img class="co-av" src="${ASSET('wizard_avatar')}" alt=""><p></p></div>`;
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
    Object.assign(ring.style, { left: `${r.x - pad}px`, top: `${r.y - pad}px`, width: `${r.w + pad * 2}px`, height: `${r.h + pad * 2}px` });
    const hr = handEl ? rectOf(handEl) : r; // the hand points at the one control to press first
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
  async function step(els, text, voice, { until, stop = null, beside = false, hand = null }) {
    const r = RUN;
    targets = [].concat(els).filter(Boolean); if (!targets.length) return;
    if (!box) build();
    side = beside; handEl = hand;
    box.querySelector('.co-card p').textContent = text;
    box.classList.add('on'); retrigger(box.querySelector('.co-card'), 'pop'); retrigger(box.querySelector('.co-ring'), 'pop');
    place(); clearInterval(track); track = setInterval(place, 120);
    speakOnly('wizard', voice); Sound.fx.pop();
    let poll = null;
    const done = new Promise(res => { poll = setInterval(() => { if (RUN !== r || until()) res('done'); }, 100); });
    const how = await Promise.race(stop ? [done, stop] : [done]);
    clearInterval(poll); guard(r);
    if (how === 'done') { // a little cheer for getting it right
      const u = union(); FX.burst(u.x + u.w / 2, u.y + u.h / 2, 18, 'star', 7); Sound.fx.sparkle();
      box.classList.remove('on'); await wait(450); guard(r);
    }
  }
  function end() { clearInterval(track); targets = []; if (box) box.classList.remove('on'); }
  return { step, end };
})();

// Chamber 1, key 1: walk with the arrows, then JUMP
async function coachKeyMoves(it, ans, asked) {
  const pad = $('#dirPick'), arrows = [pad.querySelector('[data-dir="left"]'), pad.querySelector('[data-dir="right"]')], jump = pad.querySelector('[data-dir="jump"]');
  const stop = asked.then(() => 'stop'), n = Math.abs(it.delta), way = it.delta > 0 ? '➜' : '←';
  await Coach.step(arrows, `Tap ${way} to walk ${n} steps!`, `Tap the arrow to walk ${n} steps!`, { until: () => NL.pos === ans, stop, hand: arrows[it.delta > 0 ? 1 : 0] });
  if (Mover.active) await Coach.step(jump, 'Now JUMP to grab the key! 🔑', 'Now jump to grab the key!', { until: () => !Mover.active, stop });
  Coach.end();
}
// Chamber 1, map puzzle 1: the keypad
async function coachKeypad(m, ans, asked) {
  const tray = $('#tray'), stop = asked.then(() => 'stop'), need = String(Math.abs(ans)).length;
  const typed = () => ($('#display').textContent.match(/\d/g) || []).length;
  if (ans !== 0) await Coach.step([...tray.querySelectorAll('.sign')], 'Pick + or − first!', 'First, pick plus or minus!', { until: () => !!tray.querySelector('.sign.sel'), stop, beside: true, hand: tray.querySelector(`.sign[data-k="${ans < 0 ? '-' : '+'}"]`) });
  if (Dial.active) await Coach.step(tray.querySelector('.digits'), 'Now tap the number!', 'Now tap the number!', { until: () => typed() >= need, stop, beside: true, hand: tray.querySelector(`.k[data-k="${String(Math.abs(ans))[0]}"]`) });
  if (Dial.active) await Coach.step(tray.querySelector('.k.go'), 'Tap CHECK! ✅', 'Now tap check!', { until: () => !Dial.active, stop, beside: true });
  Coach.end();
}

async function keyHunt(L, from = 0) {
  const lvl = LEVELS[L];
  HUD.keys(lvl.keys.length); setRules(L);
  for (let i = 0; i < from; i++) HUD.fill(i);
  setPlaying(true);
  if (lvl.keysIntro && from === 0) { if (lvl.signOnlyWithOst) Tablet.hide(); await voiceOnly('wizard', lvl.keysIntro, 'left'); }
  for (let i = from; i < lvl.keys.length; i++) {
    const it = lvl.keys[i], ans = it.start + it.delta;
    let tries = 0;
    QA.at(`${L}:keys:${i}`, it.delta > 0 ? 'right' : 'left', ans);
    // a question can bring its own background and stones; the next one goes back to the chamber's
    setBg(it.bg || lvl.bg); stage.classList.toggle('stones-lava', (it.stones || lvl.stones) === 'lava');
    NL.resetMarks(); Tablet.eq(it.eq);
    if (NL.pos !== it.start) await NL.teleport(it.start); else NL.face(1);
    NL.markStart(it.start);
    await voiceOnly('wizard', it.vo);
    const n = Math.abs(it.delta), submit = lvl.submit || 'JUMP';
    if (!lvl.voOnly) bubble('wizard', lvl.directPrompt
      ? `Start at ${fmt(it.start)} and move ${n} step${n === 1 ? '' : 's'} ${it.delta > 0 ? 'right' : 'left'}. Then press ${submit}.`
      : `Move the explorer with Left and Right, then press ${submit} to grab the key!`, 'left', i === 0 || lvl.theme === 'cavern');
    while (true) {
      const asked = Mover.ask(it.start, {
        idle: () => { speakOnly('wizard', it.idle, 'left'); Mover.pulse(); NL.hop(); },
      });
      if (it.coach && tries === 0) await coachKeyMoves(it, ans, asked);
      const v = await asked;
      if (v === ans) break;
      tries++;
      await wrongKey(it, v, tries, ans);
    }
    await keySuccess(L, i, it, ans, tries === 0);
  }
  setPlaying(false); stage.classList.toggle('stones-lava', lvl.stones === 'lava');
}

async function wrongKey(it, v, tries, ans) {
  const rung = Math.min(tries, 3);
  S.streak = 0; Sound.fx.wrong(); $('#counter').classList.remove('on');
  NL.stone(v)?.classList.add('miss', 'show');
  NL.pose('explorer_confused'); NL.jump();
  await wait(450); const p = stagePos(NL.exp); puffs(p.x, p.y + 110); Sound.fx.thud();
  await voiceOnly('wizard', it.wrong[rung - 1], 'left');
  // back to the start stone to try again
  NL.resetMarks(); NL.markStart(it.start);
  await NL.teleport(it.start);
  const right = it.delta > 0;
  if (rung === 2) NL.arrow(it.start, 2, right ? 'Move right' : 'Move left', !right);
  if (rung === 3) {
    const dir = Math.sign(it.delta), c = $('#counter');
    for (let k = 1; k <= Math.abs(it.delta); k++) {
      const s = NL.stone(it.start + dir * k); s?.classList.add('trail');
      c.style.left = `${NL.x(it.start + dir * k)}px`; c.innerHTML = `<small>Step</small>${k}`; retrigger(c, 'on'); Sound.fx.count(k);
      await wait(RM ? 200 : 380);
    }
    c.classList.remove('on');
    NL.stone(ans)?.classList.add('pulse');
  }
  NL.pose('explorer_idle'); NL.face(1);
}

async function keySuccess(L, i, it, ans, firstTry) {
  Mover.hide(); NL.hideArrow(); $('#counter').classList.remove('on');
  Tablet.solve(ans);
  const s = NL.stone(ans); s.classList.remove('pulse'); s.classList.add('land', 'show', 'correct'); // the answer stone lights up green and stays lit
  { const p = stagePos(s); FX.burst(p.x, p.y, 16, 'star', 6); }
  NL.pose('explorer_jump_key'); NL.jump();
  const k = $('#keyprize');
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
  if (firstTry) addGem({ x: p.x, y: p.y - 80 });
  streakHit(firstTry);
  await wait(1000);
  k.classList.remove('on');
  const r = RUN; await fly(KEY_SVG, stagePos(k), HUD.slotPos(i), 800, 70); guard(r);
  HUD.fill(i); Sound.fx.coin();
  NL.pose('explorer_thumbsup');
  await voiceOnly('wizard', it.found || `Correct! You found it. The explorer reached ${numHTML(ans)}. The key is right here.`, 'left');
  await cont(i < LEVELS[L].keys.length - 1 ? 'Next key' : 'Unlock the map');
  NL.pose('explorer_idle');
}

async function unlock(L) {
  if (LEVELS[L].artMap) return unlockArt(L);
  const UNLOCK = unlockLines(L);
  const ui = !!LEVELS[L].mapScroll, mode = ui ? 'side' : 'bottomL';
  stage.classList.toggle('map-ui', ui);
  $('#nlWrap').classList.remove('on'); Tablet.hide(); $('#ruleChip').classList.remove('on');
  // Chamber 1: the map sits on the scroll over the blurred chamber, like the path reveal
  const onScroll = !!LEVELS[L].pathArt && ui; stage.classList.toggle('unlock-scroll', onScroll);
  setBg(onScroll ? LEVELS[L].bg : 'bg_map_table'); MapView.build();
  onScroll ? MapView.place(275, 146, .613, true) : ui ? MapView.place(268, 116, .62, true) : MapView.place(244, 70, .66, true); MapView.show();
  const piece = document.querySelectorAll('.mpiece')[L];
  const lock = MapView.padlock(L);
  actor('exp', { img: 'explorer_idle', x: 1150, y: 600, h: 300, cls: 'idle', enter: true });
  piece.classList.add('glow');
  showTalk('wizard', UNLOCK.wizard);
  const r = RUN;
  await new Promise(res => {
    const go = () => { piece.removeEventListener('click', go); pending.tapTarget = null; clearInterval(idleT); res(); };
    piece.addEventListener('click', go); pending.tapTarget = go;
    const idleT = setInterval(() => { if (r !== RUN) { clearInterval(idleT); return; } speakOnly('wizard', UNLOCK.idle, mode); document.querySelectorAll('#slots .slot').forEach(s => pulseClass(s, 'bump', 600)); }, 14000);
  });
  guard(r);
  piece.classList.remove('glow'); Voice.stop();
  const lp = MapView.toStage(MAP.lockAt[L]);
  const n = $('#slots').children.length;
  for (let i = 0; i < n; i++) {
    const from = HUD.slotPos(i); HUD.empty(i);
    fly(KEY_SVG, from, lp, 700, 60); setTimeout(() => Sound.fx.coin(), 650);
    await wait(170);
  }
  await wait(800);
  retrigger(lock, 'rattle'); Sound.fx.thud(); await wait(450);
  lock.classList.add('open'); Sound.fx.unlock(); await wait(500);
  lock.classList.add('gone');
  S.piecesOpen = Math.max(S.piecesOpen, L + 1); MapView.refresh();
  FX.burst(lp.x, lp.y, 50, 'star', 11); FX.confetti('huge'); Sound.fx.fanfare();
  toast(UNLOCK.ost);
  actor('exp', { img: 'explorer_thumbsup' }); actorAnim('exp', 'jump');
  await wait(600);
  await talk('explorer', UNLOCK.explorer);
  await cont('Open the map', true);
  lock.remove(); stage.classList.remove('unlock-scroll');
}

function showMiniLine(start, ans) {
  const lo = Math.min(start, ans) - 1, hi = Math.max(start, ans) + 1;
  const m = $('#miniLine'); let h = '';
  for (let v = lo; v <= hi; v++) h += `<div class="mcell ${v === 0 ? 'zero' : ''} ${v === start ? 'st' : ''}" data-v="${v}"><span class="${cls(v)}">${fmt(v)}</span></div>`;
  m.innerHTML = h; m.classList.add('on');
}
async function animateMiniLine(start, delta) {
  const dir = Math.sign(delta);
  for (let k = 1; k <= Math.abs(delta); k++) {
    $(`#miniLine .mcell[data-v="${start + dir * k}"]`)?.classList.add('hl'); Sound.fx.count(k);
    await wait(RM ? 160 : 360);
  }
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

function mapScene() {
  $('#nlWrap').classList.remove('on'); setBg('bg_map_table');
  if (!$('#mapView').classList.contains('on')) { MapView.build(); MapView.place(310, 158, .55, true); MapView.show(); }
  MapView.place(310, 158, .55);
  actor('exp', { img: 'explorer_idle', x: 1140, y: 610, h: 320, cls: 'idle' });
}

async function mysteries(L, from = 0) {
  const lvl = LEVELS[L], art = !!lvl.artMap;
  if (art) { setupPathArt(L); $('#pathArt').classList.add('faint'); litTo(lvl.pathArt, from); setRules(L); }
  else { mapScene(); setRules(L); stage.classList.toggle('map-ui', !!lvl.mapScroll); }
  HUD.seals(lvl.mysteries.length);
  if (art && from === 0 && lvl.mapIntro.some(l => !l.vo)) await castIn();
  if (from === 0) for (const line of lvl.mapIntro) await (line.vo ? voiceOnly(line.who, line.text) : talk(line.who, line.text)); // vo: an instruction, voice only
  if (art) { // the characters from the unlock scene step away before the puzzles start
    castOut();
  }
  if (!art) { MapView.seals(L); await wait(1100); }
  setPlaying(true);
  for (let j = 0; j < from; j++) { HUD.fill(j); const s = !art && MapView.seal(j); if (s) { s.classList.add('done'); s.textContent = '★'; } }
  for (let j = from; j < lvl.mysteries.length; j++) {
    const m = lvl.mysteries[j], ans = m.start + m.delta;
    let tries = 0;
    QA.at(`${L}:map:${j}`, null, ans);
    if (lvl.mapScroll) {
      if (j > from) await wait(900); // let the newly lit path stay on screen a moment
      stage.classList.add('map-scroll'); setBg(lvl.bg); Sound.fx.whoosh(); await wait(450);
    }
    Dial.clear(); Tablet.eq(m.eq); $('#hintArrow').classList.remove('on'); $('#miniLine').classList.remove('on');
    const seal = art ? null : MapView.seal(j); seal?.classList.add('active');
    if (!art) actor('exp', { img: 'explorer_idle' });
    // a puzzle without a line of its own: the banner clears and the sign carries the equation
    if (m.vo) {
      await voiceOnly('wizard', m.vo);
    } else hideBubble();
    Dial.show();
    while (true) {
      const asked = Dial.ask({
        idle: () => { speakOnly('wizard', m.idle, 'side'); Dial.pulse(); if (seal) retrigger(seal, 'active'); },
        touched: () => { $('#hintArrow').classList.remove('on'); },
      });
      if (m.coach && tries === 0) await coachKeypad(m, ans, asked);
      const v = await asked;
      if (v === ans) break;
      tries++; S.streak = 0;
      Dial.shake(); Sound.fx.wrong();
      if (!art) { actor('exp', { img: 'explorer_confused' }); actorAnim('exp', 'shake'); }
      const rung = Math.min(tries, 3);
      speakOnly('wizard', m.wrong[rung - 1], 'side');
      if (rung === 2) showHintArrow(m.delta > 0 ? 'right' : 'left');
      if (rung === 3) {
        if (lvl.hint3 === 'line') { showMiniLine(m.start, ans); await wait(900); await animateMiniLine(m.start, m.delta); }
        else { await Tablet.pulseTokens(); }
      }
      await wait(300);
      Dial.clear();
      if (!art) actor('exp', { img: 'explorer_idle' });
    }
    // solved
    Dial.good(); Tablet.solve(ans); Sound.fx.reveal();
    if (lvl.mapScroll) { await wait(900); Dial.hide(); stage.classList.remove('map-scroll'); if (!art) setBg('bg_map_table'); await wait(500); }
    if (seal) { seal.classList.remove('active'); seal.classList.add('done'); seal.textContent = '★'; }
    S.pathsOpen[L] = j + 1;
    if (art) { litTo(lvl.pathArt, j + 1); retrigger($('#pathArt .pa-lit'), 'flash'); } else MapView.refresh();
    HUD.fill(j);
    const sp = art ? artPoint(lvl.pathArt, lvl.pathArt.route[pathCut(lvl.pathArt, j + 1)]) : MapView.toStage(MAP.routes[L][j + 1]); FX.burst(sp.x, sp.y, j === 3 ? 40 : 22, 'star', j === 3 ? 10 : 7);
    toast(j === 3 ? '4/4 SOLVED!' : `${j + 1}/4 SOLVED`, true); FX.confetti(j === 3 ? 'medium' : 'small');
    if (!art) { actor('exp', { img: 'explorer_thumbsup' }); actorAnim('exp', 'hop'); }
    if (tries === 0) addGem({ x: 640, y: 120 });
    streakHit(tries === 0);
    $('#hintArrow').classList.remove('on');
    await voiceOnly('wizard', m.correct, 'side');
    await wait(500);
    $('#miniLine').classList.remove('on');
  }
  Dial.hide(); setPlaying(false);
}

async function revealed(L) {
  const lvl = LEVELS[L], rv = lvl.revealed;
  if (lvl.pathArt) return revealedArt(L);
  if (!$('#mapView').classList.contains('on')) mapScene();
  Tablet.rule(rv.ost); $('#mapPaths').classList.add('allglow');
  FX.confetti('huge'); Sound.fx.fanfare(); toast(rv.ost, true);
  await talk('wizard', rv.wizard);
  // tap the glowing path to travel
  const route = MAP.routes[L];
  const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  hit.setAttribute('class', 'hit'); hit.setAttribute('d', route.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' '));
  $('#mapPaths').style.pointerEvents = 'auto'; $('#mapPaths').appendChild(hit);
  speakOnly('wizard', 'Tap the glowing path to follow it!', 'side', false);
  const r = RUN;
  await new Promise(res => {
    const go = () => { hit.removeEventListener('click', go); pending.tapTarget = null; clearInterval(t); res(); };
    hit.addEventListener('click', go); pending.tapTarget = go;
    const t = setInterval(() => { if (r !== RUN) { clearInterval(t); return; } speakOnly('wizard', rv.idle, 'side'); }, 14000);
  });
  guard(r);
  hit.remove(); $('#mapPaths').style.pointerEvents = 'none'; Sound.fx.tap(); Voice.stop();
  MapView.token(route[0]); await wait(400);
  for (let k = 1; k < route.length; k++) { MapView.token(route[k]); Sound.fx.step(); await wait(RM ? 300 : 900); }
  FX.burst(MapView.toStage(route[4]).x, MapView.toStage(route[4]).y, 30, 'star', 8);
  actor('exp', { img: 'explorer_point' }); actorAnim('exp', 'jump');
  await talk('explorer', rv.explorer); endTalk();
  await wait(400);
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
  $('#nlWrap').classList.remove('on'); setBg(LEVELS[L].bg);
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
// Chamber 1 "unlock": no map or padlock; the path art, dimmed (route still hidden), while the lines play
const unlockLines = L => ({ ...UNLOCK, ...(LEVELS[L].unlock || {}) }); // a chamber's own lines over the defaults
async function unlockArt(L) {
  const UNLOCK = unlockLines(L);
  Tablet.hide(); $('#ruleChip').classList.remove('on');
  const pa = setupPathArt(L); litTo(pa, 0); $('#pathArt').classList.add('faint');
  retrigger($('#scroll'), 'unroll'); retrigger($('#pathArt'), 'unroll'); Sound.fx.creak(); Sound.fx.whoosh(); // the map unrolls
  await wait(900); Sound.fx.sparkle();
  await castIn(); // the explorer and the wizard stand in front of the map while the wizard explains it
  await talk('wizard', UNLOCK.wizard);
  actor('exp', { img: 'explorer_thumbsup' }); actorAnim('exp', 'hop');
  await talk('explorer', UNLOCK.explorer);
}

// the revealed route as its own illustration: the dashed path glows, a tap sends the explorer along it
async function revealedArt(L) {
  const lvl = LEVELS[L], rv = lvl.revealed, art = $('#pathArt'), tok = art.querySelector('.pa-token');
  const pa = setupPathArt(L);
  art.classList.remove('faint'); litTo(pa, lvl.artMap ? 4 : 0);
  const at = ([x, y]) => { tok.style.left = `${x / pa.w * 100}%`; tok.style.top = `${y / pa.h * 100}%`; };
  Sound.fx.reveal();
  await wait(500);
  FX.confetti('huge'); Sound.fx.fanfare(); toast(rv.ost, true);
  if (lvl.artMap) await castIn(['exp', 'wiz'], 'explorer_thumbsup');
  await talk('wizard', rv.wizard);
  if (lvl.artMap) castOut(); // out of the way of the route
  art.classList.add('glow');
  // a tapping hand on the start of the route shows where to tap
  let hand = art.querySelector('.pa-hand');
  if (!hand) { hand = document.createElement('div'); hand.className = 'pa-hand'; hand.innerHTML = '<i></i><b>👆</b>'; art.appendChild(hand); }
  hand.style.left = `${pa.route[0][0] / pa.w * 100}%`; hand.style.top = `${pa.route[0][1] / pa.h * 100}%`; hand.classList.add('on');
  speakOnly('wizard', 'Tap the glowing path to follow it!', 'side', false);
  const r = RUN, hit = art.querySelector('.pa-hit');
  await new Promise(res => {
    const go = () => { hit.removeEventListener('click', go); pending.tapTarget = null; clearInterval(t); res(); };
    hit.addEventListener('click', go); pending.tapTarget = go;
    const t = setInterval(() => { if (r !== RUN) { clearInterval(t); return; } speakOnly('wizard', rv.idle, 'side'); }, 14000);
  });
  guard(r);
  Sound.fx.tap(); Voice.stop(); art.classList.remove('glow'); hand.classList.remove('on');
  at(pa.route[0]); tok.classList.add('on'); await wait(400);
  for (let k = 1; k < pa.route.length; k++) { at(pa.route[k]); if (k % 2) Sound.fx.step(); await wait(RM ? 120 : 260); }
  const p = stagePos(tok); FX.burst(p.x, p.y, 30, 'star', 8); Sound.fx.sparkle();
  if (lvl.artMap) await castIn(['exp'], 'explorer_point');
  await talk('explorer', rv.explorer); endTalk();
  if (lvl.artMap) castOut();
  await wait(400);
}

async function badge(L) {
  const b = LEVELS[L].badge, m = $('#badgeModal');
  m.querySelector('.badge-art').innerHTML = badgeSVG(b);
  m.querySelector('.badge-name').textContent = `${b.name} badge`;
  m.querySelector('.badge-sub').innerHTML = `Chamber ${L + 1} cleared! Gems found on first try: <b style="color:#6CCBFF">${S.levelGems[L]}</b> of 9`;
  $('#btnBadge').textContent = L < 2 ? 'Next chamber' : 'Find the treasure';
  m.classList.add('on'); Sound.fx.fanfare(); FX.confetti('big');
  const r = RUN;
  await new Promise(res => { $('#btnBadge').onclick = () => { $('#btnBadge').blur(); Sound.fx.tap(); res(); }; });
  guard(r);
  m.classList.remove('on');
}

// a level can start at any step (used by the QA panel); i = which key or map puzzle
const STEPS = ['teach', 'keys', 'unlock', 'map', 'reveal', 'badge'];
async function runLevel(L, step = 'teach', i = 0) {
  const from = STEPS.indexOf(step), lvl = LEVELS[L];
  S.level = L; S.levelGems[L] = 0; S.piecesOpen = from >= 3 ? L + 1 : L;
  S.pathsOpen = [0, 1, 2].map(k => (k < L ? 4 : k > L ? 0 : from >= 4 ? 4 : from === 3 ? i : 0));
  resetUI();
  stage.classList.toggle('theme-cavern', lvl.theme === 'cavern');
  stage.classList.toggle('stones-lava', lvl.stones === 'lava'); // a chamber can use the lava stones throughout
  $('#dirPick .jump .t').textContent = lvl.submit || 'JUMP!';
  setBg(lvl.bg); NL.build(lvl);
  HUD.level(`Chamber ${L + 1}: ${lvl.name}`);
  if (L > 0 && from === 0) { toast(lvl.name, true); Sound.fx.whoosh(); await wait(1200); }
  if (from <= 0) { QA.at(`${L}:teach:0`); await teach(L); }
  if (from <= 1) await keyHunt(L, from === 1 ? i : 0);
  if (from === 2) { HUD.keys(lvl.keys.length); lvl.keys.forEach((_, k) => HUD.fill(k)); }
  if (from <= 2) { QA.at(`${L}:unlock:0`); await unlock(L); }
  if (from <= 3) await mysteries(L, from === 3 ? i : 0);
  if (from >= 4) { HUD.seals(lvl.mysteries.length); lvl.mysteries.forEach((_, k) => HUD.fill(k)); }
  if (from <= 4) { QA.at(`${L}:reveal:0`); await revealed(L); }
  if (from === 5) mapScene();
  if (lvl.badge) { QA.at(`${L}:badge:0`); await badge(L); } // a chamber without a badge goes straight on
}

async function runEnding() {
  resetUI(); S.piecesOpen = 3; QA.at('end');
  await playScenes(STORY_END);
  const f = $('#final');
  f.querySelector('.badge-art').innerHTML = badgeSVG(FINAL_BADGE);
  f.querySelector('.final-stats').innerHTML = `All 3 map pieces found and the treasure is yours!<br>Gems found on first try: <b>${S.gems}</b> of 27`;
  hideBubble(); f.classList.add('on'); Sound.fx.fanfare(); FX.confetti('huge');
}

/* ---------- chapters ---------- */
async function goChapter(c, step = 'teach', i = 0) {
  RUN++; resetUI();
  try {
    if (c === 'story') { S.gems = 0; setGems(); await runStory(); c = 0; }
    if (c === 'howto') { c = 0; step = 'keys'; i = 0; } // how to play = the guided first key
    if (c === 'end') { await runEnding(); return; }
    for (let L = +c; L < LEVELS.length; L++) await (L === +c ? runLevel(L, step, i) : runLevel(L));
    await runEnding();
  } catch (e) { if (e !== CANCEL) console.error(e); }
}

/* ---------- menu & toggles ---------- */
function paintToggles() {
  $('#btnSound').innerHTML = Sound.on ? ICONS.sound : ICONS.soundOff; $('#btnSound').classList.toggle('off', !Sound.on);
  $('#btnVoice').innerHTML = ICONS.voice; $('#btnVoice').classList.toggle('off', !Voice.on);
  $('#pause [data-act="sound"]').textContent = `Sound: ${Sound.on ? 'on' : 'off'}`;
  $('#pause [data-act="voice"]').textContent = `Voice: ${Voice.on ? 'on' : 'off'}`;
}
$('#btnSound').addEventListener('click', () => { Sound.init(); Sound.toggle(); Sound.fx.tap(); paintToggles(); });
$('#btnVoice').addEventListener('click', () => { Voice.toggle(); Sound.fx.tap(); paintToggles(); });
$('#btnPause').innerHTML = ICONS.menu;
$('#btnPause').addEventListener('click', () => { Sound.fx.tap(); Voice.stop(); $('#pause').classList.add('on'); });
function closeMenu() { $('#pause').classList.remove('on'); }
$('#pause').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) { if (e.target.id === 'pause') closeMenu(); return; }
  Sound.fx.tap();
  if (b.dataset.act === 'resume') closeMenu();
  if (b.dataset.act === 'sound') { Sound.toggle(); paintToggles(); }
  if (b.dataset.act === 'voice') { Voice.toggle(); paintToggles(); }
  if (b.dataset.go !== undefined) { closeMenu(); goChapter(b.dataset.go); }
});
$('#btnAgain').addEventListener('click', () => { Sound.fx.tap(); showTitle(); });

/* ---------- dev buttons (QA, editor) sit at the top right, left of the menu ---------- */
function devButton(btn) {
  let d = $('#devBtns');
  if (!d) { d = document.createElement('div'); d.id = 'devBtns'; stage.appendChild(d); }
  d.prepend(btn); stage.classList.add('has-dev');
}

/* ---------- QA panel: jump to any step, auto-solve ---------- */
const QA = (() => {
  let cur = '', dir = null, ans = null, open = false, box = null;
  const NAMES = { story: 'Story', howto: 'How to play', end: 'Treasure ending', teach: 'Intro', keys: 'Key', unlock: 'Unlock map', map: 'Map puzzle', reveal: 'Path reveal', badge: 'Badge' };
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
          <div class="qa-row">${chip(`${L}:reveal:0`, 'Path reveal')}${lvl.badge ? chip(`${L}:badge:0`, 'Badge') : ''}</div></section>`).join('')}
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
      if (pending.next) { fireNext(); return; }
      if (pending.cont) { $('#btnContinue').click(); return; }
      if (pending.tapTarget) { pending.tapTarget(); return; }
      if ($('#badgeModal').classList.contains('on')) { $('#btnBadge').click(); return; }
      toast('Nothing to solve yet. Wait for the animation.', true);
    },
  };
  if (QA_PANEL) build();
  return api;
})();

/* ---------- title ---------- */
/* ---------- cover page ---------- */
// art from assets/cover_*.webp; the logo and button images also shape their light sweeps
document.querySelectorAll('#title [data-asset]').forEach(img => { img.src = ASSET(img.dataset.asset); });
document.querySelectorAll('#title .cv-shine').forEach(s => { const img = s.parentElement.querySelector('img'); s.style.setProperty('--mask', `url("${img.src}")`); });
// floating embers rising out of the tunnel
$('#title .cv-motes').innerHTML = Array.from({ length: 26 }, (_, i) => {
  const x = 120 + Math.random() * 1040, d = 7 + Math.random() * 7, delay = -Math.random() * d, s = 3 + Math.random() * 5, drift = (Math.random() - .5) * 120;
  return `<i style="left:${x.toFixed(0)}px;width:${s.toFixed(1)}px;height:${s.toFixed(1)}px;--drift:${drift.toFixed(0)}px;animation-duration:${d.toFixed(1)}s;animation-delay:${delay.toFixed(1)}s"></i>`;
}).join('');
function showTitle() {
  RUN++; resetUI(); setBg('bg_entrance'); QA.at('');
  retrigger($('#title'), 'on'); // replays the entrance each time the cover opens
  coverMusic();
}
// background music starts with the first tap or key (browsers block sound before that) and loops for the whole game
// if the browser held sound back, the first tap or key anywhere starts the music (and the cover's title voice)
const startMusic = () => { Sound.init(); Sound.music(); coverVoice(); removeEventListener('pointerdown', startMusic, true); removeEventListener('keydown', startMusic, true); };
addEventListener('pointerdown', startMusic, true); addEventListener('keydown', startMusic, true);
// the cover tries to play music straight away; if the browser holds it back, a hint asks for a tap
// music button, bottom left: mutes or unmutes only the music (voice and sound effects keep playing)
const MUSIC_ICON = on => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17.5V5.2l10-2.2v12.3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><ellipse cx="6.5" cy="17.6" rx="3" ry="2.4" fill="currentColor"/><ellipse cx="16.5" cy="15.4" rx="3" ry="2.4" fill="currentColor"/>${on ? '' : '<path d="M3 3l18 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'}</svg>`;
function paintMusicBtn() {
  const b = $('#btnMusic'), m = Sound.musicMuted;
  b.innerHTML = MUSIC_ICON(!m); b.classList.toggle('muted', m);
  b.setAttribute('aria-label', m ? 'Turn music on' : 'Turn music off'); b.title = m ? 'Music off' : 'Music on';
}
try { Sound.musicMuted = localStorage.getItem('tt-music-muted') === '1'; } catch (e) {}
paintMusicBtn();
$('#btnMusic').addEventListener('click', e => {
  e.stopPropagation(); $('#btnMusic').blur();
  Sound.init(); Sound.music(); Sound.musicMuted = !Sound.musicMuted; paintMusicBtn(); Sound.fx.tap();
  try { localStorage.setItem('tt-music-muted', Sound.musicMuted ? '1' : '0'); } catch (e2) {}
});
// the cover starts the music and says the game's name as soon as it opens (browsers that block sound until
// the first interaction get both on the first tap or key instead)
let coverVoiced = false;
function coverVoice() {
  if (coverVoiced || !$('#title').classList.contains('on') || !Sound.running) return;
  coverVoiced = true; setTimeout(() => { if ($('#title').classList.contains('on')) Voice.say('Treasure Tunnel!', 'narrator'); }, 900);
}
document.addEventListener('tt-sound', coverVoice);
function coverMusic() { coverVoiced = false; Sound.init(); Sound.music(); setTimeout(coverVoice, 300); }
$('#btnStart').addEventListener('click', () => { $('#btnStart').blur(); Sound.init(); Sound.music(); Sound.fx.fanfare(); $('#title').classList.remove('on'); goChapter('story'); });

/* ---------- optional UI art: used when the file exists, drawn in CSS otherwise ---------- */
['ui_platform', 'ui_equation_sign', 'ui_btn_arrow', 'ui_btn_check', 'ui_control_base', 'ui_controls', 'ui_scroll', 'ui_key_sign', 'ui_key_digit', 'ui_key_delete', 'ui_btn_check_text', 'ui_keybox', 'ui_platform_lava'].forEach(n => {
  const img = new Image();
  img.onload = () => { stage.style.setProperty(`--a-${n}`, `url("${img.src}")`); stage.classList.add(`has-${n}`); };
  img.src = ASSET(n);
});

/* ---------- boot ---------- */
['explorer_idle', 'explorer_walk_1', 'explorer_walk_2', 'explorer_jump_key', 'explorer_confused', 'explorer_point', 'explorer_thumbsup', 'explorer_worried', 'explorer_run_back',
 'wizard_laugh', 'wizard_point', 'wizard_explain', 'wizard_proud', 'wizard_hint', 'wizard_avatar', 'explorer_avatar', 'map',
 'bg_tunnel', 'bg_level1_amber_tunnel', 'bg_level2_shadow_chamber', 'bg_level3_crystal_cavern', 'bg_map_table', 'bg_final_path', 'bg_treasure_chamber']
  .forEach(n => { const i = new Image(); i.src = ASSET(n); });
fit(); paintToggles(); setGems(); showTitle();
if (document.fonts) document.fonts.ready.then(() => Tablet.fit()); // re-fit once the game font has loaded
window.__tt = { goChapter, devButton, ctx: () => ({ step: QA.cur, label: QA.label, bg: bgNow }) };
})();
