/*
  Shared food-name matching utilities, used by both the search page (app.js)
  and the meal builder (meal.js). Depends on the global FOODS array from
  data/foods.js.
*/
const SiboMatch = (function () {
  function normalize(str) {
    return (str || "").toLowerCase().trim();
  }

  // Very small stemmer: strip a trailing "s" so "carrots" matches "carrot".
  function stem(str) {
    if (str.length > 3 && str.endsWith("ies")) return str.slice(0, -3) + "y";
    if (str.length > 3 && str.endsWith("es")) return str.slice(0, -2);
    if (str.length > 3 && str.endsWith("s") && !str.endsWith("ss")) return str.slice(0, -1);
    return str;
  }

  function scoreFood(food, qNorm, qStem) {
    const name = normalize(food.name);
    const nameStem = stem(name);
    const aliases = (food.aliases || []).map(normalize);

    if (name === qNorm || nameStem === qStem) return 100;
    if (aliases.includes(qNorm)) return 95;
    if (name.startsWith(qNorm)) return 80;
    if (aliases.some((a) => a.startsWith(qNorm))) return 75;
    if (name.includes(qNorm)) return 50;
    if (aliases.some((a) => a.includes(qNorm))) return 45;
    if (nameStem.includes(qStem)) return 40;
    return 0;
  }

  // Returns all foods matching the query, sorted best-first.
  function search(query, limit) {
    const qNorm = normalize(query);
    if (!qNorm) return [];
    const qStem = stem(qNorm);

    return FOODS
      .map((food) => ({ food, score: scoreFood(food, qNorm, qStem) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name))
      .slice(0, limit || 20)
      .map((r) => r.food);
  }

  // Returns { food, score } pairs (used by the meal-text parser to judge confidence).
  function searchScored(query, limit) {
    const qNorm = normalize(query);
    if (!qNorm) return [];
    const qStem = stem(qNorm);

    return FOODS
      .map((food) => ({ food, score: scoreFood(food, qNorm, qStem) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name))
      .slice(0, limit || 5);
  }

  return { normalize, stem, scoreFood, search, searchScored };
})();
