/*
  Approximate nutrition reference data, keyed by food id from data/foods.js.

  This is a SEPARATE dataset from the diet's own per-phase "qty" (which governs
  allow/avoid + per-meal/per-day cap checking and must not change). It exists only
  to estimate calories/protein/fibre per meal.

  Schema per food id:
    grams:     the weight (or ml) that "1 serving" represents for THIS food in the app.
               - For foods that already have a stated diet quantity (e.g. Broccoli's
                 "1/2 cup"), this is that quantity converted to grams using standard
                 cooking conversions, so "1 serving" means the same thing everywhere
                 in the app.
               - For foods the diet leaves unlimited (meat, seafood, oils, most
                 condiments, plain vegetables, etc.), this is a new reference serving,
                 sized using standard household/dietary-guideline serve conventions
                 (e.g. ~65g cooked meat, ~100g cooked fish, ~100g vegetables, 1 tbsp
                 for oils/condiments) - broadly in line with the kind of standard serve
                 sizes CSIRO's Australian Guide to Healthy Eating uses, though these
                 are round approximations, not looked up per-food from that source.
    label:     optional display text for that serving when there's no diet qty text
               to show instead (e.g. "1 egg", "65g cooked", "1 tbsp (~14g)").
    kcal100, protein100, fiber100:
               typical calories / protein (g) / fibre (g) per 100g of the food,
               from standard food-composition references. Real values vary with
               cut, ripeness, brand, cooking method etc - treat all totals in this
               app as ballpark, not lab-accurate.
    excluded:  true for generic catch-all entries that represent a whole class of
               different foods (e.g. "other grains", "canned vegetables") rather
               than one specific food - these are skipped from serving size and
               nutrition totals since a single figure would be meaningless.

  Nothing here affects what's allowed/avoided or the per-meal/per-day cap checks -
  those still come entirely from data/foods.js.
*/

const NUTRITION = {
  // ---------------- MEAT (~65g cooked reference serve) ----------------
  "beef": { grams: 65, label: "65g cooked", kcal100: 215, protein100: 27, fiber100: 0 },
  "chicken": { grams: 65, label: "65g cooked", kcal100: 165, protein100: 31, fiber100: 0 },
  "duck": { grams: 65, label: "65g cooked", kcal100: 195, protein100: 27, fiber100: 0 },
  "game-hens": { grams: 65, label: "65g cooked", kcal100: 170, protein100: 27, fiber100: 0 },
  "kangaroo": { grams: 65, label: "65g cooked", kcal100: 98, protein100: 22, fiber100: 0 },
  "lamb": { grams: 65, label: "65g cooked", kcal100: 250, protein100: 25, fiber100: 0 },
  "organ-meats": { grams: 65, label: "65g cooked", kcal100: 175, protein100: 24, fiber100: 0 },
  "pork": { grams: 65, label: "65g cooked", kcal100: 242, protein100: 27, fiber100: 0 },
  "quail-meat": { grams: 65, label: "65g cooked", kcal100: 134, protein100: 25, fiber100: 0 },
  "deli-meats": { grams: 50, label: "50g", kcal100: 250, protein100: 18, fiber100: 0 },
  "turkey": { grams: 65, label: "65g cooked", kcal100: 135, protein100: 29, fiber100: 0 },
  "venison": { grams: 65, label: "65g cooked", kcal100: 120, protein100: 30, fiber100: 0 },

  // ---------------- EGGS ----------------
  "eggs": { grams: 50, label: "1 egg", kcal100: 143, protein100: 13, fiber100: 0 },

  // ---------------- SEAFOOD (~100g cooked reference serve) ----------------
  "salmon-wild": { grams: 100, label: "100g cooked", kcal100: 208, protein100: 20, fiber100: 0 },
  "barramundi": { grams: 100, label: "100g cooked", kcal100: 130, protein100: 23, fiber100: 0 },
  "herring": { grams: 100, label: "100g cooked", kcal100: 203, protein100: 18, fiber100: 0 },
  "pacific-cod": { grams: 100, label: "100g cooked", kcal100: 105, protein100: 23, fiber100: 0 },
  "oysters": { grams: 100, label: "100g", kcal100: 81, protein100: 9, fiber100: 0 },
  "sardines": { grams: 100, label: "100g", kcal100: 208, protein100: 25, fiber100: 0 },
  "scallops": { grams: 100, label: "100g cooked", kcal100: 111, protein100: 20, fiber100: 0 },
  "shrimp-local": { grams: 100, label: "100g cooked", kcal100: 99, protein100: 24, fiber100: 0 },
  "snapper": { grams: 100, label: "100g cooked", kcal100: 100, protein100: 21, fiber100: 0 },
  "trout": { grams: 100, label: "100g cooked", kcal100: 148, protein100: 21, fiber100: 0 },
  "whiting": { grams: 100, label: "100g cooked", kcal100: 90, protein100: 19, fiber100: 0 },
  "farmed-seafood": { grams: 100, label: "100g cooked", kcal100: 180, protein100: 20, fiber100: 0 },
  "marlin": { grams: 100, label: "100g cooked", kcal100: 120, protein100: 24, fiber100: 0 },
  "shark": { grams: 100, label: "100g cooked", kcal100: 130, protein100: 21, fiber100: 0 },
  "shrimp-imported": { grams: 100, label: "100g cooked", kcal100: 99, protein100: 24, fiber100: 0 },
  "swordfish": { grams: 100, label: "100g cooked", kcal100: 144, protein100: 20, fiber100: 0 },
  "tuna": { grams: 100, label: "100g cooked", kcal100: 132, protein100: 28, fiber100: 0 },

  // ---------------- PLANT-BASED PROTEIN ----------------
  "tempeh": { grams: 100, kcal100: 192, protein100: 20, fiber100: 9 },
  "tofu-firm": { grams: 100, kcal100: 144, protein100: 15, fiber100: 2 },
  "protein-powder": { grams: 30, label: "1 scoop (~30g)", kcal100: 400, protein100: 80, fiber100: 3 },
  "black-eyed-peas": { grams: 82, kcal100: 116, protein100: 8, fiber100: 6.5 },
  "edamame": { grams: 75, kcal100: 121, protein100: 11, fiber100: 5 },
  "lentils": { grams: 100, kcal100: 116, protein100: 9, fiber100: 8 },
  "lima-beans": { grams: 85, kcal100: 115, protein100: 7.8, fiber100: 7 },
  "mung-beans": { grams: 100, kcal100: 105, protein100: 7, fiber100: 7.6 },
  "adzuki-beans": { grams: 115, kcal100: 128, protein100: 7.5, fiber100: 7.3 },
  "other-legumes": { excluded: true },

  // ---------------- DAIRY ----------------
  "dairy-general": { excluded: true },
  "cheddar": { grams: 40, kcal100: 402, protein100: 25, fiber100: 0 },
  "goat-cheese": { grams: 40, kcal100: 364, protein100: 22, fiber100: 0 },
  "halloumi": { grams: 40, kcal100: 321, protein100: 22, fiber100: 0 },
  "havarti": { grams: 40, kcal100: 371, protein100: 21, fiber100: 0 },
  "mozzarella": { grams: 40, kcal100: 280, protein100: 22, fiber100: 0 },
  "parmesan": { grams: 40, kcal100: 431, protein100: 38, fiber100: 0 },
  "pecorino": { grams: 40, kcal100: 387, protein100: 26, fiber100: 0 },
  "soy-cheese": { grams: 40, kcal100: 290, protein100: 18, fiber100: 0 },
  "cottage-cheese": { grams: 30, kcal100: 98, protein100: 11, fiber100: 0 },
  "feta": { grams: 30, kcal100: 264, protein100: 14, fiber100: 0 },
  "quark": { grams: 30, kcal100: 80, protein100: 12, fiber100: 0 },
  "coconut-yogurt": { grams: 120, kcal100: 157, protein100: 1.5, fiber100: 2 },
  "cow-goat-yogurt": { grams: 120, kcal100: 61, protein100: 3.5, fiber100: 0 },
  "lactose-free-yogurt": { grams: 180, kcal100: 63, protein100: 3.5, fiber100: 0 },
  "kefir": { grams: 30, kcal100: 60, protein100: 3.3, fiber100: 0 },
  "dairy-other": { excluded: true },

  // ---------------- VEGETABLES - UNLIMITED (~100g reference serve) ----------------
  "lettuce-loose-leaf": { grams: 100, kcal100: 15, protein100: 1.4, fiber100: 1.3 },
  "chicory-leaf": { grams: 100, kcal100: 17, protein100: 1, fiber100: 4 },
  "endive": { grams: 100, kcal100: 17, protein100: 1.3, fiber100: 3.1 },
  "gem-lettuce": { grams: 100, kcal100: 14, protein100: 1.2, fiber100: 1.2 },
  "iceberg-lettuce": { grams: 100, kcal100: 14, protein100: 0.9, fiber100: 1.2 },
  "butter-lettuce": { grams: 100, kcal100: 13, protein100: 1.4, fiber100: 1.1 },
  "cos-romaine-lettuce": { grams: 100, kcal100: 17, protein100: 1.2, fiber100: 2.1 },
  "radicchio": { grams: 100, kcal100: 23, protein100: 1.4, fiber100: 0.9 },
  "rocket": { grams: 100, kcal100: 25, protein100: 2.6, fiber100: 1.6 },
  "witlof": { grams: 100, kcal100: 17, protein100: 0.9, fiber100: 3 },
  "bamboo-shoots": { grams: 100, kcal100: 27, protein100: 2.6, fiber100: 2.2 },
  "ginger": { grams: 10, label: "~10g (thumb-size piece)", kcal100: 80, protein100: 1.8, fiber100: 2 },
  "capsicum-red": { grams: 100, kcal100: 31, protein100: 1, fiber100: 2.1 },
  "cucumber": { grams: 100, kcal100: 15, protein100: 0.7, fiber100: 0.5 },
  "eggplant": { grams: 100, kcal100: 25, protein100: 1, fiber100: 3 },
  "olives": { grams: 30, label: "~30g (6-8 olives)", kcal100: 145, protein100: 1, fiber100: 3.3 },
  "spring-onion-green": { grams: 15, label: "~15g chopped", kcal100: 32, protein100: 1.8, fiber100: 2.6 },
  "tomato": { grams: 100, kcal100: 18, protein100: 0.9, fiber100: 1.2 },
  "yellow-squash": { grams: 100, kcal100: 17, protein100: 1.2, fiber100: 1.1 },
  "bok-choy": { grams: 100, kcal100: 13, protein100: 1.5, fiber100: 1 },
  "chard": { grams: 100, kcal100: 19, protein100: 1.8, fiber100: 1.6 },
  "choy-sum": { grams: 100, kcal100: 15, protein100: 1.5, fiber100: 1.2 },
  "kale": { grams: 100, kcal100: 35, protein100: 2.9, fiber100: 3.6 },
  "sprouts-alfalfa": { grams: 30, label: "~30g (a handful)", kcal100: 23, protein100: 4, fiber100: 1.9 },
  "sprouts-broccoli": { grams: 30, label: "~30g (a handful)", kcal100: 43, protein100: 3.2, fiber100: 3.2 },
  "sprouts-mung": { grams: 30, kcal100: 30, protein100: 3, fiber100: 1.8 },
  "sprouts-radish": { grams: 30, label: "~30g (a handful)", kcal100: 16, protein100: 1.3, fiber100: 1.9 },
  "sprouts-snow-pea": { grams: 30, label: "~30g (a handful)", kcal100: 42, protein100: 2.8, fiber100: 2.6 },
  "sprouts-sunflower": { grams: 30, label: "~30g (a handful)", kcal100: 65, protein100: 3.8, fiber100: 2 },
  "parsnip": { grams: 100, kcal100: 75, protein100: 1.2, fiber100: 4.9 },
  "cauliflower": { grams: 100, kcal100: 25, protein100: 1.9, fiber100: 2 },
  "corn": { grams: 100, kcal100: 96, protein100: 3.4, fiber100: 2.4 },
  "garlic": { grams: 5, label: "~5g (1-2 cloves)", kcal100: 149, protein100: 6.4, fiber100: 2.1 },
  "mushrooms": { grams: 100, kcal100: 22, protein100: 3.1, fiber100: 1 },
  "onions": { grams: 100, kcal100: 40, protein100: 1.1, fiber100: 1.7 },
  "canned-vegetables": { excluded: true },
  "starch-powder": { excluded: true },

  // ---------------- VEGETABLES - LIMITED (grams = the diet's own stated qty) ----------------
  "asparagus": { grams: 60, kcal100: 20, protein100: 2.2, fiber100: 2.1 },
  "artichoke-hearts": { grams: 60, kcal100: 47, protein100: 3.3, fiber100: 5.4 },
  "beetroot": { grams: 45, kcal100: 43, protein100: 1.6, fiber100: 2.8 },
  "broccoli": { grams: 45, kcal100: 34, protein100: 2.8, fiber100: 2.6 },
  "brussels-sprouts": { grams: 44, kcal100: 43, protein100: 3.4, fiber100: 3.8 },
  "cabbage": { grams: 53, kcal100: 25, protein100: 1.3, fiber100: 2.5 },
  "carrot-orange": { grams: 110, kcal100: 41, protein100: 0.9, fiber100: 2.8 },
  "celery": { grams: 40, kcal100: 16, protein100: 0.7, fiber100: 1.6 },
  "celeriac": { grams: 78, kcal100: 42, protein100: 1.5, fiber100: 1.8 },
  "fennel-bulb": { grams: 45, kcal100: 31, protein100: 1.2, fiber100: 3.1 },
  "green-beans": { grams: 70, kcal100: 31, protein100: 1.8, fiber100: 2.7 },
  "leek": { grams: 27, kcal100: 61, protein100: 1.5, fiber100: 1.8 },
  "nori": { grams: 2.5, kcal100: 35, protein100: 6, fiber100: 5 },
  "peas-green": { grams: 36, kcal100: 81, protein100: 5.4, fiber100: 5.5 },
  "snow-peas": { grams: 25, kcal100: 42, protein100: 2.8, fiber100: 2.6 },
  "spinach-baby": { grams: 45, kcal100: 23, protein100: 2.9, fiber100: 2.2 },
  "spinach-mature": { grams: 60, kcal100: 23, protein100: 2.9, fiber100: 2.2 },
  "spaghetti-squash": { grams: 78, kcal100: 31, protein100: 0.6, fiber100: 1.5 },
  "zucchini": { grams: 124, kcal100: 17, protein100: 1.2, fiber100: 1.1 },

  // ---------------- STARCHY VEGETABLES ----------------
  "carrot-other-colors": { grams: 28, kcal100: 41, protein100: 0.9, fiber100: 2.8 },
  "pumpkin": { grams: 120, kcal100: 26, protein100: 1, fiber100: 2.5 },
  "cassava": { grams: 103, kcal100: 160, protein100: 1.4, fiber100: 1.8 },
  "potato-peeled": { grams: 170, kcal100: 87, protein100: 1.9, fiber100: 1.8 },
  "potato-unpeeled": { grams: 170, kcal100: 93, protein100: 2, fiber100: 2.2 },
  "turnip": { grams: 78, kcal100: 22, protein100: 0.7, fiber100: 1.6 },
  "sweet-potato": { grams: 100, kcal100: 90, protein100: 1.6, fiber100: 2.5 },

  // ---------------- FRUIT ----------------
  "lemon": { grams: 15, label: "~1 tbsp juice", kcal100: 29, protein100: 1.1, fiber100: 2.8 },
  "lime": { grams: 10, label: "~2 tsp juice", kcal100: 30, protein100: 0.7, fiber100: 2.8 },
  "avocado-fruit": { grams: 50, kcal100: 160, protein100: 2, fiber100: 6.7 },
  "banana": { grams: 60, kcal100: 89, protein100: 1.1, fiber100: 2.6 },
  "berries": { grams: 75, kcal100: 43, protein100: 0.8, fiber100: 2.8 },
  "starfruit": { grams: 91, kcal100: 31, protein100: 1, fiber100: 2.8 },
  "cherries": { grams: 15, kcal100: 63, protein100: 1.1, fiber100: 2.1 },
  "citrus-other": { grams: 130, kcal100: 47, protein100: 0.9, fiber100: 2.4 },
  "grapes": { grams: 50, kcal100: 69, protein100: 0.7, fiber100: 0.9 },
  "honeydew": { grams: 40, kcal100: 36, protein100: 0.5, fiber100: 0.8 },
  "kiwi": { grams: 75, kcal100: 61, protein100: 1.1, fiber100: 3 },
  "lychee": { grams: 50, kcal100: 66, protein100: 0.8, fiber100: 1.3 },
  "papaya": { grams: 35, kcal100: 43, protein100: 0.5, fiber100: 1.7 },
  "passion-fruit": { grams: 18, kcal100: 97, protein100: 2.2, fiber100: 10.4 },
  "pineapple": { grams: 41, kcal100: 50, protein100: 0.5, fiber100: 1.4 },
  "pomegranate": { grams: 45, kcal100: 83, protein100: 1.7, fiber100: 4 },
  "rhubarb": { grams: 51, kcal100: 21, protein100: 0.9, fiber100: 1.8 },
  "rockmelon": { grams: 40, kcal100: 34, protein100: 0.8, fiber100: 0.9 },
  "dragon-fruit": { grams: 100, kcal100: 60, protein100: 1.2, fiber100: 3 },
  "apple": { grams: 150, kcal100: 52, protein100: 0.3, fiber100: 2.4 },
  "apricot": { grams: 35, kcal100: 48, protein100: 1.4, fiber100: 2 },
  "blackberries": { grams: 75, kcal100: 43, protein100: 1.4, fiber100: 5.3 },
  "canned-fruit": { grams: 125, kcal100: 75, protein100: 0.5, fiber100: 1.2 },
  "custard-apple": { grams: 100, kcal100: 94, protein100: 2.1, fiber100: 2.4 },
  "date-fruit": { grams: 24, kcal100: 282, protein100: 2.5, fiber100: 8 },
  "fig": { grams: 50, kcal100: 74, protein100: 0.8, fiber100: 2.9 },
  "jam": { grams: 20, kcal100: 250, protein100: 0.3, fiber100: 0.5 },
  "mango": { grams: 100, kcal100: 60, protein100: 0.8, fiber100: 1.6 },
  "nashi": { grams: 150, kcal100: 42, protein100: 0.5, fiber100: 3.6 },
  "nectarine": { grams: 140, kcal100: 44, protein100: 1.1, fiber100: 1.7 },
  "peach": { grams: 150, kcal100: 39, protein100: 0.9, fiber100: 1.5 },
  "pear": { grams: 150, kcal100: 57, protein100: 0.4, fiber100: 3.1 },
  "persimmon": { grams: 170, kcal100: 70, protein100: 0.6, fiber100: 3.6 },
  "plum": { grams: 65, kcal100: 46, protein100: 0.7, fiber100: 1.4 },
  "dried-fruit": { grams: 30, kcal100: 300, protein100: 2.5, fiber100: 7 },

  // ---------------- GRAINS, STARCHES & CEREALS ----------------
  "kelp-konjac-noodles": { grams: 100, kcal100: 9, protein100: 0, fiber100: 3 },
  "arrowroot-flour": { grams: 16, kcal100: 357, protein100: 0.3, fiber100: 1 },
  "buckwheat": { grams: 85, kcal100: 92, protein100: 3.4, fiber100: 2.7 },
  "hulled-millet": { grams: 120, kcal100: 119, protein100: 3.5, fiber100: 1.7 },
  "quinoa": { grams: 93, kcal100: 120, protein100: 4.4, fiber100: 2.8 },
  "rice": { grams: 100, kcal100: 130, protein100: 2.7, fiber100: 0.4 },
  "rice-cakes": { grams: 18, kcal100: 387, protein100: 8, fiber100: 4.2 },
  "crackers-approved-grain": { grams: 20, kcal100: 420, protein100: 8, fiber100: 4 },
  "gf-oats": { grams: 120, kcal100: 71, protein100: 2.5, fiber100: 1.7 },
  "corn-flour-tortillas": { grams: 30, kcal100: 218, protein100: 5.7, fiber100: 3.5 },
  "gf-yeast-free-bread": { grams: 30, kcal100: 250, protein100: 4, fiber100: 3 },
  "other-grains": { excluded: true },

  // ---------------- SOUPS ----------------
  "homemade-broth": { grams: 250, label: "1 cup (~250ml)", kcal100: 15, protein100: 2, fiber100: 0 },
  "canned-soup": { excluded: true },

  // ---------------- BEVERAGES ----------------
  "water": { grams: 250, label: "1 cup (~250ml)", kcal100: 0, protein100: 0, fiber100: 0 },
  "tea": { grams: 250, label: "1 cup (~250ml)", kcal100: 1, protein100: 0, fiber100: 0 },
  "coffee": { grams: 250, kcal100: 2, protein100: 0.1, fiber100: 0 },
  "almond-milk": { grams: 250, kcal100: 17, protein100: 0.6, fiber100: 0.4 },
  "coconut-milk-bev": { grams: 250, kcal100: 25, protein100: 0.2, fiber100: 0 },
  "hemp-milk": { grams: 250, kcal100: 35, protein100: 2, fiber100: 0.2 },
  "macadamia-milk": { grams: 250, kcal100: 27, protein100: 0.5, fiber100: 0.2 },
  "rice-milk": { grams: 250, kcal100: 47, protein100: 0.3, fiber100: 0.3 },
  "soy-milk": { grams: 250, kcal100: 33, protein100: 3.3, fiber100: 0.6 },
  "clear-spirits": { grams: 30, kcal100: 231, protein100: 0, fiber100: 0 },
  "cacao": { grams: 5, kcal100: 228, protein100: 19.6, fiber100: 33 },
  "beer": { grams: 375, kcal100: 42, protein100: 0.5, fiber100: 0 },
  "energy-drinks": { grams: 250, kcal100: 45, protein100: 0, fiber100: 0 },
  "fruit-juice": { grams: 250, kcal100: 45, protein100: 0.7, fiber100: 0.2 },
  "dark-spirits": { grams: 30, kcal100: 250, protein100: 0, fiber100: 0 },
  "soft-drinks": { grams: 375, kcal100: 42, protein100: 0, fiber100: 0 },
  "wine": { grams: 150, kcal100: 83, protein100: 0.1, fiber100: 0 },

  // ---------------- SWEETENERS ----------------
  "honey": { grams: 21, kcal100: 304, protein100: 0.3, fiber100: 0 },
  "maple-syrup": { grams: 20, kcal100: 260, protein100: 0, fiber100: 0 },
  "stevia": { grams: 1, label: "a pinch / a few drops", kcal100: 0, protein100: 0, fiber100: 0 },
  "agave": { grams: 21, kcal100: 310, protein100: 0, fiber100: 0 },
  "artificial-sweeteners": { grams: 1, label: "a pinch / a few drops", kcal100: 0, protein100: 0, fiber100: 0 },
  "dextrose": { grams: 4, kcal100: 375, protein100: 0, fiber100: 0 },
  "glucose": { grams: 4, kcal100: 375, protein100: 0, fiber100: 0 },
  "sugar": { grams: 4, kcal100: 387, protein100: 0, fiber100: 0 },
  "xylitol": { grams: 4, kcal100: 240, protein100: 0, fiber100: 0 },

  // ---------------- NUTS & SEEDS ----------------
  "almonds": { grams: 12, kcal100: 579, protein100: 21, fiber100: 12.5 },
  "almond-butter": { grams: 16, kcal100: 614, protein100: 21, fiber100: 10 },
  "chia-seeds": { grams: 24, kcal100: 486, protein100: 17, fiber100: 34 },
  "coconut-flour": { grams: 25, kcal100: 660, protein100: 6.9, fiber100: 16 },
  "coconut-cream": { grams: 40, kcal100: 330, protein100: 3.6, fiber100: 2 },
  "coconut-milk-culinary": { grams: 60, kcal100: 230, protein100: 2.3, fiber100: 2.2 },
  "flaxseed": { grams: 10, kcal100: 534, protein100: 18, fiber100: 27 },
  "hazelnuts": { grams: 13, kcal100: 628, protein100: 15, fiber100: 9.7 },
  "macadamias": { grams: 30, kcal100: 718, protein100: 7.9, fiber100: 8.6 },
  "mixed-nuts": { grams: 18, kcal100: 607, protein100: 20, fiber100: 8 },
  "pecans": { grams: 40, kcal100: 691, protein100: 9.2, fiber100: 9.6 },
  "pine-nuts": { grams: 10, kcal100: 673, protein100: 14, fiber100: 3.7 },
  "pumpkin-seeds": { grams: 18, kcal100: 559, protein100: 30, fiber100: 6 },
  "sesame-seeds": { grams: 18, kcal100: 573, protein100: 18, fiber100: 12 },
  "sunflower-seeds": { grams: 18, kcal100: 584, protein100: 21, fiber100: 8.6 },
  "tahini": { grams: 30, kcal100: 595, protein100: 17, fiber100: 9.3 },
  "walnuts": { grams: 20, kcal100: 654, protein100: 15, fiber100: 6.7 },
  "hemp-seeds": { grams: 20, kcal100: 553, protein100: 31, fiber100: 4 },
  "cashews": { grams: 18, kcal100: 553, protein100: 18, fiber100: 3.3 },
  "peanuts": { grams: 18, kcal100: 567, protein100: 26, fiber100: 8.5 },
  "pistachios": { grams: 18, kcal100: 560, protein100: 20, fiber100: 10.6 },

  // ---------------- CONDIMENTS, HERBS & SPICES ----------------
  "chives": { grams: 3, label: "1 tbsp chopped (~3g)", kcal100: 30, protein100: 3.3, fiber100: 2.5 },
  "chili": { grams: 28, kcal100: 40, protein100: 1.9, fiber100: 1.5 },
  "mayonnaise": { grams: 15, label: "1 tbsp (~15g)", kcal100: 680, protein100: 1, fiber100: 0 },
  "mustard": { grams: 5, label: "1 tsp (~5g)", kcal100: 66, protein100: 4, fiber100: 3 },
  "tabasco": { grams: 5, label: "1 tsp (~5ml)", kcal100: 12, protein100: 0, fiber100: 0 },
  "herbs-spices-fresh": { grams: 2, label: "1 tsp (~2g)", kcal100: 250, protein100: 8, fiber100: 25 },
  "bragg-aminos": { grams: 15, label: "1 tbsp (~15ml)", kcal100: 53, protein100: 8, fiber100: 0 },
  "coconut-aminos": { grams: 15, label: "1 tbsp (~15ml)", kcal100: 45, protein100: 3, fiber100: 0 },
  "fish-sauce": { grams: 15, label: "1 tbsp (~15ml)", kcal100: 35, protein100: 5, fiber100: 0 },
  "miso": { grams: 17, label: "1 tbsp (~17g)", kcal100: 199, protein100: 12, fiber100: 5.4 },
  "tamari": { grams: 15, label: "1 tbsp (~15ml)", kcal100: 53, protein100: 8, fiber100: 0 },
  "vinegar-other": { grams: 15, label: "1 tbsp (~15ml)", kcal100: 18, protein100: 0, fiber100: 0 },
  "wasabi": { grams: 5, label: "1 tsp (~5g)", kcal100: 109, protein100: 2, fiber100: 7 },
  "balsamic-vinegar": { grams: 15, label: "1 tbsp (~15ml)", kcal100: 88, protein100: 0.5, fiber100: 0 },
  "chicory-root": { grams: 10, label: "1 tbsp (~10g)", kcal100: 250, protein100: 2, fiber100: 40 },
  "gums-thickeners": { excluded: true },
  "soy-sauce": { grams: 15, label: "1 tbsp (~15ml)", kcal100: 53, protein100: 8, fiber100: 0 },
  "spice-sachets": { excluded: true },

  // ---------------- FATS & OILS (~1 tbsp reference serve) ----------------
  "avocado-oil": { grams: 14, label: "1 tbsp (~14g)", kcal100: 884, protein100: 0, fiber100: 0 },
  "coconut-oil": { grams: 14, label: "1 tbsp (~14g)", kcal100: 862, protein100: 0, fiber100: 0 },
  "flax-oil": { grams: 14, label: "1 tbsp (~14g)", kcal100: 884, protein100: 0, fiber100: 0 },
  "ghee": { grams: 14, label: "1 tbsp (~14g)", kcal100: 900, protein100: 0, fiber100: 0 },
  "grapeseed-oil": { grams: 14, label: "1 tbsp (~14g)", kcal100: 884, protein100: 0, fiber100: 0 },
  "mct-oil": { grams: 14, label: "1 tbsp (~14g)", kcal100: 833, protein100: 0, fiber100: 0 },
  "olive-oil": { grams: 14, label: "1 tbsp (~14g)", kcal100: 884, protein100: 0, fiber100: 0 },
  "rice-bran-oil": { grams: 14, label: "1 tbsp (~14g)", kcal100: 884, protein100: 0, fiber100: 0 },
  "pumpkin-seed-oil": { grams: 14, label: "1 tbsp (~14g)", kcal100: 884, protein100: 0, fiber100: 0 },
  "safflower-oil": { grams: 14, label: "1 tbsp (~14g)", kcal100: 884, protein100: 0, fiber100: 0 },
  "sesame-oil": { grams: 14, label: "1 tbsp (~14g)", kcal100: 884, protein100: 0, fiber100: 0 },
  "sunflower-oil": { grams: 14, label: "1 tbsp (~14g)", kcal100: 884, protein100: 0, fiber100: 0 },
  "walnut-oil": { grams: 14, label: "1 tbsp (~14g)", kcal100: 884, protein100: 0, fiber100: 0 },
  "butter": { grams: 14, label: "1 tbsp (~14g)", kcal100: 717, protein100: 0.9, fiber100: 0 },
  "gmo-oils": { excluded: true },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = { NUTRITION };
}
