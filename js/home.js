/* =========================================================
   home.js — populates the hero "today's pick" and the
   featured dish rows on the homepage, both pulled live
   from TheMealDB.
   ========================================================= */

async function loadHeroDish() {
  const img = document.getElementById('heroImg');
  const caption = document.getElementById('heroCaption');
  try {
    const meal = await getRandomMeal();
    if (!meal) return;
    img.src = meal.strMealThumb;
    img.alt = meal.strMeal;
    img.hidden = false;
    caption.textContent = `Today's pick: ${meal.strMeal}`;
    caption.style.display = 'block';
  } catch (err) {
    caption.textContent = 'Could not load a live photo right now.';
    caption.style.display = 'block';
  }
}

function dishRowHTML(meal) {
  return `
    <a class="dish-row" href="product.html?id=${meal.idMeal}">
      <div class="dish-thumb"><img src="${meal.strMealThumb}/preview" alt="${escapeHTML(meal.strMeal)}" loading="lazy"></div>
      <div class="dish-info">
        <h3>${escapeHTML(meal.strMeal)}</h3>
        <div class="dish-meta"><span class="tag">Real recipe</span></div>
      </div>
      <span class="dish-go">View dish →</span>
    </a>
  `;
}

async function loadFeaturedDishes() {
  const container = document.getElementById('featuredDishes');
  const loader = document.getElementById('featuredLoader');
  try {
    const meals = await getMealsByArea('Indian');
    const picks = meals.slice(0, 5);
    hideLoader(loader);
    container.innerHTML = picks.map(dishRowHTML).join('');
  } catch (err) {
    hideLoader(loader);
    container.innerHTML = '<p>Dishes could not be loaded right now — please refresh the page.</p>';
  }
}

loadHeroDish();
loadFeaturedDishes();
