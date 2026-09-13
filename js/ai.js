// ai.js
//
// This file is the "AI" part of TasteAI. It sends the user's mood / cuisine /
// hunger answers to Google's Gemini API, grounded on our own dish list, and
// asks it to reply with strict JSON naming which dish to recommend and why:
//
//   user picks options -> getRecommendation() -> fetch() -> Gemini API
//   -> JSON response -> JavaScript extracts the pick -> DOM shows the result
//
// SECURITY NOTE (say this in your viva):
// GEMINI_API_KEY lives in js/config.js and is visible to anyone who views
// this page's source — that is unavoidable for a fully static site with no
// backend. In a production app, this fetch() would instead hit your own
// backend or serverless function (e.g. POST /api/recommend), which holds the
// real key on the server and calls Gemini from there. The frontend code
// below would stay almost identical either way.
//
// If the Gemini call fails (no key set, no internet, quota hit, bad JSON
// back) the app falls back to a small local scoring function so the page
// never breaks during a demo.

document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('ai-form');
  if (!form) return;

  var placeholder = document.getElementById('result-placeholder');
  var loader = document.getElementById('loader');
  var resultContent = document.getElementById('result-content');

  var hungerLabels = {
    snack: 'just want a snack',
    moderate: 'are moderately hungry',
    very: 'are very hungry',
    starving: 'are starving'
  };

  var allDishes = [];

  fetch('data/menu.json')
    .then(function (res) { return res.json(); })
    .then(function (dishes) { allDishes = dishes; })
    .catch(function () { /* handled again on submit if this failed */ });

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var mood = form.mood.value;
    var type = form.type.value;
    var hunger = form.hunger.value;

    if (!validateForm(mood, type, hunger)) return;

    getRecommendation(mood, type, hunger);
  });

  function validateForm(mood, type, hunger) {
    var valid = true;
    valid = validateField('mood', mood) && valid;
    valid = validateField('type', type) && valid;
    valid = validateField('hunger', hunger) && valid;
    return valid;
  }

  function validateField(name, value) {
    var field = document.getElementById(name);
    var errorBox = document.getElementById(name + '-error');
    var wrapper = field.closest('.field');
    if (!value) {
      errorBox.textContent = 'Please make a selection.';
      wrapper.classList.add('has-error');
      return false;
    }
    errorBox.textContent = '';
    wrapper.classList.remove('has-error');
    return true;
  }

  // The single function that is "the AI part" of the assignment.
  function getRecommendation(mood, type, hunger) {
    placeholder.style.display = 'none';
    resultContent.classList.remove('is-visible');
    loader.classList.add('is-active');

    var pool = allDishes.filter(function (d) { return d.category === type; });
    if (pool.length === 0) pool = allDishes.slice();

    askGemini(mood, type, hunger, pool)
      .then(function (picked) {
        renderResult(picked.top, picked.suggestions, mood, type, hunger, picked.why);
      })
      .catch(function (err) {
        console.warn('Gemini call failed, using local fallback:', err.message);
        var ranked = scoreDishesLocally(pool, mood, hunger);
        var why = 'You selected ' + mood + ' ' + type + ' food and said you ' + hungerLabels[hunger] + '.';
        renderResult(ranked[0], ranked.slice(1, 4), mood, type, hunger, why);
      });
  }

  // Calls the Gemini API and asks it to choose from our own dish list.
  function askGemini(mood, type, hunger, pool) {
    if (!window.GEMINI_API_KEY || window.GEMINI_API_KEY.indexOf('PASTE_YOUR') === 0) {
      return Promise.reject(new Error('No Gemini API key set in js/config.js'));
    }

    var menuForPrompt = pool.map(function (d) {
      return { id: d.id, name: d.name, tags: d.mood, heaviness: d.heaviness, description: d.description };
    });

    var prompt =
      'You are a food recommendation assistant for a ' + type + ' restaurant menu.\n' +
      'The customer is in the mood for something "' + mood + '" and ' + hungerLabels[hunger] + '.\n' +
      'Pick exactly ONE dish id from this list that best fits, plus up to 3 other ids as backups:\n' +
      JSON.stringify(menuForPrompt) + '\n' +
      'Reply with ONLY raw JSON, no markdown fences, in this exact shape:\n' +
      '{"recommended_id": "id", "why": "one short friendly sentence", "also_like_ids": ["id","id","id"]}';

    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + window.GEMINI_API_KEY;

    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    })
      .then(function (response) {
        if (!response.ok) throw new Error('Gemini request failed: ' + response.status);
        return response.json();
      })
      .then(function (data) {
        var text = data.candidates[0].content.parts[0].text;
        var clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        var parsed = JSON.parse(clean);

        var top = allDishes.find(function (d) { return d.id === parsed.recommended_id; });
        var suggestions = (parsed.also_like_ids || [])
          .map(function (id) { return allDishes.find(function (d) { return d.id === id; }); })
          .filter(Boolean);

        if (!top) throw new Error('Gemini returned an unknown dish id');

        return { top: top, suggestions: suggestions.slice(0, 3), why: parsed.why };
      });
  }

  // Local fallback used only if the Gemini call above fails for any reason.
  function scoreDishesLocally(pool, mood, hunger) {
    var hungerToHeaviness = { snack: 'light', moderate: 'medium', very: 'heavy', starving: 'heavy' };
    var target = hungerToHeaviness[hunger];

    var scored = pool.map(function (d) {
      var score = 0;
      if (d.mood.indexOf(mood) !== -1) score += 2;
      if (d.heaviness === target) score += 2;
      else if (target === 'heavy' && d.heaviness === 'medium') score += 1;
      return { dish: d, score: score };
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.map(function (s) { return s.dish; });
  }

  function renderResult(top, suggestions, mood, type, hunger, why) {
    loader.classList.remove('is-active');

    document.getElementById('result-tile').className = 'emoji-badge ' + top.tile;
    document.getElementById('result-emoji').textContent = top.emoji;
    document.getElementById('result-name').textContent = top.name;
    document.getElementById('result-price').textContent = top.price;
    document.getElementById('result-description').textContent = top.description;
    document.getElementById('result-why').textContent = why;

    var list = document.getElementById('also-like-list');
    list.innerHTML = suggestions.map(function (d) {
      return '<li><span>' + d.emoji + ' ' + d.name + '</span><span class="dish-price">' + d.price + '</span></li>';
    }).join('');

    resultContent.classList.add('is-visible');
  }
});
