import * as store from '../store.js';
import { html, on, thumb, sheet, minutesLabel, haptic } from '../ui.js';

// Remember the filter between visits
const ui = { q: '', filter: 'all', sort: 'recent' };

const SORTS = {
  recent: (a, b) => b.createdAt - a.createdAt,
  az: (a, b) => a.title.localeCompare(b.title),
  rating: (a, b) => (b.rating - a.rating) || (b.cookedCount - a.cookedCount),
  quick: (a, b) => ((a.prepMin + a.cookMin) || 999) - ((b.prepMin + b.cookMin) || 999),
  cooked: (a, b) => b.cookedCount - a.cookedCount
};

export default function recipes(el, params, query) {
  if (query.get('fav')) ui.filter = 'fav';
  if (query.get('tag')) ui.filter = 'tag:' + query.get('tag');

  el.innerHTML = String(html`
    <header class="page-head">
      <div><h1>Recipes</h1><p class="eyebrow" data-count></p></div>
      <select class="sort" data-sort aria-label="Sort">
        <option value="recent">Newest</option>
        <option value="az">A–Z</option>
        <option value="rating">Top rated</option>
        <option value="quick">Quickest</option>
        <option value="cooked">Most cooked</option>
      </select>
    </header>
    <div class="sticky-tools">
      <input class="input search" type="search" placeholder="Search recipes, ingredients, tags…" data-q value="${ui.q}" />
      <div class="chip-row" data-chips></div>
    </div>
    <div class="recipe-grid" data-grid></div>
    <button class="fab" data-add aria-label="Add recipe">＋</button>
  `);

  const grid = el.querySelector('[data-grid]');
  const chips = el.querySelector('[data-chips]');
  el.querySelector('[data-sort]').value = ui.sort;

  const drawChips = () => {
    const s = store.get();
    const cats = [...new Set(s.recipes.map(r => r.category).filter(Boolean))].sort();
    const tags = Object.entries(s.recipes.flatMap(r => r.tags).reduce((m, t) => (m[t.toLowerCase()] = (m[t.toLowerCase()] || 0) + 1, m), {}))
      .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);
    const list = [['all', 'All'], ['fav', '♥ Favourites'], ...cats.map(c => ['cat:' + c, c]), ...tags.map(t => ['tag:' + t, '#' + t])];
    if (!list.some(([k]) => k === ui.filter)) ui.filter = 'all';
    chips.innerHTML = String(html`${list.map(([k, label]) => html`<button class="chip ${ui.filter === k ? 'on' : ''}" data-f="${k}">${label}</button>`)}`);
  };

  const drawGrid = () => {
    const s = store.get();
    const q = ui.q.toLowerCase().trim();
    let list = s.recipes.filter(r => {
      if (ui.filter === 'fav' && !r.favorite) return false;
      if (ui.filter.startsWith('cat:') && r.category !== ui.filter.slice(4)) return false;
      if (ui.filter.startsWith('tag:') && !r.tags.some(t => t.toLowerCase() === ui.filter.slice(4))) return false;
      if (q) {
        const hay = [r.title, r.category, r.notes, ...r.tags, ...r.ingredients].join(' ').toLowerCase();
        return q.split(/\s+/).every(w => hay.includes(w));
      }
      return true;
    });
    list.sort(SORTS[ui.sort]);
    el.querySelector('[data-count]').textContent = `${list.length} of ${s.recipes.length}`;

    if (!s.recipes.length) {
      grid.innerHTML = String(html`
        <div class="empty">
          <div class="empty-emoji">📖</div>
          <h3>Your cookbook is empty</h3>
          <p>Tap ＋ to write one, paste one, or grab ideas from Discover.</p>
          <a class="btn primary" href="#/discover">Browse Discover</a>
        </div>`);
      return;
    }
    if (!list.length) {
      grid.innerHTML = String(html`<div class="empty"><div class="empty-emoji">🔍</div><h3>No matches</h3><p>Try a different word or filter.</p></div>`);
      return;
    }
    grid.innerHTML = String(html`${list.map(r => {
      const time = minutesLabel(r.prepMin + r.cookMin);
      return html`
        <article class="recipe-card">
          <a href="#/recipe/${r.id}" class="card-link" aria-label="${r.title}"></a>
          <div class="rc-img">${thumb(r)}</div>
          <button class="fav-btn ${r.favorite ? 'on' : ''}" data-fav="${r.id}" aria-label="Favourite">${r.favorite ? '♥' : '♡'}</button>
          <div class="rc-body">
            <h3>${r.title}</h3>
            <p class="rc-meta">${[time && '⏱ ' + time, r.rating ? '★ ' + r.rating : '', r.category].filter(Boolean).join(' · ')}</p>
          </div>
        </article>`;
    })}`);
  };

  drawChips();
  drawGrid();

  el.querySelector('[data-q]').addEventListener('input', e => { ui.q = e.target.value; drawGrid(); });
  el.querySelector('[data-sort]').addEventListener('change', e => { ui.sort = e.target.value; drawGrid(); });
  on(chips, 'click', '[data-f]', (e, b) => { ui.filter = b.dataset.f; drawChips(); drawGrid(); });
  on(grid, 'click', '[data-fav]', (e, b) => {
    e.preventDefault();
    haptic();
    store.update(s => { const r = s.recipes.find(x => x.id === b.dataset.fav); r.favorite = !r.favorite; });
  });
  on(el, 'click', '[data-add]', () => addSheet());

  const unsub = store.subscribe(() => { drawChips(); drawGrid(); });
  return unsub;
}

export function addSheet() {
  sheet(String(html`
    <div class="stack">
      <a class="option" href="#/edit/new"><span class="big-emoji">✍️</span><span><b>Write it myself</b><small>Start with a blank recipe</small></span></a>
      <a class="option" href="#/edit/new?mode=paste"><span class="big-emoji">📋</span><span><b>Paste a recipe</b><small>Copy text from a website or note and we’ll sort it out</small></span></a>
      <a class="option" href="#/edit/new?mode=url"><span class="big-emoji">🔗</span><span><b>Import from a link</b><small>Works with most recipe websites – no key needed</small></span></a>
      <a class="option" href="#/discover"><span class="big-emoji">✨</span><span><b>Find something new</b><small>Browse thousands of free recipes</small></span></a>
    </div>`), { title: 'Add a recipe' });
}
