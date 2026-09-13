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
   ========================================================= */

const GEMINI_API_KEY = 'AQ.Ab8RN6JkCE_HD8S7zai5vkJt_Mb5kSbmViqdcnWSa16cCCkILg';
const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const aiForm = document.getElementById('aiForm');
const aiLoader = document.getElementById('aiLoader');
const aiPlaceholder = document.getElementById('aiPlaceholder');
const resultCard = document.getElementById('resultCard');
const aiError = document.getElementById('aiError');

/**
 * A small local knowledge base used two ways:
 *  1. As the fallback "AI" when no Gemini key is set.
 *  2. As a safety net if Gemini returns a dish TheMealDB doesn't have.
 * Keyed by cuisine -> mood, each entry lists a main pick and backups.
 */
const LOCAL_RECOMMENDATIONS = {
  pakistani: {
    default: { dish: 'Chicken Karahi', backups: ['Chicken Biryani', 'Seekh Kebab', 'Mutton Karahi'] },
    Sweet: { dish: 'Gulab Jamun', backups: ['Kheer', 'Sheer Khurma'] },
  },
  chinese: {
    default: { dish: 'Kung Pao Chicken', backups: ['Chow Mein', 'Spring Rolls', 'Sweet and Sour Pork'] },
  },
  italian: {
    default: { dish: 'Chicken Parmentier', backups: ['Spaghetti Carbonara', 'Margherita Pizza', 'Lasagne'] },
  },
  mexican: {
    default: { dish: 'Chicken Enchiladas', backups: ['Beef Tacos', 'Chilli Con Carne', 'Nachos'] },
  },
  american: {
    default: { dish: 'BBQ Pulled Pork', backups: ['Classic Burger', 'Mac and Cheese', 'Fried Chicken'] },
  },
  mediterranean: {
    default: { dish: 'Greek Salad', backups: ['Chicken Souvlaki', 'Falafel', 'Moussaka'] },
  },
  japanese: {
    default: { dish: 'Chicken Katsu', backups: ['Teriyaki Salmon', 'Ramen', 'Gyoza'] },
  },
  thai: {
    default: { dish: 'Thai Green Curry', backups: ['Pad Thai', 'Tom Yum Soup', 'Mango Sticky Rice'] },
  },
};

function localRecommendation(mood, cuisine, hunger) {
  const cuisineData = LOCAL_RECOMMENDATIONS[cuisine] || LOCAL_RECOMMENDATIONS.pakistani;
  const pick = cuisineData[mood] || cuisineData.default;
  const portionNote = hunger === 'Very Hungry'
    ? 'a hearty, filling meal'
    : hunger === 'Just a Snack'
      ? 'something light you can eat quickly'
      : 'a satisfying, medium-size plate';
  return {
    dish: pick.dish,
    reason: `You selected ${mood.toLowerCase()} ${cuisineLabel(cuisine)} food and asked for ${portionNote}, so ${pick.dish} is the closest match on the menu.`,
    alternatives: pick.backups,
  };
}

function cuisineLabel(value) {
  const map = {
    pakistani: 'Pakistani', chinese: 'Chinese', italian: 'Italian', mexican: 'Mexican',
    american: 'American', mediterranean: 'Mediterranean', japanese: 'Japanese', thai: 'Thai',
  };
  return map[value] || value;
}

/** Calls Gemini and asks it to return strict JSON we can parse safely. */
async function askGemini(mood, cuisine, hunger) {
  const prompt = `You are a food recommendation assistant for a ${cuisineLabel(cuisine)} restaurant menu.
A customer is in the mood for "${mood}" food and describes their hunger as "${hunger}".
Recommend exactly one real, well-known ${cuisineLabel(cuisine)} dish that fits, plus three alternative dishes from the same cuisine.
Respond with ONLY valid JSON, no markdown, in exactly this shape:
{"dish": "Dish Name", "reason": "one short sentence explaining why it fits", "alternatives": ["Dish A", "Dish B", "Dish C"]}`;

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
        maxOutputTokens: 1000,
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

  if (!text) {
    const finishReason = data?.candidates?.[0]?.finishReason;
    console.error('Gemini returned no text (finishReason:', finishReason, ') — full response:', data);
    throw new Error('Gemini returned an empty response');
  }

  const cleaned = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned);

  if (!parsed.dish || !Array.isArray(parsed.alternatives)) {
    throw new Error('Gemini returned an unexpected shape');
  }
  return parsed;
}

/** Tries to find a real TheMealDB entry for a dish name; falls back to a cuisine-area sample. */
async function matchRealDish(dishName, cuisine) {
  try {
    const matches = await searchMealsByName(dishName);
    if (matches.length) return matches[0];
  } catch (err) {
    /* fall through to the simplified search below */
  }
  try {
    const firstWord = dishName.split(' ')[0];
    const matches = await searchMealsByName(firstWord);
    if (matches.length) return matches[0];
  } catch (err) {
    /* fall through to the area fallback below */
  }
  try {
    const area = CUISINE_TO_AREA[cuisine] || 'Indian';
    const areaMeals = await getMealsByArea(area);
    if (areaMeals.length) {
      const random = areaMeals[Math.floor(Math.random() * areaMeals.length)];
      return await getMealById(random.idMeal);
    }
  } catch (err) {
    console.error('Could not find a real dish match:', err);
  }
  return null;
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
 * form values -> Gemini (or local fallback) -> real dish match -> render.
 */
async function generateRecommendation(mood, cuisine, hunger) {
  aiPlaceholder.style.display = 'none';
  aiError.classList.remove('active');
  resultCard.classList.remove('active');
  showLoader(aiLoader);

  let recommendation;
  let usedFallback = false;

  try {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
      throw new Error('No Gemini API key configured');
    }
    recommendation = await askGemini(mood, cuisine, hunger);
  } catch (err) {
    console.error('Falling back to local recommendation because:', err);
    usedFallback = true;
    recommendation = localRecommendation(mood, cuisine, hunger);
  }

  const realDish = await matchRealDish(recommendation.dish, cuisine);

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