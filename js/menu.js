// menu.js
// Fetches the dish dataset once, renders it as cards, and filters by category
// when a filter pill is clicked. Demonstrates fetch() + JSON + DOM rendering.

document.addEventListener('DOMContentLoaded', function () {
  var grid = document.getElementById('menu-grid');
  var emptyState = document.getElementById('empty-state');
  var filterBar = document.getElementById('filter-bar');
  var allDishes = [];

  function renderDishes(dishes) {
    if (dishes.length === 0) {
      grid.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';
    grid.innerHTML = dishes.map(function (d) {
      return (
        '<article class="dish-card">' +
          '<div class="dish-tile ' + d.tile + '" data-dish-id="' + d.id + '">' + d.emoji + '</div>' +
          '<div class="dish-body">' +
            '<div class="dish-top"><h3>' + d.name + '</h3><span class="dish-price">' + d.price + '</span></div>' +
            '<span class="dish-category">' + d.category + '</span>' +
            '<p>' + d.description + '</p>' +
          '</div>' +
        '</article>'
      );
    }).join('');

    attachRealPhotos(dishes);
  }

  // Best-effort: ask TheMealDB (free, no key) for a real photo of each dish.
  // If it doesn't recognise the dish, the illustrated CSS tile stays as-is.
  function attachRealPhotos(dishes) {
    dishes.forEach(function (d) {
      FoodAPI.findPhoto(d.name).then(function (photoUrl) {
        if (!photoUrl) return;
        var tile = grid.querySelector('.dish-tile[data-dish-id="' + d.id + '"]');
        if (tile) {
          tile.innerHTML = '<img src="' + photoUrl + '" alt="' + d.name + '" loading="lazy">';
        }
      });
    });
  }

  function applyFilter(category) {
    if (category === 'All') {
      renderDishes(allDishes);
      return;
    }
    renderDishes(allDishes.filter(function (d) { return d.category === category; }));
  }

  fetch('data/menu.json')
    .then(function (response) { return response.json(); })
    .then(function (dishes) {
      allDishes = dishes;
      renderDishes(allDishes);
    })
    .catch(function () {
      grid.innerHTML = '<p>Couldn\'t load the menu right now. Please refresh.</p>';
    });

  filterBar.addEventListener('click', function (event) {
    var pill = event.target.closest('.filter-pill');
    if (!pill) return;

    filterBar.querySelectorAll('.filter-pill').forEach(function (btn) {
      btn.classList.remove('active');
    });
    pill.classList.add('active');

    applyFilter(pill.dataset.category);
  });
});
