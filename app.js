(function () {
  "use strict";

  const PHASE_META = {
    p1r: { label: "Phase 1 · Restricted", short: "Phase One – Restricted" },
    p1s: { label: "Phase 1 · Semi-Restricted", short: "Phase One – Semi-Restricted" },
    p2: { label: "Phase 2 · Reintroduce", short: "Phase Two – Reintroduce" },
  };

  const STATUS_META = {
    allow: { label: "Allowed", icon: "✓" },
    avoid: { label: "Avoid", icon: "✕" },
    caution: { label: "Check first", icon: "!" },
  };

  const STORAGE_KEY = "sibo-app-phase";

  const searchInput = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearBtn");
  const resultsEl = document.getElementById("results");
  const emptyStateEl = document.getElementById("emptyState");
  const phaseBtn = document.getElementById("phaseBtn");
  const phaseLabel = document.getElementById("phaseLabel");
  const phaseSheet = document.getElementById("phaseSheet");
  const phaseSheetClose = document.getElementById("phaseSheetClose");
  const phaseOptions = document.querySelectorAll(".phase-option");

  let currentPhase = localStorage.getItem(STORAGE_KEY) || "p1r";

  function setPhase(phase) {
    currentPhase = phase;
    localStorage.setItem(STORAGE_KEY, phase);
    phaseLabel.textContent = PHASE_META[phase].label;
    phaseOptions.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.phase === phase);
    });
    runSearch(searchInput.value);
    window.dispatchEvent(new CustomEvent("sibo-phase-changed", { detail: { phase } }));
  }

  window.SiboPhase = {
    get: () => currentPhase,
    meta: PHASE_META,
  };
  window.SiboStatusMeta = STATUS_META;

  function openPhaseSheet() {
    phaseSheet.classList.remove("hidden");
    phaseBtn.setAttribute("aria-expanded", "true");
  }

  function closePhaseSheet() {
    phaseSheet.classList.add("hidden");
    phaseBtn.setAttribute("aria-expanded", "false");
  }

  phaseBtn.addEventListener("click", openPhaseSheet);
  phaseSheetClose.addEventListener("click", closePhaseSheet);
  phaseSheet.addEventListener("click", (e) => {
    if (e.target === phaseSheet) closePhaseSheet();
  });
  phaseOptions.forEach((btn) => {
    btn.addEventListener("click", () => {
      setPhase(btn.dataset.phase);
      closePhaseSheet();
    });
  });

  function search(query) {
    return SiboMatch.search(query, 20);
  }

  function categoryLabel(catId) {
    if (CATEGORY_LIMITS[catId]) return CATEGORY_LIMITS[catId].label;
    return catId;
  }

  function renderCard(food) {
    const phaseData = food[currentPhase];
    const status = phaseData.status;
    const meta = STATUS_META[status];

    const card = document.createElement("div");
    card.className = `result-card ${status}`;

    let qtyLine = "";
    if (status === "allow") {
      qtyLine = phaseData.qty
        ? `<div class="result-qty">Limit: <strong>${escapeHtml(phaseData.qty)}</strong></div>`
        : `<div class="result-qty"><strong>Unlimited</strong> — no stated limit</div>`;
    } else if (status === "caution") {
      qtyLine = `<div class="result-qty"><strong>Check with your practitioner</strong></div>`;
    }

    const noteLine = phaseData.note
      ? `<div class="result-note">${escapeHtml(phaseData.note)}</div>`
      : "";

    card.innerHTML = `
      <div class="result-top">
        <div>
          <div class="result-name">${escapeHtml(food.name)}</div>
          <div class="result-category">${escapeHtml(categoryLabel(food.category))}</div>
        </div>
        <div class="status-badge ${status}">${meta.icon} ${meta.label}</div>
      </div>
      ${qtyLine}
      ${noteLine}
    `;
    return card;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function runSearch(query) {
    const q = query.trim();
    clearBtn.classList.toggle("hidden", q.length === 0);

    if (!q) {
      resultsEl.innerHTML = "";
      emptyStateEl.classList.remove("hidden");
      return;
    }
    emptyStateEl.classList.add("hidden");

    const matches = search(q);
    resultsEl.innerHTML = "";

    if (matches.length === 0) {
      const div = document.createElement("div");
      div.className = "no-results";
      div.textContent = `No match for "${q}". Try a simpler or different name.`;
      resultsEl.appendChild(div);
      return;
    }

    matches.forEach((food) => resultsEl.appendChild(renderCard(food)));
  }

  searchInput.addEventListener("input", (e) => runSearch(e.target.value));
  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    runSearch("");
    searchInput.focus();
  });
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      searchInput.value = chip.dataset.fill;
      runSearch(searchInput.value);
      searchInput.focus();
    });
  });

  // Tabs
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanels = {
    search: document.getElementById("tab-search"),
    meal: document.getElementById("tab-meal"),
  };
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      tabBtns.forEach((b) => {
        b.classList.toggle("active", b === btn);
        b.setAttribute("aria-selected", b === btn ? "true" : "false");
      });
      Object.keys(tabPanels).forEach((key) => {
        tabPanels[key].classList.toggle("hidden", key !== tab);
      });
      if (tab === "meal") window.dispatchEvent(new CustomEvent("sibo-tab-meal-shown"));
    });
  });

  // Init
  setPhase(currentPhase);
  runSearch("");

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    });
  }
})();
