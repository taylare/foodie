import * as store from '../store.js';
import { html, on, sheet, toast, confirmSheet, shareText, haptic, weekStartOf, addDays } from '../ui.js';
import { AISLES, itemText, formatQty, unitLabel, guessAisle } from '../ingredients.js';
import { addManual, addLines, planLines, listAsText } from '../shoplist.js';

const ui = { group: 'aisle' }; // aisle | recipe

export default function shopping(el) {
  el.innerHTML = String(html`
    <header class="page-head">
      <div><h1>Shopping</h1><p class="eyebrow" data-sum></p></div>
      <button class="icon-btn" data-menu aria-label="List options">⋯</button>
    </header>
    <form class="add-item" data-add>
      <input class="input" name="item" placeholder="Add an item… e.g. 2 L milk" autocomplete="off" enterkeyhint="done" />
      <button class="btn primary" aria-label="Add">＋</button>
    </form>
    <div class="seg small mt-s" data-group>
      <button data-g="aisle">By aisle</button>
      <button data-g="recipe">By recipe</button>
    </div>
    <div data-list></div>
  `);

  const list = el.querySelector('[data-list]');

  const itemHtml = i => html`
    <li class="shop-item ${i.checked ? 'checked' : ''}" data-id="${i.id}">
      <button class="tick" data-tick="${i.id}" aria-label="${i.checked ? 'Uncheck' : 'Check'} ${i.name}">${i.checked ? '✓' : ''}</button>
      <button class="shop-txt" data-edit="${i.id}">
        <span>${itemText(i)}</span>
        ${i.sources && i.sources.length && ui.group === 'aisle' ? html`<small>${i.sources.join(', ')}</small>` : ''}
      </button>
    </li>`;

  const draw = () => {
    const s = store.get();
    const items = s.shopping;
    const open = items.filter(i => !i.checked);
    const done = items.filter(i => i.checked);
    el.querySelector('[data-sum]').textContent = items.length ? `${open.length} to get · ${done.length} in the trolley` : 'Nothing on the list';
    el.querySelectorAll('[data-g]').forEach(b => b.classList.toggle('on', b.dataset.g === ui.group));

    if (!items.length) {
      list.innerHTML = String(html`
        <div class="empty">
          <div class="empty-emoji">🛒</div>
          <h3>Your list is empty</h3>
          <p>Add items above, or build the list from this week’s meal plan.</p>
          <button class="btn primary" data-from-plan>🗓️ Add from this week’s plan</button>
        </div>`);
      return;
    }

    let groups;
    if (ui.group === 'aisle') {
      groups = AISLES.map(a => ({ title: `${a.icon} ${a.label}`, items: open.filter(i => (i.aisle || 'other') === a.key) }));
    } else {
      const by = new Map();
      open.forEach(i => {
        const keys = i.sources && i.sources.length ? i.sources : ['Added by you'];
        const k = keys[0];
        if (!by.has(k)) by.set(k, []);
        by.get(k).push(i);
      });
      groups = [...by.entries()].map(([title, items]) => ({ title: title === 'Added by you' ? '✍️ ' + title : '🍽️ ' + title, items }));
    }
    groups = groups.filter(g => g.items.length);
    groups.forEach(g => g.items.sort((a, b) => a.name.localeCompare(b.name)));

    list.innerHTML = String(html`
      ${open.length ? '' : html`<div class="all-done card"><span class="big-emoji">🎉</span><b>All done!</b><small>Everything’s in the trolley.</small></div>`}
      ${groups.map(g => html`
        <section class="aisle">
          <h3>${g.title} <small>${g.items.length}</small></h3>
          <ul class="card shop-list">${g.items.map(itemHtml)}</ul>
        </section>`)}
      ${done.length ? html`
        <section class="aisle done-group">
          <div class="row between"><h3>In the trolley <small>${done.length}</small></h3><button class="link-btn" data-clear-done>Clear</button></div>
          <ul class="card shop-list">${done.map(itemHtml)}</ul>
        </section>` : ''}
    `);
  };

  draw();

  const form = el.querySelector('[data-add]');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = form.item.value.trim();
    if (!v) return;
    // allow "milk, eggs, bread" in one go
    v.split(/\s*[,;]\s*|\n/).filter(Boolean).forEach(addManual);
    form.item.value = '';
    haptic();
  });

  on(el, 'click', '[data-g]', (e, b) => { ui.group = b.dataset.g; draw(); });
  on(el, 'click', '[data-tick]', (e, b) => {
    haptic(8);
    const li = b.closest('.shop-item');
    li.classList.add('ticking');
    setTimeout(() => store.update(s => { const i = s.shopping.find(x => x.id === b.dataset.tick); if (i) i.checked = !i.checked; }), 180);
  });
  on(el, 'click', '[data-edit]', (e, b) => editItem(b.dataset.edit));
  on(el, 'click', '[data-clear-done]', () => clearDone());
  on(el, 'click', '[data-from-plan]', () => fromPlan());

  const fromPlan = () => {
    const start = weekStartOf(new Date(), store.get().settings.weekStart);
    const lines = planLines(start, 7);
    if (!lines.length) return toast('Nothing planned this week yet');
    const { added } = addLines(lines);
    toast(`Added ${added} item${added === 1 ? '' : 's'} from your plan`);
  };

  const clearDone = () => {
    const before = store.get().shopping.slice();
    store.update(s => { s.shopping = s.shopping.filter(i => !i.checked); });
    toast('Cleared', { action: 'Undo', onAction: () => store.update(s => { s.shopping = before; }) });
  };

  on(el, 'click', '[data-menu]', () => {
    const sh = sheet(String(html`
      <div class="menu">
        <button data-m="plan">🗓️ Add this week’s plan</button>
        <button data-m="next">⏭️ Add next week’s plan</button>
        <button data-m="share">📤 Share / copy list</button>
        <button data-m="uncheck">↩️ Uncheck everything</button>
        <button data-m="done">✅ Clear checked items</button>
        <button data-m="all" class="danger-text">🗑️ Clear whole list</button>
      </div>
      <p class="muted small mt">Staples like salt & pepper are skipped – change them in <a href="#/settings">Settings</a>.</p>`), { title: 'Shopping list' });
    on(sh.el, 'click', '[data-m]', async (e, b) => {
      const m = b.dataset.m;
      sh.close();
      if (m === 'plan') fromPlan();
      if (m === 'next') {
        const start = addDays(weekStartOf(new Date(), store.get().settings.weekStart), 7);
        const lines = planLines(start, 7);
        if (!lines.length) return toast('Nothing planned next week yet');
        const { added } = addLines(lines);
        toast(`Added ${added} item${added === 1 ? '' : 's'} from next week`);
      }
      if (m === 'share') shareText('Shopping list', listAsText());
      if (m === 'uncheck') store.update(s => s.shopping.forEach(i => { i.checked = false; }));
      if (m === 'done') clearDone();
      if (m === 'all') {
        if (!(await confirmSheet('Everything on your shopping list will be removed.', { ok: 'Clear list', danger: true, title: 'Clear the list?' }))) return;
        const before = store.get().shopping.slice();
        store.update(s => { s.shopping = []; });
        toast('List cleared', { action: 'Undo', onAction: () => store.update(s => { s.shopping = before; }) });
      }
    });
  });

  return store.subscribe(draw);
}

function editItem(id) {
  const item = store.get().shopping.find(i => i.id === id);
  if (!item) return;
  const sh = sheet(String(html`
    <form data-f class="stack">
      <label class="field"><span>Item</span><input class="input" name="name" value="${item.name}" /></label>
      <div class="grid-2">
        <label class="field"><span>Amount</span><input class="input" name="qty" inputmode="decimal" value="${item.qty != null ? formatQty(item.qty, item.unit) : ''}" placeholder="—" /></label>
        <label class="field"><span>Unit</span><input class="input" name="unit" value="${item.unit ? unitLabel(item.unit, item.qty) : ''}" placeholder="e.g. g, cups" /></label>
      </div>
      <label class="field"><span>Aisle</span>
        <select class="input" name="aisle">${AISLES.map(a => html`<option value="${a.key}" ${a.key === (item.aisle || 'other') ? 'selected' : ''}>${a.icon} ${a.label}</option>`)}</select>
      </label>
      ${item.sources && item.sources.length ? html`<p class="muted small">For: ${item.sources.join(', ')}</p>` : ''}
      <div class="row gap">
        <button type="button" class="btn ghost danger-text" data-del>Delete</button>
        <button class="btn primary grow">Save</button>
      </div>
    </form>`), { title: 'Edit item' });
  const f = sh.el.querySelector('[data-f]');
  f.addEventListener('submit', e => {
    e.preventDefault();
    const qtyStr = f.qty.value.trim();
    let qty = null;
    if (qtyStr) {
      const map = { '½': .5, '¼': .25, '¾': .75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': .125 };
      qty = qtyStr.split(/\s+/).reduce((t, p) => {
        const u = [...p].find(ch => map[ch]);
        let v = 0;
        if (u) { v += map[u]; p = p.replace(u, ''); }
        if (p.includes('/')) { const [a, b] = p.split('/').map(Number); v += b ? a / b : 0; } else v += Number(p.replace(',', '.')) || 0;
        return t + v;
      }, 0) || null;
    }
    const name = f.name.value.trim() || item.name;
    store.update(s => {
      const i = s.shopping.find(x => x.id === id);
      const nameChanged = i.name !== name;
      Object.assign(i, { name, qty, unit: f.unit.value.trim(), aisle: nameChanged && f.aisle.value === i.aisle ? guessAisle(name) : f.aisle.value });
    });
    sh.close();
  });
  sh.el.querySelector('[data-del]').addEventListener('click', () => {
    const before = store.get().shopping.slice();
    store.update(s => { s.shopping = s.shopping.filter(i => i.id !== id); });
    sh.close();
    toast('Item removed', { action: 'Undo', onAction: () => store.update(s => { s.shopping = before; }) });
  });
}
