import * as store from '../store.js';
import { MEALS } from '../store.js';
import { html, on, thumb, iso, addDays, weekStartOf, DAY_LONG, MONTH_SHORT, MEAL_META, toast } from '../ui.js';
import { pickRecipe, surprise } from '../pickers.js';
import { install } from '../platform.js';
import { SAMPLES } from '../samples.js';

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Late-night snack?' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function today(el) {
  const draw = () => {
    const s = store.get();
    const now = new Date();
    const todayIso = iso(now);
    const meals = MEALS.filter(m => m !== 'snack' || s.settings.showSnack);
    const plan = s.plan[todayIso] || {};
    const tomorrow = s.plan[iso(addDays(now, 1))] || {};
    const ws = weekStartOf(now, s.settings.weekStart);
    let plannedWeek = 0;
    for (let i = 0; i < 7; i++) plannedWeek += Object.keys(s.plan[iso(addDays(ws, i))] || {}).length;
    const toBuy = s.shopping.filter(i => !i.checked).length;
    const favs = s.recipes.filter(r => r.favorite);
    const recent = [...s.recipes].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);
    const showInstall = !install.standalone && !s.settings.installDismissed;
    const name = s.settings.name ? ', ' + s.settings.name : '';

    const slot = m => {
      const v = plan[m];
      const meta = MEAL_META[m];
      if (!v) return html`
        <button class="meal-row vacant" data-plan="${m}">
          <span class="meal-ico">${meta.icon}</span>
          <span class="grow"><small>${meta.label}</small><b>Nothing planned</b></span>
          <span class="add-dot">＋</span>
        </button>`;
      if (v.note) return html`
        <button class="meal-row" data-plan="${m}">
          <span class="meal-ico">${meta.icon}</span>
          <span class="grow"><small>${meta.label}</small><b>${v.note}</b></span>
        </button>`;
      const r = store.recipeById(v.recipeId);
      if (!r) return '';
      return html`
        <div class="meal-row">
          <a class="meal-link" href="#/recipe/${r.id}?servings=${v.servings || r.servings}">
            ${thumb(r, 'meal-thumb')}
            <span class="grow"><small>${meta.label}</small><b>${r.title}</b></span>
          </a>
          <a class="btn small primary" href="#/cook/${r.id}?servings=${v.servings || r.servings}">Cook</a>
        </div>`;
    };

    const tomorrowList = meals.filter(m => tomorrow[m]).map(m => {
      const v = tomorrow[m];
      const r = v.recipeId && store.recipeById(v.recipeId);
      return html`<li><span>${MEAL_META[m].icon}</span> ${r ? r.title : v.note}</li>`;
    });

    el.innerHTML = String(html`
      <header class="page-head">
        <div>
          <p class="eyebrow">${DAY_LONG[now.getDay()]} ${now.getDate()} ${MONTH_SHORT[now.getMonth()]}</p>
          <h1>${greeting()}${name} 👋</h1>
        </div>
        <a class="icon-btn" href="#/settings" aria-label="Settings">⚙️</a>
      </header>

      ${showInstall ? html`
        <section class="card install-card">
          <div class="row gap">
            <img src="icons/icon-192.png" alt="" width="52" height="52" class="install-ico" />
            <div class="grow">
              <h3>Put Foodie on your home screen</h3>
              ${install.ios
                ? html`<p class="small">Tap <b>Share</b> <span class="ios-share">⬆︎</span> in Safari, then <b>Add to Home Screen</b>.</p>`
                : html`<p class="small">It opens full-screen and works offline, like a real app.</p>`}
            </div>
          </div>
          <div class="row gap mt-s">
            ${install.prompt ? html`<button class="btn primary grow" data-install>Install app</button>` : ''}
            <button class="btn ghost ${install.prompt ? '' : 'grow'}" data-dismiss-install>Not now</button>
          </div>
        </section>` : ''}

      ${!s.recipes.length ? html`
        <section class="card welcome">
          <h2>Welcome to Foodie 🍓</h2>
          <p>Save your recipes, plan the week and get a shopping list that writes itself. Everything stays on this phone.</p>
          <div class="stack mt">
            <a class="btn primary block" href="#/edit/new">✍️ Add my first recipe</a>
            <a class="btn ghost block" href="#/discover">✨ Find recipes in Discover</a>
            <button class="btn ghost block" data-samples>🧺 Load 4 sample recipes</button>
          </div>
        </section>` : ''}

      <section class="section">
        <div class="section-head">
          <h2>Today’s menu</h2>
          <a href="#/plan" class="link">Week →</a>
        </div>
        <div class="card list-card">${meals.map(slot)}</div>
        ${tomorrowList.length ? html`
          <div class="tomorrow"><b>Tomorrow:</b><ul>${tomorrowList}</ul></div>` : ''}
      </section>

      <section class="stats">
        <a href="#/recipes" class="stat" style="--c:var(--pink)"><b>${s.recipes.length}</b><span>recipes</span></a>
        <a href="#/plan" class="stat" style="--c:var(--blue)"><b>${plannedWeek}</b><span>meals this week</span></a>
        <a href="#/shop" class="stat" style="--c:var(--green)"><b>${toBuy}</b><span>to buy</span></a>
      </section>

      ${s.recipes.length ? html`
        <button class="card surprise-btn" data-surprise>
          <span class="big-emoji">🎲</span>
          <span class="grow"><b>What should I cook?</b><small>Spin for a random pick from your recipes</small></span>
          <span>→</span>
        </button>` : ''}

      ${favs.length ? html`
        <section class="section">
          <div class="section-head"><h2>Favourites</h2><a class="link" href="#/recipes?fav=1">All →</a></div>
          <div class="h-scroll">${favs.slice(0, 10).map(miniCard)}</div>
        </section>` : ''}

      ${recent.length ? html`
        <section class="section">
          <div class="section-head"><h2>Recently added</h2><a class="link" href="#/recipes">All →</a></div>
          <div class="h-scroll">${recent.map(miniCard)}</div>
        </section>` : ''}
    `);
  };

  draw();
  on(el, 'click', '[data-plan]', (e, b) => {
    const meal = b.dataset.plan;
    pickRecipe({
      meal, title: `Today’s ${MEAL_META[meal].label.toLowerCase()}`,
      onPick: v => store.setSlot(iso(new Date()), meal, v.recipeId ? { recipeId: v.recipeId, servings: store.recipeById(v.recipeId).servings } : v)
    });
  });
  on(el, 'click', '[data-surprise]', () => surprise());
  on(el, 'click', '[data-install]', async () => { if (await install.run()) draw(); });
  on(el, 'click', '[data-dismiss-install]', () => store.update(s => { s.settings.installDismissed = true; }));
  on(el, 'click', '[data-samples]', () => {
    SAMPLES.forEach(r => store.saveRecipe({ ...r }));
    toast('Added 4 sample recipes');
  });
  const onInstallable = () => draw();
  window.addEventListener('foodie:installable', onInstallable);
  const unsub = store.subscribe(draw);
  return () => { unsub(); window.removeEventListener('foodie:installable', onInstallable); };
}

function miniCard(r) {
  return html`
    <a class="mini-card" href="#/recipe/${r.id}">
      ${thumb(r, 'mini-img')}
      <b>${r.title}</b>
    </a>`;
}
