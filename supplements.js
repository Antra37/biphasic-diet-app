(function () {
  "use strict";

  const STORAGE_KEY = "sibo-supplements-v1";
  const DUE_SOON_WINDOW_MIN = 15; // flag as "due soon" this many minutes before the scheduled time

  // ---------- DOM ----------
  const notifBanner = document.getElementById("notifBanner");
  const enableNotifBtn = document.getElementById("enableNotifBtn");
  const dueNowWrap = document.getElementById("dueNowWrap");
  const suppDateLabel = document.getElementById("suppDateLabel");
  const scheduleList = document.getElementById("scheduleList");

  const manageSuppBtn = document.getElementById("manageSuppBtn");
  const suppManagePanel = document.getElementById("suppManagePanel");
  const suppManageClose = document.getElementById("suppManageClose");
  const suppList = document.getElementById("suppList");
  const addSuppBtn = document.getElementById("addSuppBtn");
  const ruleList = document.getElementById("ruleList");
  const addRuleBtn = document.getElementById("addRuleBtn");

  const suppForm = document.getElementById("suppForm");
  const suppFormTitle = document.getElementById("suppFormTitle");
  const suppFormClose = document.getElementById("suppFormClose");
  const suppNameInput = document.getElementById("suppNameInput");
  const suppDosageInput = document.getElementById("suppDosageInput");
  const suppTimesList = document.getElementById("suppTimesList");
  const suppAddTimeBtn = document.getElementById("suppAddTimeBtn");
  const suppNotesInput = document.getElementById("suppNotesInput");
  const suppSaveBtn = document.getElementById("suppSaveBtn");
  const suppDeleteBtn = document.getElementById("suppDeleteBtn");

  const ruleForm = document.getElementById("ruleForm");
  const ruleFormClose = document.getElementById("ruleFormClose");
  const ruleAInput = document.getElementById("ruleAInput");
  const ruleBInput = document.getElementById("ruleBInput");
  const ruleGapInput = document.getElementById("ruleGapInput");
  const ruleNoteInput = document.getElementById("ruleNoteInput");
  const ruleSaveBtn = document.getElementById("ruleSaveBtn");
  const ruleDeleteBtn = document.getElementById("ruleDeleteBtn");

  // ---------- State ----------
  let state = loadState();
  let editingSuppId = null;
  let editingRuleId = null;
  let notifTimers = [];
  let tickTimer = null;

  function uid() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function loadState() {
    let raw;
    try {
      raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      raw = null;
    }
    if (!raw || !Array.isArray(raw.supplements)) {
      return { supplements: [], rules: [], logs: {} };
    }
    raw.rules = raw.rules || [];
    raw.logs = raw.logs || {};
    return raw;
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    schedulePushSync();
  }

  function getTodayLog() {
    const d = todayStr();
    if (!state.logs[d]) state.logs[d] = {};
    return state.logs[d];
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function getSupp(id) {
    return state.supplements.find((s) => s.id === id);
  }

  // ---------- Dose schedule ----------
  function doseKey(supplementId, time) {
    return `${supplementId}__${time}`;
  }

  function scheduledDateFor(time) {
    const [h, m] = time.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }

  function generateDoses() {
    const doses = [];
    state.supplements.filter((s) => s.active !== false).forEach((s) => {
      (s.times || []).forEach((time) => {
        doses.push({ supplement: s, time, key: doseKey(s.id, time) });
      });
    });
    doses.sort((a, b) => a.time.localeCompare(b.time));
    return doses;
  }

  function doseState(dose, now) {
    const log = getTodayLog();
    if (log[dose.key]) return "taken";
    const scheduled = scheduledDateFor(dose.time);
    if (now >= scheduled) return "overdue";
    if (scheduled - now <= DUE_SOON_WINDOW_MIN * 60 * 1000) return "due-soon";
    return "upcoming";
  }

  // Most recent "taken" time today for a given supplement, or null.
  function lastTakenAt(supplementId, now) {
    const log = getTodayLog();
    const supp = getSupp(supplementId);
    if (!supp) return null;
    let latest = null;
    (supp.times || []).forEach((time) => {
      const entry = log[doseKey(supplementId, time)];
      if (entry && entry.takenAt) {
        const t = new Date(entry.takenAt);
        if (!latest || t > latest) latest = t;
      }
    });
    return latest;
  }

  // For a supplement, find the strictest "not safe until" time imposed by spacing rules
  // against other supplements already taken today. Returns {safeAt, otherName, gapHours} or null.
  function blockedUntil(supplementId, now) {
    let strictest = null;
    state.rules.forEach((rule) => {
      let otherId = null;
      if (rule.aId === supplementId) otherId = rule.bId;
      else if (rule.bId === supplementId) otherId = rule.aId;
      if (!otherId) return;
      const otherTaken = lastTakenAt(otherId, now);
      if (!otherTaken) return;
      const safeAt = new Date(otherTaken.getTime() + rule.gapMinutes * 60 * 1000);
      if (safeAt > now && (!strictest || safeAt > strictest.safeAt)) {
        const other = getSupp(otherId);
        strictest = { safeAt, otherName: other ? other.name : "another supplement", gapHours: rule.gapMinutes / 60 };
      }
    });
    return strictest;
  }

  function formatTime12(time) {
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  }

  function formatCountdown(ms) {
    const totalMin = Math.max(0, Math.ceil(ms / 60000));
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  // ---------- Rendering ----------
  const STATE_META = {
    taken: { label: "Taken", icon: "✓", cls: "allow" },
    overdue: { label: "Overdue", icon: "!", cls: "avoid" },
    "due-soon": { label: "Due soon", icon: "•", cls: "caution" },
    upcoming: { label: "Upcoming", icon: "", cls: "" },
  };

  function renderDoseRow(dose, now) {
    const st = doseState(dose, now);
    const meta = STATE_META[st];
    const block = st !== "taken" ? blockedUntil(dose.supplement.id, now) : null;

    const row = document.createElement("div");
    row.className = `dose-row ${meta.cls}`;

    const blockLine = block
      ? `<div class="dose-blocked">⏳ Wait ${formatCountdown(block.safeAt - now)} - within ${block.gapHours}h of ${escapeHtml(block.otherName)}</div>`
      : "";
    const warnLine = dose.supplement.notes
      ? `<div class="dose-note">${escapeHtml(dose.supplement.notes)}</div>`
      : "";
    const takenLine = st === "taken" && getTodayLog()[dose.key]
      ? `<div class="dose-taken-at">Taken at ${new Date(getTodayLog()[dose.key].takenAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</div>`
      : "";

    row.innerHTML = `
      <div class="dose-time">${formatTime12(dose.time)}</div>
      <div class="dose-main">
        <div class="dose-name">${escapeHtml(dose.supplement.name)} <span class="dose-dosage">${escapeHtml(dose.supplement.dosage || "")}</span></div>
        ${st !== "taken" ? `<span class="status-badge small ${meta.cls}">${meta.icon} ${meta.label}</span>` : ""}
        ${blockLine}
        ${warnLine}
        ${takenLine}
      </div>
      <button class="dose-check-btn ${st === "taken" ? "checked" : ""}" data-key="${dose.key}" aria-label="Mark taken">${st === "taken" ? "✓" : ""}</button>
    `;
    return row;
  }

  function renderSchedule() {
    const now = new Date();
    suppDateLabel.textContent = now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

    const doses = generateDoses();

    if (doses.length === 0) {
      scheduleList.innerHTML = '<p class="today-empty">No supplements set up yet - tap Manage to add one.</p>';
      dueNowWrap.innerHTML = "";
      return;
    }

    scheduleList.innerHTML = "";
    doses.forEach((dose) => scheduleList.appendChild(renderDoseRow(dose, now)));

    const urgent = doses.filter((d) => {
      const st = doseState(d, now);
      return st === "overdue" || st === "due-soon";
    });
    if (urgent.length > 0) {
      dueNowWrap.innerHTML = '<div class="due-now-title">Due now</div>';
      urgent.forEach((dose) => dueNowWrap.appendChild(renderDoseRow(dose, now)));
    } else {
      dueNowWrap.innerHTML = "";
    }
  }

  function handleDoseCheckClick(e) {
    const btn = e.target.closest(".dose-check-btn");
    if (!btn) return;
    const key = btn.dataset.key;
    const log = getTodayLog();

    if (log[key]) {
      delete log[key];
      saveState();
      renderSchedule();
      renderManageLists();
      return;
    }

    const [supplementId] = key.split("__");
    const now = new Date();
    const block = blockedUntil(supplementId, now);
    if (block) {
      const ok = confirm(
        `This needs ${block.gapHours}h since ${block.otherName} - that was only ${formatCountdown(now - (block.safeAt - block.gapHours * 60 * 60 * 1000))} ago. Mark as taken anyway?`
      );
      if (!ok) return;
    }

    log[key] = { takenAt: new Date().toISOString() };
    saveState();
    renderSchedule();
    renderManageLists();
    scheduleNotifications();
  }

  dueNowWrap.addEventListener("click", handleDoseCheckClick);
  scheduleList.addEventListener("click", handleDoseCheckClick);

  // ---------- Manage: supplement list ----------
  function renderManageLists() {
    suppList.innerHTML = "";
    if (state.supplements.length === 0) {
      suppList.innerHTML = '<p class="today-empty">No supplements added yet.</p>';
    } else {
      state.supplements.forEach((s) => {
        const row = document.createElement("button");
        row.className = "supp-list-row";
        row.innerHTML = `
          <span class="supp-list-name">${escapeHtml(s.name)}</span>
          <span class="supp-list-sub">${escapeHtml(s.dosage || "")} · ${(s.times || []).map(formatTime12).join(", ")}</span>
        `;
        row.addEventListener("click", () => openSuppForm(s.id));
        suppList.appendChild(row);
      });
    }

    ruleList.innerHTML = "";
    if (state.rules.length === 0) {
      ruleList.innerHTML = '<p class="today-empty">No spacing rules yet.</p>';
    } else {
      state.rules.forEach((r) => {
        const a = getSupp(r.aId);
        const b = getSupp(r.bId);
        const row = document.createElement("button");
        row.className = "supp-list-row";
        row.innerHTML = `
          <span class="supp-list-name">${escapeHtml(a ? a.name : "?")} ↔ ${escapeHtml(b ? b.name : "?")}</span>
          <span class="supp-list-sub">at least ${r.gapMinutes / 60}h apart${r.note ? " · " + escapeHtml(r.note) : ""}</span>
        `;
        row.addEventListener("click", () => openRuleForm(r.id));
        ruleList.appendChild(row);
      });
    }
  }

  manageSuppBtn.addEventListener("click", () => {
    renderManageLists();
    suppManagePanel.classList.remove("hidden");
  });
  suppManageClose.addEventListener("click", () => suppManagePanel.classList.add("hidden"));

  // ---------- Supplement add/edit form ----------
  function addTimeRow(value) {
    const row = document.createElement("div");
    row.className = "supp-time-row";
    row.innerHTML = `
      <input type="time" class="supp-time-input" value="${escapeHtml(value || "08:00")}" />
      <button type="button" class="remove-btn" aria-label="Remove time">&times;</button>
    `;
    row.querySelector(".remove-btn").addEventListener("click", () => row.remove());
    suppTimesList.appendChild(row);
  }

  suppAddTimeBtn.addEventListener("click", () => addTimeRow("08:00"));

  // ---------- Label lookup (NIH Dietary Supplement Label Database) ----------
  // Public API, no key needed, CORS-enabled. Only covers labels sold in the US.
  const DSLD_API = "https://api.ods.od.nih.gov/dsld/v9";
  const suppLookupInput = document.getElementById("suppLookupInput");
  const suppLookupBtn = document.getElementById("suppLookupBtn");
  const suppLookupStatus = document.getElementById("suppLookupStatus");
  const suppLookupResults = document.getElementById("suppLookupResults");
  let lookupSeq = 0;
  let pendingDsldId = null;

  // Spread N daily doses across the waking day.
  const DEFAULT_TIMES = {
    1: ["08:00"],
    2: ["08:00", "20:00"],
    3: ["08:00", "13:00", "19:00"],
    4: ["08:00", "12:00", "16:00", "20:00"],
  };

  function setLookupStatus(msg) {
    suppLookupStatus.textContent = msg || "";
    suppLookupStatus.classList.toggle("hidden", !msg);
  }

  function resetLookup() {
    lookupSeq++;
    pendingDsldId = null;
    suppLookupInput.value = "";
    suppLookupResults.innerHTML = "";
    setLookupStatus("");
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function runLookup() {
    const q = suppLookupInput.value.trim();
    if (q.length < 2) { suppLookupInput.focus(); return; }
    const seq = ++lookupSeq;
    suppLookupResults.innerHTML = "";
    setLookupStatus("Searching…");
    let data;
    try {
      data = await fetchJson(`${DSLD_API}/search-filter?q=${encodeURIComponent(q)}&size=40`);
    } catch (e) {
      if (seq === lookupSeq) setLookupStatus("Couldn't reach the label database (are you offline?). You can still fill in the details by hand.");
      return;
    }
    if (seq !== lookupSeq) return;

    // The database keeps every label version, so collapse duplicates (same brand + name),
    // preferring products still on the market and the most recently entered label.
    const byKey = new Map();
    (data.hits || []).forEach((h) => {
      const s = h._source || {};
      const item = { id: h._id, brand: s.brandName || "", name: s.fullName || "", offMarket: s.offMarket, entryDate: s.entryDate || "", form: s.physicalState && s.physicalState.langualCodeDescription };
      const key = (item.brand + "|" + item.name).toLowerCase();
      const prev = byKey.get(key);
      const better = !prev
        || (prev.offMarket && !item.offMarket)
        || (!!prev.offMarket === !!item.offMarket && item.entryDate > prev.entryDate);
      if (better) byKey.set(key, item);
    });
    // The API ranks mostly on the product name, so float labels whose brand she typed to the top.
    const qWords = q.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const brandHits = (brand) => {
      const words = brand.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
      return words.filter((w) => qWords.includes(w)).length;
    };
    const items = Array.from(byKey.values())
      .map((it, i) => ({ it, i, score: brandHits(it.brand) }))
      .sort((a, b) => b.score - a.score || a.i - b.i)
      .map((x) => x.it)
      .slice(0, 12);

    if (items.length === 0) {
      setLookupStatus("No US labels found. Try the brand and product name, or just type the details in below.");
      return;
    }
    setLookupStatus("Tap the matching product:");
    items.forEach((it) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "supp-list-row";
      row.innerHTML = `
        <span class="supp-list-name">${escapeHtml(it.brand)} - ${escapeHtml(it.name)}</span>
        <span class="supp-list-sub">${escapeHtml(it.form || "")}${it.offMarket ? " · discontinued label" : ""}</span>
      `;
      row.addEventListener("click", () => applyLabel(it.id));
      suppLookupResults.appendChild(row);
    });
  }

  function cleanUnit(unit, qty) {
    let u = String(unit || "").replace(/[{}]/g, "").trim();
    u = u.replace(/\(s\)/i, qty === 1 ? "" : "s").toLowerCase();
    return u;
  }

  function fmtRange(min, max) {
    if (min == null) return max == null ? "" : String(max);
    if (max == null || max === min) return String(min);
    return `${min}-${max}`;
  }

  async function applyLabel(id) {
    const seq = ++lookupSeq;
    setLookupStatus("Loading label…");
    let label;
    try {
      label = await fetchJson(`${DSLD_API}/label/${encodeURIComponent(id)}`);
    } catch (e) {
      if (seq === lookupSeq) setLookupStatus("Couldn't load that label. Try again, or fill in the details by hand.");
      return;
    }
    if (seq !== lookupSeq) return;

    const serving = (label.servingSizes || [])[0] || {};
    const qtyText = fmtRange(serving.minQuantity, serving.maxQuantity);
    const unitText = cleanUnit(serving.unit, serving.maxQuantity || serving.minQuantity);

    // Headline amounts: the top-level ingredients with a stated quantity per serving.
    const amounts = (label.ingredientRows || [])
      .map((r) => {
        const q = (r.quantity || [])[0];
        if (!q || q.quantity == null || !q.unit || q.unit === "NP") return null;
        return `${r.name} ${q.quantity} ${q.unit}`;
      })
      .filter(Boolean);
    const amountText = amounts.slice(0, 3).join(", ") + (amounts.length > 3 ? ", …" : "");

    let dosage = [qtyText, unitText].filter(Boolean).join(" ");
    if (amountText) dosage += dosage ? ` (${amountText})` : amountText;

    // Label directions + any real precautions (skip boilerplate like storage/child-safety/FDA disclaimer).
    const notes = (label.statements || [])
      .filter((s) => /Suggested|Directions|Precautions re: All Other|Precautions re: Pregnan|Warning/i.test(s.type || ""))
      .map((s) => (s.notes || "").trim())
      .filter((n) => n && !/tamper|seal/i.test(n));
    const uniqueNotes = Array.from(new Set(notes)).join(" ");

    suppNameInput.value = [label.brandName, label.fullName].filter(Boolean).join(" ");
    suppDosageInput.value = dosage;
    if (uniqueNotes) suppNotesInput.value = uniqueNotes;

    const daily = serving.minDailyServings || serving.maxDailyServings;
    const dailyRange = fmtRange(serving.minDailyServings, serving.maxDailyServings);
    if (daily && DEFAULT_TIMES[daily]) {
      suppTimesList.innerHTML = "";
      DEFAULT_TIMES[daily].forEach((t) => addTimeRow(t));
    }

    pendingDsldId = String(label.id || id);
    suppLookupResults.innerHTML = "";
    setLookupStatus(
      `Filled in from the label${dailyRange ? ` (label says ${dailyRange}× daily)` : ""}. Check it against her bottle and adjust the times to what her practitioner prescribed.`
    );
  }

  suppLookupBtn.addEventListener("click", runLookup);
  suppLookupInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); runLookup(); }
  });

  function openSuppForm(id) {
    editingSuppId = id || null;
    const s = id ? getSupp(id) : null;
    suppFormTitle.textContent = s ? "Edit supplement" : "Add supplement";
    suppNameInput.value = s ? s.name : "";
    suppDosageInput.value = s ? s.dosage : "";
    suppNotesInput.value = s ? s.notes || "" : "";
    resetLookup();
    suppTimesList.innerHTML = "";
    (s && s.times && s.times.length ? s.times : ["08:00"]).forEach((t) => addTimeRow(t));
    suppDeleteBtn.classList.toggle("hidden", !s);
    suppManagePanel.classList.add("hidden");
    suppForm.classList.remove("hidden");
    suppForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  addSuppBtn.addEventListener("click", () => openSuppForm(null));
  suppFormClose.addEventListener("click", () => {
    suppForm.classList.add("hidden");
    suppManagePanel.classList.remove("hidden");
  });

  suppSaveBtn.addEventListener("click", () => {
    const name = suppNameInput.value.trim();
    if (!name) { suppNameInput.focus(); return; }
    const times = Array.from(suppTimesList.querySelectorAll(".supp-time-input"))
      .map((i) => i.value)
      .filter(Boolean)
      .sort();
    if (times.length === 0) times.push("08:00");

    if (editingSuppId) {
      const s = getSupp(editingSuppId);
      s.name = name;
      s.dosage = suppDosageInput.value.trim();
      s.times = times;
      s.notes = suppNotesInput.value.trim();
      if (pendingDsldId) s.dsldId = pendingDsldId;
    } else {
      const supp = {
        id: uid(), name, dosage: suppDosageInput.value.trim(),
        times, notes: suppNotesInput.value.trim(), active: true,
      };
      if (pendingDsldId) supp.dsldId = pendingDsldId;
      state.supplements.push(supp);
    }
    saveState();
    suppForm.classList.add("hidden");
    suppManagePanel.classList.remove("hidden");
    renderManageLists();
    renderSchedule();
    scheduleNotifications();
  });

  suppDeleteBtn.addEventListener("click", () => {
    if (!editingSuppId) return;
    if (!confirm("Delete this supplement? Any spacing rules using it will be removed too.")) return;
    state.supplements = state.supplements.filter((s) => s.id !== editingSuppId);
    state.rules = state.rules.filter((r) => r.aId !== editingSuppId && r.bId !== editingSuppId);
    saveState();
    suppForm.classList.add("hidden");
    suppManagePanel.classList.remove("hidden");
    renderManageLists();
    renderSchedule();
    scheduleNotifications();
  });

  // ---------- Rule add/edit form ----------
  function populateRuleSelects() {
    const opts = state.supplements.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("");
    ruleAInput.innerHTML = opts;
    ruleBInput.innerHTML = opts;
  }

  function openRuleForm(id) {
    editingRuleId = id || null;
    populateRuleSelects();
    const r = id ? state.rules.find((x) => x.id === id) : null;
    if (r) {
      ruleAInput.value = r.aId;
      ruleBInput.value = r.bId;
      ruleGapInput.value = r.gapMinutes / 60;
      ruleNoteInput.value = r.note || "";
    } else {
      ruleGapInput.value = "2";
      ruleNoteInput.value = "";
      if (state.supplements[1]) ruleBInput.value = state.supplements[1].id;
    }
    ruleDeleteBtn.classList.toggle("hidden", !r);
    suppManagePanel.classList.add("hidden");
    ruleForm.classList.remove("hidden");
    ruleForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  addRuleBtn.addEventListener("click", () => {
    if (state.supplements.length < 2) {
      alert("Add at least two supplements first, then you can set a spacing rule between them.");
      return;
    }
    openRuleForm(null);
  });
  ruleFormClose.addEventListener("click", () => {
    ruleForm.classList.add("hidden");
    suppManagePanel.classList.remove("hidden");
  });

  ruleSaveBtn.addEventListener("click", () => {
    const aId = ruleAInput.value;
    const bId = ruleBInput.value;
    const hours = parseFloat(ruleGapInput.value);
    if (!aId || !bId || aId === bId || !(hours > 0)) {
      alert("Pick two different supplements and a gap greater than 0 hours.");
      return;
    }
    if (editingRuleId) {
      const r = state.rules.find((x) => x.id === editingRuleId);
      r.aId = aId; r.bId = bId; r.gapMinutes = hours * 60; r.note = ruleNoteInput.value.trim();
    } else {
      state.rules.push({ id: uid(), aId, bId, gapMinutes: hours * 60, note: ruleNoteInput.value.trim() });
    }
    saveState();
    ruleForm.classList.add("hidden");
    suppManagePanel.classList.remove("hidden");
    renderManageLists();
    renderSchedule();
  });

  ruleDeleteBtn.addEventListener("click", () => {
    if (!editingRuleId) return;
    state.rules = state.rules.filter((r) => r.id !== editingRuleId);
    saveState();
    ruleForm.classList.add("hidden");
    suppManagePanel.classList.remove("hidden");
    renderManageLists();
    renderSchedule();
  });

  // ---------- Push reminders (work with the app closed; see worker/) ----------
  const PUSH_API = (window.SIBO_PUSH_API || "").replace(/\/+$/, "");
  const notifBannerText = document.getElementById("notifBannerText");
  const pushStatusText = document.getElementById("pushStatusText");
  const pushTestBtn = document.getElementById("pushTestBtn");
  let pushActive = false;
  let pushSyncTimer = null;

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

  function pushSupported() {
    return !!PUSH_API && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  }

  function urlB64ToUint8Array(b64) {
    const pad = "=".repeat((4 - (b64.length % 4)) % 4);
    const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
  }

  async function getPushSubscription(create) {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub && create) {
      const { key } = await fetch(`${PUSH_API}/vapid-public-key`).then((r) => r.json());
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(key) });
    }
    return sub;
  }

  function pushPayload(sub) {
    const log = getTodayLog();
    return {
      subscription: sub.toJSON(),
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      doses: generateDoses().map((d) => ({ key: d.key, name: d.supplement.name, dosage: d.supplement.dosage || "", time: d.time })),
      taken: { date: todayStr(), keys: Object.keys(log) },
    };
  }

  async function syncPush() {
    if (!pushSupported() || Notification.permission !== "granted") { pushActive = false; return; }
    try {
      const sub = await getPushSubscription(true);
      const res = await fetch(`${PUSH_API}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pushPayload(sub)),
      });
      pushActive = res.ok;
    } catch (e) {
      pushActive = false; // offline or server down - fall back to in-app reminders
    }
    updateNotifBanner();
    scheduleNotifications();
  }

  function schedulePushSync() {
    if (!pushSupported()) return;
    clearTimeout(pushSyncTimer);
    pushSyncTimer = setTimeout(syncPush, 800);
  }

  pushTestBtn.addEventListener("click", async () => {
    pushTestBtn.disabled = true;
    try {
      const sub = await getPushSubscription(false);
      const res = sub && await fetch(`${PUSH_API}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      pushStatusText.textContent = res && res.ok
        ? "Test sent - it should arrive in a few seconds."
        : "Couldn't send a test. Try closing and reopening the app.";
    } catch (e) {
      pushStatusText.textContent = "Couldn't reach the reminder server (offline?).";
    }
    pushTestBtn.disabled = false;
  });

  // ---------- Notifications ----------
  function updateNotifBanner() {
    let status;
    if (!("Notification" in window) || (isIos && !isStandalone)) {
      status = isIos
        ? "On iPhone, reminders only work once the app is on the Home Screen: tap Share, then 'Add to Home Screen', and open it from there."
        : "This browser can't show notifications.";
      notifBanner.classList.toggle("hidden", !isIos);
      notifBannerText.textContent = status;
      enableNotifBtn.classList.add("hidden");
    } else if (Notification.permission === "denied") {
      status = "Notifications are blocked for this app - turn them on in the phone's settings to get reminders.";
      notifBanner.classList.add("hidden");
    } else if (Notification.permission === "default") {
      status = "Reminders are off.";
      notifBannerText.textContent = pushSupported()
        ? "Get a reminder on this phone when a dose is due - even with the app closed"
        : "Get a reminder when a dose is due while this app is open";
      enableNotifBtn.classList.remove("hidden");
      notifBanner.classList.remove("hidden");
    } else {
      notifBanner.classList.add("hidden");
      status = pushActive
        ? "On - you'll get a notification when a dose is due (and a follow-up 30 min later if it isn't ticked), even with the app closed."
        : pushSupported()
          ? "On while the app is open. (Couldn't reach the reminder server just now - it'll retry next time the app opens.)"
          : "On while the app is open.";
    }
    pushStatusText.textContent = status;
    pushTestBtn.classList.toggle("hidden", !pushActive);
  }

  enableNotifBtn.addEventListener("click", () => {
    Notification.requestPermission().then(() => {
      updateNotifBanner();
      scheduleNotifications();
      syncPush();
    });
  });

  function clearScheduledNotifications() {
    notifTimers.forEach((t) => clearTimeout(t));
    notifTimers = [];
  }

  function scheduleNotifications() {
    clearScheduledNotifications();
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    if (pushActive) return; // the server sends these; avoid double notifications
    const now = new Date();
    const log = getTodayLog();
    generateDoses().forEach((dose) => {
      if (log[dose.key]) return;
      const scheduled = scheduledDateFor(dose.time);
      const delay = scheduled - now;
      if (delay <= 0 || delay > 24 * 60 * 60 * 1000) return;
      const t = setTimeout(() => fireNotification(dose), delay);
      notifTimers.push(t);
    });
  }

  function fireNotification(dose) {
    if (getTodayLog()[dose.key]) return; // marked taken since scheduling
    const title = "Supplement due";
    const body = `${dose.supplement.name}${dose.supplement.dosage ? " - " + dose.supplement.dosage : ""} (${formatTime12(dose.time)})`;
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, { body, icon: "icons/icon-192.png", tag: dose.key });
      }).catch(() => {
        try { new Notification(title, { body }); } catch (e) {}
      });
    } else {
      try { new Notification(title, { body }); } catch (e) {}
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      renderSchedule();
      scheduleNotifications();
      schedulePushSync();
    }
  });

  window.addEventListener("sibo-tab-supplements-shown", () => {
    renderSchedule();
  });

  // Periodic UI refresh so "due soon"/"overdue" badges and countdowns update live.
  function startTicking() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(renderSchedule, 30000);
  }

  // Init
  updateNotifBanner();
  renderSchedule();
  scheduleNotifications();
  syncPush();
  startTicking();
})();
