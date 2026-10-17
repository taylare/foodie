# 🍜 Foodie

Recipes, meal planning and a self-writing shopping list — an installable phone app that works offline.

Foodie is plain HTML, CSS and JavaScript. There's no server, no build step and no account: all your data is saved **on your device as JSON**, and you can back it up or move it to another phone as a `.json` file.

## Features

**Recipes**
- Add recipes by typing, **pasting text** from anywhere (title, ingredients and steps are found for you), or importing from a link (optional Spoonacular key)
- Photos from your camera or gallery, shrunk automatically so they don't fill your storage
- Categories, tags, prep/cook time, notes, source link, ★ ratings and favourites
- Search across titles, ingredients and tags; filter by category, tag or favourite; sort by newest, A–Z, rating, quickest or most cooked
- **Scale servings**: ingredient amounts recalculate, with fractions (1½ cups → 3 cups)
- Tick off ingredients as you go, share a recipe as text, duplicate, print, or export it as JSON

**Cook mode**
- Full-screen, one step at a time, swipe between steps
- Times in a step ("simmer for 10 minutes") become **tap-to-start timers** with sound, vibration and a notification
- Keeps the screen on while you cook

**Meal planner**
- A week at a time, with breakfast, lunch, dinner and an optional snack
- Tap a slot to pick a recipe, or add a note like *Leftovers* or *Eating out*
- Change servings per meal, swap, move or remove meals, with undo
- **Fill gaps** with your recipes (favourites and top-rated come up more often), copy last week, repeat this week, share the plan

**Shopping list**
- Built from your meal plan or a single recipe, with servings applied
- Matching ingredients are **merged** (2 eggs + 1 egg = 3 eggs, 1 tsp + 1 tbsp sugar = 1⅓ tbsp)
- Sorted **by supermarket aisle** or by recipe
- Pantry staples (salt, pepper, oil…) are skipped. You choose which ones.
- Add your own items (`2 L milk, bread, bananas`), tick them off, edit them, share the list

**Discover**
- Browse and search thousands of free recipes from [TheMealDB](https://www.themealdb.com) and save them in one tap

**Also included**
- Today screen with today's meals, a "what should I cook?" random pick, favourites and stats
- Light and dark themes (or follow the phone's setting)
- Works offline, installs to the home screen, updates itself

## Install on your phone

1. Open the site on your phone (see *Deploy* below for the address).
2. **iPhone / iPad (Safari):** tap **Share** ⬆︎ → **Add to Home Screen**.
   **Android (Chrome):** tap **Install app** on the Today screen, or ⋮ → **Install app**.
3. Open Foodie from your home screen. It runs full-screen and works without internet.

## Your data

- Everything lives on the device (IndexedDB), stored as one JSON document.
- **Settings → Back up** downloads or shares a `foodie-backup-YYYY-MM-DD.json` file. **Restore** can merge a backup with your data or replace it.
- To move to a new phone, back up on the old one, send the file to yourself, then restore it on the new one.
- Data isn't synced between devices automatically.

## Deploy (GitHub Pages)

The workflow in `.github/workflows/pages.yml` publishes the site whenever you push to `main`.

1. Push this repo to GitHub.
2. Go to **Settings → Pages** and set **Source** to **GitHub Actions** (the workflow also tries to turn this on for you).
3. After the action finishes, the app is live at `https://<your-username>.github.io/<repo-name>/`.

Every path in the app is relative, so it works from a sub-folder like this.

**Publishing an update:** change `VERSION` in `sw.js` (for example `foodie-v2.0.1`) whenever you change app files. Installed apps then show an **Update** prompt.

## Run it locally

Any static web server works. For example:

```sh
php -S localhost:8080        # or
npx serve .                  # or
python -m http.server 8080
```

Then open http://localhost:8080. (Opening `index.html` straight from disk won't work, because ES modules and service workers need `http://`.)

## Project layout

```
index.html            app shell + tab bar
manifest.webmanifest  install info (name, icons, colours)
sw.js                 offline cache / updates
css/app.css           all styles (light + dark)
js/app.js             router + startup
js/store.js           JSON data store (IndexedDB), backup/restore
js/ingredients.js     ingredient parsing, scaling, merging, aisles, timers
js/importers.js       paste parser, TheMealDB, Spoonacular
js/shoplist.js        builds the shopping list
js/pickers.js         shared bottom sheets
js/views/*.js         one file per screen
icons/                app icons
```

The old PHP/MySQL version is in the git history.
