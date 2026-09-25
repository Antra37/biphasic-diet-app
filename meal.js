(function () {
  "use strict";

  const DIARY_KEY = "sibo-diary-v1";
  const OLD_DAY_KEY = "sibo-day-log"; // v1 single-day format, migrated on first load

  // ---------- DOM ----------
  const dayDateLabel = document.getElementById("dayDateLabel");
  const newDayBtn = document.getElementById("newDayBtn");
  const exportBtn = document.getElementById("exportBtn");
  const fruitGaugeText = document.getElementById("fruitGaugeText");
  const todayMealsEl = document.getElementById("todayMeals");

  const addMealBtn = document.getElementById("addMealBtn");
  const mealEditor = document.getElementById("mealEditor");
  const mealEditorTitle = document.getElementById("mealEditorTitle");
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

  const exportModal = document.getElementById("exportModal");
  const exportModalClose = document.getElementById("exportModalClose");
  const exportText = document.getElementById("exportText");
  const exportCopyBtn = document.getElementById("exportCopyBtn");
  const exportShareBtn = document.getElementById("exportShareBtn");
  const exportDownloadBtn = document.getElementById("exportDownloadBtn");
  const exportCopiedNote = document.getElementById("exportCopiedNote");

  // ---------- State ----------
  let diary = loadDiary();
  let draftItems = []; // [{foodId, servings, qtyNote}]
  let editingMealId = null;

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

  function loadDiary() {
    let raw;
    try {
      raw = JSON.parse(localStorage.getItem(DIARY_KEY));
    } catch (e) {
      raw = null;
    }
    if (raw && raw.days) return raw;

    // Migrate the old single-day format if present.
    let old;
    try {
      old = JSON.parse(localStorage.getItem(OLD_DAY_KEY));
    } catch (e) {
      old = null;
    }
    const days = {};
    if (old && old.date && Array.isArray(old.meals) && old.meals.length > 0) {
      days[old.date] = { meals: old.meals };
    }
    return { days };
  }

  function saveDiary() {
    localStorage.setItem(DIARY_KEY, JSON.stringify(diary));
  }

  function getDay(dateStr) {
    if (!diary.days[dateStr]) diary.days[dateStr] = { meals: [] };
    return diary.days[dateStr];
  }

  function todayMeals() {
    return getDay(todayStr()).meals;
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
  function addDraftItem(foodId, qtyNote) {
    const existing = draftItems.find((i) => i.foodId === foodId);
    if (existing) {
      existing.servings += 1;
      if (qtyNote && !existing.qtyNote) existing.qtyNote = qtyNote;
    } else {
      draftItems.push({ foodId, servings: 1, qtyNote: qtyNote || null });
    }
    renderDraftItems();
  }

  function removeDraftItem(foodId) {
    draftItems = draftItems.filter((i) => i.foodId !== foodId);
    renderDraftItems();
  }

  function setDraftServings(foodId, servings) {
    const item = draftItems.find((i) => i.foodId === foodId);
    if (item) item.servings = Math.max(0.25, Math.round(servings * 4) / 4);
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

      let subLine = `<span class="status-badge small ${pd.status}">${meta[pd.status].icon} ${meta[pd.status].label}</span>`;
      if (pd.status === "allow") {
        subLine += pd.qty
          ? `<span class="meal-item-limit">1 serving = ${escapeHtml(pd.qty)}</span>`
          : `<span class="meal-item-limit">unlimited - no stated serving size</span>`;
      }

      const noteLine = item.qtyNote
        ? `<div class="meal-item-note">You entered: ${escapeHtml(item.qtyNote)}</div>`
        : "";

      const controls = pd.status === "allow"
        ? `<button class="stepper-btn" data-action="dec" data-id="${food.id}">−</button>
           <span class="stepper-val">${item.servings}</span>
           <button class="stepper-btn" data-action="inc" data-id="${food.id}">+</button>`
        : "";

      row.innerHTML = `
        <div class="meal-item-main">
          <div class="meal-item-name">${escapeHtml(food.name)}</div>
          <div class="meal-item-sub">${subLine}</div>
          ${noteLine}
        </div>
        <div class="meal-item-controls">
          ${controls}
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
      setDraftServings(id, item.servings + 0.25);
    } else if (action === "dec") {
      const item = draftItems.find((i) => i.foodId === id);
      if (item.servings <= 0.25) removeDraftItem(id);
      else setDraftServings(id, item.servings - 0.25);
    }
  });

  // ---------- Quick-add parsing UI ----------
  parseBtn.addEventListener("click", () => {
    const text = quickAddText.value.trim();
    if (!text) return;
    const result = parseMealText(text);

    result.matched.forEach((m) => addDraftItem(m.food.id, m.qtyText));

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
            addDraftItem(food.id, u.qtyText);
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
        addDraftItem(food.id, null);
        mealSearchInput.value = "";
        mealSearchResults.innerHTML = "";
      });
      mealSearchResults.appendChild(row);
    });
  });

  // ---------- Evaluation ----------
  function occurrencesTodayExcludingEdit(foodId) {
    let count = 0;
    todayMeals().forEach((m) => {
      if (m.id === editingMealId) return;
      m.items.forEach((i) => {
        if (i.foodId === foodId) count += 1;
      });
    });
    return count;
  }

  function fruitServingsToday() {
    let total = 0;
    todayMeals().forEach((m) => {
      if (m.id === editingMealId) return;
      const mp = m.phase || phase();
      m.items.forEach((i) => {
        const food = getFood(i.foodId);
        if (food && food.category === "fruit" && food[mp] && food[mp].status === "allow") total += i.servings;
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
        const priorCount = occurrencesTodayExcludingEdit(i.food.id);
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

  // ---------- Save / edit / day log ----------
  saveMealBtn.addEventListener("click", () => {
    const name = mealNameInput.value.trim() || "Meal";
    const meals = todayMeals();

    if (editingMealId) {
      const idx = meals.findIndex((m) => m.id === editingMealId);
      const record = {
        id: editingMealId,
        name,
        phase: phase(),
        items: draftItems.map((i) => ({ foodId: i.foodId, servings: i.servings })),
      };
      if (idx >= 0) meals[idx] = record;
      else meals.push(record);
    } else {
      meals.push({
        id: String(Date.now()),
        name,
        phase: phase(),
        items: draftItems.map((i) => ({ foodId: i.foodId, servings: i.servings })),
      });
    }
    saveDiary();
    closeMealEditor();
    renderToday();
  });

  function openMealEditor(prefillMeal) {
    if (prefillMeal) {
      editingMealId = prefillMeal.id;
      mealEditorTitle.textContent = "Edit meal";
      mealNameInput.value = prefillMeal.name;
      draftItems = prefillMeal.items.map((i) => ({ foodId: i.foodId, servings: i.servings, qtyNote: null }));
    } else {
      editingMealId = null;
      mealEditorTitle.textContent = "Add a meal";
      mealNameInput.value = "";
      draftItems = [];
    }
    quickAddText.value = "";
    mealSearchInput.value = "";
    mealSearchResults.innerHTML = "";
    unmatchedWrap.classList.add("hidden");
    unmatchedList.innerHTML = "";
    renderDraftItems();
    mealEditor.classList.remove("hidden");
    addMealBtn.classList.add("hidden");
    mealEditor.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closeMealEditor() {
    editingMealId = null;
    mealEditor.classList.add("hidden");
    addMealBtn.classList.remove("hidden");
  }

  addMealBtn.addEventListener("click", () => openMealEditor(null));
  mealEditorClose.addEventListener("click", closeMealEditor);

  newDayBtn.addEventListener("click", () => {
    getDay(todayStr()).meals = [];
    saveDiary();
    renderToday();
  });

  function renderToday() {
    const day = getDay(todayStr());
    dayDateLabel.textContent = new Date(todayStr() + "T00:00:00").toLocaleDateString(undefined, {
      weekday: "long", month: "short", day: "numeric",
    });

    const fruitTotal = fruitServingsToday();
    const fruitCap = CATEGORY_LIMITS.fruit.capPerDay;
    fruitGaugeText.textContent = `${fruitTotal} / ${fruitCap} serves`;
    fruitGaugeText.classList.toggle("over", fruitTotal > fruitCap);

    todayMealsEl.innerHTML = "";
    if (day.meals.length === 0) {
      todayMealsEl.innerHTML = '<p class="today-empty">No meals logged yet today.</p>';
      return;
    }

    day.meals.forEach((meal) => {
      const mp = meal.phase || phase();
      const items = meal.items.map((i) => ({ ...i, food: getFood(i.foodId) })).filter((i) => i.food);
      const hasAvoid = items.some((i) => i.food[mp] && i.food[mp].status === "avoid");
      const card = document.createElement("div");
      card.className = "saved-meal-card";
      card.dataset.mealId = meal.id;
      card.innerHTML = `
        <div class="saved-meal-head">
          <span class="saved-meal-name">${escapeHtml(meal.name)}</span>
          ${hasAvoid ? '<span class="status-badge small avoid">✕ Check</span>' : '<span class="status-badge small allow">✓</span>'}
          <button class="link-btn" data-action="edit" data-meal-id="${meal.id}">Edit</button>
          <button class="remove-btn" data-action="delete" data-meal-id="${meal.id}" aria-label="Delete meal">&times;</button>
        </div>
        <div class="saved-meal-items">${items.map((i) => escapeHtml(i.food.name)).join(", ")}</div>
      `;
      todayMealsEl.appendChild(card);
    });
  }

  todayMealsEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-meal-id]");
    if (!btn) return;
    const mealId = btn.dataset.mealId;
    if (btn.dataset.action === "delete") {
      const day = getDay(todayStr());
      day.meals = day.meals.filter((m) => m.id !== mealId);
      saveDiary();
      renderToday();
    } else if (btn.dataset.action === "edit") {
      const meal = getDay(todayStr()).meals.find((m) => m.id === mealId);
      if (meal) openMealEditor(meal);
    }
  });

  // ---------- Export ----------
  const PHASE_LABELS = { p1r: "Phase One – Restricted", p1s: "Phase One – Semi-Restricted", p2: "Phase Two – Reintroduce" };

  function buildExportText() {
    const dates = Object.keys(diary.days).filter((d) => diary.days[d].meals.length > 0).sort();
    if (dates.length === 0) return "No meals logged yet.";

    const lines = ["SIBO Bi-Phasic Diet — Food Diary", ""];
    dates.forEach((dateStr) => {
      const dateLabel = new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
        weekday: "long", year: "numeric", month: "short", day: "numeric",
      });
      lines.push(`== ${dateLabel} ==`);
      diary.days[dateStr].meals.forEach((meal) => {
        const mp = meal.phase || "p1r";
        lines.push(`${meal.name} (${PHASE_LABELS[mp] || mp})`);
        meal.items.forEach((i) => {
          const food = getFood(i.foodId);
          if (!food) return;
          const pd = food[mp];
          const statusTxt = pd.status === "avoid" ? "AVOID" : pd.status === "caution" ? "check with practitioner" : (pd.qty || "unlimited");
          const servingsTxt = i.servings !== 1 ? ` x${i.servings}` : "";
          lines.push(`  - ${food.name}${servingsTxt} [${statusTxt}]`);
        });
      });
      lines.push("");
    });
    return lines.join("\n");
  }

  function openExportModal() {
    exportText.value = buildExportText();
    exportCopiedNote.classList.add("hidden");
    exportModal.classList.remove("hidden");
    exportShareBtn.classList.toggle("hidden", !navigator.share);
  }

  exportBtn.addEventListener("click", openExportModal);
  exportModalClose.addEventListener("click", () => exportModal.classList.add("hidden"));
  exportModal.addEventListener("click", (e) => {
    if (e.target === exportModal) exportModal.classList.add("hidden");
  });

  exportCopyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(exportText.value);
      exportCopiedNote.classList.remove("hidden");
    } catch (e) {
      exportText.select();
      document.execCommand("copy");
      exportCopiedNote.classList.remove("hidden");
    }
  });

  exportShareBtn.addEventListener("click", async () => {
    try {
      await navigator.share({ title: "SIBO Food Diary", text: exportText.value });
    } catch (e) { /* user cancelled share - ignore */ }
  });

  exportDownloadBtn.addEventListener("click", () => {
    const blob = new Blob([exportText.value], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sibo-food-diary-${todayStr()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  window.addEventListener("sibo-phase-changed", () => {
    renderToday();
    if (draftItems.length > 0) renderDraftItems();
  });
  window.addEventListener("sibo-tab-meal-shown", () => {
    renderToday();
  });

  // Init
  saveDiary();
  renderToday();
})();
