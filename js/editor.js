/* ===== Treasure Tunnel – layout editor =====
   E (or the ✎ button) turns it on. Click anything in the game to select it (Shift+click or drag a box
   to select several), then move, resize, rotate, flip it or change its font size. Every change is kept
   in the browser and can be copied or downloaded as JSON with exact positions in the 1280×720 stage. */
(() => {
'use strict';
if (typeof EDITOR === 'undefined' || !EDITOR) return;

const $ = s => document.querySelector(s);
const stage = $('#stage');
const W = 1280, H = 720, STORE = 'tt-layout-edits-v2';
const RANK = { all: 0, bg: 1, step: 2 };
const SCOPES = { bg: 'This background', step: 'This step only', all: 'Everywhere' };
const r1 = v => Math.round(v * 10) / 10;
const r3 = v => Math.round(v * 1000) / 1000;
const sc = () => stage.getBoundingClientRect().width / W;
const ctx = () => (window.__tt && window.__tt.ctx ? window.__tt.ctx() : { step: '', label: '', bg: '' });
const fsOf = o => (o && o.fs) || 1;

let on = false, sels = [], freeze = true, dock = 'right', drag = null, hoverEl = null;
let edits = load(), styled = new Set(), fontStyled = new Set();
const mo = new MutationObserver(recs => {
  if (recs.some(r => (r.type === 'childList' && !layer.contains(r.target)) || styled.has(r.target))) applyAll();
});
const undo = [];
const primary = () => sels[sels.length - 1] || null;

function load() { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch (e) { return []; } }
function save() { try { localStorage.setItem(STORE, JSON.stringify(edits)); } catch (e) {} }
function snap() { undo.push(JSON.stringify(edits)); if (undo.length > 200) undo.shift(); }

/* ---------- geometry (everything in stage px) ---------- */
function box(el) {
  const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect(), k = sc();
  return { x: (r.left - s.left) / k, y: (r.top - s.top) / k, w: r.width / k, h: r.height / k };
}
function union(els) {
  if (!els.length) return null;
  const bs = els.map(box), x = Math.min(...bs.map(b => b.x)), y = Math.min(...bs.map(b => b.y));
  return { x, y, w: Math.max(...bs.map(b => b.x + b.w)) - x, h: Math.max(...bs.map(b => b.y + b.h)) - y };
}
// stage px per local px of the element's parent (e.g. the map is drawn at .55)
function localK(el) {
  const p = el.parentElement;
  if (!p || p === stage || !p.offsetWidth) return 1;
  return box(p).w / p.offsetWidth || 1;
}

/* ---------- identity: a selector that finds the element again after the game redraws it ---------- */
const ATTRS = ['actor', 'v', 'i', 'k', 'go', 'act', 'dir', 'qa', 'l'];
function part(el) {
  if (el.id) return '#' + CSS.escape(el.id);
  let s = el.tagName.toLowerCase();
  if (el.classList[0]) s += '.' + CSS.escape(el.classList[0]);
  const a = ATTRS.find(n => el.dataset && el.dataset[n] !== undefined);
  if (a) s += `[data-${a}="${el.dataset[a].replace(/["\\]/g, '\\$&')}"]`;
  return s;
}
function identify(el) {
  const parts = [];
  let e = el;
  for (; e && e !== stage; e = e.parentElement) { parts.unshift(part(e)); if (e.id) break; }
  if (e === stage) parts.unshift('#stage');
  const s = parts.join(' > ');
  return { sel: s, idx: Math.max(0, [...stage.querySelectorAll(s)].indexOf(el)) };
}
function nameOf(el) {
  if (el.dataset.actor) return `actor "${el.dataset.actor}"`;
  const { sel: s, idx } = identify(el);
  return s.replace(/^#stage > /, '') + (idx ? ` (#${idx + 1})` : '');
}
function sourceOf(el) {
  if (el.dataset.actor) return `actor('${el.dataset.actor}', …) in js/game.js`;
  if (el.id === 'nlExp' || el.closest('#nl')) return 'number line, NL.build() in js/game.js (.stone etc. in css/style.css)';
  if (el.classList.contains('prop')) return `prop('${el.classList[1] || ''}') in SCENES, js/game.js`;
  if (el.closest('#mapView')) return 'map, MapView + MAP data in js/game.js';
  if (el.closest('#demo')) return 'how-to-play demo, runHowTo() in js/game.js';
  const idEl = el.id ? el : el.parentElement && el.parentElement.closest('[id]');
  return idEl ? `#${idEl.id}${el === idEl ? '' : ' (inside)'}: markup in index.html, styles in css/style.css` : '';
}
function cssOf(el) {
  const cs = getComputedStyle(el);
  return { left: cs.left, top: cs.top, width: cs.width, height: cs.height, transform: cs.transform, fontSize: cs.fontSize, inline: el.getAttribute('style') || '' };
}

/* ---------- text inside an element (for font size) ---------- */
// the outermost elements that hold visible text; nested text inherits their size
function textTargets(el) {
  const hasText = t => !(t instanceof SVGElement) && [...t.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
  const all = [el, ...el.querySelectorAll('*')].filter(hasText);
  return all.filter(t => !all.some(a => a !== t && a.contains(t)));
}
const basePx = t => t._edFs !== undefined ? t._edFs : parseFloat(getComputedStyle(t).fontSize);
function elFontPx(el) { const t = textTargets(el)[0]; return t ? basePx(t) : null; }

/* ---------- edits ---------- */
function active(o) {
  const c = ctx();
  return o.scope === 'all' || (o.ctx.bg === c.bg && (o.scope === 'bg' || o.ctx.step === c.step));
}
const find = o => stage.querySelectorAll(o.sel)[o.idx] || null;
function editFor(el, create) {
  const id = identify(el);
  let best = null;
  for (const o of edits) if (o.sel === id.sel && o.idx === id.idx && active(o) && (!best || RANK[o.scope] > RANK[best.scope])) best = o;
  if (best || !create) return best;
  const o = { ...id, name: nameOf(el), scope: 'bg', ctx: ctx(), dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, fs: 1, orig: box(el), source: sourceOf(el), css: cssOf(el) };
  edits.push(o); return o;
}
// Move with the `translate` property. Rotate/scale must act on the element where it is: when the
// game positions it with an inline transform, append them to that transform (re-appended whenever
// the game rewrites it); otherwise use the rotate/scale properties.
function setStyle(el, o) {
  el.style.translate = `${r1(o.dx)}px ${r1(o.dy)}px`;
  const rs = `rotate(${r1(o.rot)}deg) scale(${o.sx.toFixed(4)}, ${o.sy.toFixed(4)})`;
  const cur = el.style.transform, base = el._edFull !== undefined && cur === el._edFull ? el._edBase : cur;
  if (base) {
    el.style.rotate = el.style.scale = '';
    el.style.transform = `${base} ${rs}`;
    el._edBase = base; el._edFull = el.style.transform; o.how = 'transform';
  } else {
    if (el._edFull !== undefined && cur === el._edFull) el.style.transform = '';
    delete el._edBase; delete el._edFull;
    el.style.rotate = `${r1(o.rot)}deg`; el.style.scale = `${o.sx.toFixed(4)} ${o.sy.toFixed(4)}`; o.how = 'props';
  }
  mo.takeRecords();
}
function clearStyle(el) {
  if (el._edFull !== undefined && el.style.transform === el._edFull) el.style.transform = el._edBase;
  delete el._edBase; delete el._edFull;
  el.style.translate = el.style.scale = el.style.rotate = '';
  mo.takeRecords();
}
// font: every text holder inside gets its own original size × o.fs
function setFont(el, o, into) {
  if (fsOf(o) === 1) return;
  const ts = textTargets(el);
  ts.forEach(t => { if (t._edFs === undefined) { t._edFs = parseFloat(getComputedStyle(t).fontSize); t._edPrev = t.style.fontSize; } });
  ts.forEach(t => { t.style.fontSize = `${r3(t._edFs * o.fs)}px`; into.add(t); });
  mo.takeRecords();
}
function clearFont(t) {
  if (t._edFs === undefined) return;
  t.style.fontSize = t._edPrev; delete t._edFs; delete t._edPrev;
  mo.takeRecords();
}
// shift the element so its centre is at (cx, cy)
function centerOn(el, o, cx, cy) {
  const b = box(el), k = localK(el);
  o.dx += (cx - b.x - b.w / 2) / k; o.dy += (cy - b.y - b.h / 2) / k;
  setStyle(el, o);
}
function keepCenter(el, o, change) {
  const a = box(el); change(); setStyle(el, o); centerOn(el, o, a.x + a.w / 2, a.y + a.h / 2);
}
function applyAll() {
  const now = new Set(), fonts = new Set();
  [...edits].sort((a, b) => RANK[a.scope] - RANK[b.scope]).forEach(o => {
    if (!active(o)) return;
    const el = find(o); if (el && !el.closest(AUTO_PLACED)) { setStyle(el, o); setFont(el, o, fonts); now.add(el); }
  });
  styled.forEach(el => { if (!now.has(el)) clearStyle(el); });
  fontStyled.forEach(t => { if (!fonts.has(t)) clearFont(t); });
  styled = now; fontStyled = fonts;
  if (sels.some(el => !el.isConnected)) { sels = sels.filter(el => el.isConnected); paint(); }
}
// make the element's bounding box match t = {x, y, w, h}
function fitTo(el, o, t) {
  let b = box(el);
  if (t.w && b.w > .5) o.sx *= t.w / b.w;
  if (t.h && b.h > .5) o.sy *= t.h / b.h;
  setStyle(el, o); b = box(el);
  const k = localK(el);
  o.dx += (t.x - b.x) / k; o.dy += (t.y - b.y) / k;
  setStyle(el, o);
}
// resize/move the whole selection so its group box becomes g; starts = each element's box when g0 was taken
function fitGroup(g0, g, starts) {
  const fx = g.w / (g0.w || 1), fy = g.h / (g0.h || 1);
  sels.forEach((el, i) => {
    const b = starts[i];
    fitTo(el, editFor(el, true), { x: g.x + (b.x - g0.x) * fx, y: g.y + (b.y - g0.y) * fy, w: b.w * fx, h: b.h * fy });
  });
}
function begin() { snap(); sels.forEach(el => editFor(el, true)); }
function commit() {
  sels.forEach(el => { const o = editFor(el, false); if (o) o.now = box(el); });
  save(); applyAll(); paint();
}

/* ---------- picking ---------- */
function visible(el) {
  for (let e = el; e && e !== stage; e = e.parentElement) {
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < .05) return false;
  }
  return true;
}
// climb to the whole object: an element with an id, an actor, or a direct child of an id'd container
const INLINE = new Set(['SPAN', 'B', 'I', 'EM', 'STRONG', 'SMALL', 'SUB', 'SUP']);
function unit(el) {
  // text pieces (e.g. the equation's numbers) belong to the object that holds them
  while (INLINE.has(el.tagName) && el.parentElement && el.parentElement !== stage) el = el.parentElement;
  while (el.parentElement && el.parentElement !== stage && !el.id && !el.dataset.actor && !el.parentElement.id) el = el.parentElement;
  return el;
}
// the speech bubble and the tutorial place themselves next to whoever is speaking, so the editor leaves them alone
const AUTO_PLACED = '#bubble, #coach';
const pickable = el => !el.closest('#edLayer, #devBtns, ' + AUTO_PLACED) && !(el instanceof SVGElement && el.tagName.toLowerCase() !== 'svg');
function pick(cx, cy, deep) {
  const k = sc(); let best = null, ba = Infinity;
  for (const el of stage.querySelectorAll('*')) {
    if (!pickable(el)) continue;
    const r = el.getBoundingClientRect(), a = r.width * r.height;
    if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) continue;
    if (r.width < 2 || r.height < 2 || a > W * H * k * k * .8 || a >= ba || !visible(el)) continue;
    best = el; ba = a;
  }
  return best && (deep ? best : unit(best));
}
// whole objects fully inside the stage-px rect m (outermost ones only)
function pickInside(m) {
  const found = [];
  for (const el of stage.querySelectorAll('*')) {
    if (!pickable(el) || unit(el) !== el) continue;
    const b = box(el);
    if (b.w < 2 || b.h < 2 || b.w * b.h > W * H * .8) continue;
    if (b.x < m.x || b.y < m.y || b.x + b.w > m.x + m.w || b.y + b.h > m.y + m.h || !visible(el)) continue;
    found.push(el);
  }
  return found.filter(el => !found.some(a => a !== el && a.contains(el)));
}

/* ---------- UI ---------- */
const layer = document.createElement('div'); layer.id = 'edLayer';
layer.innerHTML = `<div id="edHover"></div><div id="edItems"></div><div id="edMarq"></div><div id="edSel"><div class="ed-tag"></div><div class="ed-rot" data-h="rot"></div>${['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map(h => `<div class="ed-h ${h}" data-h="${h}"></div>`).join('')}</div>`;
stage.appendChild(layer);


const num = (f, label, step = 1) => `<label>${label}<input type="number" step="${step}" data-f="${f}"></label>`;
const panel = document.createElement('aside');
panel.id = 'edPanel'; panel.setAttribute('aria-label', 'Layout editor');
panel.innerHTML = `
  <header><div><b>Layout editor</b><small id="edScene"></small></div>
    <span><button id="edDock" title="Move panel to the other side">⇆</button><button id="edClose" title="Close (E)">✕</button></span></header>
  <section id="edSelBox">
    <div class="ed-name" id="edName">Click anything in the game to select it.</div>
    <div class="ed-row"><button data-a="parent">↑ Parent</button><button data-a="child">↓ Child</button></div>
    <div class="ed-grid">${num('x', 'X')}${num('y', 'Y')}${num('w', 'W')}${num('h', 'H')}${num('rot', 'Rotate°')}${num('sx', 'Scale X', .01)}${num('sy', 'Scale Y', .01)}</div>
    <div class="ed-font"><span>Font size</span><button data-a="font-" aria-label="Smaller text">A−</button><input type="number" step="1" min="4" data-f="font" aria-label="Font size in px"><small>px</small><button data-a="font+" aria-label="Bigger text">A+</button></div>
    <div class="ed-row"><button data-a="flipx">⇋ Flip H</button><button data-a="flipy">⇵ Flip V</button><button data-a="reset">Reset</button></div>
    <label class="ed-scope">Applies to <select id="edScope">${Object.entries(SCOPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
  </section>
  <section>
    <div class="ed-row"><b id="edCount"></b><button data-a="undo">Undo</button></div>
    <ul id="edList"></ul>
    <div class="ed-row"><button class="ed-main" data-a="copy">Copy JSON</button><button class="ed-main" data-a="download">Download JSON</button></div>
    <div class="ed-row"><label class="ed-check"><input type="checkbox" id="edFreeze" checked> Freeze animations</label><button data-a="clear">Clear all</button></div>
  </section>
  <p class="ed-tip">Click selects · Shift+click adds/removes · drag on empty space to box-select (Shift adds)<br>
    Drag to move · corner handles resize (Shift: free, Alt: from centre) · top dot rotates (Shift: 15° steps)<br>
    Arrows nudge (Shift ×10) · [ ] font size · H / V flip · Delete resets · Alt+click picks an inner part · ⌘/Ctrl+Z undo · Esc deselects · E closes</p>`;
document.body.appendChild(panel);

function toggle(force) {
  on = force === undefined ? !on : force;
  panel.classList.toggle('on', on); layer.classList.toggle('on', on);
  stage.classList.toggle('ed-freeze', on && freeze);
  if (on) { try { speechSynthesis.cancel(); } catch (e) {} loop(); } else { select(null); hover(null); }
  paint();
}
function select(el) { sels = el ? [el] : []; paint(); }
function setSelection(list) { sels = list; paint(); }
// add an element; drop anything it contains or is contained by so nothing gets edited twice
function addSel(el) { sels = sels.filter(s => !s.contains(el) && !el.contains(s)).concat(el); paint(); }
function removeSel(el) { sels = sels.filter(s => s !== el); paint(); }
function hover(el) { hoverEl = el; }

function place(div, b) {
  if (!b) { div.style.display = 'none'; return; }
  Object.assign(div.style, { display: 'block', left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px` });
}
function draw() {
  const k = sc();
  layer.style.setProperty('--hs', `${12 / k}px`);
  place($('#edHover'), hoverEl && !sels.includes(hoverEl) && hoverEl.isConnected ? box(hoverEl) : null);
  // one thin outline per object when several are selected
  const items = $('#edItems');
  while (items.children.length < (sels.length > 1 ? sels.length : 0)) items.appendChild(document.createElement('div'));
  [...items.children].forEach((d, i) => place(d, sels.length > 1 && sels[i] ? box(sels[i]) : null));
  const b = union(sels);
  place($('#edSel'), b);
  if (b) $('#edSel .ed-tag').textContent = `${sels.length > 1 ? `${sels.length} selected · ` : ''}${r1(b.x)}, ${r1(b.y)} · ${r1(b.w)} × ${r1(b.h)}`;
  place($('#edMarq'), drag && drag.mode === 'marquee' ? drag.rect : null);
}
function loop() { if (!on) return; draw(); requestAnimationFrame(loop); }

function paint() {
  const c = ctx(), el = primary(), n = sels.length;
  $('#edScene').textContent = `${c.label || 'Title screen'} · ${c.bg || 'no background'}`;
  const o = el && editFor(el, false), b = union(sels);
  $('#edName').textContent = !n ? 'Click anything in the game to select it.' : n === 1 ? nameOf(el) : `${n} objects: ${sels.map(nameOf).join(', ')}`;
  $('#edSelBox').classList.toggle('none', !n);
  const vals = n ? { x: b.x, y: b.y, w: b.w, h: b.h, rot: o ? o.rot : 0, sx: o ? o.sx : 1, sy: o ? o.sy : 1 } : {};
  panel.querySelectorAll('.ed-grid [data-f]').forEach(i => {
    i.disabled = !n;
    if (document.activeElement !== i) i.value = n ? (i.dataset.f[0] === 's' ? r3(vals[i.dataset.f]) : r1(vals[i.dataset.f])) : '';
  });
  // font size of the first selected object that has text
  const withText = sels.find(s => textTargets(s).length), fi = $('[data-f="font"]');
  const px = withText ? elFontPx(withText) * fsOf(editFor(withText, false)) : null;
  panel.querySelectorAll('.ed-font button, .ed-font input').forEach(x => { x.disabled = !withText; });
  if (document.activeElement !== fi) fi.value = px ? r1(px) : '';
  fi.placeholder = n && !withText ? 'no text' : '';
  $('#edScope').disabled = !o; $('#edScope').value = o ? o.scope : 'bg';
  $('#edCount').textContent = `${edits.length} change${edits.length === 1 ? '' : 's'}`;
  $('#edList').innerHTML = edits.map((e, i) => `<li class="${active(e) ? 'live' : ''}"><span title="${e.sel}">${e.name}<small>${e.scope === 'all' ? 'everywhere' : e.scope === 'bg' ? e.ctx.bg : e.ctx.label}${fsOf(e) !== 1 ? ` · font ×${r3(e.fs)}` : ''}</small></span><button data-del="${i}" aria-label="Remove change">✕</button></li>`).join('');
  panel.classList.toggle('left', dock === 'left');
}

/* ---------- actions ---------- */
// set every selected object's text so its main text is `px` (or change it by `delta` px)
function setFontPx(px, delta) {
  const list = sels.filter(s => textTargets(s).length);
  if (!list.length) return;
  begin();
  list.forEach(el => {
    const o = editFor(el, true), base = elFontPx(el), cur = base * fsOf(o);
    const want = Math.max(4, delta ? cur + delta : px);
    o.fs = want / base; o.fontBase = r1(base);
    o.fontText = textTargets(el).map(t => t === el ? '(itself)' : part(t)).slice(0, 8);
  });
  commit();
}
function act(a) {
  if (a === 'undo') return doUndo();
  if (a === 'copy') return copy();
  if (a === 'download') return download();
  if (a === 'clear') { if (edits.length && confirm('Remove all layout changes?')) { snap(); edits = []; save(); applyAll(); paint(); } return; }
  const el = primary();
  if (!el) return;
  if (a === 'parent') { if (el.parentElement && el.parentElement !== stage) select(el.parentElement); return; }
  if (a === 'child') { const c = [...el.children].find(e => !(e instanceof SVGElement && e.tagName.toLowerCase() !== 'svg') && visible(e)); if (c) select(c); return; }
  if (a === 'font+' || a === 'font-') return setFontPx(0, a === 'font+' ? 1 : -1);
  if (a === 'reset') {
    const os = sels.map(s => editFor(s, false)).filter(Boolean);
    if (os.length) { snap(); os.forEach(o => edits.splice(edits.indexOf(o), 1)); sels.forEach(clearStyle); save(); applyAll(); paint(); }
    return;
  }
  if (a === 'flipx' || a === 'flipy') {
    // mirror the group: each object flips in place and its centre mirrors across the group's centre
    const g = union(sels), gx = g.x + g.w / 2, gy = g.y + g.h / 2;
    begin();
    sels.forEach(s => {
      const o = editFor(s, true), b = box(s), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      if (a === 'flipx') o.sx *= -1; else o.sy *= -1;
      setStyle(s, o);
      centerOn(s, o, a === 'flipx' ? 2 * gx - cx : cx, a === 'flipy' ? 2 * gy - cy : cy);
    });
    commit();
  }
}
function nudge(x, y) { begin(); sels.forEach(s => { const o = editFor(s, true), k = localK(s); o.dx += x / k; o.dy += y / k; setStyle(s, o); }); commit(); }
function doUndo() {
  if (!undo.length) return;
  edits = JSON.parse(undo.pop()); save(); applyAll(); paint();
}

panel.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'edClose') toggle(false);
  else if (b.id === 'edDock') { dock = dock === 'right' ? 'left' : 'right'; paint(); }
  else if (b.dataset.del !== undefined) { snap(); const [o] = edits.splice(+b.dataset.del, 1); const el = find(o); if (el) clearStyle(el); save(); applyAll(); paint(); }
  else if (b.dataset.a) act(b.dataset.a);
});
panel.addEventListener('change', e => {
  const i = e.target;
  if (i.id === 'edFreeze') { freeze = i.checked; stage.classList.toggle('ed-freeze', on && freeze); return; }
  if (i.id === 'edScope') {
    const os = sels.map(s => editFor(s, false)).filter(Boolean);
    if (os.length) { snap(); os.forEach(o => { o.scope = i.value; o.ctx = ctx(); }); save(); applyAll(); paint(); }
    return;
  }
  const f = i.dataset.f, v = parseFloat(i.value);
  if (!sels.length || !f || !isFinite(v)) return;
  i.blur();
  if (f === 'font') return setFontPx(v);
  begin();
  if (f === 'rot') sels.forEach(s => { const o = editFor(s, true); keepCenter(s, o, () => { o.rot = v; }); });
  else if (f === 'sx' || f === 'sy') { if (v !== 0) sels.forEach(s => { const o = editFor(s, true); keepCenter(s, o, () => { o[f] = v; }); }); }
  else { const g = union(sels), t = { ...g }; t[f] = f === 'w' || f === 'h' ? Math.max(1, v) : v; fitGroup(g, t, sels.map(box)); }
  commit();
});

/* ---------- pointer: select, box-select, move, resize, rotate ---------- */
const toStage = e => { const s = stage.getBoundingClientRect(), k = sc(); return { x: (e.clientX - s.left) / k, y: (e.clientY - s.top) / k }; };
layer.addEventListener('pointerdown', e => {
  e.preventDefault(); e.stopPropagation();
  const p = toStage(e), h = e.target.dataset.h;
  let toggleOff = null, solo = null;
  if (!h) {
    const el = pick(e.clientX, e.clientY, e.altKey);
    if (!el) {
      if (!e.shiftKey) select(null);
      drag = { mode: 'marquee', p, add: e.shiftKey, base: sels.slice(), rect: { x: p.x, y: p.y, w: 0, h: 0 }, started: false };
      try { layer.setPointerCapture(e.pointerId); } catch (err) {}
      return;
    }
    if (e.shiftKey) { if (sels.includes(el)) toggleOff = el; else addSel(el); }
    else if (!sels.includes(el)) select(el);
    else if (sels.length > 1) solo = el; // a click without dragging narrows the selection to this one
  }
  if (!sels.length) return;
  drag = { mode: h ? (h === 'rot' ? 'rot' : 'size') : 'move', h, p, g: union(sels), toggleOff, solo, started: false,
    starts: sels.map(s => { const o = editFor(s, false); return { b: box(s), dx: o ? o.dx : 0, dy: o ? o.dy : 0, rot: o ? o.rot : 0, k: localK(s) }; }) };
  try { layer.setPointerCapture(e.pointerId); } catch (err) {}
});
layer.addEventListener('pointermove', e => {
  if (!drag) { if (on) hover(pick(e.clientX, e.clientY, e.altKey)); return; }
  const p = toStage(e); let dx = p.x - drag.p.x, dy = p.y - drag.p.y;
  if (drag.mode === 'marquee') {
    drag.rect = { x: Math.min(p.x, drag.p.x), y: Math.min(p.y, drag.p.y), w: Math.abs(dx), h: Math.abs(dy) };
    if (drag.rect.w > 3 || drag.rect.h > 3) {
      const inside = pickInside(drag.rect);
      setSelection(drag.add ? drag.base.filter(s => !inside.some(n => n.contains(s) || s.contains(n))).concat(inside) : inside);
    }
    return;
  }
  if (!drag.started) { if (Math.hypot(dx, dy) < 2) return; drag.started = true; begin(); }
  const g = drag.g;
  if (drag.mode === 'move') {
    if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
    sels.forEach((s, i) => { const o = editFor(s, true), st = drag.starts[i]; o.dx = st.dx + dx / st.k; o.dy = st.dy + dy / st.k; setStyle(s, o); });
  } else if (drag.mode === 'rot') {
    // the group turns around its centre: each object rotates and its centre orbits
    const cx = g.x + g.w / 2, cy = g.y + g.h / 2;
    let da = (Math.atan2(p.y - cy, p.x - cx) - Math.atan2(drag.p.y - cy, drag.p.x - cx)) * 180 / Math.PI;
    const r0 = drag.starts[sels.length - 1].rot;
    if (e.shiftKey) da = Math.round((r0 + da) / 15) * 15 - r0;
    const rad = da * Math.PI / 180, cos = Math.cos(rad), sin = Math.sin(rad);
    sels.forEach((s, i) => {
      const o = editFor(s, true), st = drag.starts[i], bx = st.b.x + st.b.w / 2 - cx, by = st.b.y + st.b.h / 2 - cy;
      o.rot = st.rot + da; setStyle(s, o);
      centerOn(s, o, cx + bx * cos - by * sin, cy + bx * sin + by * cos);
    });
  } else {
    const h = drag.h, corner = h.length === 2, mul = e.altKey ? 2 : 1;
    let w = g.w, hh = g.h;
    if (h.includes('e')) w = g.w + dx * mul;
    if (h.includes('w')) w = g.w - dx * mul;
    if (h.includes('s')) hh = g.h + dy * mul;
    if (h.includes('n')) hh = g.h - dy * mul;
    if (corner && !e.shiftKey) { const f = Math.abs(dx) > Math.abs(dy) ? w / g.w : hh / g.h; w = g.w * f; hh = g.h * f; }
    w = Math.max(4, w); hh = Math.max(4, hh);
    const x = e.altKey ? g.x + (g.w - w) / 2 : h.includes('w') ? g.x + g.w - w : g.x;
    const y = e.altKey ? g.y + (g.h - hh) / 2 : h.includes('n') ? g.y + g.h - hh : g.y;
    fitGroup(g, { x, y, w, h: hh }, drag.starts.map(st => st.b));
  }
  paint();
});
const endDrag = () => {
  if (drag) {
    if (drag.mode === 'marquee') { drag = null; paint(); return; }
    if (drag.started) commit();
    else if (drag.toggleOff) removeSel(drag.toggleOff);
    else if (drag.solo) select(drag.solo);
  }
  drag = null;
};
layer.addEventListener('pointerup', endDrag);
layer.addEventListener('pointercancel', endDrag);
layer.addEventListener('click', e => e.stopPropagation());
layer.addEventListener('pointerleave', () => { if (!drag) hover(null); });

/* ---------- keyboard (the game never sees keys while editing) ---------- */
addEventListener('keydown', e => {
  const typing = e.target.closest && e.target.closest('input, select, textarea');
  const plain = !e.metaKey && !e.ctrlKey && !e.altKey;
  if (!on) {
    if (!typing && plain && (e.key === 'e' || e.key === 'E')) { e.preventDefault(); e.stopImmediatePropagation(); toggle(true); }
    return;
  }
  e.stopImmediatePropagation();
  if (typing) { if (e.key === 'Escape') e.target.blur(); return; }
  const k = e.key, n = e.shiftKey ? 10 : 1;
  if ((e.metaKey || e.ctrlKey) && (k === 'z' || k === 'Z')) { e.preventDefault(); doUndo(); return; }
  if (!plain) return;
  if (k === 'e' || k === 'E') { e.preventDefault(); toggle(false); return; }
  if (k === 'Escape') { e.preventDefault(); if (sels.length) select(null); else toggle(false); return; }
  if (!sels.length) return;
  const moves = { ArrowLeft: [-n, 0], ArrowRight: [n, 0], ArrowUp: [0, -n], ArrowDown: [0, n] };
  if (moves[k]) { e.preventDefault(); nudge(...moves[k]); }
  else if (k === 'h' || k === 'H') act('flipx');
  else if (k === 'v' || k === 'V') act('flipy');
  else if (k === '[' || k === '{') { e.preventDefault(); setFontPx(0, -n); }
  else if (k === ']' || k === '}') { e.preventDefault(); setFontPx(0, n); }
  else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); act('reset'); }
}, true);

/* ---------- JSON export ---------- */
const rbox = b => b && { x: r1(b.x), y: r1(b.y), width: r1(b.w), height: r1(b.h), centerX: r1(b.x + b.w / 2), centerY: r1(b.y + b.h / 2) };
function exportJSON() {
  edits.forEach(o => { if (active(o)) { const el = find(o); if (el) o.now = box(el); } });
  return JSON.stringify({
    game: 'Treasure Tunnel',
    exported: new Date().toISOString(),
    stage: { width: W, height: H, units: 'All x, y, width, height are stage pixels in the 1280×720 design space. x/y is the top-left of the bounding box.' },
    howToApply: 'Goal: make each element\'s bounding box match "edited" (it was "original") in the scene given by "appliesTo". The editor moved it with the CSS translate property (px, in its parent\'s space) and rotated/scaled it in place about its transform-origin (a negative scale means flipped): appended to the element\'s own transform when "method" is "transform", or as the CSS rotate/scale properties when "method" is "properties". When "fontSize" is present, the text inside was resized: set the listed text elements\' font-size from "fromPx" to "toPx" (other text inside scales by the same "scale"). To make a change permanent, change the position/size where "source" says the element is created, or apply the "css" there.',
    changes: edits.map(o => ({
      element: o.name,
      selector: o.sel, index: o.idx,
      source: o.source,
      appliesTo: o.scope === 'all' ? 'everywhere' : o.scope === 'bg' ? `every step with background "${o.ctx.bg}"` : `only step "${o.ctx.label}" (${o.ctx.step}), background "${o.ctx.bg}"`,
      scene: o.ctx,
      original: rbox(o.orig),
      edited: rbox(o.now || o.orig),
      transform: { translateX: r1(o.dx), translateY: r1(o.dy), rotate: r1(o.rot), scaleX: r3(Math.abs(o.sx)), scaleY: r3(Math.abs(o.sy)), flipX: o.sx < 0, flipY: o.sy < 0 },
      ...(fsOf(o) !== 1 ? { fontSize: { fromPx: o.fontBase, toPx: r1(o.fontBase * o.fs), scale: r3(o.fs), text: o.fontText } } : {}),
      method: o.how === 'transform' ? 'transform' : 'properties',
      css: o.how === 'transform'
        ? `translate: ${r1(o.dx)}px ${r1(o.dy)}px; and append to its transform: rotate(${r1(o.rot)}deg) scale(${r3(o.sx)}, ${r3(o.sy)})`
        : `translate: ${r1(o.dx)}px ${r1(o.dy)}px; rotate: ${r1(o.rot)}deg; scale: ${r3(o.sx)} ${r3(o.sy)};`,
      originalCss: o.css,
    })),
  }, null, 2);
}
function note(text) {
  const t = $('#edCount'), old = t.textContent; t.textContent = text;
  setTimeout(() => { if (t.textContent === text) t.textContent = old; }, 1600);
}
function copy() {
  const text = exportJSON();
  const fallback = () => {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); note('Copied!'); } catch (e) { note('Copy failed'); }
    ta.remove();
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => note('Copied!'), fallback);
  else fallback();
}
function download() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([exportJSON()], { type: 'application/json' }));
  a.download = 'treasure-tunnel-layout.json'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  note('Downloaded');
}

/* ---------- keep edits applied while the game redraws ---------- */
let lastCtx = '';
// runs before the next paint, so a redrawn or moved object never flashes without its edit
mo.observe(stage, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
setInterval(() => {
  const c = JSON.stringify(ctx());
  if (c !== lastCtx) { lastCtx = c; applyAll(); if (on) paint(); }
}, 400);
applyAll();
window.__ttEditor = { toggle, exportJSON };
})();
