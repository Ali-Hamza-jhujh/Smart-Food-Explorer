/* =========================================================
   gallery.js — loads a grid of real dish photos from
   several cuisines via TheMealDB, with "show more" paging.
   ========================================================= */

const GALLERY_AREAS = ['Indian', 'Italian', 'Chinese', 'Mexican', 'Japanese', 'American', 'Thai', 'Greek'];
const GALLERY_PAGE_SIZE = 16;

let galleryMeals = [];
let galleryVisibleCount = GALLERY_PAGE_SIZE;

function galleryItemHTML(meal) {
  return `
    <a class="gallery-item" href="product.html?id=${meal.idMeal}">
      <img src="${meal.strMealThumb}" alt="${escapeHTML(meal.strMeal)}" loading="lazy">
      <span class="gallery-caption">${escapeHTML(meal.strMeal)}</span>
    </a>
  `;
}

function renderGallery() {
  const grid = document.getElementById('galleryGrid');
  const toShow = galleryMeals.slice(0, galleryVisibleCount);
  const hasMore = galleryVisibleCount < galleryMeals.length;

  grid.innerHTML = toShow.map(galleryItemHTML).join('');

  let moreWrap = document.getElementById('galleryMoreWrap');
  if (moreWrap) moreWrap.remove();

  if (hasMore) {
    moreWrap = document.createElement('div');
    moreWrap.id = 'galleryMoreWrap';
    moreWrap.style.textAlign = 'center';
    moreWrap.style.marginTop = '30px';
    moreWrap.innerHTML = '<button type="button" class="btn btn-outline" id="galleryMoreBtn">Show more photos</button>';
    grid.after(moreWrap);
    document.getElementById('galleryMoreBtn').addEventListener('click', () => {
      galleryVisibleCount += GALLERY_PAGE_SIZE;
      renderGallery();
    });
  }
}

async function loadGallery() {
  const loader = document.getElementById('galleryLoader');

  try {
    const results = await Promise.all(GALLERY_AREAS.map((area) => getMealsByArea(area).catch(() => [])));

    const seen = new Set();
    galleryMeals = [];
    results.forEach((list) => {
      list.slice(0, 8).forEach((meal) => {
        if (meal && meal.strMealThumb && !seen.has(meal.idMeal)) {
          seen.add(meal.idMeal);
          galleryMeals.push(meal);
        }
      });
    });

    // Mix cuisines together rather than showing them in solid blocks.
    galleryMeals.sort(() => Math.random() - 0.5);

    hideLoader(loader);
    galleryVisibleCount = GALLERY_PAGE_SIZE;
    renderGallery();
  } catch (err) {
    hideLoader(loader);
    document.getElementById('galleryGrid').innerHTML = '<p>Photos could not be loaded right now — please refresh the page.</p>';
  }
}

loadGallery();