// Full-screen, step-by-step cook mode with timers and screen wake lock.
import * as store from '../store.js';
import { html, esc, raw, on, sheet, toast, haptic } from '../ui.js';
import { scaleLine, findTimers } from '../ingredients.js';
import { keepAwake, alarm, primeAudio } from '../platform.js';

// Timers survive moving between steps (and screens) while the app is open
const timers = new Map(); // id -> { label, end, total, done }
let tickHandle = null;

function fmt(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
}

export default function cook(el, [id], query) {
  const r = store.recipeById(id);
  if (!r) { location.hash = '#/recipes'; return; }
  const servings = Number(query.get('servings')) || r.servings;
  const factor = servings / (r.servings || 1);
  const steps = r.steps.length ? r.steps : ['No steps written yet – just enjoy!'];
  let i = 0;

  if (store.get().settings.keepAwake) keepAwake(true);

  el.className = 'cook-view';
  const render = () => {
    const step = steps[i];
    const found = findTimers(step);
    // Highlight times in the step text and make them tappable
    let text = esc(step);
    found.forEach((t, n) => {
      text = text.replace(esc(t.label), `<button class="time-chip" data-timer="${n}">⏱ ${esc(t.label)}</button>`);
    });

    el.innerHTML = String(html`
      <header class="cook-head">
        <button class="icon-btn" data-exit aria-label="Close cook mode">✕</button>
        <div class="grow center"><small class="muted">${r.title}</small><b>Step ${i + 1} of ${steps.length}</b></div>
        <button class="icon-btn" data-ings aria-label="Ingredients">🧺</button>
      </header>
      <div class="progress"><span style="width:${((i + 1) / steps.length) * 100}%"></span></div>

      <div class="cook-step" data-swipe>
        <div class="step-num">${i + 1}</div>
        <p class="step-text">${raw(text)}</p>
        ${found.length ? html`<p class="muted small center">Tap a time to start a timer</p>` : ''}
      </div>

      <div class="timer-dock" data-dock></div>

      <footer class="cook-foot">
        <button class="btn ghost" data-prev ${i === 0 ? 'disabled' : ''}>← Back</button>
        ${i < steps.length - 1
          ? html`<button class="btn primary grow" data-next>Next step →</button>`
          : html`<button class="btn primary grow" data-finish>🎉 All done!</button>`}
      </footer>
    `);
    el._found = found;
    renderDock();
  };

  const renderDock = () => {
    const dock = el.querySelector('[data-dock]');
    if (!dock) return;
    const now = Date.now();
    dock.innerHTML = [...timers.entries()].map(([tid, t]) => {
      const left = (t.end - now) / 1000;
      return `<div class="timer ${t.done ? 'done' : ''}">
        <span class="t-label">${esc(t.label)}</span>
        <b class="t-time">${t.done ? 'Done!' : fmt(left)}</b>
        <button class="icon-btn small" data-cancel="${tid}" aria-label="Dismiss timer">✕</button>
      </div>`;
    }).join('');
  };

  const tick = () => {
    const now = Date.now();
    timers.forEach(t => {
      if (!t.done && t.end <= now) { t.done = true; alarm(t.label); toast('⏰ ' + t.label + ' – done!', { duration: 8000 }); }
    });
    renderDock();
  };
  clearInterval(tickHandle);
  tickHandle = setInterval(tick, 500);

  const go = d => {
    const n = Math.min(steps.length - 1, Math.max(0, i + d));
    if (n !== i) { i = n; haptic(); render(); }
  };

  render();

  on(el, 'click', '[data-next]', () => go(1));
  on(el, 'click', '[data-prev]', () => go(-1));
  on(el, 'click', '[data-exit]', () => exit());
  on(el, 'click', '[data-finish]', () => {
    store.update(() => { r.cookedCount++; r.lastCooked = Date.now(); });
    toast('Logged as cooked – enjoy! 😋');
    exit();
  });
  on(el, 'click', '[data-timer]', (e, b) => {
    primeAudio();
    const t = el._found[Number(b.dataset.timer)];
    const tid = store.uid();
    timers.set(tid, { label: `Step ${i + 1}: ${t.label}`, end: Date.now() + t.seconds * 1000, total: t.seconds, done: false });
    haptic(15);
    renderDock();
  });
  on(el, 'click', '[data-cancel]', (e, b) => { timers.delete(b.dataset.cancel); renderDock(); });
  on(el, 'click', '[data-ings]', () => {
    sheet(String(html`<ul class="ing-list">${r.ingredients.map(l => /:$/.test(l)
      ? html`<li class="ing-head">${l.replace(/:$/, '')}</li>`
      : html`<li><label class="check"><input type="checkbox" /><span>${scaleLine(l, factor).text}</span></label></li>`)}</ul>`),
    { title: `Ingredients · ${servings} servings` });
  });

  // Swipe left/right between steps
  let x0 = null, y0 = null;
  el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchend', e => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
    x0 = null;
  });
  const onKey = e => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); if (e.key === 'Escape') exit(); };
  document.addEventListener('keydown', onKey);

  function exit() {
    location.hash = '#/recipe/' + r.id + (servings !== r.servings ? '?servings=' + servings : '');
  }

  return () => {
    document.removeEventListener('keydown', onKey);
    keepAwake(false);
    // keep running timers alive only if there are any pending
    if (![...timers.values()].some(t => !t.done)) { clearInterval(tickHandle); timers.clear(); }
    else {
      clearInterval(tickHandle);
      tickHandle = setInterval(() => {
        const now = Date.now();
        timers.forEach(t => { if (!t.done && t.end <= now) { t.done = true; alarm(t.label); toast('⏰ ' + t.label + ' – done!', { duration: 8000 }); } });
        if (![...timers.values()].some(t => !t.done)) { clearInterval(tickHandle); timers.clear(); }
      }, 1000);
    }
  };
}
