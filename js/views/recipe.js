import * as store from '../store.js';
import { html, on, thumb, stars, sheet, toast, confirmSheet, minutesLabel, shareText, downloadFile, haptic } from '../ui.js';
import { scaleLine } from '../ingredients.js';
import { planRecipe } from '../pickers.js';
import { addLines, recipeLines } from '../shoplist.js';

export default function recipe(el, [id], query) {
  let r = store.recipeById(id);
  if (!r) {
    el.innerHTML = String(html`<div class="empty pad-top"><div class="empty-emoji">🤷</div><h3>Recipe not found</h3><a class="btn primary" href="#/recipes">Back to recipes</a></div>`);
    return;
  }
  let servings = Number(query.get('servings')) || r.servings;
  const checked = new Set();

  const draw = () => {
    r = store.recipeById(id);
    if (!r) { location.hash = '#/recipes'; return; }
    const factor = servings / (r.servings || 1);
    const total = r.prepMin + r.cookMin;
    el.innerHTML = String(html`
      <div class="hero">
        ${thumb(r, 'hero-img')}
        <div class="hero-bar">
          <button class="icon-btn glass" data-back aria-label="Back">←</button>
          <div class="row gap-s">
            <button class="icon-btn glass ${r.favorite ? 'fav-on' : ''}" data-fav aria-label="Favourite">${r.favorite ? '♥' : '♡'}</button>
            <button class="icon-btn glass" data-more aria-label="More">⋯</button>
          </div>
        </div>
      </div>

      <article class="recipe-sheet">
        <div class="tag-row">
          ${r.category ? html`<span class="pill">${r.category}</span>` : ''}
          ${r.tags.map(t => html`<a class="pill soft" href="#/recipes?tag=${encodeURIComponent(t.toLowerCase())}">#${t}</a>`)}
        </div>
        <h1 class="recipe-title">${r.title}</h1>
        <div class="row between wrap gap-s">
          <div data-rating>${stars(r.rating, true)}</div>
          <span class="muted small">${r.cookedCount ? `Cooked ${r.cookedCount}× · last ${new Date(r.lastCooked).toLocaleDateString()}` : 'Not cooked yet'}</span>
        </div>

        <div class="facts">
          ${r.prepMin ? html`<div><small>Prep</small><b>${minutesLabel(r.prepMin)}</b></div>` : ''}
          ${r.cookMin ? html`<div><small>Cook</small><b>${minutesLabel(r.cookMin)}</b></div>` : ''}
          ${total ? html`<div><small>Total</small><b>${minutesLabel(total)}</b></div>` : ''}
          <div><small>Steps</small><b>${r.steps.length}</b></div>
        </div>

        <div class="action-row">
          <a class="btn primary grow" href="#/cook/${r.id}?servings=${servings}">👩‍🍳 Start cooking</a>
          <button class="btn ghost" data-plan>🗓️ Plan</button>
          <button class="btn ghost" data-shop>🛒 List</button>
        </div>

        <section class="section">
          <div class="section-head">
            <h2>Ingredients</h2>
            <div class="stepper small">
              <button type="button" data-serv="-1" aria-label="Fewer servings">−</button>
              <output>${servings} serving${servings === 1 ? '' : 's'}</output>
              <button type="button" data-serv="1" aria-label="More servings">+</button>
            </div>
          </div>
          ${factor !== 1 ? html`<p class="muted small">Scaled from ${r.servings} servings. <button class="link-btn" data-reset-serv>Reset</button></p>` : ''}
          <ul class="ing-list">
            ${r.ingredients.map((line, i) => {
              const isHead = /:$/.test(line);
              if (isHead) return html`<li class="ing-head">${line.replace(/:$/, '')}</li>`;
              return html`<li><label class="check ${checked.has(i) ? 'done' : ''}">
                <input type="checkbox" data-ing="${i}" ${checked.has(i) ? 'checked' : ''} />
                <span>${scaleLine(line, factor).text}</span></label></li>`;
            })}
          </ul>
        </section>

        <section class="section">
          <h2>Method</h2>
          <ol class="steps">
            ${r.steps.map(st => html`<li><p>${st}</p></li>`)}
          </ol>
        </section>

        ${r.notes ? html`<section class="section"><h2>Notes</h2><p class="notes">${r.notes}</p></section>` : ''}
        ${r.sourceUrl ? html`<p class="small muted">Source: <a href="${r.sourceUrl}" target="_blank" rel="noopener">${hostOf(r.sourceUrl)}</a></p>` : ''}

        <button class="btn ghost block mt" data-cooked>✅ I made this</button>
      </article>
    `);
  };

  draw();

  on(el, 'click', '[data-back]', () => history.length > 1 ? history.back() : (location.hash = '#/recipes'));
  on(el, 'click', '[data-fav]', () => { haptic(); store.update(() => { r.favorite = !r.favorite; }); draw(); });
  on(el, 'click', '[data-rate]', (e, b) => {
    const v = Number(b.dataset.rate);
    store.update(() => { r.rating = r.rating === v ? 0 : v; });
    haptic(); draw();
  });
  on(el, 'click', '[data-serv]', (e, b) => { servings = Math.max(1, servings + Number(b.dataset.serv)); draw(); });
  on(el, 'click', '[data-reset-serv]', () => { servings = r.servings; draw(); });
  on(el, 'change', '[data-ing]', (e, c) => {
    const i = Number(c.dataset.ing);
    c.checked ? checked.add(i) : checked.delete(i);
    c.closest('.check').classList.toggle('done', c.checked);
  });
  on(el, 'click', '[data-plan]', () => planRecipe(r));
  on(el, 'click', '[data-shop]', () => {
    const { added, total } = addLines(recipeLines(r, servings));
    haptic(15);
    toast(added ? `Added ${added} item${added === 1 ? '' : 's'} to your list` : total ? 'Already on your list – quantities updated' : 'Nothing to add (all staples)', {
      action: 'View', onAction: () => { location.hash = '#/shop'; }
    });
  });
  on(el, 'click', '[data-cooked]', () => {
    store.update(() => { r.cookedCount++; r.lastCooked = Date.now(); });
    haptic(20);
    toast('Nice one! 🎉 Logged as cooked');
    draw();
  });
  on(el, 'click', '[data-more]', () => moreMenu(r, servings));

  return store.subscribe(() => { if (!store.recipeById(id)) location.hash = '#/recipes'; });
}

function moreMenu(r, servings) {
  const sh = sheet(String(html`
    <div class="menu">
      <a href="#/edit/${r.id}">✏️ Edit recipe</a>
      <button data-m="share">📤 Share recipe</button>
      <button data-m="dup">📄 Duplicate</button>
      <button data-m="json">💾 Export as JSON</button>
      <button data-m="print">🖨️ Print</button>
      <button data-m="del" class="danger-text">🗑️ Delete</button>
    </div>`), { title: r.title });

  on(sh.el, 'click', '[data-m]', async (e, b) => {
    const m = b.dataset.m;
    if (m === 'share') {
      const factor = servings / (r.servings || 1);
      const text = `${r.title}\nServes ${servings}\n\nIngredients\n${r.ingredients.map(l => '• ' + scaleLine(l, factor).text).join('\n')}\n\nMethod\n${r.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}${r.notes ? '\n\nNotes\n' + r.notes : ''}\n\n— shared from Foodie`;
      sh.close();
      shareText(r.title, text);
    } else if (m === 'dup') {
      const copy = store.saveRecipe({ ...r, id: store.uid(), title: r.title + ' (copy)', extId: '', createdAt: Date.now(), cookedCount: 0, lastCooked: null });
      sh.close();
      location.hash = '#/edit/' + copy.id;
    } else if (m === 'json') {
      downloadFile(slug(r.title) + '.json', JSON.stringify(r, null, 2));
      sh.close();
    } else if (m === 'print') {
      sh.close();
      setTimeout(() => window.print(), 300);
    } else if (m === 'del') {
      sh.close();
      if (await confirmSheet(`"${r.title}" will be removed from your recipes and meal plan.`, { ok: 'Delete', danger: true, title: 'Delete recipe?' })) {
        const undo = store.deleteRecipe(r.id);
        location.hash = '#/recipes';
        toast('Recipe deleted', { action: 'Undo', onAction: undo, duration: 6000 });
      }
    }
  });
}

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'recipe';
function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }
