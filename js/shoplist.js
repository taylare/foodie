import * as store from './store.js';
import { mergeIngredients, parseIngredient, guessAisle, nameKey, itemText } from './ingredients.js';
import { iso, addDays } from './ui.js';

// Lines needed for every planned recipe between start and start+days
export function planLines(start, days = 7) {
  const s = store.get();
  const lines = [];
  for (let i = 0; i < days; i++) {
    const day = s.plan[iso(addDays(start, i))];
    if (!day) continue;
    Object.values(day).forEach(slot => {
      if (!slot || !slot.recipeId) return;
      const r = store.recipeById(slot.recipeId);
      if (!r) return;
      const factor = (slot.servings || r.servings) / (r.servings || 1);
      r.ingredients.forEach(line => lines.push({ line, factor, source: r.title }));
    });
  }
  return lines;
}

export function recipeLines(recipe, servings) {
  const factor = (servings || recipe.servings) / (recipe.servings || 1);
  return recipe.ingredients.map(line => ({ line, factor, source: recipe.title }));
}

// Merge new lines into the existing (unchecked) list. Returns number of new rows.
export function addLines(lines) {
  const staples = store.get().settings.staples || [];
  const merged = mergeIngredients(lines, staples);
  let added = 0;
  store.update(s => {
    for (const m of merged) {
      const existing = s.shopping.find(i => !i.checked && i.key === m.key);
      if (existing) {
        if (existing.qty != null && m.qty != null && existing.unit === m.unit) existing.qty += m.qty;
        else if (existing.qty == null && m.qty != null) { existing.qty = m.qty; existing.unit = m.unit; }
        m.sources.forEach(src => { if (!existing.sources.includes(src)) existing.sources.push(src); });
      } else {
        s.shopping.push({ id: store.uid(), ...m, checked: false, manual: false, addedAt: Date.now() });
        added++;
      }
    }
  });
  return { added, total: merged.length };
}

export function addManual(text) {
  const p = parseIngredient(text);
  const name = p.name || text.trim();
  if (!name) return;
  store.update(s => {
    s.shopping.push({
      id: store.uid(), key: nameKey(name) + '|' + (p.qty != null ? p.unit : '~'),
      name, qty: p.qty, unit: p.unit, aisle: guessAisle(name),
      sources: [], checked: false, manual: true, addedAt: Date.now()
    });
  });
}

export function listAsText() {
  const items = store.get().shopping.filter(i => !i.checked);
  return '🛒 Shopping list\n' + items.map(i => '• ' + itemText(i)).join('\n');
}
