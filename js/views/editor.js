import * as store from '../store.js';
import { CATEGORIES } from '../store.js';
import { html, on, toast, resizeImage, confirmSheet, sheet } from '../ui.js';
import { parseRecipeText, importFromUrl, normalizeUrl } from '../importers.js';

export default function editor(el, [id], query) {
  const isNew = id === 'new';
  const existing = isNew ? null : store.recipeById(id);
  if (!isNew && !existing) { location.hash = '#/recipes'; return; }

  const r = existing ? { ...existing } : {
    id: store.uid(), title: '', image: '', category: '', tags: [], prepMin: 0, cookMin: 0,
    servings: store.get().settings.defaultServings, ingredients: [], steps: [], notes: '', sourceUrl: ''
  };
  let dirty = false;
  let image = r.image;

  el.innerHTML = String(html`
    <header class="page-head compact">
      <button class="icon-btn" data-cancel aria-label="Cancel">✕</button>
      <h1 class="grow center">${isNew ? 'New recipe' : 'Edit recipe'}</h1>
      <button class="btn small primary" data-save>Save</button>
    </header>

    ${isNew ? html`
      <div class="import-bar">
        <button class="chip" data-import="paste">📋 Paste text</button>
        <button class="chip" data-import="url">🔗 From link</button>
      </div>` : ''}

    <form class="form" data-form autocomplete="off">
      <label class="photo-pick" data-photo>
        <input type="file" accept="image/*" data-file hidden />
        <div class="photo-preview" data-preview></div>
        <span class="photo-hint">📷 ${image ? 'Change photo' : 'Add a photo'}</span>
      </label>
      <div class="row gap-s">
        <input class="input grow" type="url" name="imageUrl" placeholder="…or paste an image link" value="${/^https?:/.test(image) ? image : ''}" />
        <button type="button" class="btn ghost small" data-clear-photo ${image ? '' : 'hidden'}>Remove</button>
      </div>

      <label class="field">
        <span>Title</span>
        <input class="input big" name="title" required placeholder="e.g. Grandma’s lasagne" value="${r.title}" />
      </label>

      <div class="grid-2">
        <label class="field">
          <span>Category</span>
          <select class="input" name="category">
            <option value="">—</option>
            ${CATEGORIES.map(c => html`<option ${r.category === c ? 'selected' : ''}>${c}</option>`)}
          </select>
        </label>
        <label class="field">
          <span>Servings</span>
          <input class="input" name="servings" type="number" inputmode="numeric" min="1" value="${r.servings}" />
        </label>
        <label class="field">
          <span>Prep (min)</span>
          <input class="input" name="prepMin" type="number" inputmode="numeric" min="0" value="${r.prepMin || ''}" placeholder="0" />
        </label>
        <label class="field">
          <span>Cook (min)</span>
          <input class="input" name="cookMin" type="number" inputmode="numeric" min="0" value="${r.cookMin || ''}" placeholder="0" />
        </label>
      </div>

      <label class="field">
        <span>Ingredients <small class="muted">one per line · end a line with “:” for a heading</small></span>
        <textarea class="input" name="ingredients" rows="8" placeholder="2 cups flour&#10;1 tsp salt&#10;Sauce:&#10;400 g tomatoes">${r.ingredients.join('\n')}</textarea>
      </label>

      <label class="field">
        <span>Method <small class="muted">one step per line</small></span>
        <textarea class="input" name="steps" rows="8" placeholder="Preheat oven to 180°C.&#10;Mix everything together.&#10;Bake for 25 minutes.">${r.steps.join('\n')}</textarea>
      </label>

      <label class="field">
        <span>Tags <small class="muted">comma separated</small></span>
        <input class="input" name="tags" placeholder="vegetarian, quick, kids" value="${r.tags.join(', ')}" />
      </label>

      <label class="field">
        <span>Notes</span>
        <textarea class="input" name="notes" rows="3" placeholder="Tips, swaps, who loved it…">${r.notes}</textarea>
      </label>

      <label class="field">
        <span>Source link</span>
        <input class="input" name="sourceUrl" type="url" placeholder="https://" value="${r.sourceUrl}" />
      </label>

      <button class="btn primary block" type="submit">${isNew ? 'Save recipe' : 'Save changes'}</button>
    </form>
  `);

  const form = el.querySelector('[data-form]');
  const preview = el.querySelector('[data-preview]');
  const drawPreview = () => {
    preview.innerHTML = image ? `<img src="${image.replace(/"/g, '&quot;')}" alt="" />` : '<span class="big-emoji">🍽️</span>';
    el.querySelector('.photo-hint').textContent = image ? '📷 Change photo' : '📷 Add a photo';
    el.querySelector('[data-clear-photo]').hidden = !image;
  };
  drawPreview();

  form.addEventListener('input', () => { dirty = true; });
  el.querySelector('[data-file]').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      image = await resizeImage(f);
      form.imageUrl.value = '';
      dirty = true;
      drawPreview();
    } catch (err) { toast(err.message); }
  });
  form.imageUrl.addEventListener('change', () => { image = form.imageUrl.value.trim(); drawPreview(); });
  on(el, 'click', '[data-clear-photo]', () => { image = ''; form.imageUrl.value = ''; dirty = true; drawPreview(); });

  const fill = data => {
    if (data.title) form.title.value = data.title;
    if (data.ingredients?.length) form.ingredients.value = data.ingredients.join('\n');
    if (data.steps?.length) form.steps.value = data.steps.join('\n');
    if (data.servings) form.servings.value = data.servings;
    if (data.prepMin) form.prepMin.value = data.prepMin;
    if (data.cookMin) form.cookMin.value = data.cookMin;
    if (data.notes) form.notes.value = data.notes;
    if (data.sourceUrl) form.sourceUrl.value = data.sourceUrl;
    if (data.tags?.length) form.tags.value = data.tags.join(', ');
    if (data.category) form.category.value = data.category;
    if (data.image) { image = data.image; form.imageUrl.value = data.image; drawPreview(); }
    dirty = true;
  };

  // A pasted "recipe" that's really just a link
  const onlyLink = t => { const s = t.trim(); return !/\n/.test(s) && s.length < 600 && normalizeUrl(s) && s.split(/\s+/).length <= 8; };

  const openPaste = (prefill = '') => {
    const sh = sheet(String(html`
      <p class="muted small">Copy a recipe from a website, message or note and paste it here – or just paste a link to a recipe page. No account or API key needed.</p>
      <div class="row gap-s mb-s"><button type="button" class="btn small ghost" data-clip>📋 Paste from clipboard</button></div>
      <textarea class="input" rows="10" data-text autofocus placeholder="Paste the whole recipe or a link…">${prefill}</textarea>
      <button class="btn primary block mt" data-go>Fill in the recipe</button>`), { title: 'Paste a recipe' });
    const ta = sh.el.querySelector('[data-text]');
    const clip = sh.el.querySelector('[data-clip]');
    if (!navigator.clipboard || !navigator.clipboard.readText) clip.hidden = true;
    clip.addEventListener('click', async () => {
      try { ta.value = await navigator.clipboard.readText(); }
      catch (e) { toast('Long-press the box and choose Paste'); ta.focus(); }
    });
    sh.el.querySelector('[data-go]').addEventListener('click', () => {
      const text = ta.value;
      if (onlyLink(text)) { sh.close(); setTimeout(() => openUrl(normalizeUrl(text), true), 280); return; }
      const parsed = parseRecipeText(text);
      if (!parsed) return toast('Paste some text first');
      fill(parsed);
      sh.close();
      toast(`Found ${parsed.ingredients.length} ingredients and ${parsed.steps.length} steps – check them over`);
    });
  };

  const openUrl = (prefill = '', autostart = false) => {
    const key = store.get().settings.spoonacularKey;
    const sh = sheet(String(html`
      <p class="muted small">Works with most recipe websites – no API key needed. If a site won’t import, copy its text and use <b>Paste text</b> instead.</p>
      <input class="input" type="url" inputmode="url" data-url placeholder="https://www.example.com/best-brownies" value="${prefill}" autofocus />
      <div class="notice mt-s" data-fail hidden>
        <p data-fail-msg></p>
        <div class="row gap-s wrap">
          <a class="btn small ghost" data-open-page target="_blank" rel="noopener">↗ Open the page</a>
          <button type="button" class="btn small primary" data-to-paste>📋 Paste text instead</button>
        </div>
      </div>
      <button class="btn primary block mt" data-go>Import</button>`), { title: 'Import from a link' });
    const go = sh.el.querySelector('[data-go]');
    const fail = sh.el.querySelector('[data-fail]');
    sh.el.querySelector('[data-to-paste]').addEventListener('click', () => { sh.close(); setTimeout(() => openPaste(), 280); });
    const run = async () => {
      const url = sh.el.querySelector('[data-url]').value.trim();
      if (!url) return;
      fail.hidden = true;
      go.disabled = true; go.textContent = 'Reading the recipe…';
      try {
        const r = await importFromUrl(url, key);
        fill(r);
        sh.close();
        toast(`Imported ${r.ingredients.length} ingredients and ${r.steps.length} steps – check them over and save`);
      } catch (err) {
        sh.el.querySelector('[data-fail-msg]').textContent = err.message || 'Import failed';
        const page = sh.el.querySelector('[data-open-page]');
        page.hidden = !err.blocked;
        if (err.blocked) page.href = err.blocked;
        fail.hidden = false;
        go.disabled = false; go.textContent = 'Try again';
      }
    };
    go.addEventListener('click', run);
    sh.el.querySelector('[data-url]').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); run(); } });
    if (autostart && prefill) run();
  };

  on(el, 'click', '[data-import]', (e, b) => b.dataset.import === 'paste' ? openPaste() : openUrl());
  if (query.get('mode') === 'paste') setTimeout(() => openPaste(), 50);
  if (query.get('mode') === 'url') setTimeout(() => openUrl(), 50);
  if (query.get('mode') === 'shared') {
    // Something was shared to Foodie from another app (Android share sheet)
    let shared = '';
    try { shared = sessionStorage.getItem('foodie-shared') || ''; sessionStorage.removeItem('foodie-shared'); } catch (e) { /* ignore */ }
    const link = normalizeUrl(shared);
    // Browsers usually share "title + link"; a long text with a link in it is a pasted recipe
    setTimeout(() => (link && shared.length < 400 ? openUrl(link, true) : openPaste(shared)), 50);
  }

  const save = () => {
    const f = new FormData(form);
    const title = String(f.get('title') || '').trim();
    if (!title) { form.title.focus(); toast('Give your recipe a name'); return; }
    const saved = store.saveRecipe({
      ...r,
      title,
      image,
      category: f.get('category'),
      servings: Math.max(1, Number(f.get('servings')) || 1),
      prepMin: Number(f.get('prepMin')) || 0,
      cookMin: Number(f.get('cookMin')) || 0,
      ingredients: String(f.get('ingredients')),
      steps: String(f.get('steps')),
      tags: String(f.get('tags')),
      notes: String(f.get('notes')).trim(),
      sourceUrl: String(f.get('sourceUrl')).trim(),
      createdAt: r.createdAt || Date.now()
    });
    dirty = false;
    toast(isNew ? 'Recipe saved 🎉' : 'Changes saved');
    location.replace('#/recipe/' + saved.id);
  };

  form.addEventListener('submit', e => { e.preventDefault(); save(); });
  on(el, 'click', '[data-save]', save);
  on(el, 'click', '[data-cancel]', async () => {
    if (dirty && !(await confirmSheet('Your changes haven’t been saved.', { ok: 'Discard', danger: true, title: 'Discard changes?' }))) return;
    dirty = false;
    history.length > 1 ? history.back() : (location.hash = '#/recipes');
  });

  const beforeUnload = e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
  window.addEventListener('beforeunload', beforeUnload);
  return () => window.removeEventListener('beforeunload', beforeUnload);
}
