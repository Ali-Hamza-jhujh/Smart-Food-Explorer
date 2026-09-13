// food-api.js
//
// Talks to TheMealDB (https://www.themealdb.com/api.php) — a free, public,
// keyless food API — to try to fetch a real photo for a dish by name.
// This is the "third-party API for food data" part of the project.
//
// It's deliberately best-effort: TheMealDB doesn't have most Pakistani home
// dishes by exact name, so when it can't find a confident match we keep the
// illustrated CSS tile instead of showing an unrelated photo.

var FoodAPI = (function () {
  var BASE_URL = 'https://www.themealdb.com/api/json/v1/1/search.php?s=';

  // Returns a promise resolving to a photo URL, or null if nothing matched well.
  function findPhoto(dishName) {
    return fetch(BASE_URL + encodeURIComponent(dishName))
      .then(function (response) { return response.json(); })
      .then(function (data) {
        if (!data.meals) return null;

        var lowerName = dishName.toLowerCase();
        var match = data.meals.find(function (meal) {
          return meal.strMeal.toLowerCase() === lowerName;
        });

        // Only accept a close match, not just "the first result for this word".
        if (!match) {
          match = data.meals.find(function (meal) {
            return lowerName.indexOf(meal.strMeal.toLowerCase()) !== -1 ||
                   meal.strMeal.toLowerCase().indexOf(lowerName) !== -1;
          });
        }

        return match ? match.strMealThumb : null;
      })
      .catch(function () { return null; });
  }

  return { findPhoto: findPhoto };
})();
