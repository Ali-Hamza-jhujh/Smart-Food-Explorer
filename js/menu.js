/* =========================================================
   menu.js — fetches and filters dishes from TheMealDB
   ---------------------------------------------------------
   Search box uses TheMealDB's real name-search endpoint
   directly (search.php), then narrows by cuisine/category
   locally using the full details it already returns — rather
   than searching only within whatever the cuisine dropdown
   had already loaded, which missed anything not already in
   that smaller list.
   ========================================================= */

const menuForm = document.getElementById('filterForm');
const menuResults = document.getElementById('menuResults');
const menuLoader = document.getElementById('menuLoader');
const menuEmpty = document.getElementById('menuEmpty');

const PAGE_SIZE = 9;
let currentMeals = [];
let visibleCount = PAGE_SIZE;

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

function renderResults() {
  const toShow = currentMeals.slice(0, visibleCount);
  const rows = toShow.map(renderDishRow).join('');
  const hasMore = visibleCount < currentMeals.length;

  menuResults.innerHTML = rows + (hasMore
    ? `<div style="text-align:center; padding-top:24px;">
         <button type="button" class="btn btn-outline" id="loadMoreBtn">Show more dishes</button>
       </div>`
    : '');

  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      visibleCount += PAGE_SIZE;
      renderResults();
    });
  }
}

async function runFilter() {
  const search = document.getElementById('searchInput').value.trim();
  const area = document.getElementById('areaSelect').value;
  const category = document.getElementById('categorySelect').value;

  menuEmpty.classList.remove('active');
  menuResults.innerHTML = '';
  showLoader(menuLoader);

  try {
    let meals;

    if (search) {
      // A typed name is the most specific signal — search TheMealDB directly,
      // then narrow by cuisine/category using the details search.php already
      // includes, rather than only searching within a smaller pre-fetched list.
      meals = await searchMealsByName(search);
      if (area) meals = meals.filter((m) => (m.strArea || '').toLowerCase() === area.toLowerCase());
      if (category) meals = meals.filter((m) => (m.strCategory || '').toLowerCase() === category.toLowerCase());
    } else if (category) {
      meals = await getMealsByCategory(category);
    } else {
      meals = await getMealsByArea(area);
    }

    hideLoader(menuLoader);

    if (!meals.length) {
      menuEmpty.textContent = 'No dishes matched those filters — try a different cuisine, category, or search term.';
      menuEmpty.classList.add('active');
      currentMeals = [];
      return;
    }

    currentMeals = meals;
    visibleCount = PAGE_SIZE;
    renderResults();
  } catch (err) {
    hideLoader(menuLoader);
    menuEmpty.textContent = 'Something went wrong loading dishes — please try again.';
    menuEmpty.classList.add('active');
    currentMeals = [];
  }
}

menuForm.addEventListener('submit', (event) => {
  event.preventDefault();
  runFilter();
});

runFilter();