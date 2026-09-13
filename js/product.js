/* =========================================================
   product.js — reads ?id= from the URL and renders full
   recipe detail from TheMealDB.
   ========================================================= */

async function loadProduct() {
  const loader = document.getElementById('productLoader');
  const empty = document.getElementById('productEmpty');
  const hero = document.getElementById('productHero');

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    hideLoader(loader);
    empty.classList.add('active');
    return;
  }

  try {
    const meal = await getMealById(id);
    hideLoader(loader);

    if (!meal) {
      empty.classList.add('active');
      return;
    }

    document.title = `${meal.strMeal} — TasteAI`;
    document.getElementById('productImg').src = meal.strMealThumb;
    document.getElementById('productImg').alt = meal.strMeal;
    document.getElementById('productName').textContent = meal.strMeal;
    document.getElementById('productTags').innerHTML = `
      <span class="tag">${escapeHTML(meal.strCategory || 'Dish')}</span>
      <span class="tag">${escapeHTML(meal.strArea || 'Unknown cuisine')}</span>
    `;

    if (meal.strSource) {
      document.getElementById('productSource').innerHTML =
        `<a href="${meal.strSource}" target="_blank" rel="noopener">Original recipe source ↗</a>`;
    }

    const ingredients = extractIngredients(meal);
    document.getElementById('productIngredients').innerHTML = ingredients
      .map((item) => `<li><span>${escapeHTML(item.name)}</span><span>${escapeHTML(item.measure)}</span></li>`)
      .join('');

    document.getElementById('productInstructions').textContent = meal.strInstructions || 'Instructions not available.';

    if (meal.strYoutube) {
      document.getElementById('productVideo').innerHTML =
        `<a href="${meal.strYoutube}" target="_blank" rel="noopener" class="btn btn-outline">Watch video recipe ↗</a>`;
    }

    hero.style.display = 'grid';
  } catch (err) {
    hideLoader(loader);
    empty.textContent = 'Something went wrong loading this recipe — please try again.';
    empty.classList.add('active');
  }
}

loadProduct();
