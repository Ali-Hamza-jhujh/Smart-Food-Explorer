# TasteAI — Smart Food Explorer

TasteAI is a static, front-end-only website that pairs real recipe data with
an AI assistant that recommends a dish based on your mood, cuisine, and
hunger level. Built with plain HTML, CSS, and JavaScript — no backend,
server, database, or framework required.

## Live features

| Page | What it does |
|---|---|
| **Home** (`index.html`) | Hero with a live "today's pick" photo, a 3-step "how it works" explainer, and a preview of featured dishes. |
| **Menu** (`menu.html`) | Browse real dishes with search-by-name, cuisine, and category filters, plus "Show more dishes" pagination. |
| **AI Recommendation** (`ai.html`) | Pick a mood, cuisine, and hunger level; the AI Food Assistant names one real dish that fits, explains why, and suggests three alternatives. |
| **Gallery** (`gallery.html`) | A shuffled photo grid across 8 cuisines with "Show more photos" pagination. |
| **Contact** (`contact.html`) | A contact form with client-side validation (name, email format, message length). No backend exists, so submitting shows a confirmation message only. |
| **Dish detail** (`product.html?id=...`) | Full recipe: photo, ingredients with measurements, instructions, and a video link when available. |

## Tech stack

- **HTML** — semantic `header` / `nav` / `main` / `section` / `article` / `form` / `footer`
- **CSS** — custom properties, Flexbox, Grid, media queries, hover effects, and a few restrained animations (spinner, fade-in)
- **JavaScript** — hamburger menu, form validation, dish filtering, `fetch()`-based API calls, dynamic DOM rendering, loading indicators
- **Data**: [TheMealDB](https://www.themealdb.com/api.php) — free, public recipe API (no key required)
- **AI**: [Google Gemini API](https://aistudio.google.com/apikey) (optional — see below)

No build step, no `npm install`, no server. Just open `index.html` in a browser, or serve the folder with any static server (e.g. VS Code's Live Server).

## File structure

```
tasteai/
├── index.html          Home
├── menu.html            Menu (search + filters)
├── ai.html              AI Recommendation
├── gallery.html         Gallery
├── contact.html         Contact form
├── product.html         Dish detail (?id=<TheMealDB id>)
├── css/
│   ├── base.css          Design tokens, typography, buttons, resets
│   ├── layout.css        Header, nav, hamburger, footer
│   └── components.css    Hero, cards, forms, AI panel, gallery, product page
└── js/
    ├── api.js            Shared TheMealDB helpers (fetch, search, filter, fallback logic)
    ├── main.js           Hamburger menu + active nav link, shared on every page
    ├── home.js           Home page hero + featured dishes
    ├── menu.js           Menu search/filter + pagination
    ├── ai.js             The AI Food Assistant — see below
    ├── gallery.js         Gallery grid + pagination
    ├── product.js         Dish detail page
    └── contact.js         Contact form validation
```

## How the AI Assistant works

The whole flow lives in one entry-point function, `generateRecommendation()`
in `js/ai.js`:

```
form values (mood, cuisine, hunger)
        ↓
fetch the REAL dish list for that cuisine from TheMealDB
        ↓
ask Gemini to pick ONE dish from that exact list (+ 3 alternatives)
        ↓
   (no key, or Gemini fails) → fall back to a local rule-based pick
        ↓
look the chosen name back up in the same real dish list
        ↓
render name + real photo + reason + alternatives
```

The AI is deliberately **constrained to only choose from a list of dishes
that actually exist in TheMealDB**, fetched right before the AI call. This
guarantees the photo shown always matches the dish name — Gemini can't
recommend something (e.g. a very specific dish) that this particular
database doesn't have.

When the selected mood is **"Sweet"**, the pool also pulls in TheMealDB's
real `Dessert` category, since a single cuisine's data (e.g. Indian) is
almost entirely savory on its own and wouldn't otherwise have a genuine
sweet option to offer.

### Connecting your own Gemini API key

1. Get a free key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Open `js/ai.js` and paste it in at the top:
   ```js
   const GEMINI_API_KEY = 'your-real-key-here';
   ```
3. That's it. Reload the AI Recommendation page and submit the form.

**Without a key**, the page still works — it automatically falls back to a
local, rule-based recommender that picks from the same real dish list, so
the demo never breaks. A banner explains when this fallback is active.

⚠️ **This key is visible to anyone who views the page source.** That's
acceptable for a class project or demo, but never do this in a real
product — a real app should call Gemini through a backend or serverless
proxy that keeps the key private.

## Known quirks & troubleshooting

These came up during development and are worth knowing for a viva or if
something looks off:

- **"Pakistani" isn't a TheMealDB cuisine.** Requests for it are mapped to
  the closest real category the API has — `Indian` — since the dishes
  (karahi, biryani, kebabs) are shared across both cuisines. See
  `CUISINE_TO_AREA` in `js/api.js`.
- **TheMealDB's free shared test key can intermittently return an empty
  result** from the cuisine/category filter endpoint. `js/api.js` handles
  this by falling back to a curated list of real dishes for that cuisine,
  so the app never shows completely unrelated dishes.
- **Gemini key formats**: newer `AQ.`-prefixed keys from AI Studio can
  return a `401 ACCESS_TOKEN_TYPE_UNSUPPORTED` error with the public
  `generateContent` endpoint — a known, intermittent limitation on
  Google's side during their key-format rollout, not a bug in this code.
  If it happens, the app just falls back to demo mode automatically.
- **Model names change.** If Gemini responds with a 404 naming a newer
  model, update `GEMINI_MODEL` in `js/ai.js` to whatever name the error
  message suggests.
- **Newer Gemini models spend tokens "thinking"** before answering, which
  can leave little room for the actual reply if `maxOutputTokens` is too
  low. This is why the AI call uses a generous token budget and asks for
  a short answer.
- **No mixed-cuisine images.** Because the AI can only choose from dishes
  TheMealDB actually has, the photo and dish name are always guaranteed to
  match — there's no separate "search for a photo of this name" step that
  could return something unrelated.

## Assignment notes

This project is intentionally **fully static** — no backend, server-side
language, database, or framework — per typical front-end assignment
requirements. All "dynamic" behavior (search, filtering, the AI call,
pagination) happens client-side in the browser via `fetch()`.

Technologies demonstrated:
- HTML5 semantic elements, forms
- CSS Flexbox, Grid, media queries, hover states, transitions/animations
- JavaScript: hamburger menu, form validation, dynamic filtering,
  `fetch()`-based API integration (both TheMealDB and Gemini), a loading
  indicator, and DOM manipulation to render AI responses dynamically

## Credits

- Recipe data and photos: [TheMealDB](https://www.themealdb.com/api.php)
- AI recommendations: [Google Gemini API](https://ai.google.dev/)
- Fonts: [Fraunces](https://fonts.google.com/specimen/Fraunces) and
  [Work Sans](https://fonts.google.com/specimen/Work+Sans) via Google Fonts
