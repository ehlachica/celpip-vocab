# CELPIP Daily Vocab (400)

Static GitHub Pages site.

## Structure
- `index.html` — markup only
- `assets/css/styles.css` — styles
- `assets/js/app.js` — main app (UI + state + events)
- `assets/js/config.js` — Supabase config + localStorage key
- `assets/js/words-data.js` — the raw 400-word list
- `assets/js/words.js` — parses word list into objects
- `assets/js/utils.js` — helpers (RNG, search scoring, etc.)
- `assets/js/storage.js` — local save/load
- `assets/js/toast.js` — toast UI
- `assets/js/supabase.js` — creates Supabase client safely (no duplicate `supabase` identifier)

## GitHub Pages
Works as-is (relative paths).
