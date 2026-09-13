/* =========================================================
   api.js — shared helpers for TheMealDB
   TheMealDB is a free, public recipe database. No API key
   is required for the endpoints this project uses, so the
   requests below run straight from the browser.
   Docs: https://www.themealdb.com/api.php
   ========================================================= */

const MEALDB_BASE = 'https://www.themealdb.com/api/json/v1/1';

/**
 * "Pakistani" cuisine is not its own entry in TheMealDB, so requests
 * for it are mapped to the closest real category the API does carry
 * (Indian) — the dishes returned (karahi, biryani, kebabs) are shared
 * across both cuisines.
 */
const CUISINE_TO_AREA = {
  pakistani: 'Indian',
  indian: 'Indian',
  chinese: 'Chinese',
  italian: 'Italian',
  mexican: 'Mexican',
  american: 'American',
  mediterranean: 'Greek',
  british: 'British',
  japanese: 'Japanese',
  thai: 'Thai',
};

async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`TheMealDB request failed (${response.status})`);
  return response.json();
}

/** Random single meal — used for the homepage "today's pick". */
async function getRandomMeal() {
  const data = await fetchJSON(`${MEALDB_BASE}/random.php`);
  return data.meals ? data.meals[0] : null;
}

/** Meals filtered by cuisine/area, e.g. "Indian". Returns summary objects only. */
async function getMealsByArea(area) {
  const data = await fetchJSON(`${MEALDB_BASE}/filter.php?a=${encodeURIComponent(area)}`);
  return data.meals || [];
}

/** Meals filtered by TheMealDB category, e.g. "Seafood". */
async function getMealsByCategory(category) {
  const data = await fetchJSON(`${MEALDB_BASE}/filter.php?c=${encodeURIComponent(category)}`);
  return data.meals || [];
}

/** Search meals by name (also matches partial names). */
async function searchMealsByName(name) {
  const data = await fetchJSON(`${MEALDB_BASE}/search.php?s=${encodeURIComponent(name)}`);
  return data.meals || [];
}

/** Full detail for one meal by id — ingredients, instructions, image, video. */
async function getMealById(id) {
  const data = await fetchJSON(`${MEALDB_BASE}/lookup.php?i=${encodeURIComponent(id)}`);
  return data.meals ? data.meals[0] : null;
}

/** Flattens TheMealDB's strIngredient1..20 / strMeasure1..20 fields into a clean list. */
function extractIngredients(meal) {
  const list = [];
  for (let i = 1; i <= 20; i += 1) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ingredient && ingredient.trim()) {
      list.push({ name: ingredient.trim(), measure: (measure || '').trim() });
    }
  }
  return list;
}

function showLoader(el) {
  if (el) el.classList.add('active');
}

function hideLoader(el) {
  if (el) el.classList.remove('active');
}

/** Minimal HTML-escaping for any text pulled from the API before it hits the DOM. */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
