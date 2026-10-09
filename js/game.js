/* ===== Treasure Tunnel – game engine ===== */
(() => {
'use strict';

const $ = s => document.querySelector(s);
const ASSET = n => (window.ASSETS && window.ASSETS[n]) || `assets/${n}.webp`;
const RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const STEP = 112, MIN = -25, MAX = 25;
const STAGE_W = 1280, STAGE_H = 720;
const stage = $('#stage');

/* One formatter for every number shown anywhere. */
const fmt = v => v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : '0';
const cls = v => v > 0 ? 'pos' : v < 0 ? 'neg' : 'zer';
const numHTML = v => `<span class="${cls(v)}">${fmt(v)}</span>`;

/* ---------- inline art ---------- */
const KEY_SVG = `<svg viewBox="0 0 100 100"><defs><linearGradient id="kg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#ffc83a"/><stop offset="1" stop-color="#c47f00"/></linearGradient></defs><g transform="rotate(-35 50 50)"><rect x="46" y="44" width="46" height="12" rx="4" fill="url(#kg)" stroke="#7a4a00" stroke-width="4"/><rect x="71" y="54" width="9" height="15" rx="2" fill="url(#kg)" stroke="#7a4a00" stroke-width="3"/><rect x="83" y="54" width="8" height="11" rx="2" fill="url(#kg)" stroke="#7a4a00" stroke-width="3"/><circle cx="30" cy="50" r="21" fill="url(#kg)" stroke="#7a4a00" stroke-width="4"/><circle cx="30" cy="50" r="9" fill="#7a4a00"/><circle cx="30" cy="50" r="5.5" fill="#4fc3ff"/></g></svg>`;
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
  if (bgNow === name) return; bgNow = name;
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
function bubble(who, text, mode = 'bottom', speak = true) {
  const b = $('#bubble');
  b.className = `on ${mode} ${who}`;
  b.querySelector('.av').src = who === 'wizard' ? ASSET('wizard_avatar') : who === 'explorer' ? ASSET('explorer_avatar') : NARRATOR_AV;
  b.querySelector('.who').textContent = WHO[who];
  b.querySelector('.txt').innerHTML = text;
  retrigger(b, 'pop');
  lastLine = { who, text };
  return speak ? Voice.say(text, who) : Promise.resolve();
}
async function say(who, text, mode = 'bottom') { const r = RUN; await bubble(who, text, mode); guard(r); }
function bubbleText(text) { $('#bubble .txt').innerHTML = text; }
function hideBubble() { $('#bubble').className = ''; }
$('#btnReplay').innerHTML = ICONS.replay;
$('#btnReplay').addEventListener('click', e => { e.stopPropagation(); Sound.fx.tap(); Voice.say(lastLine.text, lastLine.who); });

/* ---------- waiting for the player ---------- */
let pending = { next: null, cont: null, dial: null, dir: null, tapTarget: null };
function nextTap() {
  const r = RUN;
  $('#bubble').classList.add('has-next');
  $('#tapHint').style.opacity = 1;
  return new Promise(res => { pending.next = res; }).then(() => {
    $('#bubble').classList.remove('has-next'); $('#tapHint').style.opacity = 0; Voice.stop(); guard(r);
  });
}
function fireNext() { if (pending.next) { const f = pending.next; pending.next = null; Sound.fx.tap(); f(); } }
$('#btnNext').addEventListener('click', e => { e.stopPropagation(); fireNext(); });
stage.addEventListener('pointerdown', e => {
  if (!pending.next) return;
  if (e.target.closest('button, #tray, #dirPick, .overlay.on, #hud, .mpiece')) return;
  fireNext();
});

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
  await fly(GEM_SVG, from, stagePos($('#gems .gem-ico')), 700, 46);
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
  },
  rule(html) { const t = $('#tablet'); t.className = 'on rule'; t.innerHTML = html; },
  solve(v) { const t = $('#tablet'); const q = t.querySelector('.q'); if (q) { q.outerHTML = numHTML(v); } t.classList.add('solved'); },
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
    const el = document.createElement('div'); el.className = 'actor';
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
    this.top = Math.round(lvl.ledge * STAGE_H);
    $('#nlWrap').style.top = `${this.top}px`;
    nl.style.width = `${(MAX - MIN + 1) * STEP}px`;
    for (let v = MIN; v <= MAX; v++) {
      const s = document.createElement('div');
      s.className = `stone${v === 0 ? ' zero' : ''}${v % 5 === 0 ? ' mark show' : ''}`;
      s.dataset.v = v; s.style.left = `${this.x(v)}px`;
      s.innerHTML = `<span class="dot"></span><span class="lbl ${cls(v)}">${fmt(v)}</span>`;
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
    this.pos = v;
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
      s.classList.remove('trail', 'land', 'miss', 'pulse', 'start');
      if (!s.classList.contains('mark')) s.classList.remove('show');
    });
    $('#keyprize').classList.remove('on');
  },
  arrow(from, len, label, flipped = false) {
    let a = $('#nlArrow');
    if (!a) { a = document.createElement('div'); a.className = 'nl-arrow'; a.id = 'nlArrow'; $('#nl').appendChild(a); }
    const w = len * STEP;
    a.style.left = `${this.x(from)}px`; a.style.width = `${w}px`;
    a.innerHTML = arrowSVG(w) + `<div class="lab">${label}</div>`;
    a.classList.remove('on'); a.classList.toggle('flipped', flipped);
    void a.offsetWidth; a.classList.add('on'); Sound.fx.whoosh();
    return a;
  },
  hideArrow() { $('#nlArrow')?.remove(); },
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
    } else if (/\d/.test(k)) { if (digits.length < 2) digits = (digits === '0' ? '' : digits) + k; }
    render(); resetIdle();
  }
  tray.addEventListener('click', e => { const b = e.target.closest('.k'); if (b) { retrigger(b, 'press'); press(b.dataset.k); } });
  return {
    show() { tray.classList.add('on'); },
    hide() { tray.classList.remove('on'); resolver = null; clearTimeout(idleT); },
    clear() { sign = 0; digits = ''; disp.classList.remove('shake', 'good'); render(); },
    ask({ idle, touched } = {}) {
      const r = RUN; this.show(); idleFn = idle; onTouch = touched || null;
      return new Promise(res => { resolver = res; resetIdle(); }).then(v => { guard(r); return v; });
    },
    shake() { retrigger(disp, 'shake'); },
    good() { disp.classList.add('good'); },
    pulse() { retrigger(tray, 'pulse'); },
    key(k) { press(k); },
    get active() { return !!resolver; },
  };
})();

/* ---------- direction choice ---------- */
let dirResolver = null;
function askDir() {
  const r = RUN; $('#dirPick').classList.add('on');
  return new Promise(res => { dirResolver = res; }).then(d => { $('#dirPick').classList.remove('on'); guard(r); return d; });
}
$('#dirPick').addEventListener('click', e => { const b = e.target.closest('button'); if (b && dirResolver) { Sound.fx.tap(); const f = dirResolver; dirResolver = null; f(b.dataset.dir); } });

/* ---------- keyboard ---------- */
addEventListener('keydown', e => {
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
  if (dirResolver && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); const f = dirResolver; dirResolver = null; Sound.fx.tap(); f(e.key === 'ArrowLeft' ? 'left' : 'right'); return; }
  if (e.key === 'Enter' || e.key === ' ') {
    if (pending.next) { e.preventDefault(); fireNext(); }
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
  Voice.stop();
  pending = { next: null, cont: null, dial: null, dir: null, tapTarget: null };
  dirResolver = null;
  hideBubble(); Tablet.hide(); Dial.hide(); Dial.clear();
  ['#dirPick', '#btnContinue', '#demo', '#miniLine', '#hintArrow', '#ruleChip', '#flare'].forEach(s => $(s).classList.remove('on'));
  $('#toast').classList.remove('on'); $('#tapHint').style.opacity = 0;
  clearActors(); clearProps(); $('#nlWrap').classList.remove('on'); $('#nl').innerHTML = '';
  MapView.hide(); HUD.hide();
  document.querySelectorAll('.fly, .puff, .poofcloud').forEach(e => e.remove());
  ['#badgeModal', '#final', '#title'].forEach(s => $(s).classList.remove('on'));
  S.streak = 0;
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
function storySeals() {
  [[600, 150], [760, 118], [920, 140], [1080, 112]].forEach(([x, y], i) => {
    const s = prop('sealf', { left: `${x - 35}px`, top: `${y - 35}px`, animationDelay: `${i * .18}s, ${.6 + i * .18}s` }, '?');
  });
}

const SCENES = {
  async hook() {
    prop('lightbeam on', {});
    actor('exp', { img: 'explorer_idle', x: 330, y: 600, h: 380, cls: 'idle', enter: true });
  },
  async lostMap() {
    actor('exp', { img: 'explorer_idle', x: 230, y: 600, h: 340, cls: 'idle' });
    mapScrap(420, 470, 150, -10, 0); mapScrap(800, 430, 110, 14, 1); mapScrap(1060, 470, 120, -18, 2);
    Sound.fx.whoosh(); puffs(480, 530); puffs(850, 480, 6); puffs(1110, 520, 6);
  },
  async worried() {
    actor('exp', { img: 'explorer_worried', x: 420, y: 640, h: 480, cls: 'idle' });
    mapScrap(860, 440, 100, 14, 1); mapScrap(1080, 470, 110, -18, 2);
  },
  async wizardAppears() {
    actor('exp', { img: 'explorer_worried', x: 380, y: 640, h: 450, cls: 'idle' });
    poofAt(950, 420); await wait(250);
    actor('wiz', { img: 'wizard_laugh', x: 950, y: 640, h: 470, cls: 'idle', enter: true });
    await wait(500); storySeals(); Sound.fx.sparkle();
  },
  async ready() {
    actor('exp', { img: 'explorer_thumbsup', x: 380, y: 640, h: 450, cls: 'idle glowring' });
    actor('wiz', { img: 'wizard_point', x: 950, y: 640, h: 470, cls: 'idle' }); actorAnim('exp', 'hop');
    storySeals();
  },
  async readyWizard() {
    actor('exp', { img: 'explorer_point', x: 380, y: 640, h: 450, cls: 'idle' });
    actor('wiz', { img: 'wizard_explain', x: 950, y: 640, h: 470, cls: 'idle' });
    storySeals();
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
    bubble(sc.who, sc.text, 'bottom');
    await nextTap();
  }
}

async function runStory() {
  await playScenes(STORY_INTRO);
  await runHowTo();
}

/* ---------- how to play ---------- */
async function runHowTo() {
  clearActors(); clearProps(); setBg('bg_tunnel');
  const d = $('#demo');
  for (let i = 0; i < HOW_TO_PLAY.length; i++) {
    const h = HOW_TO_PLAY[i];
    const dots = HOW_TO_PLAY.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('');
    let inner = '';
    if (h.demo === 'puzzle') inner = `<div style="position:absolute;left:50%;top:96px;transform:translateX(-50%);font:46px 'Lilita One';padding:8px 26px;border-radius:16px;background:linear-gradient(#8a8d98,#4a4d57);border:3px solid #2c2e35;white-space:nowrap"><span class="pos">(+2)</span> + <span class="pos">3</span> = <span style="color:#FFD54A">?</span></div>
      <div style="position:absolute;left:50%;top:180px;transform:translateX(-50%);font:40px 'Lilita One';color:#fff">↓</div>
      <div style="position:absolute;left:50%;top:230px;width:110px;height:110px;margin-left:-55px;animation:keySpin 1.4s ease-in-out infinite;filter:drop-shadow(0 0 14px #ffd54a)">${KEY_SVG}</div>`;
    if (h.demo === 'jump') inner = `<img src="${ASSET('explorer_jump_key')}" style="position:absolute;left:50%;bottom:-10px;height:300px;transform:translateX(-50%);animation:floaty 1.2s ease-in-out infinite">`;
    if (h.demo === 'wrong') inner = `<img src="${ASSET('explorer_confused')}" style="position:absolute;left:50%;bottom:-10px;height:290px;transform:translateX(-50%)"><div style="position:absolute;right:40px;top:110px;font:30px 'Lilita One';color:#fff;background:#c0392b;border-radius:14px;padding:4px 14px;transform:rotate(6deg)">No key here</div>`;
    if (h.demo === 'map') inner = `<div style="position:absolute;left:40px;top:70px;width:480px;height:320px;background:url(${ASSET('map')}) center/contain no-repeat"></div><svg viewBox="0 0 1200 800" style="position:absolute;left:40px;top:70px;width:480px;height:320px"><path d="${segPath(MAP.routes[0][0], MAP.routes[0][2], 0)} ${segPath(MAP.routes[0][2], MAP.routes[0][4], 1).replace('M', 'L')}" fill="none" stroke="#FFD54A" stroke-width="18" stroke-linecap="round" stroke-dasharray="1 30" style="filter:drop-shadow(0 0 8px #ffb300);animation:drawSeg 1.6s ease-out infinite"/></svg>`;
    if (h.demo === 'go') inner = `<img src="${ASSET('explorer_thumbsup')}" style="position:absolute;left:70px;bottom:-10px;height:290px"><img src="${ASSET('wizard_point')}" style="position:absolute;right:50px;bottom:-10px;height:290px">`;
    d.innerHTML = `<div class="steps">${dots}</div><div class="htp">How to play</div>${inner}`;
    retrigger(d, 'on'); Sound.fx.pop();
    bubble(h.who, h.text, 'bottom');
    await nextTap();
  }
  d.classList.remove('on');
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
    Tablet.rule(t.ost);
    if (t.type === 'zero') {
      NL.place(0, true); NL.stone(0).classList.add('pulse'); NL.hop();
    } else if (t.type === 'arrows') {
      NL.stone(0).classList.remove('pulse');
      bubble(t.who, t.text, 'left');
      NL.face(1); NL.arrow(0, 3, 'Add'); await wait(2200);
      NL.face(-1); NL.arrow(0, 3, 'Subtract', true); await wait(2000);
      NL.face(1);
      await nextTap(); NL.hideArrow(); continue;
    } else if (t.type === 'confused') {
      NL.place(0, true); NL.pose('explorer_confused'); NL.hop();
    } else if (t.type === 'wizard') {
      NL.pose('explorer_worried');
      const p = { x: 1110, y: NL.top - 150 }; poofAt(p.x, p.y); await wait(250);
      wizardOnLedge('wizard_laugh', true);
    } else if (t.type === 'flip') {
      NL.pose('explorer_idle'); wizardOnLedge('wizard_explain');
      bubble(t.who, t.text, 'left');
      const fromLeft = t.from === 'left';
      NL.face(fromLeft ? -1 : 1);
      NL.arrow(0, 3, fromLeft ? 'Subtract' : 'Add', fromLeft); await wait(2400);
      const toks = $('#tablet'); toks.innerHTML = t.ost.replace(/\(−3\)/, '<span class="tok neg hl">(−3)</span>');
      Sound.fx.sparkle(); await wait(1200);
      NL.face(fromLeft ? 1 : -1);
      NL.arrow(0, 3, fromLeft ? 'Subtract a negative' : 'Add a negative', !fromLeft);
      await nextTap(); continue;
    } else if (t.type === 'understand') {
      wizardOnLedge('wizard_proud');
      NL.pose('explorer_point'); NL.face(t.from === 'left' ? -1 : 1);
      bubble(t.who, t.text, 'left');
      await wait(1600); NL.face(t.to === 'left' ? -1 : 1); NL.hop(); Sound.fx.pop();
      NL.arrow(0, 3, t.to === 'left' ? 'Move left' : 'Move right', t.to === 'left');
      await nextTap(); NL.hideArrow(); continue;
    }
    bubble(t.who, t.text, 'left');
    await nextTap();
  }
  NL.hideArrow(); NL.stone(0)?.classList.remove('pulse');
  if (actors.wiz) { const p = stagePos(actors.wiz.el); poofAt(p.x, p.y); removeActor('wiz'); }
  NL.pose('explorer_idle'); NL.face(1);
}

async function keyHunt(L) {
  const lvl = LEVELS[L];
  HUD.keys(lvl.keys.length); setRules(L);
  for (let i = 0; i < lvl.keys.length; i++) {
    const it = lvl.keys[i], ans = it.start + it.delta;
    let tries = 0;
    NL.resetMarks(); Dial.clear(); Tablet.eq(it.eq);
    if (NL.pos !== it.start) await NL.teleport(it.start); else NL.face(1);
    NL.markStart(it.start);
    await say('wizard', it.vo, 'left');
    if (it.askDir) await chooseDirection(it);
    await NL.walk(it.start, it.delta);
    const prompt = 'Where did the explorer stop? Tap the number, then press GO!';
    bubble('wizard', prompt, 'left', i === 0);
    while (true) {
      const v = await Dial.ask({
        idle: () => { bubble('wizard', it.idle, 'left'); Dial.pulse(); NL.hop(); },
        touched: () => bubbleText(prompt),
      });
      if (v === ans) break;
      tries++;
      await wrongKey(it, v, tries, ans);
    }
    await keySuccess(L, i, it, ans, tries === 0);
  }
}

async function chooseDirection(it) {
  const right = it.delta > 0 ? 'right' : 'left';
  while (true) {
    const d = await askDir();
    if (d === right) {
      Sound.fx.pop(); NL.face(d === 'right' ? 1 : -1); NL.hop();
      bubble('wizard', `Yes! Move ${d}.`, 'left', false); await wait(700); return;
    }
    Sound.fx.wrong(); NL.face(d === 'right' ? 1 : -1); NL.hop(); retrigger($('#ruleChip').lastElementChild, 'flash');
    await say('wizard', it.wrong[1], 'left');
    NL.face(1);
  }
}

async function wrongKey(it, v, tries, ans) {
  const rung = Math.min(tries, 3);
  S.streak = 0; Dial.shake(); Sound.fx.wrong(); Dial.hide();
  const inRange = v >= MIN && v <= MAX;
  if (inRange && v !== NL.pos) {
    await NL.walk(NL.pos, v - NL.pos, { count: false, trail: false, stepMs: RM ? 120 : 150 });
  }
  if (inRange) {
    NL.stone(v)?.classList.add('miss', 'show');
    NL.pose('explorer_confused'); NL.jump();
    await wait(450); const p = stagePos(NL.exp); puffs(p.x, p.y + 110); Sound.fx.thud();
  } else {
    retrigger($('#bubble'), 'flash');
  }
  await say('wizard', it.wrong[rung - 1], 'left');
  if (rung === 2) {
    NL.resetMarks(); NL.markStart(it.start);
    await NL.teleport(it.start);
    await NL.walk(it.start, it.delta);
  } else {
    if (NL.pos !== ans) await NL.walk(NL.pos, ans - NL.pos, { count: false, trail: false, stepMs: RM ? 120 : 150 });
    NL.pose('explorer_idle');
    const vs = NL.stone(v);
    if (vs && v % 5 !== 0 && !vs.classList.contains('start')) vs.classList.remove('show');
    NL.stone(v)?.classList.remove('miss');
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
  }
  NL.pose('explorer_idle'); NL.face(1);
  Dial.clear();
}

async function keySuccess(L, i, it, ans, firstTry) {
  Dial.good(); Dial.hide();
  Tablet.solve(ans);
  const s = NL.stone(ans); s.classList.remove('pulse'); s.classList.add('land', 'show');
  NL.pose('explorer_jump_key'); NL.jump(); Sound.fx.key();
  const k = $('#keyprize'); k.style.left = `${NL.x(ans) + 100}px`; retrigger(k, 'on');
  const p = stagePos(NL.exp); FX.burst(p.x, p.y - 60, 30, 'star', 8);
  toast(it.cele, it.cele.length < 8); FX.confetti(it.size);
  if (firstTry) addGem({ x: p.x, y: p.y - 80 });
  streakHit(firstTry);
  await wait(1000);
  k.classList.remove('on');
  await fly(KEY_SVG, stagePos(k), HUD.slotPos(i), 800, 70);
  HUD.fill(i); Sound.fx.coin();
  NL.pose('explorer_thumbsup');
  await say('wizard', `Correct! You found it. The explorer reached ${numHTML(ans)}. The key is right here.`, 'left');
  await cont(i < LEVELS[L].keys.length - 1 ? 'Next key' : 'Unlock the map');
  NL.pose('explorer_idle');
}

async function unlock(L) {
  $('#nlWrap').classList.remove('on'); Tablet.hide(); $('#ruleChip').classList.remove('on');
  setBg('bg_map_table'); MapView.build(); MapView.place(244, 70, .66, true); MapView.show();
  const piece = document.querySelectorAll('.mpiece')[L];
  const lock = MapView.padlock(L);
  actor('exp', { img: 'explorer_idle', x: 1150, y: 600, h: 300, cls: 'idle', enter: true });
  piece.classList.add('glow');
  bubble('wizard', UNLOCK.wizard, 'bottomL');
  const r = RUN;
  await new Promise(res => {
    const go = () => { piece.removeEventListener('click', go); pending.tapTarget = null; clearInterval(idleT); res(); };
    piece.addEventListener('click', go); pending.tapTarget = go;
    const idleT = setInterval(() => { if (r !== RUN) { clearInterval(idleT); return; } bubble('wizard', UNLOCK.idle, 'bottomL'); document.querySelectorAll('#slots .slot').forEach(s => pulseClass(s, 'bump', 600)); }, 14000);
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
  await say('explorer', UNLOCK.explorer, 'bottomL');
  await cont('Open the map', true);
  lock.remove();
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

async function mysteries(L) {
  const lvl = LEVELS[L];
  $('#nlWrap').classList.remove('on'); setBg('bg_map_table');
  if (!$('#mapView').classList.contains('on')) { MapView.build(); MapView.place(310, 158, .55, true); MapView.show(); }
  MapView.place(310, 158, .55); setRules(L);
  actor('exp', { img: 'explorer_idle', x: 1140, y: 610, h: 320, cls: 'idle' });
  HUD.seals(lvl.mysteries.length);
  for (const line of lvl.mapIntro) { bubble(line.who, line.text, 'side'); await nextTap(); }
  MapView.seals(L); await wait(1100);
  for (let j = 0; j < lvl.mysteries.length; j++) {
    const m = lvl.mysteries[j], ans = m.start + m.delta;
    let tries = 0;
    Dial.clear(); Tablet.eq(m.eq); $('#hintArrow').classList.remove('on'); $('#miniLine').classList.remove('on');
    const seal = MapView.seal(j); seal.classList.add('active');
    actor('exp', { img: 'explorer_idle' });
    if (m.tutorial) {
      showMiniLine(m.start, ans);
      bubble('wizard', m.vo, 'side');
      await wait(1800); await animateMiniLine(m.start, m.delta);
    } else {
      await say('wizard', m.vo, 'side');
    }
    Dial.show();
    while (true) {
      const v = await Dial.ask({
        idle: () => { bubble('wizard', m.idle, 'side'); Dial.pulse(); retrigger(seal, 'active'); },
        touched: () => { $('#hintArrow').classList.remove('on'); },
      });
      if (v === ans) break;
      tries++; S.streak = 0;
      Dial.shake(); Sound.fx.wrong();
      actor('exp', { img: 'explorer_confused' }); actorAnim('exp', 'shake');
      const rung = Math.min(tries, 3);
      bubble('wizard', m.wrong[rung - 1], 'side');
      if (rung === 2) showHintArrow(m.delta > 0 ? 'right' : 'left');
      if (rung === 3) {
        if (lvl.hint3 === 'line') { showMiniLine(m.start, ans); await wait(900); await animateMiniLine(m.start, m.delta); }
        else { await Tablet.pulseTokens(); }
      }
      await wait(300);
      Dial.clear();
      actor('exp', { img: 'explorer_idle' });
    }
    // solved
    Dial.good(); Tablet.solve(ans); Sound.fx.reveal();
    seal.classList.remove('active'); seal.classList.add('done'); seal.textContent = '★';
    S.pathsOpen[L] = j + 1; MapView.refresh();
    HUD.fill(j);
    const sp = MapView.toStage(MAP.routes[L][j + 1]); FX.burst(sp.x, sp.y, j === 3 ? 40 : 22, 'star', j === 3 ? 10 : 7);
    toast(j === 3 ? '4/4 SOLVED!' : `${j + 1}/4 SOLVED`, true);
    actor('exp', { img: 'explorer_thumbsup' }); actorAnim('exp', 'hop');
    if (tries === 0) addGem({ x: 640, y: 120 });
    streakHit(tries === 0);
    $('#hintArrow').classList.remove('on');
    await say('wizard', m.correct, 'side');
    await wait(500);
    $('#miniLine').classList.remove('on');
  }
  Dial.hide();
}

async function revealed(L) {
  const lvl = LEVELS[L], rv = lvl.revealed;
  Tablet.rule(rv.ost); $('#mapPaths').classList.add('allglow');
  FX.confetti('huge'); Sound.fx.fanfare(); toast(rv.ost, true);
  await say('wizard', rv.wizard, 'side');
  // tap the glowing path to travel
  const route = MAP.routes[L];
  const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  hit.setAttribute('class', 'hit'); hit.setAttribute('d', route.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' '));
  $('#mapPaths').style.pointerEvents = 'auto'; $('#mapPaths').appendChild(hit);
  bubble('wizard', 'Tap the glowing path to follow it!', 'side', false);
  const r = RUN;
  await new Promise(res => {
    const go = () => { hit.removeEventListener('click', go); pending.tapTarget = null; clearInterval(t); res(); };
    hit.addEventListener('click', go); pending.tapTarget = go;
    const t = setInterval(() => { if (r !== RUN) { clearInterval(t); return; } bubble('wizard', rv.idle, 'side'); }, 14000);
  });
  guard(r);
  hit.remove(); $('#mapPaths').style.pointerEvents = 'none'; Sound.fx.tap(); Voice.stop();
  MapView.token(route[0]); await wait(400);
  for (let k = 1; k < route.length; k++) { MapView.token(route[k]); Sound.fx.step(); await wait(RM ? 300 : 900); }
  FX.burst(MapView.toStage(route[4]).x, MapView.toStage(route[4]).y, 30, 'star', 8);
  actor('exp', { img: 'explorer_point' }); actorAnim('exp', 'jump');
  await say('explorer', rv.explorer, 'side');
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

async function runLevel(L) {
  S.level = L; S.levelGems[L] = 0; S.piecesOpen = L; S.pathsOpen = [0, 1, 2].map(i => (i < L ? 4 : 0));
  resetUI();
  const lvl = LEVELS[L];
  setBg(lvl.bg); NL.build(lvl);
  HUD.level(`Chamber ${L + 1}: ${lvl.name}`);
  if (L > 0) { toast(lvl.name, true); Sound.fx.whoosh(); await wait(1200); }
  await teach(L);
  await keyHunt(L);
  await unlock(L);
  await mysteries(L);
  await revealed(L);
  await badge(L);
}

async function runEnding() {
  resetUI(); S.piecesOpen = 3;
  await playScenes(STORY_END);
  const f = $('#final');
  f.querySelector('.badge-art').innerHTML = badgeSVG(FINAL_BADGE);
  f.querySelector('.final-stats').innerHTML = `All 3 map pieces found and the treasure is yours!<br>Gems found on first try: <b>${S.gems}</b> of 27`;
  hideBubble(); f.classList.add('on'); Sound.fx.fanfare(); FX.confetti('huge');
}

/* ---------- chapters ---------- */
async function goChapter(c) {
  RUN++; resetUI();
  try {
    if (c === 'story') { S.gems = 0; setGems(); await runStory(); c = 0; }
    if (c === 'end') { await runEnding(); return; }
    for (let L = +c; L < LEVELS.length; L++) await runLevel(L);
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

/* ---------- title ---------- */
function showTitle() {
  RUN++; resetUI(); setBg('bg_entrance');
  $('#title').classList.add('on');
  $('#title .logo-key').innerHTML = KEY_SVG;
  actor('exp', { img: 'explorer_idle', x: 190, y: 735, h: 400, cls: 'idle' });
  actor('wiz', { img: 'wizard_laugh', x: 1100, y: 735, h: 400, cls: 'float' });
}
$('#btnStart').addEventListener('click', () => { $('#btnStart').blur(); Sound.init(); Sound.fx.fanfare(); $('#title').classList.remove('on'); goChapter('story'); });

/* ---------- boot ---------- */
['explorer_idle', 'explorer_walk_1', 'explorer_walk_2', 'explorer_jump_key', 'explorer_confused', 'explorer_point', 'explorer_thumbsup', 'explorer_worried', 'explorer_run_back',
 'wizard_laugh', 'wizard_point', 'wizard_explain', 'wizard_proud', 'wizard_hint', 'wizard_avatar', 'explorer_avatar', 'map',
 'bg_tunnel', 'bg_level1_amber_tunnel', 'bg_level2_shadow_chamber', 'bg_level3_crystal_cavern', 'bg_map_table', 'bg_final_path', 'bg_treasure_chamber']
  .forEach(n => { const i = new Image(); i.src = ASSET(n); });
fit(); paintToggles(); setGems(); showTitle();
window.__tt = { goChapter };
})();
