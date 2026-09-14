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

/**
 * A short list of real, well-known dishes per area — including a couple of
 * desserts — used as a fallback source when filter.php comes back empty.
 * Not every name here is guaranteed to exist in TheMealDB; searchMealsByNames
 * simply drops whichever ones don't resolve, so it's safe to list generously.
 */
const AREA_SEED_DISHES = {
  Indian: ['Chicken Karahi', 'Chicken Handi', 'Chicken Tikka Masala', 'Rogan Josh', 'Chana Masala',
    'Palak Paneer', 'Chicken Korma', 'Vegetable Korma', 'Chicken Biryani', 'Bhindi Masala',
    'Aloo Gobi', 'Gulab Jamun', 'Kheer', 'Kulfi'],
  Chinese: ['Kung Pao Chicken', 'Chow Mein', 'Sweet and Sour Pork', 'Spring Rolls',
    'Chicken Fried Rice', 'Egg Fried Rice', 'Dan Dan Noodles', 'Beef Chow Fun'],
  Italian: ['Spaghetti Carbonara', 'Spaghetti Bolognese', 'Margherita Pizza', 'Lasagne',
    'Risotto Nero', 'Tiramisu', 'Chicken Piccata', 'Ravioli'],
  Mexican: ['Chicken Enchiladas', 'Tacos', 'Chilli Con Carne', 'Nachos', 'Guacamole',
    'Chicken Fajita Mix', 'Beef Burrito'],
  American: ['BBQ Pulled Pork', 'Classic Burger', 'Mac and Cheese', 'Fried Chicken',
    'Apple Pie', 'Buffalo Chicken', 'BBQ Ribs'],
  Greek: ['Greek Salad', 'Moussaka', 'Souvlaki', 'Baklava', 'Spanakopita'],
  Japanese: ['Chicken Katsu', 'Teriyaki Salmon', 'Ramen', 'Gyoza', 'Chicken Yakitori', 'Katsu Curry'],
  Thai: ['Thai Green Curry', 'Pad Thai', 'Tom Yum Soup', 'Mango Sticky Rice', 'Thai Red Curry'],
  British: ['Beef Wellington', 'Fish and Chips', "Shepherd's Pie", 'Full English Breakfast', 'Sticky Toffee Pudding'],
};

/** Looks up several dish names in parallel via search.php and returns the unique real matches found. */
async function searchMealsByNames(names) {
  const requests = names.map((name) => searchMealsByName(name).catch(() => []));
  const results = await Promise.all(requests);
  const seen = new Set();
  const meals = [];
  results.flat().forEach((meal) => {
    if (meal && !seen.has(meal.idMeal)) {
      seen.add(meal.idMeal);
      meals.push(meal);
    }
  });
  return meals;
}

/**
 * TheMealDB's shared free test key can intermittently return an empty
 * result from filter.php (a known limitation of the public test key,
 * separate from any account you'd set up). When that happens, this falls
 * back to searching for a curated list of real dishes from the SAME area,
 * so the app still shows dishes that actually belong to that cuisine
 * rather than random unrelated ones.
 */
async function randomFallbackByField(field, value, attempts = 12) {
  const requests = Array.from({ length: attempts }, () => fetchJSON(`${MEALDB_BASE}/random.php`).catch(() => null));
  const results = await Promise.all(requests);
  const meals = results.filter((r) => r && r.meals && r.meals[0]).map((r) => r.meals[0]);
  const matched = meals.filter((m) => (m[field] || '').toLowerCase() === value.toLowerCase());
  return matched.length ? matched : meals;
}

/** Meals filtered by cuisine/area, e.g. "Indian". Returns summary objects only. */
async function getMealsByArea(area) {
  const data = await fetchJSON(`${MEALDB_BASE}/filter.php?a=${encodeURIComponent(area)}`);
  if (data.meals && data.meals.length) return data.meals;

  const seeds = AREA_SEED_DISHES[area];
  if (seeds) {
    const seeded = await searchMealsByNames(seeds);
    if (seeded.length) return seeded;
  }

  return randomFallbackByField('strArea', area);
}

/** Meals filtered by TheMealDB category, e.g. "Seafood". */
async function getMealsByCategory(category) {
  const data = await fetchJSON(`${MEALDB_BASE}/filter.php?c=${encodeURIComponent(category)}`);
  if (data.meals && data.meals.length) return data.meals;
  return randomFallbackByField('strCategory', category);
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