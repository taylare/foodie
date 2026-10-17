import * as store from '../store.js';
import { MEALS } from '../store.js';
import { html, on, thumb, sheet, toast, confirmSheet, iso, fromIso, addDays, weekStartOf, DAY_SHORT, DAY_LONG, MONTH_SHORT, MEAL_META, haptic, shareText } from '../ui.js';
import { pickRecipe } from '../pickers.js';
import { addLines, planLines } from '../shoplist.js';

const MEAL_CAT = { breakfast: ['Breakfast', 'Baking'], lunch: ['Lunch', 'Side'], dinner: ['Dinner'], snack: ['Snack', 'Dessert', 'Baking'] };

export default function planner(el, [startParam]) {
  const settings = store.get().settings;
  let start = startParam ? weekStartOf(fromIso(startParam), settings.weekStart) : weekStartOf(new Date(), settings.weekStart);

  const draw = () => {
    const s = store.get();
    const meals = MEALS.filter(m => m !== 'snack' || s.settings.showSnack);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const todayIso = iso(new Date());
    const end = days[6];
    const thisWeek = iso(weekStartOf(new Date(), s.settings.weekStart)) === iso(start);
    const count = days.reduce((n, d) => n + Object.keys(s.plan[iso(d)] || {}).length, 0);
    const label = start.getMonth() === end.getMonth()
      ? `${start.getDate()}–${end.getDate()} ${MONTH_SHORT[end.getMonth()]}`
      : `${start.getDate()} ${MONTH_SHORT[start.getMonth()]} – ${end.getDate()} ${MONTH_SHORT[end.getMonth()]}`;

    el.innerHTML = String(html`
      <header class="page-head">
        <div><h1>Meal plan</h1><p class="eyebrow">${count} of ${meals.length * 7} meals planned</p></div>
        <button class="icon-btn" data-menu aria-label="Plan options">⋯</button>
      </header>

      <div class="week-nav card">
        <button class="icon-btn" data-week="-1" aria-label="Previous week">‹</button>
        <div class="grow center">
          <b>${label}</b>
          ${thisWeek ? html`<small class="muted">This week</small>` : html`<button class="link-btn small" data-week="0">Jump to this week</button>`}
        </div>
        <button class="icon-btn" data-week="1" aria-label="Next week">›</button>
      </div>

      <div class="plan-actions">
        <button class="btn ghost small" data-autofill>✨ Fill gaps</button>
        <button class="btn ghost small" data-shop>🛒 Make list</button>
      </div>

      <div class="days">
        ${days.map(d => {
          const key = iso(d);
          const day = s.plan[key] || {};
          const isToday = key === todayIso;
          return html`
            <section class="day card ${isToday ? 'today' : ''}" id="d-${key}">
              <header class="day-head">
                <div><b>${DAY_LONG[d.getDay()]}</b> <span class="muted">${d.getDate()} ${MONTH_SHORT[d.getMonth()]}</span></div>
                ${isToday ? html`<span class="pill">Today</span>` : ''}
              </header>
              <div class="slots">
                ${meals.map(m => slotHtml(key, m, day[m]))}
              </div>
            </section>`;
        })}
      </div>
    `);
  };

  const slotHtml = (date, meal, v) => {
    const meta = MEAL_META[meal];
    if (!v) return html`<button class="slot vacant" data-slot="${date}|${meal}"><span>${meta.icon}</span><small>${meta.label}</small><b>＋</b></button>`;
    if (v.note) return html`<button class="slot note" data-slot="${date}|${meal}"><span>${meta.icon}</span><small>${meta.label}</small><b>${v.note}</b></button>`;
    const r = store.recipeById(v.recipeId);
    if (!r) return html`<button class="slot vacant" data-slot="${date}|${meal}"><span>${meta.icon}</span><small>${meta.label}</small><b>＋</b></button>`;
    return html`
      <button class="slot filled" data-slot="${date}|${meal}">
        ${thumb(r, 'slot-thumb')}
        <span class="slot-txt"><small>${meta.label}${v.servings && v.servings !== r.servings ? ' · ' + v.servings + ' srv' : ''}</small><b>${r.title}</b></span>
      </button>`;
  };

  draw();
  // Scroll today into view on the current week
  requestAnimationFrame(() => {
    const t = el.querySelector('.day.today');
    if (t && !startParam) t.scrollIntoView({ block: 'center' });
  });

  on(el, 'click', '[data-week]', (e, b) => {
    const d = Number(b.dataset.week);
    start = d === 0 ? weekStartOf(new Date(), store.get().settings.weekStart) : addDays(start, d * 7);
    history.replaceState(null, '', '#/plan/' + iso(start));
    haptic();
    draw();
    window.scrollTo({ top: 0 });
  });

  on(el, 'click', '[data-slot]', (e, b) => {
    const [date, meal] = b.dataset.slot.split('|');
    const v = (store.get().plan[date] || {})[meal];
    if (!v) return choose(date, meal);
    slotMenu(date, meal, v);
  });

  const choose = (date, meal) => {
    const d = fromIso(date);
    pickRecipe({
      meal, title: `${DAY_LONG[d.getDay()]} · ${MEAL_META[meal].label}`,
      onPick: v => {
        store.setSlot(date, meal, v.recipeId ? { recipeId: v.recipeId, servings: store.recipeById(v.recipeId).servings } : v);
      }
    });
  };

  const slotMenu = (date, meal, v) => {
    const d = fromIso(date);
    const r = v.recipeId && store.recipeById(v.recipeId);
    let servings = v.servings || (r && r.servings) || 1;
    const sh = sheet(String(html`
      ${r ? html`
        <a class="pick-row" href="#/recipe/${r.id}?servings=${servings}">${thumb(r, 'pick-thumb')}<span class="grow"><b>${r.title}</b><small class="muted">Open recipe</small></span><span>→</span></a>
        <div class="row between mt">
          <span class="label">Servings</span>
          <div class="stepper small">
            <button type="button" data-d="-1">−</button><output data-serv>${servings}</output><button type="button" data-d="1">+</button>
          </div>
        </div>` : html`<p class="big-note">${v.note}</p>`}
      <div class="menu mt">
        ${r ? html`<a href="#/cook/${r.id}?servings=${servings}">👩‍🍳 Start cooking</a>` : ''}
        <button data-a="swap">🔁 Swap for something else</button>
        <button data-a="move">📅 Move to another day</button>
        <button data-a="remove" class="danger-text">🗑️ Remove from plan</button>
      </div>`), { title: `${DAY_LONG[d.getDay()]} · ${MEAL_META[meal].label}` });

    on(sh.el, 'click', '[data-d]', (e, b) => {
      servings = Math.max(1, servings + Number(b.dataset.d));
      sh.el.querySelector('[data-serv]').textContent = servings;
      store.setSlot(date, meal, { ...v, servings });
    });
    on(sh.el, 'click', '[data-a]', (e, b) => {
      const a = b.dataset.a;
      if (a === 'remove') {
        store.setSlot(date, meal, null);
        sh.close();
        toast('Removed', { action: 'Undo', onAction: () => store.setSlot(date, meal, v) });
      } else if (a === 'swap') {
        sh.close();
        setTimeout(() => choose(date, meal), 260);
      } else if (a === 'move') {
        sh.close();
        setTimeout(() => moveSheet(date, meal, { ...v, servings }), 260);
      }
    });
  };

  const moveSheet = (date, meal, v) => {
    const s = store.get();
    const meals = MEALS.filter(m => m !== 'snack' || s.settings.showSnack);
    const days = Array.from({ length: 14 }, (_, i) => addDays(start, i));
    const sh = sheet(String(html`
      <div class="move-grid">
        ${days.map(d => html`
          <div class="move-day"><b>${DAY_SHORT[d.getDay()]} ${d.getDate()}</b>
            <div class="row gap-s wrap">${meals.map(m => {
              const k = iso(d);
              const taken = (s.plan[k] || {})[m];
              const same = k === date && m === meal;
              return html`<button class="chip ${taken ? 'taken' : ''}" ${same ? 'disabled' : ''} data-to="${k}|${m}" title="${MEAL_META[m].label}">${MEAL_META[m].icon}</button>`;
            })}</div>
          </div>`)}
      </div>
      <p class="muted small mt-s">Moving onto a meal that’s already planned swaps them.</p>`), { title: 'Move to…' });
    on(sh.el, 'click', '[data-to]', (e, b) => {
      const [d2, m2] = b.dataset.to.split('|');
      const other = (store.get().plan[d2] || {})[m2] || null;
      store.update(st => {
        const a = (st.plan[date] ||= {});
        const c = (st.plan[d2] ||= {});
        c[m2] = v;
        if (other) a[meal] = other; else delete a[meal];
        if (!Object.keys(a).length) delete st.plan[date];
      });
      sh.close();
      haptic(15);
    });
  };

  on(el, 'click', '[data-autofill]', () => {
    const s = store.get();
    if (!s.recipes.length) return toast('Add some recipes first');
    const meals = MEALS.filter(m => m !== 'snack');
    const used = new Set();
    let filled = 0;
    const before = JSON.parse(JSON.stringify(s.plan));
    store.update(st => {
      for (let i = 0; i < 7; i++) {
        const key = iso(addDays(start, i));
        if (key < iso(new Date())) continue; // don't fill the past
        const day = (st.plan[key] ||= {});
        for (const m of meals) {
          if (day[m]) continue;
          let pool = st.recipes.filter(r => MEAL_CAT[m].includes(r.category));
          if (!pool.length && m !== 'breakfast') pool = st.recipes.filter(r => !['Breakfast', 'Dessert', 'Drink', 'Snack'].includes(r.category));
          if (!pool.length) continue;
          const fresh = pool.filter(r => !used.has(r.id));
          const choices = (fresh.length ? fresh : pool).flatMap(r => Array(1 + (r.favorite ? 2 : 0) + (r.rating || 0)).fill(r));
          const pick = choices[Math.floor(Math.random() * choices.length)];
          used.add(pick.id);
          day[m] = { recipeId: pick.id, servings: pick.servings };
          filled++;
        }
        if (!Object.keys(day).length) delete st.plan[key];
      }
    });
    if (filled) toast(`Filled ${filled} meal${filled === 1 ? '' : 's'}`, { action: 'Undo', onAction: () => store.update(st => { st.plan = before; }) });
    else toast('No gaps to fill (tip: set categories on recipes)');
  });

  on(el, 'click', '[data-shop]', () => {
    const lines = planLines(start, 7);
    if (!lines.length) return toast('Plan some recipes first');
    const { added, total } = addLines(lines);
    haptic(15);
    toast(`${total} ingredients · ${added} new on your list`, { action: 'View', onAction: () => { location.hash = '#/shop'; } });
  });

  on(el, 'click', '[data-menu]', () => {
    const sh = sheet(String(html`
      <div class="menu">
        <button data-m="copy">📋 Copy last week into this week</button>
        <button data-m="repeat">🔁 Repeat this week next week</button>
        <button data-m="share">📤 Share this week’s plan</button>
        <button data-m="clear" class="danger-text">🧹 Clear this week</button>
      </div>`), { title: 'This week' });
    on(sh.el, 'click', '[data-m]', async (e, b) => {
      const m = b.dataset.m;
      sh.close();
      const copyWeek = (from, to) => {
        const before = JSON.parse(JSON.stringify(store.get().plan));
        let n = 0;
        store.update(st => {
          for (let i = 0; i < 7; i++) {
            const src = st.plan[iso(addDays(from, i))];
            if (!src) continue;
            const dst = (st.plan[iso(addDays(to, i))] ||= {});
            Object.entries(src).forEach(([meal, v]) => { if (!dst[meal]) { dst[meal] = { ...v }; n++; } });
          }
        });
        toast(n ? `Copied ${n} meal${n === 1 ? '' : 's'}` : 'Nothing to copy', n ? { action: 'Undo', onAction: () => store.update(st => { st.plan = before; }) } : {});
      };
      if (m === 'copy') copyWeek(addDays(start, -7), start);
      if (m === 'repeat') { copyWeek(start, addDays(start, 7)); }
      if (m === 'share') {
        const s = store.get();
        const lines = [];
        for (let i = 0; i < 7; i++) {
          const d = addDays(start, i);
          const day = s.plan[iso(d)];
          if (!day) continue;
          lines.push(`\n${DAY_LONG[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`);
          MEALS.forEach(meal => {
            const v = day[meal];
            if (!v) return;
            const r = v.recipeId && store.recipeById(v.recipeId);
            lines.push(`  ${MEAL_META[meal].icon} ${MEAL_META[meal].label}: ${r ? r.title : v.note}`);
          });
        }
        shareText('Meal plan', '🗓️ Our meal plan' + (lines.length ? lines.join('\n') : '\n(nothing planned yet)'));
      }
      if (m === 'clear') {
        if (!(await confirmSheet('Every meal planned for this week will be removed.', { ok: 'Clear week', danger: true, title: 'Clear this week?' }))) return;
        const before = JSON.parse(JSON.stringify(store.get().plan));
        store.update(st => { for (let i = 0; i < 7; i++) delete st.plan[iso(addDays(start, i))]; });
        toast('Week cleared', { action: 'Undo', onAction: () => store.update(st => { st.plan = before; }) });
      }
    });
  });

  return store.subscribe(() => {
    const y = window.scrollY;
    draw();
    window.scrollTo(0, y);
  });
}
