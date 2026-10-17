import * as store from '../store.js';
import { html, on, toast, confirmSheet, downloadFile, sheet } from '../ui.js';
import { applyTheme, install } from '../platform.js';

export const APP_VERSION = '2.0.0';

export default function settings(el) {
  const draw = async () => {
    const s = store.get();
    const st = s.settings;
    const json = store.exportJSON();
    const sizeKb = Math.round(new Blob([json]).size / 1024);
    const est = await store.storageEstimate();
    const persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : false;

    el.innerHTML = String(html`
      <header class="page-head compact">
        <a class="icon-btn" href="#/" aria-label="Back">←</a>
        <h1 class="grow center">Settings</h1>
        <span class="icon-btn" aria-hidden="true"></span>
      </header>

      <section class="section">
        <h2 class="label">You</h2>
        <div class="card form-card">
          <label class="field"><span>Your name <small class="muted">for the greeting</small></span>
            <input class="input" data-set="name" value="${st.name}" placeholder="e.g. Tay" /></label>
        </div>
      </section>

      <section class="section">
        <h2 class="label">Look & feel</h2>
        <div class="card form-card">
          <p class="field-label">Theme</p>
          <div class="seg" data-theme-seg>
            ${[['system', '📱 Auto'], ['light', '☀️ Light'], ['dark', '🌙 Dark']].map(([v, l]) => html`<button class="${st.theme === v ? 'on' : ''}" data-theme="${v}">${l}</button>`)}
          </div>
          <label class="toggle"><span>Show snack slot in planner</span><input type="checkbox" data-toggle="showSnack" ${st.showSnack ? 'checked' : ''} /></label>
          <label class="toggle"><span>Keep screen on while cooking</span><input type="checkbox" data-toggle="keepAwake" ${st.keepAwake ? 'checked' : ''} /></label>
          <div class="grid-2">
            <label class="field"><span>Week starts</span>
              <select class="input" data-set="weekStart">
                <option value="1" ${st.weekStart === 1 ? 'selected' : ''}>Monday</option>
                <option value="0" ${st.weekStart === 0 ? 'selected' : ''}>Sunday</option>
                <option value="6" ${st.weekStart === 6 ? 'selected' : ''}>Saturday</option>
              </select></label>
            <label class="field"><span>Default servings</span>
              <input class="input" type="number" min="1" inputmode="numeric" data-set="defaultServings" value="${st.defaultServings}" /></label>
          </div>
        </div>
      </section>

      <section class="section">
        <h2 class="label">Shopping list</h2>
        <div class="card form-card">
          <label class="field"><span>Pantry staples <small class="muted">never added to the list automatically</small></span>
            <textarea class="input" rows="3" data-set="staples">${st.staples.join(', ')}</textarea></label>
        </div>
      </section>

      <section class="section">
        <h2 class="label">Import from links</h2>
        <div class="card form-card">
          <label class="field"><span>Spoonacular API key <small class="muted">optional · free at spoonacular.com/food-api</small></span>
            <input class="input" data-set="spoonacularKey" value="${st.spoonacularKey}" placeholder="Paste your key" autocomplete="off" spellcheck="false" /></label>
          <p class="muted small">Stored only on this device. Without a key you can still paste recipe text or use Discover.</p>
        </div>
      </section>

      <section class="section">
        <h2 class="label">Your data</h2>
        <div class="card form-card">
          <p class="small">Everything is saved on this device as JSON: <b>${s.recipes.length}</b> recipes, <b>${Object.keys(s.plan).length}</b> planned days, <b>${s.shopping.length}</b> list items (${sizeKb} KB).
            ${est ? html` Using ${Math.round((est.usage || 0) / 1024 / 1024 * 10) / 10} MB of ${Math.round((est.quota || 0) / 1024 / 1024)} MB available.` : ''}</p>
          <p class="small ${persisted ? 'ok-text' : 'muted'}">${persisted ? '🔒 Storage is protected from automatic clean-up.' : 'ℹ️ Back up regularly – the browser may clear data from apps you haven’t opened in a while' + (install.standalone ? '.' : ' (installing the app helps).')}</p>
          <div class="stack mt-s">
            <button class="btn primary block" data-export>💾 Back up (download JSON)</button>
            <button class="btn ghost block" data-share-backup>📤 Share backup file</button>
            <label class="btn ghost block">📥 Restore from JSON<input type="file" accept="application/json,.json" data-import hidden /></label>
            <button class="btn ghost block" data-view-json>🔎 View raw JSON</button>
          </div>
          <p class="muted small mt-s">Moving to a new phone? Back up here, send the file to yourself, then restore on the new phone.</p>
        </div>
      </section>

      <section class="section">
        <h2 class="label">Danger zone</h2>
        <div class="card form-card stack">
          <button class="btn ghost block danger-text" data-clear-plan>Clear the whole meal plan</button>
          <button class="btn danger block" data-reset>Erase all data</button>
        </div>
      </section>

      <p class="center muted small about">Foodie v${APP_VERSION} · made with 🍓<br />Works offline · no account needed</p>
    `);
  };

  draw();

  on(el, 'click', '[data-theme]', (e, b) => {
    store.update(s => { s.settings.theme = b.dataset.theme; });
    applyTheme(b.dataset.theme);
    el.querySelectorAll('[data-theme]').forEach(x => x.classList.toggle('on', x === b));
  });
  on(el, 'change', '[data-toggle]', (e, c) => store.update(s => { s.settings[c.dataset.toggle] = c.checked; }));
  on(el, 'change', '[data-set]', (e, c) => {
    const k = c.dataset.set;
    let v = c.value;
    if (k === 'weekStart') v = Number(v);
    if (k === 'defaultServings') v = Math.max(1, Number(v) || 2);
    if (k === 'staples') v = v.split(/[,\n]/).map(x => x.trim().toLowerCase()).filter(Boolean);
    if (typeof v === 'string') v = v.trim();
    store.update(s => { s.settings[k] = v; });
    toast('Saved');
  });

  const fileName = () => `foodie-backup-${new Date().toISOString().slice(0, 10)}.json`;
  on(el, 'click', '[data-export]', () => {
    downloadFile(fileName(), store.exportJSON());
    store.update(s => { s.settings.lastBackup = Date.now(); });
  });
  on(el, 'click', '[data-share-backup]', async () => {
    const file = new File([store.exportJSON()], fileName(), { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Foodie backup' }); store.update(s => { s.settings.lastBackup = Date.now(); }); }
      catch (e) { /* cancelled */ }
    } else {
      downloadFile(file.name, store.exportJSON());
    }
  });
  on(el, 'change', '[data-import]', async (e, input) => {
    const f = input.files[0];
    if (!f) return;
    const text = await f.text();
    input.value = '';
    const sh = sheet(String(html`
      <p>How should we use <b>${f.name}</b>?</p>
      <div class="stack mt">
        <button class="btn primary block" data-mode="merge">Merge with what I have</button>
        <button class="btn ghost block danger-text" data-mode="replace">Replace everything</button>
      </div>`), { title: 'Restore backup' });
    on(sh.el, 'click', '[data-mode]', (ev, b) => {
      try {
        const n = store.importJSON(text, b.dataset.mode);
        applyTheme(store.get().settings.theme);
        toast(`Restored – ${n} recipe${n === 1 ? '' : 's'} added`);
        sh.close();
        draw();
      } catch (err) {
        toast(err.message.includes('JSON') ? 'That file isn’t valid JSON' : err.message);
      }
    });
  });
  on(el, 'click', '[data-view-json]', () => {
    const text = store.exportJSON();
    const sh = sheet(`<pre class="json-view"></pre><button class="btn primary block mt" data-copy>Copy JSON</button>`, { title: 'Raw data', className: 'tall' });
    sh.el.querySelector('pre').textContent = text.length > 200000 ? text.slice(0, 200000) + '\n…' : text;
    sh.el.querySelector('[data-copy]').addEventListener('click', () => navigator.clipboard.writeText(text).then(() => toast('Copied')));
  });
  on(el, 'click', '[data-clear-plan]', async () => {
    if (await confirmSheet('Every planned meal (past and future) will be removed.', { ok: 'Clear plan', danger: true })) {
      store.update(s => { s.plan = {}; });
      toast('Meal plan cleared');
      draw();
    }
  });
  on(el, 'click', '[data-reset]', async () => {
    if (await confirmSheet('All recipes, plans and lists on this device will be erased. Back up first if you might want them.', { ok: 'Erase everything', danger: true, title: 'Erase all data?' })) {
      store.resetAll();
      toast('All data erased');
      location.hash = '#/';
    }
  });
}
