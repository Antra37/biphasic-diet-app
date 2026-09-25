(function () {
  "use strict";

  const DAY_STORAGE_KEY = "sibo-day-log";

  // ---------- DOM ----------
  const dayDateLabel = document.getElementById("dayDateLabel");
  const newDayBtn = document.getElementById("newDayBtn");
  const fruitGaugeText = document.getElementById("fruitGaugeText");
  const todayMealsEl = document.getElementById("todayMeals");

  const addMealBtn = document.getElementById("addMealBtn");
  const mealEditor = document.getElementById("mealEditor");
  const mealEditorClose = document.getElementById("mealEditorClose");
  const mealNameInput = document.getElementById("mealNameInput");

  const quickAddText = document.getElementById("quickAddText");
  const parseBtn = document.getElementById("parseBtn");
  const unmatchedWrap = document.getElementById("unmatchedWrap");
  const unmatchedList = document.getElementById("unmatchedList");

  const mealSearchInput = document.getElementById("mealSearchInput");
  const mealSearchResults = document.getElementById("mealSearchResults");
  const mealItemsEl = document.getElementById("mealItems");

  const checkMealBtn = document.getElementById("checkMealBtn");
  const verdictWrap = document.getElementById("verdictWrap");
  const saveMealBtn = document.getElementById("saveMealBtn");

  // ---------- State ----------
  let dayLog = loadDayLog();
  let draftItems = []; // [{foodId, servings}]

  function getFood(id) {
    return FOODS.find((f) => f.id === id);
  }

  function phase() {
    return window.SiboPhase.get();
  }

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function loadDayLog() {
    let raw;
    try {
      raw = JSON.parse(localStorage.getItem(DAY_STORAGE_KEY));
    } catch (e) {
      raw = null;
    }
    if (!raw || raw.date !== todayStr()) {
      return { date: todayStr(), meals: [] };
    }
    return raw;
  }

  function saveDayLog() {
    localStorage.setItem(DAY_STORAGE_KEY, JSON.stringify(dayLog));
  }

  // ---------- Text parsing ----------
  const LEADING_WORDS = /^(with|and|a|an|some|few|handful of|plus|also|of)\s+/i;
  const QTY_PATTERN = /^\d+([.,]\d+)?\s*(g|grams?|kg|kilograms?|cups?|tbsp|tablespoons?|tsp|teaspoons?|ml|millilitres?|milliliters?|l|litres?|liters?|oz|ounces?|pieces?|piece|slices?|slice|sticks?|stick|spears?|spear|halves?|half|pods?|pod|sheets?|sheet|stalks?|stalk|cloves?|clove|medium|small|large)?\s*/i;
  const TRAILING_WORDS = /\s*(salad|bowl|plate|stir[- ]?fry|stirfry|dish|mix|meal|serve|serving)$/i;

  function splitFragments(text) {
    const commaParts = text.split(/\r?\n|,/);
    const fragments = [];
    commaParts.forEach((part) => {
      part.split(/\s+and\s+|\s*&\s*/i).forEach((sub) => {
        const t = sub.trim();
        if (t) fragments.push(t);
      });
    });
    return fragments;
  }

  function cleanFragment(raw) {
    let s = raw.trim();
    let qtyText = null;

    // Strip leading connector words and a leading quantity, in whichever order
    // they appear ("a 200g steak" vs "200g of steak"), until neither matches.
    let changed = true;
    while (changed) {
      changed = false;
      if (LEADING_WORDS.test(s)) {
        s = s.replace(LEADING_WORDS, "").trim();
        changed = true;
        continue;
      }
      const qtyMatch = s.match(QTY_PATTERN);
      if (qtyMatch && qtyMatch[0].trim().length > 0 && /\d/.test(qtyMatch[0])) {
        qtyText = qtyText ? `${qtyText} ${qtyMatch[0].trim()}` : qtyMatch[0].trim();
        s = s.slice(qtyMatch[0].length).trim();
        changed = true;
      }
    }
    while (TRAILING_WORDS.test(s)) {
      s = s.replace(TRAILING_WORDS, "").trim();
    }
    while (LEADING_WORDS.test(s)) {
      s = s.replace(LEADING_WORDS, "").trim();
    }
    return { cleaned: s, qtyText, original: raw.trim() };
  }

  function parseMealText(text) {
    const fragments = splitFragments(text);
    const result = { matched: [], uncertain: [], unmatched: [] };

    fragments.forEach((raw) => {
      const { cleaned, qtyText, original } = cleanFragment(raw);
      if (!cleaned) {
        result.unmatched.push({ raw: original });
        return;
      }
      const candidates = SiboMatch.searchScored(cleaned, 5);
      if (candidates.length === 0) {
        result.unmatched.push({ raw: original });
      } else if (candidates.length === 1 || candidates[0].score > candidates[1].score) {
        result.matched.push({ food: candidates[0].food, raw: original, qtyText });
      } else {
        const topScore = candidates[0].score;
        const tied = candidates.filter((c) => c.score === topScore).map((c) => c.food);
        result.uncertain.push({ raw: original, qtyText, candidates: tied });
      }
    });

    return result;
  }

  // ---------- Draft item management ----------
  function addDraftItem(foodId) {
    const existing = draftItems.find((i) => i.foodId === foodId);
    if (existing) {
      existing.servings += 1;
    } else {
      draftItems.push({ foodId, servings: 1 });
    }
    renderDraftItems();
  }

  function removeDraftItem(foodId) {
    draftItems = draftItems.filter((i) => i.foodId !== foodId);
    renderDraftItems();
  }

  function setDraftServings(foodId, servings) {
    const item = draftItems.find((i) => i.foodId === foodId);
    if (item) item.servings = Math.max(0.5, Math.round(servings * 2) / 2);
    renderDraftItems();
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function statusMeta() {
    return window.SiboStatusMeta;
  }

  function renderDraftItems() {
    mealItemsEl.innerHTML = "";
    if (draftItems.length === 0) {
      mealItemsEl.innerHTML = '<p class="meal-items-empty">No foods added yet.</p>';
      verdictWrap.classList.add("hidden");
      saveMealBtn.classList.add("hidden");
      return;
    }
    const ph = phase();
    const meta = statusMeta();

    draftItems.forEach((item) => {
      const food = getFood(item.foodId);
      const pd = food[ph];
      const row = document.createElement("div");
      row.className = `meal-item-row ${pd.status}`;
      row.innerHTML = `
        <div class="meal-item-main">
          <div class="meal-item-name">${escapeHtml(food.name)}</div>
          <div class="meal-item-sub">
            <span class="status-badge small ${pd.status}">${meta[pd.status].icon} ${meta[pd.status].label}</span>
            ${pd.status === "allow" ? `<span class="meal-item-limit">${pd.qty ? "limit " + escapeHtml(pd.qty) : "unlimited"}</span>` : ""}
          </div>
        </div>
        <div class="meal-item-controls">
          <button class="stepper-btn" data-action="dec" data-id="${food.id}">−</button>
          <span class="stepper-val">${item.servings}</span>
          <button class="stepper-btn" data-action="inc" data-id="${food.id}">+</button>
          <button class="remove-btn" data-action="remove" data-id="${food.id}" aria-label="Remove">&times;</button>
        </div>
      `;
      mealItemsEl.appendChild(row);
    });

    verdictWrap.classList.add("hidden");
    saveMealBtn.classList.add("hidden");
  }

  mealItemsEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    if (action === "remove") removeDraftItem(id);
    else if (action === "inc") {
      const item = draftItems.find((i) => i.foodId === id);
      setDraftServings(id, item.servings + 0.5);
    } else if (action === "dec") {
      const item = draftItems.find((i) => i.foodId === id);
      if (item.servings <= 0.5) removeDraftItem(id);
      else setDraftServings(id, item.servings - 0.5);
    }
  });

  // ---------- Quick-add parsing UI ----------
  parseBtn.addEventListener("click", () => {
    const text = quickAddText.value.trim();
    if (!text) return;
    const result = parseMealText(text);

    result.matched.forEach((m) => addDraftItem(m.food.id));

    unmatchedList.innerHTML = "";
    const toShow = [...result.uncertain, ...result.unmatched];
    if (toShow.length > 0) {
      unmatchedWrap.classList.remove("hidden");
      result.uncertain.forEach((u) => {
        const card = document.createElement("div");
        card.className = "uncertain-card";
        card.innerHTML = `
          <div class="uncertain-raw">"${escapeHtml(u.raw)}" — did you mean:</div>
          <div class="uncertain-options"></div>
        `;
        const optsEl = card.querySelector(".uncertain-options");
        u.candidates.forEach((food) => {
          const b = document.createElement("button");
          b.className = "chip";
          b.textContent = food.name;
          b.addEventListener("click", () => {
            addDraftItem(food.id);
            card.remove();
            if (unmatchedList.children.length === 0) unmatchedWrap.classList.add("hidden");
          });
          optsEl.appendChild(b);
        });
        unmatchedList.appendChild(card);
      });
      result.unmatched.forEach((u) => {
        const card = document.createElement("div");
        card.className = "uncertain-card";
        card.innerHTML = `<div class="uncertain-raw">Couldn't match "${escapeHtml(u.raw)}" — try searching for it below.</div>`;
        unmatchedList.appendChild(card);
      });
    } else {
      unmatchedWrap.classList.add("hidden");
    }

    quickAddText.value = "";
  });

  // ---------- Manual search-add ----------
  mealSearchInput.addEventListener("input", (e) => {
    const q = e.target.value.trim();
    mealSearchResults.innerHTML = "";
    if (!q) return;
    const matches = SiboMatch.search(q, 8);
    matches.forEach((food) => {
      const row = document.createElement("button");
      row.className = "meal-search-row";
      row.innerHTML = `<span>${escapeHtml(food.name)}</span><span class="add-icon">+ Add</span>`;
      row.addEventListener("click", () => {
        addDraftItem(food.id);
        mealSearchInput.value = "";
        mealSearchResults.innerHTML = "";
      });
      mealSearchResults.appendChild(row);
    });
  });

  // ---------- Evaluation ----------
  function occurrencesTodayExcludingDraft(foodId) {
    let count = 0;
    dayLog.meals.forEach((m) => {
      m.items.forEach((i) => {
        if (i.foodId === foodId) count += 1;
      });
    });
    return count;
  }

  function fruitServingsToday() {
    let total = 0;
    const ph = phase();
    dayLog.meals.forEach((m) => {
      m.items.forEach((i) => {
        const food = getFood(i.foodId);
        if (food && food.category === "fruit" && food[ph].status === "allow") total += i.servings;
      });
    });
    return total;
  }

  function evaluateDraft() {
    const ph = phase();
    const withFood = draftItems.map((i) => ({ ...i, food: getFood(i.foodId) }));

    const avoidItems = withFood.filter((i) => i.food[ph].status === "avoid");
    const cautionItems = withFood.filter((i) => i.food[ph].status === "caution");
    const okItems = withFood.filter((i) => i.food[ph].status === "allow");

    const categoryTotals = {};
    okItems.forEach((i) => {
      const cat = i.food.category;
      const limits = CATEGORY_LIMITS[cat];
      if (limits && limits.capPerMeal) {
        categoryTotals[cat] = categoryTotals[cat] || { total: 0, items: [] };
        categoryTotals[cat].total += i.servings;
        categoryTotals[cat].items.push(i);
      }
    });

    const categoryFlags = [];
    Object.keys(categoryTotals).forEach((cat) => {
      const limits = CATEGORY_LIMITS[cat];
      const data = categoryTotals[cat];
      const cap = limits.capPerMeal;
      if (data.total > cap) {
        categoryFlags.push({ label: limits.label, total: data.total, cap, items: data.items });
      }
    });

    const fruitThisMeal = okItems.filter((i) => i.food.category === "fruit").reduce((s, i) => s + i.servings, 0);
    const fruitBefore = fruitServingsToday();
    const fruitAfter = fruitBefore + fruitThisMeal;
    const fruitCap = CATEGORY_LIMITS.fruit.capPerDay;
    const fruitOver = fruitAfter > fruitCap;

    const dailyReminders = [];
    okItems.forEach((i) => {
      const qty = i.food[ph].qty;
      if (qty && /day/i.test(qty)) {
        const priorCount = occurrencesTodayExcludingDraft(i.food.id);
        if (priorCount >= 1) {
          dailyReminders.push({ food: i.food, qty, priorCount });
        }
      }
    });

    let verdict = "good";
    if (avoidItems.length > 0) verdict = "avoid";
    else if (categoryFlags.length > 0 || fruitOver) verdict = "adjust";
    else if (cautionItems.length > 0 || dailyReminders.length > 0) verdict = "check";

    return {
      verdict, avoidItems, cautionItems, categoryFlags,
      fruitThisMeal, fruitBefore, fruitAfter, fruitCap, fruitOver,
      dailyReminders,
    };
  }

  const VERDICT_META = {
    good: { icon: "✓", title: "Looks good", cls: "allow" },
    check: { icon: "!", title: "Worth a quick check", cls: "caution" },
    adjust: { icon: "⚠", title: "A few things to adjust", cls: "caution" },
    avoid: { icon: "✕", title: "Contains foods to avoid", cls: "avoid" },
  };

  function renderVerdict(ev) {
    const vm = VERDICT_META[ev.verdict];
    let html = `<div class="verdict-banner ${vm.cls}"><span class="verdict-icon">${vm.icon}</span> ${vm.title}</div>`;
    const lines = [];

    if (ev.avoidItems.length > 0) {
      lines.push(`<strong>Remove — not allowed in this phase:</strong> ${ev.avoidItems.map((i) => escapeHtml(i.food.name)).join(", ")}`);
    }
    ev.categoryFlags.forEach((f) => {
      lines.push(`<strong>${escapeHtml(f.label)}:</strong> limit is ${f.cap} serve${f.cap > 1 ? "s" : ""} per meal — you've got ${f.total}. Pick ${f.cap}, drop or reduce: ${f.items.map((i) => escapeHtml(i.food.name)).join(", ")}.`);
    });
    if (ev.fruitThisMeal > 0) {
      const overNote = ev.fruitOver ? ` — that's over the daily limit of ${ev.fruitCap}.` : "";
      lines.push(`<strong>Fruit today:</strong> ${ev.fruitAfter} / ${ev.fruitCap} serves after this meal${overNote}`);
    }
    if (ev.cautionItems.length > 0) {
      lines.push(`<strong>Check with your practitioner:</strong> ${ev.cautionItems.map((i) => escapeHtml(i.food.name)).join(", ")}`);
    }
    ev.dailyReminders.forEach((r) => {
      lines.push(`<strong>${escapeHtml(r.food.name)}</strong> has already been logged today — its limit is <em>${escapeHtml(r.qty)}</em>, so check the running total is still within that.`);
    });
    if (ev.verdict === "good") {
      lines.push("Nothing to change here.");
    }

    html += `<ul class="verdict-list">${lines.map((l) => `<li>${l}</li>`).join("")}</ul>`;
    verdictWrap.innerHTML = html;
    verdictWrap.classList.remove("hidden");
    saveMealBtn.classList.remove("hidden");
  }

  checkMealBtn.addEventListener("click", () => {
    if (draftItems.length === 0) return;
    renderVerdict(evaluateDraft());
  });

  // ---------- Save / day log ----------
  saveMealBtn.addEventListener("click", () => {
    const name = mealNameInput.value.trim() || "Meal";
    dayLog.meals.push({
      id: String(Date.now()),
      name,
      phase: phase(),
      items: draftItems.map((i) => ({ foodId: i.foodId, servings: i.servings })),
    });
    saveDayLog();
    closeMealEditor();
    renderToday();
  });

  function openMealEditor() {
    draftItems = [];
    mealNameInput.value = "";
    quickAddText.value = "";
    mealSearchInput.value = "";
    mealSearchResults.innerHTML = "";
    unmatchedWrap.classList.add("hidden");
    unmatchedList.innerHTML = "";
    renderDraftItems();
    mealEditor.classList.remove("hidden");
    addMealBtn.classList.add("hidden");
  }

  function closeMealEditor() {
    mealEditor.classList.add("hidden");
    addMealBtn.classList.remove("hidden");
  }

  addMealBtn.addEventListener("click", openMealEditor);
  mealEditorClose.addEventListener("click", closeMealEditor);

  newDayBtn.addEventListener("click", () => {
    dayLog = { date: todayStr(), meals: [] };
    saveDayLog();
    renderToday();
  });

  function renderToday() {
    dayDateLabel.textContent = new Date(dayLog.date + "T00:00:00").toLocaleDateString(undefined, {
      weekday: "long", month: "short", day: "numeric",
    });

    const fruitTotal = fruitServingsToday();
    const fruitCap = CATEGORY_LIMITS.fruit.capPerDay;
    fruitGaugeText.textContent = `${fruitTotal} / ${fruitCap} serves`;
    fruitGaugeText.classList.toggle("over", fruitTotal > fruitCap);

    todayMealsEl.innerHTML = "";
    if (dayLog.meals.length === 0) {
      todayMealsEl.innerHTML = '<p class="today-empty">No meals logged yet today.</p>';
      return;
    }

    const ph = phase();
    dayLog.meals.forEach((meal) => {
      const items = meal.items.map((i) => ({ ...i, food: getFood(i.foodId) })).filter((i) => i.food);
      const hasAvoid = items.some((i) => i.food[ph].status === "avoid");
      const card = document.createElement("div");
      card.className = "saved-meal-card";
      card.innerHTML = `
        <div class="saved-meal-head">
          <span class="saved-meal-name">${escapeHtml(meal.name)}</span>
          ${hasAvoid ? '<span class="status-badge small avoid">✕ Check</span>' : '<span class="status-badge small allow">✓</span>'}
          <button class="remove-btn" data-meal-id="${meal.id}" aria-label="Delete meal">&times;</button>
        </div>
        <div class="saved-meal-items">${items.map((i) => escapeHtml(i.food.name)).join(", ")}</div>
      `;
      todayMealsEl.appendChild(card);
    });
  }

  todayMealsEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-meal-id]");
    if (!btn) return;
    dayLog.meals = dayLog.meals.filter((m) => m.id !== btn.dataset.mealId);
    saveDayLog();
    renderToday();
  });

  window.addEventListener("sibo-phase-changed", () => {
    renderToday();
    if (draftItems.length > 0) renderDraftItems();
  });
  window.addEventListener("sibo-tab-meal-shown", () => {
    renderToday();
  });

  // Init
  renderToday();
})();
