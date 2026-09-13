/* =========================================================
   menu.js — fetches and filters dishes from TheMealDB
   ========================================================= */

const menuForm = document.getElementById('filterForm');
const menuResults = document.getElementById('menuResults');
const menuLoader = document.getElementById('menuLoader');
const menuEmpty = document.getElementById('menuEmpty');

function renderDishRow(meal) {
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

async function runFilter() {
  const search = document.getElementById('searchInput').value.trim().toLowerCase();
  const area = document.getElementById('areaSelect').value;
  const category = document.getElementById('categorySelect').value;

  menuEmpty.classList.remove('active');
  menuResults.innerHTML = '';
  showLoader(menuLoader);

  try {
    // Category filter takes priority when both cuisine and category are set,
    // since TheMealDB's free tier filters on one dimension at a time —
    // the search term is then applied on the client against that result set.
    let meals = category ? await getMealsByCategory(category) : await getMealsByArea(area);

    if (search) {
      meals = meals.filter((m) => m.strMeal.toLowerCase().includes(search));
    }

    hideLoader(menuLoader);

    if (!meals.length) {
      menuEmpty.classList.add('active');
      return;
    }

    menuResults.innerHTML = meals.slice(0, 16).map(renderDishRow).join('');
  } catch (err) {
    hideLoader(menuLoader);
    menuEmpty.textContent = 'Something went wrong loading dishes — please try again.';
    menuEmpty.classList.add('active');
  }
}

menuForm.addEventListener('submit', (event) => {
  event.preventDefault();
  runFilter();
});

runFilter();
