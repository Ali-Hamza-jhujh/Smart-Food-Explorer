// gallery.js
// Renders every dish as a gallery tile and opens a lightbox with details on click.

document.addEventListener('DOMContentLoaded', function () {
  var grid = document.getElementById('gallery-grid');
  var lightbox = document.getElementById('lightbox');
  var lightboxClose = document.getElementById('lightbox-close');

  fetch('data/menu.json')
    .then(function (response) { return response.json(); })
    .then(function (dishes) {
      grid.innerHTML = dishes.map(function (d, index) {
        return (
          '<div class="gallery-item" data-index="' + index + '" tabindex="0" role="button" aria-label="View ' + d.name + '">' +
            '<div class="tile-face ' + d.tile + '" data-dish-id="' + d.id + '">' + d.emoji + '</div>' +
            '<div class="gallery-caption">' + d.name + '</div>' +
          '</div>'
        );
      }).join('');

      // Best-effort: swap in a real photo from TheMealDB (free, no key) when it recognises the dish.
      dishes.forEach(function (d) {
        FoodAPI.findPhoto(d.name).then(function (photoUrl) {
          if (!photoUrl) return;
          var tile = grid.querySelector('.tile-face[data-dish-id="' + d.id + '"]');
          if (tile) tile.innerHTML = '<img src="' + photoUrl + '" alt="' + d.name + '" loading="lazy">';
        });
      });

      grid.querySelectorAll('.gallery-item').forEach(function (item) {
        item.addEventListener('click', function () {
          openLightbox(dishes[Number(item.dataset.index)]);
        });
        item.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openLightbox(dishes[Number(item.dataset.index)]);
          }
        });
      });
    })
    .catch(function () {
      grid.innerHTML = '<p>Couldn\'t load the gallery right now.</p>';
    });

  function openLightbox(dish) {
    document.getElementById('lightbox-tile').className = 'lightbox-tile ' + dish.tile;
    document.getElementById('lightbox-tile').textContent = dish.emoji;
    document.getElementById('lightbox-name').textContent = dish.name;
    document.getElementById('lightbox-description').textContent = dish.description;
    document.getElementById('lightbox-price').textContent = dish.price;
    lightbox.classList.add('is-visible');
  }

  function closeLightbox() {
    lightbox.classList.remove('is-visible');
  }

  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', function (event) {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeLightbox();
  });
});
