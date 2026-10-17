import * as store from '../store.js';
import { CATEGORIES } from '../store.js';
import { html, on, toast, resizeImage, confirmSheet } from '../ui.js';
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
      <section class="card import-card" data-import-card>
        <div class="seg small" role="tablist">
          <button type="button" class="on" data-tab="url">🔗 From a link</button>
          <button type="button" data-tab="paste">📋 Paste text</button>
        </div>

        <div class="import-pane" data-pane="url">
          <p class="muted small">Copy a recipe page’s address, then paste it here. No API key needed.</p>
          <div class="input-paste">
            <input class="input" type="text" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go" data-url placeholder="https://www.example.com/best-brownies" />
            <button type="button" class="btn small primary" data-paste-url>📋 Paste</button>
          </div>
          <div class="notice mt-s" data-fail hidden>
            <p data-fail-msg></p>
            <div class="row gap-s wrap">
              <a class="btn small ghost" data-open-page target="_blank" rel="noopener">↗ Open the page</a>
              <button type="button" class="btn small primary" data-tab="paste">📋 Paste text instead</button>
            </div>
          </div>
          <button type="button" class="btn primary block mt-s" data-go-url>Import recipe</button>
        </div>

        <div class="import-pane" data-pane="paste" hidden>
          <p class="muted small">Copy a recipe’s text from a website, message or note and paste it here. We’ll sort out the title, ingredients and steps.</p>
          <textarea class="input" rows="7" data-text placeholder="Paste the whole recipe…"></textarea>
          <div class="row gap-s mt-s">
            <button type="button" class="btn small ghost" data-clip>📋 Paste</button>
            <button type="button" class="btn primary grow" data-go-text>Fill in the recipe</button>
          </div>
        </div>
      </section>
      <p class="or-divider"><span>or type it in</span></p>` : ''}

    <form class="form" data-form autocomplete="off">
      <label class="photo-pick" data-photo>
        <input type="file" accept="image/*" data-file hidden />
        <div class="photo-preview" data-preview></div>
        <span class="photo-hint">📷 ${image ? 'Change photo' : 'Add a photo'}</span>
      </label>
      <div class="row gap-s">
        <input class="input grow" type="text" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" name="imageUrl" placeholder="…or paste an image link" value="${/^https?:/.test(image) ? image : ''}" />
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
        <input class="input" name="sourceUrl" type="text" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="https://" value="${r.sourceUrl}" />
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

  // ---------- import card (inline on the page, not in a pop-up: iOS won't paste
  // into fields inside the floating sheets) ----------
  if (isNew) {
    const card = el.querySelector('[data-import-card]');
    const urlField = card.querySelector('[data-url]');
    const textBox = card.querySelector('[data-text]');
    const goUrl = card.querySelector('[data-go-url]');
    const fail = card.querySelector('[data-fail]');
    const hasReadText = !!(navigator.clipboard && navigator.clipboard.readText);

    const showTab = name => {
      card.querySelectorAll('.seg [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
      card.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== name; });
    };
    on(card, 'click', '[data-tab]', (e, b) => showTab(b.dataset.tab));

    // A pasted "recipe" that's really just a link
    const onlyLink = t => { const s = t.trim(); return !/\n/.test(s) && s.length < 600 && normalizeUrl(s) && s.split(/\s+/).length <= 8; };

    const done = msg => {
      toast(msg);
      // Show the filled-in form
      requestAnimationFrame(() => form.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    };

    // Read the clipboard. iOS sometimes never answers, so give up after a few seconds.
    const readClipboard = () => Promise.race([
      navigator.clipboard.readText(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))
    ]);
    const pasteHelp = field => {
      field.focus();
      toast('Tap the box, hold your finger down, then tap Paste', { duration: 5000 });
    };

    const runUrl = async () => {
      const url = urlField.value.trim();
      if (!url) { urlField.focus(); return; }
      fail.hidden = true;
      goUrl.disabled = true; goUrl.textContent = 'Reading the recipe…';
      try {
        const rec = await importFromUrl(url, store.get().settings.spoonacularKey);
        fill(rec);
        done(`Imported ${rec.ingredients.length} ingredients and ${rec.steps.length} steps – check them over and save`);
      } catch (err) {
        card.querySelector('[data-fail-msg]').textContent = err.message || 'Import failed';
        const page = card.querySelector('[data-open-page]');
        page.hidden = !err.blocked;
        if (err.blocked) page.href = err.blocked;
        fail.hidden = false;
      } finally {
        goUrl.disabled = false; goUrl.textContent = 'Import recipe';
      }
    };

    const runText = () => {
      const text = textBox.value;
      if (onlyLink(text)) { urlField.value = normalizeUrl(text); textBox.value = ''; showTab('url'); runUrl(); return; }
      const parsed = parseRecipeText(text);
      if (!parsed) { textBox.focus(); toast('Paste some text first'); return; }
      fill(parsed);
      done(`Found ${parsed.ingredients.length} ingredients and ${parsed.steps.length} steps – check them over`);
    };

    goUrl.addEventListener('click', runUrl);
    urlField.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); runUrl(); } });
    // Pasting a link the normal way (hold → Paste) starts the import straight away
    urlField.addEventListener('paste', () => setTimeout(() => {
      const link = normalizeUrl(urlField.value);
      if (link && !goUrl.disabled) { urlField.value = link; runUrl(); }
    }, 0));
    card.querySelector('[data-go-text]').addEventListener('click', runText);

    const pasteUrlBtn = card.querySelector('[data-paste-url]');
    const clipBtn = card.querySelector('[data-clip]');
    if (!hasReadText) { pasteUrlBtn.hidden = true; clipBtn.hidden = true; }
    pasteUrlBtn.addEventListener('click', async () => {
      let text;
      try { text = await readClipboard(); } catch (e) { pasteHelp(urlField); return; }
      const link = normalizeUrl(text);
      if (!link) { toast('There’s no link on your clipboard – copy the recipe page’s address first', { duration: 5000 }); return; }
      urlField.value = link;
      runUrl();
    });
    clipBtn.addEventListener('click', async () => {
      try { textBox.value = await readClipboard(); } catch (e) { pasteHelp(textBox); }
    });

    const mode = query.get('mode');
    if (mode === 'paste') showTab('paste');
    if (mode === 'shared') {
      // Something was shared to Foodie from another app (Android share sheet)
      let shared = '';
      try { shared = sessionStorage.getItem('foodie-shared') || ''; sessionStorage.removeItem('foodie-shared'); } catch (e) { /* ignore */ }
      const link = normalizeUrl(shared);
      // Browsers usually share "title + link"; a long text with a link in it is a pasted recipe
      if (link && shared.length < 400) { urlField.value = link; runUrl(); }
      else { textBox.value = shared; showTab('paste'); }
    }
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
