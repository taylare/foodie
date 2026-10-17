// Parse ingredient lines like "1 1/2 cups plain flour, sifted" into
// { qty, qtyMax, unit, name, note } so they can be scaled and merged.

const UNICODE_FRACTIONS = {
  '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅕': 0.2, '⅖': 0.4,
  '⅗': 0.6, '⅘': 0.8, '⅙': 1 / 6, '⅚': 5 / 6, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875
};

// canonical unit -> aliases
const UNITS = {
  cup: ['cup', 'cups', 'c'],
  tbsp: ['tbsp', 'tbsps', 'tablespoon', 'tablespoons', 'tbs', 'tbl', 'T'],
  tsp: ['tsp', 'tsps', 'teaspoon', 'teaspoons', 't'],
  g: ['g', 'gram', 'grams', 'gr'],
  kg: ['kg', 'kgs', 'kilogram', 'kilograms'],
  ml: ['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'],
  l: ['l', 'liter', 'liters', 'litre', 'litres'],
  oz: ['oz', 'ounce', 'ounces'],
  'fl oz': ['fl oz', 'fl. oz', 'fluid ounce', 'fluid ounces'],
  lb: ['lb', 'lbs', 'pound', 'pounds'],
  pinch: ['pinch', 'pinches'],
  dash: ['dash', 'dashes'],
  clove: ['clove', 'cloves'],
  can: ['can', 'cans', 'tin', 'tins'],
  pkg: ['package', 'packages', 'pkg', 'packet', 'packets', 'pack', 'packs'],
  slice: ['slice', 'slices'],
  bunch: ['bunch', 'bunches'],
  handful: ['handful', 'handfuls'],
  piece: ['piece', 'pieces', 'pc', 'pcs'],
  sprig: ['sprig', 'sprigs'],
  stick: ['stick', 'sticks'],
  head: ['head', 'heads'],
  jar: ['jar', 'jars'],
  bottle: ['bottle', 'bottles'],
  drop: ['drop', 'drops']
};

const ALIAS = new Map();
Object.entries(UNITS).forEach(([canon, list]) => list.forEach(a => ALIAS.set(a, canon)));
const CASE_SENSITIVE = new Set(['T', 't']);
const sortedAliases = [...ALIAS.keys()].sort((a, b) => b.length - a.length);

const NUM = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?\s*[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|\d+(?:[.,]\d+)?|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])`;
const QTY_RE = new RegExp(String.raw`^\s*(${NUM})(?:\s*(?:-|–|to)\s*(${NUM}))?\s*`);

function toNumber(str) {
  str = str.trim().replace(',', '.');
  let total = 0;
  const uni = str.match(/[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/);
  if (uni) { total += UNICODE_FRACTIONS[uni[0]]; str = str.replace(uni[0], '').trim(); }
  if (!str) return total;
  const parts = str.split(/\s+/);
  for (const p of parts) {
    if (p.includes('/')) { const [a, b] = p.split('/').map(Number); if (b) total += a / b; }
    else total += Number(p) || 0;
  }
  return total;
}

export function parseIngredient(line) {
  const original = String(line).trim();
  let rest = original.replace(/^[-•*▢□☐]\s*/, '');
  let qty = null, qtyMax = null, unit = '';

  const m = rest.match(QTY_RE);
  if (m) {
    qty = toNumber(m[1]);
    if (m[2]) qtyMax = toNumber(m[2]);
    rest = rest.slice(m[0].length);
    // "2 (400g) cans" – keep the parenthetical in the note
    let paren = '';
    const pm = rest.match(/^\(([^)]*)\)\s*/);
    if (pm) { paren = pm[0]; rest = rest.slice(pm[0].length); }
    for (const a of sortedAliases) {
      const flags = CASE_SENSITIVE.has(a) ? '' : 'i';
      const re = new RegExp('^' + a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:\\.|\\b)\\s*(?:of\\s+)?', flags);
      if (re.test(rest)) { unit = ALIAS.get(a); rest = rest.replace(re, ''); break; }
    }
    if (paren) rest = paren + rest;
  }

  let name = rest.trim(), note = '';
  const comma = name.indexOf(',');
  if (comma > 0) { note = name.slice(comma + 1).trim(); name = name.slice(0, comma).trim(); }
  return { original, qty, qtyMax, unit, name, note };
}

// Nicely format 0.333 -> "⅓", 1.5 -> "1½"
const NICE = [[1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [3 / 8, '⅜'], [1 / 2, '½'], [5 / 8, '⅝'], [2 / 3, '⅔'], [3 / 4, '¾'], [7 / 8, '⅞']];
export function formatQty(n, unit = '') {
  if (n == null || isNaN(n)) return '';
  // metric weights/volumes read better as decimals
  if (['g', 'kg', 'ml', 'l'].includes(unit) || n >= 10) {
    const r = n >= 100 ? Math.round(n) : Math.round(n * 10) / 10;
    return String(r);
  }
  const whole = Math.floor(n);
  const frac = n - whole;
  if (frac < 0.06) return String(whole || (n > 0 ? '⅛' : 0));
  if (frac > 0.94) return String(whole + 1);
  let best = NICE[0];
  for (const f of NICE) if (Math.abs(f[0] - frac) < Math.abs(best[0] - frac)) best = f;
  return (whole ? whole : '') + best[1];
}

const UNIT_LABEL = { cup: ['cup', 'cups'], clove: ['clove', 'cloves'], can: ['can', 'cans'], slice: ['slice', 'slices'], bunch: ['bunch', 'bunches'], handful: ['handful', 'handfuls'], piece: ['piece', 'pieces'], sprig: ['sprig', 'sprigs'], stick: ['stick', 'sticks'], head: ['head', 'heads'], jar: ['jar', 'jars'], bottle: ['bottle', 'bottles'], pinch: ['pinch', 'pinches'], dash: ['dash', 'dashes'], drop: ['drop', 'drops'], pkg: ['pack', 'packs'] };
export function unitLabel(unit, qty) {
  if (!unit) return '';
  const l = UNIT_LABEL[unit];
  return l ? (qty > 1 ? l[1] : l[0]) : unit;
}

// Return a display string for an ingredient scaled by factor
export function scaleLine(line, factor) {
  const p = parseIngredient(line);
  if (p.qty == null || factor === 1) return { text: line, parsed: p };
  const q = p.qty * factor;
  const qMax = p.qtyMax != null ? p.qtyMax * factor : null;
  const qtyText = formatQty(q, p.unit) + (qMax != null ? '–' + formatQty(qMax, p.unit) : '');
  const u = unitLabel(p.unit, qMax ?? q);
  const text = [qtyText, u, p.name].filter(Boolean).join(' ') + (p.note ? ', ' + p.note : '');
  return { text, parsed: p };
}

// ---------- aisle classification ----------
export const AISLES = [
  { key: 'produce', label: 'Fruit & Veg', icon: '🥦' },
  { key: 'meat', label: 'Meat & Seafood', icon: '🥩' },
  { key: 'dairy', label: 'Dairy & Eggs', icon: '🧀' },
  { key: 'bakery', label: 'Bakery', icon: '🥖' },
  { key: 'pantry', label: 'Pantry', icon: '🥫' },
  { key: 'spices', label: 'Herbs & Spices', icon: '🧂' },
  { key: 'frozen', label: 'Frozen', icon: '🧊' },
  { key: 'drinks', label: 'Drinks', icon: '🧃' },
  { key: 'household', label: 'Household', icon: '🧻' },
  { key: 'other', label: 'Other', icon: '🛍️' }
];

const AISLE_WORDS = {
  spices: 'salt pepper paprika cumin oregano thyme rosemary cinnamon nutmeg turmeric chili chilli flakes powder seasoning bay leaf leaves cayenne coriander seed seeds clove allspice cardamom curry garam masala vanilla extract sage dill basil dried mixed herbs saffron fennel star anise peppercorn',
  produce: 'apple banana lemon lime orange berries berry strawberry strawberries blueberry blueberries raspberry grape mango pineapple avocado tomato tomatoes potato potatoes onion onions garlic ginger carrot carrots celery lettuce spinach kale cabbage broccoli cauliflower zucchini courgette cucumber capsicum bell pepper mushroom mushrooms pumpkin squash corn peas beans sprout sprouts leek leeks shallot shallots spring scallion scallions herb parsley cilantro mint chives fresh rocket arugula eggplant aubergine beetroot beet sweet radish asparagus pear peach plum cherry cherries watermelon melon kiwi date dates fig figs',
  meat: 'chicken beef pork lamb mince ground bacon ham sausage sausages turkey steak fish salmon tuna prawn prawns shrimp crab lobster mussels cod fillet fillets thigh thighs breast breasts chorizo prosciutto salami veal duck anchovy anchovies',
  dairy: 'milk butter cheese cheddar mozzarella parmesan feta ricotta cream yogurt yoghurt egg eggs sour custard mascarpone halloumi brie gouda buttermilk ghee',
  bakery: 'bread loaf roll rolls bun buns baguette tortilla tortillas wrap wraps pita naan croissant bagel sourdough',
  frozen: 'frozen ice',
  drinks: 'juice soda wine beer coffee tea sparkling lemonade kombucha',
  household: 'foil paper towel towels wrap detergent soap sponge bags',
  pantry: 'flour sugar rice pasta spaghetti noodles oil vinegar sauce soy stock broth honey syrup maple oats cereal beans lentils chickpeas tin canned can tomato paste passata baking soda yeast cocoa chocolate nuts almonds walnuts peanut peanuts cashews jam mustard mayo mayonnaise ketchup cornflour cornstarch breadcrumbs coconut quinoa couscous crackers chips tahini sesame sriracha'
};
const AISLE_ORDER = ['frozen', 'household', 'drinks', 'spices', 'meat', 'dairy', 'bakery', 'produce', 'pantry'];

export function guessAisle(name) {
  const n = ' ' + String(name).toLowerCase().replace(/[^a-z ]/g, ' ') + ' ';
  // Specific overrides
  if (/\b(frozen)\b/.test(n)) return 'frozen';
  if (/\b(coconut milk|almond milk|oat milk|soy milk)\b/.test(n)) return 'pantry';
  if (/\b(tinned|canned|tin of|can of)\b/.test(n)) return 'pantry';
  if (/\b(stock|broth|sauce|paste|peanut butter|noodles)\b/.test(n)) return 'pantry';
  if (/\b(bell pepper|red pepper|green pepper|yellow pepper|capsicum|jalapeno|chilli pepper|chili pepper)s?\b/.test(n)) return 'produce';
  if (/\bfresh\b/.test(n) && /\b(basil|thyme|rosemary|sage|dill|coriander|oregano|chilli|chili|ginger)\b/.test(n)) return 'produce';
  if (/\b(dried|ground)\b/.test(n) && !/\b(beef|pork|chicken|turkey|lamb)\b/.test(n)) return 'spices';
  for (const aisle of AISLE_ORDER) {
    for (const w of AISLE_WORDS[aisle].split(' ')) {
      if (n.includes(' ' + w + ' ')) return aisle;
    }
  }
  return 'other';
}

// ---------- merging for the shopping list ----------
export function nameKey(name) {
  return String(name).toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/\b(fresh|large|small|medium|chopped|diced|sliced|minced|finely|roughly|peeled|grated|optional|to taste|of)\b/g, '')
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(oes|ies|es|s)$/, m => (m === 'ies' ? 'y' : m === 'oes' ? 'o' : ''));
}

// Convert to a base unit so tbsp + tsp etc. can be summed
const CONVERT = {
  tsp: ['tsp', 1], tbsp: ['tsp', 3], cup: ['tsp', 48],
  ml: ['ml', 1], l: ['ml', 1000],
  g: ['g', 1], kg: ['g', 1000],
  oz: ['oz', 1], lb: ['oz', 16]
};

function toBase(qty, unit) {
  const c = CONVERT[unit];
  return c ? { qty: qty * c[1], unit: c[0] } : { qty, unit };
}

function fromBase(qty, base) {
  if (base === 'tsp') {
    if (qty >= 12) return { qty: qty / 48, unit: 'cup' };
    if (qty >= 3) return { qty: qty / 3, unit: 'tbsp' };
    return { qty, unit: 'tsp' };
  }
  if (base === 'ml' && qty >= 1000) return { qty: qty / 1000, unit: 'l' };
  if (base === 'g' && qty >= 1000) return { qty: qty / 1000, unit: 'kg' };
  if (base === 'oz' && qty >= 16) return { qty: qty / 16, unit: 'lb' };
  return { qty, unit: base };
}

// lines: [{ line, factor, source }] -> merged list items
export function mergeIngredients(lines, staples = []) {
  const stapleKeys = new Set(staples.map(nameKey));
  const map = new Map();
  for (const { line, factor = 1, source } of lines) {
    const p = parseIngredient(line);
    if (!p.name) continue;
    const key0 = nameKey(p.name);
    if (!key0 || stapleKeys.has(key0)) continue;
    // "salt and pepper" -> skip if every part is a staple
    const parts = key0.split(/\s+(?:and|or|&)\s+/).map(nameKey);
    if (parts.length > 1 && parts.every(x => stapleKeys.has(x))) continue;
    const base = p.qty != null ? toBase(p.qty * factor, p.unit) : { qty: null, unit: p.unit };
    const key = key0 + '|' + (base.qty != null ? base.unit : '~');
    const existing = map.get(key);
    if (existing) {
      if (existing.qty != null && base.qty != null) existing.qty += base.qty;
      if (source && !existing.sources.includes(source)) existing.sources.push(source);
    } else {
      map.set(key, { key, name: p.name, qty: base.qty, unit: base.unit, sources: source ? [source] : [], aisle: guessAisle(p.name) });
    }
  }
  return [...map.values()].map(i => {
    if (i.qty == null) return i;
    const f = fromBase(i.qty, i.unit);
    return { ...i, qty: f.qty, unit: f.unit };
  });
}

export function itemText(item) {
  if (item.qty == null) return item.name;
  return [formatQty(item.qty, item.unit), unitLabel(item.unit, item.qty), item.name].filter(Boolean).join(' ');
}

// Find durations inside a step, e.g. "simmer for 10-15 minutes"
export function findTimers(text) {
  const out = [];
  const re = /(\d+(?:[.,]\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:[.,]\d+)?))?\s*(hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?)\b/gi;
  let m;
  while ((m = re.exec(text))) {
    const n = parseFloat((m[2] || m[1]).replace(',', '.'));
    const u = m[3].toLowerCase();
    const secs = u.startsWith('h') ? n * 3600 : u.startsWith('s') ? n : n * 60;
    if (secs > 0 && secs <= 86400) out.push({ label: m[0], seconds: Math.round(secs) });
  }
  return out;
}
