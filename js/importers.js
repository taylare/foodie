// Ways to get recipes into the app without typing them out.
import { parseIngredient } from './ingredients.js';

// ---------- paste a whole recipe ----------
// Splits copied text into title / ingredients / steps using headings when present,
// or a best guess when not.
export function parseRecipeText(text) {
  const lines = String(text).replace(/\r/g, '').split('\n').map(l => l.trim());
  const nonEmpty = lines.filter(Boolean);
  if (!nonEmpty.length) return null;

  const isIngHead = l => /^(ingredients?|you(?:'|’)?ll need|what you need)\s*:?$/i.test(l);
  const isStepHead = l => /^(method|directions?|instructions?|steps?|preparation|how to make( it)?)\s*:?$/i.test(l);
  const isNoteHead = l => /^(notes?|tips?)\s*:?$/i.test(l);
  const meta = { servings: 0, prepMin: 0, cookMin: 0 };

  let title = '';
  let section = 'intro';
  const ingredients = [], steps = [], notes = [];

  for (const l of lines) {
    if (!l) continue;
    if (isIngHead(l)) { section = 'ing'; continue; }
    if (isStepHead(l)) { section = 'steps'; continue; }
    if (isNoteHead(l)) { section = 'notes'; continue; }

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

// ---------- Spoonacular URL extract (needs the user's own API key) ----------
export async function importFromUrl(url, apiKey) {
  if (!apiKey) throw new Error('Add a Spoonacular API key in Settings to import from links.');
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
