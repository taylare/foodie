import * as store from './store.js';
import { toast, $$ } from './ui.js';
import { applyTheme } from './platform.js';
import today from './views/today.js';
import recipes from './views/recipes.js';
import recipe from './views/recipe.js';
import editor from './views/editor.js';
import cook from './views/cook.js';
import planner from './views/planner.js';
import shopping from './views/shopping.js';
import discover from './views/discover.js';
import settings from './views/settings.js';

const routes = [
  [/^$/, today, 'today'],
  [/^recipes$/, recipes, 'recipes'],
  [/^recipe\/([\w-]+)$/, recipe, 'recipes'],
  [/^edit\/([\w-]+)$/, editor, 'recipes'],
  [/^cook\/([\w-]+)$/, cook, null],
  [/^plan(?:\/(\d{4}-\d{2}-\d{2}))?$/, planner, 'plan'],
  [/^shop$/, shopping, 'shop'],
  [/^discover$/, discover, 'discover'],
  [/^settings$/, settings, 'today']
];

let view = document.getElementById('view');
let cleanup = null;
const scrollMemory = new Map();
let currentPath = null;

function route() {
  const path = location.hash.replace(/^#\/?/, '').replace(/\/$/, '');
  const [pathOnly, query = ''] = path.split('?');
  const match = routes.find(([re]) => re.test(pathOnly)) || routes[0];
  const [re, mod, tab] = match;
  const params = (pathOnly.match(re) || []).slice(1);

  if (currentPath != null) scrollMemory.set(currentPath, window.scrollY);
  const swap = () => {
    if (typeof cleanup === 'function') cleanup();
    cleanup = null;
    // Fresh element per screen so delegated listeners never pile up
    const fresh = view.cloneNode(false);
    fresh.className = '';
    view.replaceWith(fresh);
    view = fresh;
    document.body.dataset.route = tab || 'full';
    cleanup = mod(view, params, new URLSearchParams(query));
    $$('.tabbar a').forEach(a => a.classList.toggle('active', a.dataset.tab === tab));
    window.scrollTo(0, scrollMemory.get(path) || 0);
  };
  currentPath = path;
  swap();
}

// ---------- shopping badge ----------
function updateBadge() {
  const left = store.get().shopping.filter(i => !i.checked).length;
  const b = document.getElementById('shopBadge');
  b.hidden = !left;
  b.textContent = left > 99 ? '99+' : left;
}

// ---------- service worker ----------
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  // Only reload on controller change if this is an update, not the very first install
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw && nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          toast('A new version of Foodie is ready', {
            action: 'Update', duration: 10000,
            onAction: () => nw.postMessage('skipWaiting')
          });
        }
      });
    });
  }).catch(err => console.warn('SW registration failed', err));
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded || !hadController) return;
    reloaded = true;
    store.saveNow().then(() => location.reload());
  });
}

// ---------- boot ----------
(async function boot() {
  await store.load();
  applyTheme(store.get().settings.theme);
  updateBadge();
  store.subscribe(updateBadge);
  window.addEventListener('hashchange', route);
  window.addEventListener('foodie:save-error', () => toast('Storage is full – try removing some photos'));
  window.addEventListener('online', () => toast('Back online'));
  window.addEventListener('offline', () => toast('Offline – everything still works'));
  route();
  registerSW();
})();
