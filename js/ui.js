// Small DOM helpers shared by every view.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ESC[c]);

class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = s => new Raw(s);

// Tagged template that escapes interpolations. Arrays are joined; raw() is trusted.
export function html(strings, ...values) {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < values.length) out += render(values[i]);
  });
  return raw(out);
}
function render(v) {
  if (v == null || v === false) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(render).join('');
  return esc(v);
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Delegate events: on(el, 'click', '[data-act=save]', fn)
export function on(root, type, selector, fn) {
  root.addEventListener(type, e => {
    const t = e.target.closest(selector);
    if (t && root.contains(t)) fn(e, t);
  });
}

export function haptic(ms = 10) {
  try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* ignore */ }
}

// ---------- toast ----------
export function toast(message, { action, onAction, duration = 3200 } = {}) {
  const host = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${esc(message)}</span>${action ? `<button type="button">${esc(action)}</button>` : ''}`;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  const close = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); };
  if (action) el.querySelector('button').addEventListener('click', () => { onAction && onAction(); close(); });
  setTimeout(close, duration);
}

// ---------- bottom sheet ----------
export function sheet(content, { title = '', className = '' } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `
    <div class="sheet-backdrop"></div>
    <section class="sheet ${className}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="sheet-grip"></div>
      ${title ? `<header class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Close">✕</button></header>` : ''}
      <div class="sheet-body">${content}</div>
    </section>`;
  document.body.appendChild(wrap);
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => wrap.classList.add('open'));

  const panel = wrap.querySelector('.sheet');
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    wrap.classList.remove('open');
    document.body.classList.remove('no-scroll');
    window.removeEventListener('hashchange', close);
    setTimeout(() => wrap.remove(), 260);
  };
  wrap.querySelector('.sheet-backdrop').addEventListener('click', close);
  on(wrap, 'click', '[data-close]', close);
  window.addEventListener('hashchange', close);
  wrap.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  // Drag the grip down to dismiss
  let startY = null;
  const grip = wrap.querySelector('.sheet-grip');
  const head = wrap.querySelector('.sheet-head');
  [grip, head].filter(Boolean).forEach(h => {
    h.addEventListener('touchstart', e => { startY = e.touches[0].clientY; panel.style.transition = 'none'; }, { passive: true });
    h.addEventListener('touchmove', e => {
      if (startY == null) return;
      const dy = Math.max(0, e.touches[0].clientY - startY);
      panel.style.transform = `translateY(${dy}px)`;
    }, { passive: true });
    h.addEventListener('touchend', e => {
      if (startY == null) return;
      const dy = e.changedTouches[0].clientY - startY;
      panel.style.transition = ''; panel.style.transform = '';
      startY = null;
      if (dy > 90) close();
    });
  });

  const focusable = panel.querySelector('[autofocus]');
  if (focusable) setTimeout(() => focusable.focus(), 280);
  return { el: panel, close };
}

export function confirmSheet(message, { ok = 'Yes', danger = false, title = 'Are you sure?' } = {}) {
  return new Promise(resolve => {
    let answered = false;
    const s = sheet(`
      <p class="muted">${esc(message)}</p>
      <div class="row gap mt">
        <button class="btn ghost grow" data-no>Cancel</button>
        <button class="btn ${danger ? 'danger' : 'primary'} grow" data-yes>${esc(ok)}</button>
      </div>`, { title });
    s.el.querySelector('[data-yes]').addEventListener('click', () => { answered = true; resolve(true); s.close(); });
    s.el.querySelector('[data-no]').addEventListener('click', () => { answered = true; resolve(false); s.close(); });
    const obs = new MutationObserver(() => { if (!document.body.contains(s.el)) { obs.disconnect(); if (!answered) resolve(false); } });
    obs.observe(document.body, { childList: true });
  });
}

// ---------- images ----------
// Shrink a photo from the camera to a small JPEG data URL so it fits in the JSON.
export function resizeImage(file, max = 900, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image')); };
    img.src = url;
  });
}

// ---------- dates ----------
export const pad = n => String(n).padStart(2, '0');
export const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export function weekStartOf(d, weekStart = 1) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (x.getDay() - weekStart + 7) % 7;
  return addDays(x, -diff);
}
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function minutesLabel(min) {
  if (!min) return '';
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h}h${m ? ' ' + m + 'm' : ''}` : `${m} min`;
}

export const MEAL_META = {
  breakfast: { label: 'Breakfast', icon: '🥞' },
  lunch: { label: 'Lunch', icon: '🥪' },
  dinner: { label: 'Dinner', icon: '🍝' },
  snack: { label: 'Snack', icon: '🍪' }
};

// Placeholder thumbnail: a pastel tile with an emoji that matches the category
const CAT_EMOJI = { breakfast: '🥞', lunch: '🥗', dinner: '🍲', dessert: '🍰', snack: '🍿', side: '🥖', drink: '🥤', baking: '🧁' };
const TINTS = ['#ffd6e8', '#fff1b8', '#d4ecff', '#dff7d8', '#eadcff', '#ffe0cc'];
export function thumb(recipe, cls = '') {
  if (recipe.image) return html`<img class="${cls}" src="${recipe.image}" alt="" loading="lazy" decoding="async" />`;
  const emoji = CAT_EMOJI[(recipe.category || '').toLowerCase()] || '🍽️';
  const tint = TINTS[[...recipe.id].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];
  return html`<div class="${cls} ph" style="--tint:${tint}"><span>${emoji}</span></div>`;
}

export function stars(rating, interactive = false) {
  let s = '';
  for (let i = 1; i <= 5; i++) {
    const on = i <= rating ? ' on' : '';
    s += interactive
      ? `<button type="button" class="star${on}" data-rate="${i}" aria-label="${i} star${i > 1 ? 's' : ''}">★</button>`
      : `<span class="star${on}">★</span>`;
  }
  return raw(`<span class="stars">${s}</span>`);
}

export function downloadFile(name, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export async function shareText(title, text) {
  if (navigator.share) {
    try { await navigator.share({ title, text }); return true; }
    catch (e) { if (e.name === 'AbortError') return true; }
  }
  try { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); return true; }
  catch (e) { toast('Sharing isn’t available here'); return false; }
}
