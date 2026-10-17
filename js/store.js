// All app data lives in one JSON document, saved to IndexedDB on the device
// (falls back to localStorage). It can be exported/imported as a .json file.

const DB_NAME = 'foodie';
const DB_STORE = 'kv';
const KEY = 'state';
export const SCHEMA_VERSION = 1;

export const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
export const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack', 'Side', 'Drink', 'Baking'];

export function defaultSettings() {
  return {
    theme: 'system',          // system | light | dark
    weekStart: 1,             // 0 = Sunday, 1 = Monday
    defaultServings: 2,
    showSnack: true,
    keepAwake: true,          // keep screen on in cook mode
    staples: ['salt', 'pepper', 'water', 'black pepper', 'olive oil'],
    spoonacularKey: '',
    name: ''
  };
}

function emptyState() {
  return {
    version: SCHEMA_VERSION,
    recipes: [],
    plan: {},       // { 'YYYY-MM-DD': { breakfast: { recipeId, servings } | { note } } }
    shopping: [],   // [{ id, name, qty, unit, aisle, checked, sources: [], manual }]
    settings: defaultSettings(),
    updatedAt: Date.now()
  };
}

let state = emptyState();
const listeners = new Set();
let saveTimer = null;

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ---------- IndexedDB ----------
function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('no idb'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const r = db.transaction(DB_STORE).objectStore(DB_STORE).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function idbSet(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- load / save ----------
export async function load() {
  let raw = null;
  try { raw = await idbGet(KEY); } catch (e) { /* fall through */ }
  if (!raw) {
    try { raw = localStorage.getItem('foodie-state'); } catch (e) { /* ignore */ }
  }
  if (raw) {
    try { state = normalize(JSON.parse(raw)); } catch (e) { console.error('Bad saved data', e); }
  } else {
    state = emptyState();
    state.settings.isNew = true;
  }
  // Ask the browser not to evict our data (important on iOS)
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persisted().then(p => { if (!p) navigator.storage.persist(); }).catch(() => {});
  }
  return state;
}

function normalize(s) {
  const base = emptyState();
  const out = {
    ...base,
    ...s,
    settings: { ...base.settings, ...(s.settings || {}) },
    recipes: Array.isArray(s.recipes) ? s.recipes.map(normalizeRecipe) : [],
    plan: s.plan && typeof s.plan === 'object' ? s.plan : {},
    shopping: Array.isArray(s.shopping) ? s.shopping : []
  };
  out.version = SCHEMA_VERSION;
  return out;
}

export function normalizeRecipe(r) {
  const now = Date.now();
  const lines = v => Array.isArray(v) ? v.map(String).map(x => x.trim()).filter(Boolean)
    : String(v || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  return {
    id: r.id || uid(),
    title: String(r.title || 'Untitled recipe').trim(),
    image: r.image || '',
    category: r.category || '',
    tags: Array.isArray(r.tags) ? r.tags : String(r.tags || '').split(',').map(t => t.trim()).filter(Boolean),
    prepMin: Number(r.prepMin) || 0,
    cookMin: Number(r.cookMin) || 0,
    servings: Number(r.servings) || 2,
    ingredients: lines(r.ingredients),
    steps: lines(r.steps),
    notes: r.notes || '',
    sourceUrl: r.sourceUrl || '',
    extId: r.extId || '',   // id on TheMealDB, so Discover knows it's saved
    rating: Number(r.rating) || 0,
    favorite: !!r.favorite,
    cookedCount: Number(r.cookedCount) || 0,
    lastCooked: r.lastCooked || null,
    createdAt: r.createdAt || now,
    updatedAt: r.updatedAt || now
  };
}

export function get() { return state; }

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// Mutate state via a function, then persist (debounced) and notify.
export function update(fn) {
  fn(state);
  state.updatedAt = Date.now();
  scheduleSave();
  listeners.forEach(l => l(state));
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 250);
}

export async function saveNow() {
  clearTimeout(saveTimer);
  const json = JSON.stringify(state);
  try {
    await idbSet(KEY, json);
  } catch (e) {
    try { localStorage.setItem('foodie-state', json); }
    catch (err) { console.error('Could not save', err); window.dispatchEvent(new CustomEvent('foodie:save-error')); }
  }
}

// Make sure nothing is lost if the app is closed mid-debounce
window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveNow(); });

// ---------- JSON backup ----------
export function exportJSON() {
  return JSON.stringify({ app: 'foodie', exportedAt: new Date().toISOString(), ...state }, null, 2);
}

// mode: 'merge' keeps existing data and adds/overwrites by id; 'replace' wipes first.
export function importJSON(text, mode = 'merge') {
  const data = JSON.parse(text);
  // Accept a full backup, a bare array of recipes, or a single recipe
  let incoming;
  if (Array.isArray(data)) incoming = { recipes: data };
  else if (data.recipes || data.plan || data.shopping) incoming = data;
  else if (data.title) incoming = { recipes: [data] };
  else throw new Error('This file doesn’t look like a Foodie backup.');

  const clean = normalize(incoming);
  let added = 0;
  update(s => {
    if (mode === 'replace') {
      s.recipes = clean.recipes;
      s.plan = clean.plan;
      s.shopping = clean.shopping;
      if (incoming.settings) s.settings = clean.settings;
      added = clean.recipes.length;
      return;
    }
    const byId = new Map(s.recipes.map(r => [r.id, r]));
    clean.recipes.forEach(r => { if (!byId.has(r.id)) added++; byId.set(r.id, r); });
    s.recipes = [...byId.values()];
    Object.entries(clean.plan).forEach(([d, slots]) => { s.plan[d] = { ...(s.plan[d] || {}), ...slots }; });
    const ids = new Set(s.shopping.map(i => i.id));
    clean.shopping.forEach(i => { if (!ids.has(i.id)) s.shopping.push(i); });
  });
  return added;
}

export function resetAll() {
  const settings = state.settings;
  state = emptyState();
  state.settings = { ...settings };
  scheduleSave();
  listeners.forEach(l => l(state));
}

// ---------- convenience accessors ----------
export const recipeById = id => state.recipes.find(r => r.id === id);

export function saveRecipe(recipe) {
  const r = normalizeRecipe({ ...recipe, updatedAt: Date.now() });
  update(s => {
    const i = s.recipes.findIndex(x => x.id === r.id);
    if (i >= 0) s.recipes[i] = r; else s.recipes.unshift(r);
  });
  return r;
}

export function deleteRecipe(id) {
  const recipe = recipeById(id);
  const removedSlots = [];
  update(s => {
    s.recipes = s.recipes.filter(r => r.id !== id);
    Object.entries(s.plan).forEach(([d, slots]) => {
      Object.entries(slots).forEach(([m, v]) => {
        if (v && v.recipeId === id) { removedSlots.push([d, m, v]); delete slots[m]; }
      });
    });
  });
  // Returns an undo function
  return () => update(s => {
    s.recipes.unshift(recipe);
    removedSlots.forEach(([d, m, v]) => { (s.plan[d] ||= {})[m] = v; });
  });
}

export function setSlot(date, meal, value) {
  update(s => {
    const day = (s.plan[date] ||= {});
    if (value) day[meal] = value; else delete day[meal];
    if (!Object.keys(day).length) delete s.plan[date];
  });
}

export function storageEstimate() {
  if (navigator.storage && navigator.storage.estimate) return navigator.storage.estimate();
  return Promise.resolve(null);
}
