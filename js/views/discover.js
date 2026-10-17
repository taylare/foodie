import * as store from '../store.js';
import { html, on, sheet, toast, haptic } from '../ui.js';
import { mealdbSearch, mealdbRandom, mealdbByCategory, mealdbLookup, MEALDB_CATEGORIES } from '../importers.js';
import { planRecipe } from '../pickers.js';

// Keep results while hopping between tabs
const ui = { q: '', cat: '', results: null, title: '' };

export default function discover(el) {
  el.innerHTML = String(html`
    <header class="page-head">
      <div><h1>Discover</h1><p class="eyebrow">Free recipes from TheMealDB</p></div>
      <button class="icon-btn" data-random aria-label="Random recipes">🎲</button>
    </header>
    <form class="sticky-tools" data-search>
      <input class="input search" type="search" name="q" placeholder="Search e.g. lasagne, curry, tacos…" value="${ui.q}" enterkeyhint="search" />
      <div class="chip-row">
        ${MEALDB_CATEGORIES.map(c => html`<button type="button" class="chip ${ui.cat === c ? 'on' : ''}" data-cat="${c}">${c}</button>`)}
      </div>
    </form>
    <div data-results></div>
  `);

  const out = el.querySelector('[data-results]');
  const savedIds = () => new Set(store.get().recipes.map(r => r.extId).filter(Boolean));

  const draw = () => {
    if (!ui.results) { out.innerHTML = '<div class="loading">Finding tasty things…</div>'; return; }
    if (!ui.results.length) {
      out.innerHTML = String(html`<div class="empty"><div class="empty-emoji">🥲</div><h3>No recipes found</h3><p>Try another word – searches work best with one dish name.</p></div>`);
      return;
    }
    const saved = savedIds();
    out.innerHTML = String(html`
      ${ui.title ? html`<h2 class="section-title">${ui.title}</h2>` : ''}
      <div class="recipe-grid">
        ${ui.results.map((r, i) => html`
          <article class="recipe-card">
            <button class="card-link" data-open="${i}" aria-label="${r.title}"></button>
            <div class="rc-img"><img src="${r.image ? r.image + '/preview' : ''}" alt="" loading="lazy" /></div>
            ${saved.has(r.extId) ? html`<span class="saved-badge">✓ Saved</span>` : ''}
            <div class="rc-body"><h3>${r.title}</h3>${r.tags ? html`<p class="rc-meta">${r.tags.slice(0, 2).join(' · ')}</p>` : ''}</div>
          </article>`)}
      </div>`);
  };

  const run = async (fn, title) => {
    if (!navigator.onLine) {
      out.innerHTML = String(html`<div class="empty"><div class="empty-emoji">📡</div><h3>You’re offline</h3><p>Discover needs the internet. Your own recipes still work offline.</p></div>`);
      return;
    }
    ui.results = null; ui.title = title;
    draw();
    try { ui.results = await fn(); }
    catch (e) { ui.results = []; toast('Couldn’t reach the recipe service'); }
    draw();
  };

  const form = el.querySelector('[data-search]');
  form.addEventListener('submit', e => {
    e.preventDefault();
    ui.q = form.q.value.trim();
    ui.cat = '';
    el.querySelectorAll('[data-cat]').forEach(c => c.classList.remove('on'));
    form.q.blur();
    if (ui.q) run(() => mealdbSearch(ui.q), `Results for “${ui.q}”`);
  });
  on(el, 'click', '[data-cat]', (e, b) => {
    ui.cat = ui.cat === b.dataset.cat ? '' : b.dataset.cat;
    el.querySelectorAll('[data-cat]').forEach(c => c.classList.toggle('on', c.dataset.cat === ui.cat));
    if (ui.cat) run(() => mealdbByCategory(ui.cat), ui.cat);
    else run(() => mealdbRandom(8), 'Inspiration');
  });
  on(el, 'click', '[data-random]', () => { haptic(); ui.cat = ''; run(() => mealdbRandom(8), 'Inspiration'); });
  on(el, 'click', '[data-open]', async (e, b) => {
    let r = ui.results[Number(b.dataset.open)];
    if (r.partial) {
      try { r = await mealdbLookup(r.extId); ui.results[Number(b.dataset.open)] = r; }
      catch (err) { return toast('Couldn’t load that recipe'); }
    }
    preview(r, draw);
  });

  if (ui.results) draw();
  else run(() => mealdbRandom(8), 'Inspiration');

  return store.subscribe(() => { if (ui.results) draw(); });
}

function preview(r, redraw) {
  const existing = store.get().recipes.find(x => x.extId && x.extId === r.extId);
  const sh = sheet(String(html`
    <img class="preview-img" src="${r.image}" alt="" />
    <div class="tag-row mt-s">${(r.tags || []).slice(0, 5).map(t => html`<span class="pill soft">${t}</span>`)}</div>
    <h3 class="mt-s">Ingredients <small class="muted">(${r.ingredients.length})</small></h3>
    <ul class="ing-list compact">${r.ingredients.map(i => html`<li>${i}</li>`)}</ul>
    <h3>Method</h3>
    <ol class="steps compact">${r.steps.map(s => html`<li><p>${s}</p></li>`)}</ol>
    <div class="sheet-actions">
      ${existing
        ? html`<a class="btn primary grow" href="#/recipe/${existing.id}">Open my copy</a>`
        : html`<button class="btn ghost" data-plan>Save & plan</button><button class="btn primary grow" data-save>♡ Save to my recipes</button>`}
    </div>`), { title: r.title, className: 'tall' });

  const save = () => {
    const saved = store.saveRecipe({ ...r, id: store.uid(), createdAt: Date.now() });
    haptic(15);
    redraw();
    return saved;
  };
  sh.el.querySelector('[data-save]')?.addEventListener('click', () => {
    const saved = save();
    sh.close();
    toast('Saved to your recipes', { action: 'Open', onAction: () => { location.hash = '#/recipe/' + saved.id; } });
  });
  sh.el.querySelector('[data-plan]')?.addEventListener('click', () => {
    const saved = save();
    sh.close();
    setTimeout(() => planRecipe(saved), 280);
  });
}
