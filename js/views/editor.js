import * as store from '../store.js';
import { CATEGORIES } from '../store.js';
import { html, on, toast, resizeImage, confirmSheet, sheet } from '../ui.js';
import { parseRecipeText, importFromUrl } from '../importers.js';

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

  const openPaste = () => {
    const sh = sheet(String(html`
      <p class="muted small">Copy a recipe from a website, message or note and paste it here. We’ll find the title, ingredients and steps.</p>
      <textarea class="input" rows="10" data-text autofocus placeholder="Paste the whole recipe…"></textarea>
      <button class="btn primary block mt" data-go>Fill in the recipe</button>`), { title: 'Paste a recipe' });
    sh.el.querySelector('[data-go]').addEventListener('click', () => {
      const parsed = parseRecipeText(sh.el.querySelector('[data-text]').value);
      if (!parsed) return toast('Paste some text first');
      fill(parsed);
      sh.close();
      toast(`Found ${parsed.ingredients.length} ingredients and ${parsed.steps.length} steps – check them over`);
    });
  };

  const openUrl = () => {
    const key = store.get().settings.spoonacularKey;
    const sh = sheet(String(html`
      ${key ? '' : html`<p class="notice">Importing from links needs a free Spoonacular API key. <a href="#/settings">Add it in Settings</a>. Or use <b>Paste text</b> instead – it works without a key.</p>`}
      <input class="input" type="url" data-url placeholder="https://www.example.com/best-brownies" autofocus />
      <button class="btn primary block mt" data-go ${key ? '' : 'disabled'}>Import</button>`), { title: 'Import from a link' });
    const go = sh.el.querySelector('[data-go]');
    go.addEventListener('click', async () => {
      const url = sh.el.querySelector('[data-url]').value.trim();
      if (!url) return;
      go.disabled = true; go.textContent = 'Importing…';
      try {
        fill(await importFromUrl(url, key));
        sh.close();
        toast('Imported! Check it over and save');
      } catch (err) {
        toast(err.message || 'Import failed');
        go.disabled = false; go.textContent = 'Import';
      }
    });
  };

  on(el, 'click', '[data-import]', (e, b) => b.dataset.import === 'paste' ? openPaste() : openUrl());
  if (query.get('mode') === 'paste') setTimeout(openPaste, 50);
  if (query.get('mode') === 'url') setTimeout(openUrl, 50);

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
