/* =========================================================
   gallery.js — loads a grid of real dish photos from
   several cuisines via TheMealDB.
   ========================================================= */

const GALLERY_AREAS = ['Indian', 'Italian', 'Chinese', 'Mexican', 'Japanese', 'American'];

function galleryItemHTML(meal) {
  return `
    <a class="gallery-item" href="product.html?id=${meal.idMeal}">
      <img src="${meal.strMealThumb}" alt="${escapeHTML(meal.strMeal)}" loading="lazy">
      <span class="gallery-caption">${escapeHTML(meal.strMeal)}</span>
    </a>
  `;
}

async function loadGallery() {
  const grid = document.getElementById('galleryGrid');
  const loader = document.getElementById('galleryLoader');

  try {
    const results = await Promise.all(GALLERY_AREAS.map((area) => getMealsByArea(area)));
    const meals = results.flatMap((list) => list.slice(0, 4));
    hideLoader(loader);
    grid.innerHTML = meals.map(galleryItemHTML).join('');
  } catch (err) {
    hideLoader(loader);
    grid.innerHTML = '<p>Photos could not be loaded right now — please refresh the page.</p>';
  }
}

loadGallery();
