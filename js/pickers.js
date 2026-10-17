// Reusable bottom-sheet pickers.
import * as store from './store.js';
import { MEALS } from './store.js';
import { sheet, html, esc, on, thumb, toast, iso, addDays, fromIso, weekStartOf, DAY_SHORT, MONTH_SHORT, MEAL_META, haptic } from './ui.js';

const MEAL_CAT = { breakfast: ['breakfast', 'baking'], lunch: ['lunch', 'side'], dinner: ['dinner'], snack: ['snack', 'dessert', 'baking', 'drink'] };

// Pick a recipe (or write a note) for a meal slot.
export function pickRecipe({ meal, title = 'Choose a recipe', onPick }) {
  const s = store.get();
  const prefer = MEAL_CAT[meal] || [];
  const sorted = [...s.recipes].sort((a, b) => {
    const score = r => (prefer.includes((r.category || '').toLowerCase()) ? 4 : 0) + (r.favorite ? 2 : 0) + (r.rating || 0) / 5;
    return score(b) - score(a) || a.title.localeCompare(b.title);
  });

  const row = r => html`
    <button class="pick-row" data-id="${r.id}">
      ${thumb(r, 'pick-thumb')}
      <span class="grow">
        <b>${r.title}</b>
        <small class="muted">${[r.category, r.favorite ? '♥ favourite' : ''].filter(Boolean).join(' · ')}</small>
      </span>
    </button>`;

  const body = html`
    <input class="input" type="search" placeholder="Search recipes…" data-q autofocus />
    <div class="chip-row mt-s">
      <button class="chip" data-note="Leftovers">🍱 Leftovers</button>
      <button class="chip" data-note="Eating out">🍽️ Eating out</button>
      <button class="chip" data-note="Takeaway">🥡 Takeaway</button>
      <button class="chip" data-custom>✏️ Note…</button>
    </div>
    <div class="pick-list mt-s" data-list>
      ${sorted.length ? sorted.map(row) : html`<p class="empty-mini">No recipes yet. <a href="#/edit/new">Add one</a> or grab some from <a href="#/discover">Discover</a>.</p>`}
    </div>`;

  const sh = sheet(String(body), { title });
  const list = sh.el.querySelector('[data-list]');
  sh.el.querySelector('[data-q]').addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    list.querySelectorAll('.pick-row').forEach(b => {
      const r = store.recipeById(b.dataset.id);
      const hay = (r.title + ' ' + r.tags.join(' ') + ' ' + r.category + ' ' + r.ingredients.join(' ')).toLowerCase();
      b.hidden = q && !hay.includes(q);
    });
  });
  on(sh.el, 'click', '.pick-row', (e, b) => { haptic(); onPick({ recipeId: b.dataset.id }); sh.close(); });
  on(sh.el, 'click', '[data-note]', (e, b) => { onPick({ note: b.dataset.note }); sh.close(); });
  on(sh.el, 'click', '[data-custom]', () => {
    const note = prompt('Note for this meal');
    if (note && note.trim()) { onPick({ note: note.trim() }); sh.close(); }
  });
  return sh;
}

// Choose a day + meal to plan a recipe into.
export function planRecipe(recipe) {
  const s = store.get();
  const meals = MEALS.filter(m => m !== 'snack' || s.settings.showSnack);
  const start = new Date();
  const days = Array.from({ length: 14 }, (_, i) => addDays(start, i));
  const defaultMeal = ({ breakfast: 'breakfast', lunch: 'lunch', snack: 'snack', dessert: 'snack' })[(recipe.category || '').toLowerCase()] || 'dinner';

  const body = html`
    <p class="label">Day</p>
    <div class="day-scroll" data-days>
      ${days.map((d, i) => html`
        <button class="day-pill ${i === 0 ? 'on' : ''}" data-date="${iso(d)}">
          <small>${i === 0 ? 'Today' : i === 1 ? 'Tmrw' : DAY_SHORT[d.getDay()]}</small>
          <b>${d.getDate()}</b>
          <small>${MONTH_SHORT[d.getMonth()]}</small>
        </button>`)}
    </div>
    <p class="label mt">Meal</p>
    <div class="seg" data-meals>
      ${meals.map(m => html`<button class="${m === defaultMeal ? 'on' : ''}" data-meal="${m}">${MEAL_META[m].icon} ${MEAL_META[m].label}</button>`)}
    </div>
    <p class="label mt">Servings</p>
    <div class="stepper" data-stepper>
      <button type="button" data-d="-1" aria-label="Fewer">−</button>
      <output data-serv>${recipe.servings}</output>
      <button type="button" data-d="1" aria-label="More">+</button>
    </div>
    <p class="muted small mt-s" data-warn></p>
    <button class="btn primary block mt" data-save>Add to plan</button>`;

  const sh = sheet(String(body), { title: 'Add to meal plan' });
  let date = iso(days[0]), meal = defaultMeal, servings = recipe.servings;
  const warn = () => {
    const cur = (store.get().plan[date] || {})[meal];
    const w = sh.el.querySelector('[data-warn]');
    if (cur) {
      const r = cur.recipeId && store.recipeById(cur.recipeId);
      w.textContent = `This will replace ${r ? r.title : cur.note || 'what’s planned'}.`;
    } else w.textContent = '';
  };
  warn();
  on(sh.el, 'click', '[data-date]', (e, b) => {
    sh.el.querySelectorAll('[data-date]').forEach(x => x.classList.toggle('on', x === b));
    date = b.dataset.date; warn();
  });
  on(sh.el, 'click', '[data-meal]', (e, b) => {
    sh.el.querySelectorAll('[data-meal]').forEach(x => x.classList.toggle('on', x === b));
    meal = b.dataset.meal; warn();
  });
  on(sh.el, 'click', '[data-d]', (e, b) => {
    servings = Math.max(1, servings + Number(b.dataset.d));
    sh.el.querySelector('[data-serv]').textContent = servings;
  });
  sh.el.querySelector('[data-save]').addEventListener('click', () => {
    store.setSlot(date, meal, { recipeId: recipe.id, servings });
    sh.close();
    haptic(15);
    const d = fromIso(date);
    const ws = iso(weekStartOf(d, store.get().settings.weekStart));
    toast(`Planned for ${DAY_SHORT[d.getDay()]} ${MEAL_META[meal].label.toLowerCase()}`, {
      action: 'View', onAction: () => { location.hash = '#/plan/' + ws; }
    });
  });
}

// A "what should I cook?" roulette
export function surprise() {
  const all = store.get().recipes;
  if (!all.length) { toast('Add some recipes first'); return; }
  const pool = all.flatMap(r => Array(1 + (r.favorite ? 2 : 0) + Math.round(r.rating || 0)).fill(r));
  let last = null;
  const pick = () => {
    let r;
    do { r = pool[Math.floor(Math.random() * pool.length)]; } while (all.length > 1 && r === last);
    last = r;
    return r;
  };
  const card = r => String(html`
    <a class="surprise-card" href="#/recipe/${r.id}">
      ${thumb(r, 'surprise-img')}
      <h3>${r.title}</h3>
      <p class="muted">${[r.category, r.prepMin + r.cookMin ? (r.prepMin + r.cookMin) + ' min' : ''].filter(Boolean).join(' · ')}</p>
    </a>`);
  const sh = sheet(`<div data-card>${card(pick())}</div>
    <div class="row gap mt"><button class="btn ghost grow" data-again>🎲 Spin again</button><button class="btn primary grow" data-plan>Plan it</button></div>`,
  { title: 'Tonight you could cook…' });
  sh.el.querySelector('[data-again]').addEventListener('click', () => {
    haptic();
    const c = sh.el.querySelector('[data-card]');
    c.classList.remove('spin'); void c.offsetWidth; c.classList.add('spin');
    c.innerHTML = card(pick());
  });
  sh.el.querySelector('[data-plan]').addEventListener('click', () => { sh.close(); setTimeout(() => planRecipe(last), 280); });
}
