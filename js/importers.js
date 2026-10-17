// Ways to get recipes into the app without typing them out.
import { parseIngredient } from './ingredients.js';

// ---------- paste a whole recipe ----------
// Splits copied text into title / ingredients / steps using headings when present,
// or a best guess when not.
export function parseRecipeText(text) {
  const lines = String(text).replace(/\r/g, '').split('\n').map(l => l.trim()
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')          // markdown images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')       // markdown links -> text
    .trim());
  const nonEmpty = lines.filter(Boolean);
  if (!nonEmpty.length) return null;

  // Headings may be "Ingredients", "## Ingredients", "**Method:**" etc.
  const plain = l => l.replace(/^#+\s*/, '').replace(/\*\*|__/g, '').replace(/:$/, '').trim();
  const isIngHead = l => /^(ingredients?|you(?:'|’)?ll need|what you need)$/i.test(plain(l));
  const isStepHead = l => /^(method|directions?|instructions?|steps?|preparation|how to make( it)?)$/i.test(plain(l));
  const isNoteHead = l => /^(notes?|tips?|recipe notes?)$/i.test(plain(l));
  const isOtherHead = l => /^#{1,2}\s/.test(l); // "###" sub-headings (e.g. "For the sauce") don't end it
  const meta = { servings: 0, prepMin: 0, cookMin: 0 };

  let title = '';
  let section = 'intro';
  const ingredients = [], steps = [], notes = [];

  for (const l of lines) {
    if (!l) continue;
    if (isIngHead(l)) { section = 'ing'; continue; }
    if (isStepHead(l)) { section = 'steps'; continue; }
    if (isNoteHead(l)) { section = 'notes'; continue; }
    // Any other big heading after the recipe started (e.g. "## Comments") ends it
    if (isOtherHead(l) && (ingredients.length || steps.length)) { section = 'skip'; continue; }
    if (section === 'skip') continue;

    const serv = l.match(/(?:serves|servings|yield|makes)\s*:?\s*(\d+)/i);
    if (serv && l.length < 40) { meta.servings = +serv[1]; continue; }
    const prep = l.match(/prep(?:aration)?\s*(?:time)?\s*:?\s*(\d+)\s*(h|hr|hour|m|min)/i);
    const cook = l.match(/cook(?:ing)?\s*(?:time)?\s*:?\s*(\d+)\s*(h|hr|hour|m|min)/i);
    if ((prep || cook) && l.length < 60) {
      if (prep) meta.prepMin = +prep[1] * (/^h/i.test(prep[2]) ? 60 : 1);
      if (cook) meta.cookMin = +cook[1] * (/^h/i.test(cook[2]) ? 60 : 1);
      continue;
    }

    if (!title && section === 'intro') { title = l.replace(/^#+\s*/, ''); continue; }
    if (section === 'ing') ingredients.push(cleanBullet(l));
    else if (section === 'steps') steps.push(cleanStep(l));
    else if (section === 'notes') notes.push(l);
    else {
      // No headings yet: lines that start with a quantity look like ingredients
      if (parseIngredient(l).qty != null && l.length < 80) ingredients.push(cleanBullet(l));
      else if (/^\d+[.)]\s/.test(l) || l.length > 80) steps.push(cleanStep(l));
      else notes.push(l);
    }
  }

  return {
    title: title || 'Pasted recipe',
    ingredients, steps,
    notes: notes.join('\n'),
    servings: meta.servings || 0,
    prepMin: meta.prepMin, cookMin: meta.cookMin
  };
}

const cleanBullet = l => l.replace(/^[-•*▢□☐✓✔]\s*/, '').trim();
const cleanStep = l => l.replace(/^(step\s*)?\d+[.):-]?\s+/i, '').replace(/^[-•*]\s*/, '').trim();

// Split a big instructions blob into sensible steps
export function splitSteps(text) {
  const t = String(text || '').replace(/\r/g, '').trim();
  if (!t) return [];
  let parts = t.split(/\n+/).map(s => s.trim()).filter(Boolean);
  if (parts.length === 1 && parts[0].length > 220) {
    parts = parts[0].split(/(?<=[.!?])\s+(?=[A-Z])/).reduce((acc, s) => {
      const last = acc[acc.length - 1];
      if (last && last.length < 90) acc[acc.length - 1] = last + ' ' + s; else acc.push(s);
      return acc;
    }, []);
  }
  return parts.map(cleanStep).filter(s => s && !/^step\s*\d*$/i.test(s));
}

// ---------- TheMealDB (free, no key needed) ----------
const MEALDB = 'https://www.themealdb.com/api/json/v1/1/';

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Network error (' + res.status + ')');
  return res.json();
}

export async function mealdbSearch(q) {
  const d = await getJSON(MEALDB + 'search.php?s=' + encodeURIComponent(q));
  return (d.meals || []).map(fromMealDB);
}
export async function mealdbRandom(n = 6) {
  const all = await Promise.all(Array.from({ length: n }, () => getJSON(MEALDB + 'random.php').catch(() => null)));
  const seen = new Set();
  return all.filter(Boolean).flatMap(d => d.meals || []).filter(m => !seen.has(m.idMeal) && seen.add(m.idMeal)).map(fromMealDB);
}
export async function mealdbByCategory(cat) {
  const d = await getJSON(MEALDB + 'filter.php?c=' + encodeURIComponent(cat));
  return (d.meals || []).slice(0, 24).map(m => ({ extId: m.idMeal, title: m.strMeal, image: m.strMealThumb, partial: true }));
}
export async function mealdbLookup(id) {
  const d = await getJSON(MEALDB + 'lookup.php?i=' + encodeURIComponent(id));
  return d.meals && d.meals[0] ? fromMealDB(d.meals[0]) : null;
}
export const MEALDB_CATEGORIES = ['Chicken', 'Beef', 'Vegetarian', 'Seafood', 'Pasta', 'Dessert', 'Breakfast', 'Vegan', 'Lamb', 'Pork', 'Side', 'Starter'];

function fromMealDB(m) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ing = (m['strIngredient' + i] || '').trim();
    const meas = (m['strMeasure' + i] || '').trim();
    if (ing) ingredients.push((meas ? meas + ' ' : '') + ing);
  }
  const catMap = { Breakfast: 'Breakfast', Dessert: 'Dessert', Side: 'Side', Starter: 'Lunch' };
  return {
    extId: m.idMeal,
    title: m.strMeal,
    image: m.strMealThumb || '',
    category: catMap[m.strCategory] || 'Dinner',
    tags: [m.strArea, m.strCategory, ...(m.strTags || '').split(',')].map(t => (t || '').trim()).filter(Boolean),
    ingredients,
    steps: splitSteps(m.strInstructions),
    servings: 4,
    sourceUrl: m.strSource || (m.strYoutube || ''),
    notes: m.strYoutube ? 'Video: ' + m.strYoutube : ''
  };
}

// ---------- import from a link (no API key needed) ----------
// Browsers can't read other sites directly (CORS), so we try the site itself and
// free public readers at the same time and use whichever finds a recipe first.
// Most recipe sites embed schema.org Recipe data (JSON-LD), which is what we parse.
const SOURCES = [
  { url: u => u },
  { url: u => 'https://r.jina.ai/' + u, headers: { 'X-Return-Format': 'html' } },
  { url: u => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u) }
];

async function fetchText(url, headers, ms = 10000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.text();
  } finally { clearTimeout(timer); }
}

async function readRecipePage(url) {
  try {
    return await Promise.any(SOURCES.map(async s => {
      const r = parseRecipeHtml(await fetchText(s.url(url), s.headers), url);
      if (!r) throw new Error('no recipe');
      return r;
    }));
  } catch (e) { /* none found a structured recipe */ }

  // Last resort: read the page as plain text and pick out the recipe
  try {
    const md = await fetchText('https://r.jina.ai/' + url, { 'X-Return-Format': 'markdown' }, 12000);
    const title = (md.match(/^Title:\s*(.+)$/m) || [])[1];
    const body = md.split(/^Markdown Content:\s*$/m).pop();
    const r = parseRecipeText(body);
    if (r && r.ingredients.length >= 2 && r.steps.length >= 1) return { ...r, title: title ? title.trim() : r.title, sourceUrl: url };
  } catch (e) { /* fall through */ }
  return null;
}

export function normalizeUrl(input) {
  const m = String(input || '').match(/https?:\/\/[^\s<>"']+/i);
  if (m) return m[0].replace(/[),.]+$/, '');
  const t = String(input || '').trim();
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(t)) return 'https://' + t;
  return null;
}

export async function importFromUrl(input, apiKey) {
  const url = normalizeUrl(input);
  if (!url) throw new Error('That doesn’t look like a link');
  if (!navigator.onLine) throw new Error('You’re offline – connect to import from a link.');
  const r = await readRecipePage(url);
  if (r) return r;
  if (apiKey) {
    try { return await importFromSpoonacular(url, apiKey); } catch (e) { /* fall through */ }
  }
  const err = new Error('This site blocks importing. Open the page, copy the recipe, then paste it here.');
  err.blocked = url;
  throw err;
}

// Turn a web page's HTML into a recipe. Tries JSON-LD, then microdata, then page structure.
export function parseRecipeHtml(html, pageUrl = '') {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const abs = u => { try { return new URL(u, pageUrl || undefined).href; } catch (e) { return u || ''; } };

  // 1) JSON-LD
  for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
    let data;
    try { data = JSON.parse(s.textContent.trim().replace(/^﻿/, '')); } catch (e) { continue; }
    const node = findRecipeNode(data);
    if (node) {
      const r = fromSchema(node, abs);
      if (r.ingredients.length || r.steps.length) return { ...r, sourceUrl: pageUrl };
    }
  }

  // 2) Microdata (itemprop)
  const md = doc.querySelector('[itemtype*="schema.org/Recipe" i]');
  if (md) {
    const prop = p => [...md.querySelectorAll(`[itemprop="${p}"]`)];
    const val = el => el.getAttribute('content') || el.getAttribute('src') || el.textContent;
    const node = {
      name: prop('name')[0] && val(prop('name')[0]),
      image: prop('image')[0] && val(prop('image')[0]),
      recipeYield: prop('recipeYield')[0] && val(prop('recipeYield')[0]),
      prepTime: prop('prepTime')[0] && val(prop('prepTime')[0]),
      cookTime: prop('cookTime')[0] && val(prop('cookTime')[0]),
      totalTime: prop('totalTime')[0] && val(prop('totalTime')[0]),
      recipeIngredient: (prop('recipeIngredient').length ? prop('recipeIngredient') : prop('ingredients')).map(val),
      recipeInstructions: prop('recipeInstructions').map(val),
      recipeCategory: prop('recipeCategory')[0] && val(prop('recipeCategory')[0])
    };
    const r = fromSchema(node, abs);
    if (r.ingredients.length) return { ...r, sourceUrl: pageUrl };
  }

  // 3) Page structure: lists inside elements named like "ingredients" / "instructions"
  const ING = /ingredient/i, STEP = /instruction|direction|method|steps|preparation/i;
  // Take the matching container with the most list items (so ingredient groups stay together)
  const pick = (re, not) => {
    let best = [];
    for (const box of doc.querySelectorAll('[class],[id]')) {
      const name = (typeof box.className === 'string' ? box.className : '') + ' ' + box.id;
      if (!re.test(name) || not.test(name)) continue;
      const items = [...box.querySelectorAll('li')].map(li => clean(li.textContent)).filter(t => t && t.length < 400);
      if (items.length > best.length) best = items;
    }
    return best.length >= 2 ? best : [];
  };
  const ingredients = pick(ING, STEP);
  const steps = pick(STEP, ING);
  // Needs both lists, so random pages (404s, menus) aren't mistaken for recipes
  if (ingredients.length && steps.length) {
    const title = clean(doc.querySelector('meta[property="og:title"]')?.content || doc.querySelector('h1')?.textContent || doc.title);
    const image = doc.querySelector('meta[property="og:image"]')?.content;
    return { title: title || 'Imported recipe', ingredients: dedupe(ingredients), steps: dedupe(steps).map(cleanStep), servings: 0, image: image ? abs(image) : '', sourceUrl: pageUrl };
  }
  return null;
}

function findRecipeNode(data) {
  const isRecipe = n => n && typeof n === 'object' && [].concat(n['@type'] || []).some(t => /recipe$/i.test(String(t)));
  const stack = [data];
  while (stack.length) {
    const n = stack.shift();
    if (!n || typeof n !== 'object') continue;
    if (Array.isArray(n)) { stack.push(...n); continue; }
    if (isRecipe(n)) return n;
    if (n['@graph']) stack.push(n['@graph']);
    if (n.mainEntity) stack.push(n.mainEntity);
  }
  return null;
}

// "PT1H30M" -> 90
function isoMinutes(v) {
  if (!v) return 0;
  const m = String(v).trim().match(/^P(?:(\d+)D)?T?(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?/i);
  if (!m || m[0].length <= 2) { const n = parseInt(v, 10); return isNaN(n) ? 0 : n; }
  return Math.round((+m[1] || 0) * 1440 + (+m[2] || 0) * 60 + (+m[3] || 0));
}

const decoder = typeof document !== 'undefined' ? document.createElement('textarea') : null;
function clean(s) {
  if (s == null) return '';
  let t = String(s).replace(/<[^>]+>/g, ' ');
  if (decoder) { decoder.innerHTML = t; t = decoder.value; }
  return t.replace(/\s+/g, ' ').trim();
}
const dedupe = arr => [...new Set(arr)];

function fromSchema(n, abs) {
  const text = v => Array.isArray(v) ? text(v[0]) : (v && typeof v === 'object' ? (v.text || v.name || v['@value'] || '') : v);
  let image = n.image;
  if (Array.isArray(image)) image = image[0];
  if (image && typeof image === 'object') image = image.url || image.contentUrl || '';

  const steps = [];
  const walk = ins => {
    if (!ins) return;
    if (typeof ins === 'string') {
      // keep line breaks so one block of text still becomes separate steps
      const lines = ins.replace(/<\/(p|li)>|<br\s*\/?>/gi, '\n').split(/\n+/).map(clean).filter(Boolean);
      splitSteps(lines.join('\n')).forEach(s => steps.push(s));
      return;
    }
    if (Array.isArray(ins)) { ins.forEach(walk); return; }
    const type = [].concat(ins['@type'] || []).join(' ');
    if (/HowToSection/i.test(type) || ins.itemListElement) {
      walk(ins.itemListElement);
      return;
    }
    const t = clean(ins.text || ins.name || ins.description || '');
    if (t) steps.push(cleanStep(t));
  };
  walk(n.recipeInstructions);

  const ingredients = [].concat(n.recipeIngredient || n.ingredients || []).map(clean).filter(Boolean);
  const yieldStr = String(text(n.recipeYield) || '');
  const servings = parseInt((yieldStr.match(/\d+/) || [])[0], 10) || 0;
  let prepMin = isoMinutes(n.prepTime), cookMin = isoMinutes(n.cookTime);
  const total = isoMinutes(n.totalTime);
  if (!prepMin && !cookMin && total) cookMin = total;
  const kw = Array.isArray(n.keywords) ? n.keywords : String(n.keywords || '').split(',');
  const cuisine = [].concat(n.recipeCuisine || []);
  const cats = [].concat(n.recipeCategory || []).map(String);

  return {
    title: clean(text(n.name)) || 'Imported recipe',
    image: image ? abs(String(image)) : '',
    ingredients,
    steps: steps.filter(Boolean),
    servings,
    prepMin, cookMin,
    tags: [...cuisine, ...kw].map(t => clean(t).toLowerCase()).filter(t => t && t.length < 24).slice(0, 6),
    category: cats.length ? guessCategory(cats) : '',
    notes: clean(text(n.description)).slice(0, 500)
  };
}

// ---------- Spoonacular URL extract (optional fallback, needs the user's own API key) ----------
async function importFromSpoonacular(url, apiKey) {
  const d = await getJSON(`https://api.spoonacular.com/recipes/extract?url=${encodeURIComponent(url)}&apiKey=${encodeURIComponent(apiKey)}`);
  if (!d || !d.title) throw new Error('Couldn’t find a recipe on that page.');
  let steps = [];
  if (d.analyzedInstructions && d.analyzedInstructions.length) {
    steps = d.analyzedInstructions.flatMap(s => s.steps.map(x => x.step));
  } else {
    steps = splitSteps((d.instructions || '').replace(/<\/(li|p)>/g, '\n').replace(/<[^>]+>/g, ''));
  }
  const total = d.readyInMinutes || 0;
  const prep = d.preparationMinutes > 0 ? d.preparationMinutes : 0;
  const cook = d.cookingMinutes > 0 ? d.cookingMinutes : Math.max(0, total - prep);
  return {
    title: d.title,
    image: d.image || '',
    ingredients: (d.extendedIngredients || []).map(i => i.original),
    steps,
    servings: d.servings || 0,
    prepMin: prep,
    cookMin: cook,
    sourceUrl: url,
    tags: [...(d.cuisines || []), ...(d.diets || [])].slice(0, 6),
    category: guessCategory(d.dishTypes || [])
  };
}

function guessCategory(types) {
  const t = types.join(' ').toLowerCase();
  if (/breakfast|brunch|morning/.test(t)) return 'Breakfast';
  if (/dessert/.test(t)) return 'Dessert';
  if (/lunch|salad|soup/.test(t)) return 'Lunch';
  if (/snack|appetizer|fingerfood/.test(t)) return 'Snack';
  if (/side/.test(t)) return 'Side';
  if (/drink|beverage/.test(t)) return 'Drink';
  return 'Dinner';
}
