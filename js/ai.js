/* =========================================================
   ai.js — the AI Food Assistant
   ---------------------------------------------------------
   HOW TO CONNECT YOUR OWN GEMINI KEY
   1. Get a free key from https://aistudio.google.com/apikey
   2. Paste it below as GEMINI_API_KEY.
   3. That's it — generateRecommendation() will call Gemini
      automatically. Without a key, the page still works: it
      falls back to a local rule-based recommendation so the
      demo never breaks.

   ⚠️ This key is visible to anyone who views the page source.
   That's fine for a class project / demo, but never do this
   in a real product — in production, this call should go
   through a backend or serverless proxy that holds the key.

   ---------------------------------------------------------
   WHY THE AI ONLY PICKS FROM A LIST
   TheMealDB only contains a few hundred dishes, so an AI
   answering freely will sometimes name a real, well-known
   dish (e.g. "Zarda") that simply isn't in this particular
   database. Rather than show a mismatched substitute photo,
   this fetches the real dish list for the chosen cuisine
   FIRST, then asks the AI to choose only from that list —
   so the name and the photo always match exactly.
   ========================================================= */

const GEMINI_API_KEY = 'AQ.Ab8RN6IDYndCrSeuf9lgSeitrY-ObuyJy--kUHA3JPE7PsVEnQ';
const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const aiForm = document.getElementById('aiForm');
const aiLoader = document.getElementById('aiLoader');
const aiPlaceholder = document.getElementById('aiPlaceholder');
const resultCard = document.getElementById('resultCard');
const aiError = document.getElementById('aiError');

function cuisineLabel(value) {
  const map = {
    pakistani: 'Pakistani', chinese: 'Chinese', italian: 'Italian', mexican: 'Mexican',
    american: 'American', mediterranean: 'Mediterranean', japanese: 'Japanese', thai: 'Thai',
  };
  return map[value] || value;
}

/**
 * Fetches the real dish list for a cuisine — this is the pool both the AI
 * and the local fallback must pick from. When the mood is "Sweet", this also
 * pulls in TheMealDB's real "Dessert" category — a guaranteed, verified part
 * of the database — because the per-cuisine data (e.g. Indian) skews almost
 * entirely savory on its own, leaving no genuine sweet option to pick from.
 */
async function fetchCuisinePool(cuisine, mood) {
  const area = CUISINE_TO_AREA[cuisine] || 'Indian';
  const seedNames = AREA_SEED_DISHES[area] || [];
  const wantsDessert = mood.toLowerCase() === 'sweet';

  const [areaMeals, seedMeals, dessertMeals] = await Promise.all([
    getMealsByArea(area).catch(() => []),
    seedNames.length ? searchMealsByNames(seedNames) : Promise.resolve([]),
    wantsDessert ? getMealsByCategory('Dessert').catch(() => []) : Promise.resolve([]),
  ]);

  const dessertIds = new Set(dessertMeals.map((m) => m.idMeal));
  const seen = new Set();
  const combined = [];
  [...areaMeals, ...seedMeals, ...dessertMeals].forEach((meal) => {
    if (meal && meal.strMeal && meal.strMealThumb && !seen.has(meal.idMeal)) {
      seen.add(meal.idMeal);
      combined.push({ ...meal, isDessert: dessertIds.has(meal.idMeal) });
    }
  });

  return combined.slice(0, 35);
}

/** Finds a pool entry by name, case-insensitively, ignoring extra whitespace. */
function findInPool(pool, name) {
  const normalized = (name || '').trim().toLowerCase();
  return pool.find((m) => m.strMeal.trim().toLowerCase() === normalized);
}

/** A simple, dependency-free "AI" used when no Gemini key is set — picks straight from the real pool. */
function localRecommendation(mood, cuisine, hunger, pool) {
  const isSweetMood = mood.toLowerCase() === 'sweet';
  const desserts = pool.filter((m) => m.isDessert);

  // Prefer genuine desserts when the mood is "Sweet", and steer away from
  // them otherwise — falls back to the whole pool if there's no clean match.
  const candidates = isSweetMood && desserts.length
    ? desserts
    : !isSweetMood && pool.length > desserts.length
      ? pool.filter((m) => !m.isDessert)
      : pool;

  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const pick = shuffled[0];
  const portionNote = hunger === 'Very Hungry'
    ? 'a hearty, filling meal'
    : hunger === 'Just a Snack'
      ? 'something light you can eat quickly'
      : 'a satisfying, medium-size plate';

  const remainingPool = pool.filter((m) => m.idMeal !== pick.idMeal);
  const shuffledRest = [...remainingPool].sort(() => Math.random() - 0.5);

  return {
    dish: pick.strMeal,
    reason: `You selected ${mood.toLowerCase()} ${cuisineLabel(cuisine)} food and asked for ${portionNote}, so ${pick.strMeal} is the closest match on the menu.`,
    alternatives: shuffledRest.slice(0, 3).map((m) => m.strMeal),
  };
}

/** Calls Gemini, constrained to only choose dishes from the given real pool. */
async function askGemini(mood, cuisine, hunger, pool) {
  const dishNames = pool.map((m) => m.strMeal);

  const prompt = `You are a food recommendation assistant for a ${cuisineLabel(cuisine)} restaurant.
A customer is in the mood for "${mood}" food and describes their hunger as "${hunger}".
Choose exactly one dish from this exact list that best fits their mood and hunger level, plus three more from the same list as alternatives:
${dishNames.join(', ')}

Rules:
- Only use dish names copied EXACTLY as written in the list above (same spelling and capitalization).
- Do not invent or modify any dish name.
- Matching the mood matters more than matching the cuisine exactly — if the mood is "Sweet", pick a genuinely sweet/dessert item from the list even if it isn't traditionally from this cuisine, rather than picking a savory dish and calling it sweet.
- Keep "reason" to one short sentence, no more than 20 words.
Respond with ONLY valid JSON, no markdown, in exactly this shape:
{"dish": "Exact Dish Name From List", "reason": "one short sentence explaining why it fits", "alternatives": ["Exact Name A", "Exact Name B", "Exact Name C"]}`;

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        // Generous headroom: with ~25 dish names in the prompt plus reasoning
        // text, a tight budget can cut the JSON off mid-object.
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('Gemini error response:', detail);
    throw new Error(`Gemini request failed (${response.status})`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const finishReason = data?.candidates?.[0]?.finishReason;

  if (!text) {
    console.error('Gemini returned no text (finishReason:', finishReason, ') — full response:', data);
    throw new Error('Gemini returned an empty response');
  }

  // Strip markdown fences, then pull out just the {...} object in case the
  // model added any stray text before/after it, or the response got cut off
  // mid-sentence — grabbing to the last closing brace we actually have is
  // more forgiving than requiring the whole string to be valid JSON already.
  const withoutFences = text.replace(/```json|```/g, '').trim();
  const start = withoutFences.indexOf('{');
  const end = withoutFences.lastIndexOf('}');
  const cleaned = start !== -1 && end !== -1 ? withoutFences.slice(start, end + 1) : withoutFences;

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error('Could not parse Gemini JSON (finishReason:', finishReason, ') — raw text:', text);
    throw new Error('Gemini response was not valid JSON');
  }

  if (!parsed.dish || !Array.isArray(parsed.alternatives)) {
    throw new Error('Gemini returned an unexpected shape');
  }
  return parsed;
}

function renderResult(recommendation, realDish, cuisine) {
  document.getElementById('resultName').textContent = recommendation.dish;
  document.getElementById('resultWhy').textContent = recommendation.reason;
  document.getElementById('resultCuisineTag').textContent = cuisineLabel(cuisine);

  const img = document.getElementById('resultImg');
  const detailLink = document.getElementById('resultDetailLink');

  if (realDish) {
    img.src = realDish.strMealThumb;
    img.alt = realDish.strMeal;
    detailLink.href = `product.html?id=${realDish.idMeal}`;
    detailLink.style.display = 'inline-flex';
  } else {
    img.src = '';
    img.alt = '';
    detailLink.style.display = 'none';
  }

  const list = document.getElementById('alsoLikeList');
  list.innerHTML = recommendation.alternatives
    .slice(0, 4)
    .map((name) => `<li><span>${escapeHTML(name)}</span></li>`)
    .join('');

  resultCard.classList.add('active');
}

/**
 * The single entry point that runs the whole AI flow:
 * fetch the real dish pool -> Gemini (or local fallback) chooses from it
 * -> look the choice back up in the same pool -> render.
 */
async function generateRecommendation(mood, cuisine, hunger) {
  aiPlaceholder.style.display = 'none';
  aiError.classList.remove('active');
  resultCard.classList.remove('active');
  showLoader(aiLoader);

  let pool = [];
  try {
    pool = await fetchCuisinePool(cuisine, mood);
  } catch (err) {
    console.error('Could not load the dish list for this cuisine:', err);
  }

  if (!pool.length) {
    hideLoader(aiLoader);
    aiError.textContent = 'Could not load real dishes for this cuisine right now — please try again in a moment.';
    aiError.classList.add('active');
    return;
  }

  let recommendation;
  let usedFallback = false;

  try {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
      throw new Error('No Gemini API key configured');
    }
    recommendation = await askGemini(mood, cuisine, hunger, pool);
  } catch (err) {
    console.error('Falling back to local recommendation because:', err);
    usedFallback = true;
    recommendation = localRecommendation(mood, cuisine, hunger, pool);
  }

  // Whatever produced the recommendation, resolve the final dish name against
  // the real pool so the photo is always the one that matches the name shown.
  let realDish = findInPool(pool, recommendation.dish);
  if (!realDish) {
    // The AI didn't stick to the list — fall back to a real pool item so the
    // photo is never wrong, but say so plainly rather than hiding it.
    realDish = pool[Math.floor(Math.random() * pool.length)];
    recommendation = { ...recommendation, dish: realDish.strMeal };
  }
  // Match against the pool, drop anything that resolves to the main dish
  // itself or to a duplicate, so "you may also like" never repeats a name.
  const seenAlt = new Set([recommendation.dish]);
  recommendation.alternatives = recommendation.alternatives
    .map((name) => findInPool(pool, name)?.strMeal)
    .filter((name) => {
      if (!name || seenAlt.has(name)) return false;
      seenAlt.add(name);
      return true;
    });

  // If matching against the pool left us with too few alternatives (the AI
  // drifted from the list), top up with other real pool items so the
  // "you may also like" section is never empty.
  if (recommendation.alternatives.length < 3) {
    const extras = pool.map((m) => m.strMeal).filter((name) => !seenAlt.has(name));
    while (recommendation.alternatives.length < 3 && extras.length) {
      const [taken] = extras.splice(Math.floor(Math.random() * extras.length), 1);
      recommendation.alternatives.push(taken);
      seenAlt.add(taken);
    }
  }

  hideLoader(aiLoader);
  renderResult(recommendation, realDish, cuisine);

  if (usedFallback) {
    aiError.textContent = 'Running in demo mode (no Gemini API key set) — showing a rule-based recommendation instead of a live AI response.';
    aiError.classList.add('active');
  }
}

aiForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const mood = document.getElementById('moodSelect').value;
  const cuisine = document.getElementById('cuisineSelect').value;
  const hunger = document.getElementById('hungerSelect').value;
  generateRecommendation(mood, cuisine, hunger);
});