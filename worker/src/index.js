// SIBO supplement reminders: stores each phone's push subscription + dose schedule in D1,
// and a once-a-minute cron sends a push when a dose is due (plus one follow-up reminder
// if it still hasn't been marked taken).

import { sendWebPush } from "./webpush.js";

const FIRST_WINDOW_MIN = 30;     // send the "due" push if we're within this many minutes after the dose time
const REMINDER_AFTER_MIN = 30;   // follow-up if still not taken this long after the dose time...
const REMINDER_UNTIL_MIN = 120;  // ...but give up after this long

// Only real browser push services may be used as endpoints.
const PUSH_HOST_SUFFIXES = [
  "fcm.googleapis.com",
  "push.services.mozilla.com",
  "push.apple.com",
  "notify.windows.com",
];

const MAX_DOSES = 60;

// ---------- helpers ----------
function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const headers = { "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" };
  if (allowed.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(data, status, cors) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...cors } });
}

function str(v, max) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function validTimeZone(tz) {
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch (e) { return false; }
}

function validEndpoint(endpoint) {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && PUSH_HOST_SUFFIXES.some((s) => u.hostname === s || u.hostname.endsWith("." + s));
  } catch (e) {
    return false;
  }
}

function parseSubscription(sub) {
  if (!sub || typeof sub !== "object") return null;
  const endpoint = str(sub.endpoint, 1024);
  const keys = sub.keys || {};
  const p256dh = str(keys.p256dh, 200);
  const auth = str(keys.auth, 100);
  if (!validEndpoint(endpoint) || !p256dh || !auth) return null;
  return { endpoint, p256dh, auth };
}

async function idFor(endpoint) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

function localNow(tz, date = new Date()) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

function vapidFromEnv(env) {
  return { publicKey: env.VAPID_PUBLIC_KEY, privateJwk: JSON.parse(env.VAPID_PRIVATE_JWK), subject: env.VAPID_SUBJECT };
}

function formatTime12(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

// ---------- HTTP API ----------
async function handleSync(body, env) {
  const sub = parseSubscription(body.subscription);
  if (!sub) return [{ error: "invalid subscription" }, 400];
  const tz = str(body.tz, 64);
  if (!validTimeZone(tz)) return [{ error: "invalid timezone" }, 400];

  const doses = (Array.isArray(body.doses) ? body.doses : []).slice(0, MAX_DOSES).map((d) => ({
    key: str(d && d.key, 120),
    name: str(d && d.name, 120),
    dosage: str(d && d.dosage, 160),
    time: str(d && d.time, 5),
  })).filter((d) => d.key && d.name && /^([01]\d|2[0-3]):[0-5]\d$/.test(d.time));

  const takenIn = body.taken || {};
  const taken = {
    date: /^\d{4}-\d{2}-\d{2}$/.test(takenIn.date || "") ? takenIn.date : "",
    keys: (Array.isArray(takenIn.keys) ? takenIn.keys : []).slice(0, MAX_DOSES * 2).map((k) => str(k, 120)).filter(Boolean),
  };

  const id = await idFor(sub.endpoint);
  await env.DB.prepare(
    `INSERT INTO subscriptions (id, endpoint, p256dh, auth, tz, doses, taken, notified, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, '{}', ?8)
     ON CONFLICT(id) DO UPDATE SET p256dh = ?3, auth = ?4, tz = ?5, doses = ?6, taken = ?7, updated_at = ?8`
  ).bind(id, sub.endpoint, sub.p256dh, sub.auth, tz, JSON.stringify(doses), JSON.stringify(taken), Date.now()).run();
  return [{ ok: true, doses: doses.length }, 200];
}

async function handleUnsubscribe(body, env) {
  const endpoint = str(body.endpoint, 1024);
  if (!endpoint) return [{ error: "missing endpoint" }, 400];
  await env.DB.prepare("DELETE FROM subscriptions WHERE id = ?1").bind(await idFor(endpoint)).run();
  return [{ ok: true }, 200];
}

async function handleTest(body, env) {
  const endpoint = str(body.endpoint, 1024);
  const row = endpoint && await env.DB.prepare("SELECT * FROM subscriptions WHERE id = ?1").bind(await idFor(endpoint)).first();
  if (!row) return [{ error: "not subscribed" }, 404];
  const res = await sendWebPush(row, {
    title: "Reminders are working",
    body: "You'll get a notification like this when a supplement is due, even with the app closed.",
    tag: "test",
    url: "./#supplements",
  }, vapidFromEnv(env));
  if (res.status === 404 || res.status === 410) {
    await env.DB.prepare("DELETE FROM subscriptions WHERE id = ?1").bind(row.id).run();
  }
  return [{ ok: res.ok, status: res.status }, res.ok ? 200 : 502];
}

// ---------- Cron ----------
async function processSubscription(row, env, vapid, now) {
  let doses, taken, notified;
  try {
    doses = JSON.parse(row.doses || "[]");
    taken = JSON.parse(row.taken || "{}");
    notified = JSON.parse(row.notified || "{}");
  } catch (e) {
    return;
  }
  const local = localNow(validTimeZone(row.tz) ? row.tz : "UTC", now);
  if (notified.date !== local.date) notified = { date: local.date, stages: {} };
  const takenKeys = new Set(taken.date === local.date ? taken.keys || [] : []);

  const due = [];
  const reminders = [];
  for (const d of doses) {
    if (takenKeys.has(d.key)) continue;
    const [h, m] = d.time.split(":").map(Number);
    const doseMin = h * 60 + m;
    const delta = local.minutes - doseMin;
    const stage = notified.stages[d.key] || 0;
    if (stage < 1 && delta >= 0 && delta < FIRST_WINDOW_MIN) {
      due.push({ ...d, doseMin });
    } else if (stage < 2 && delta >= REMINDER_AFTER_MIN && delta < REMINDER_UNTIL_MIN) {
      reminders.push({ ...d, doseMin });
    }
  }
  if (due.length === 0 && reminders.length === 0) return;

  const lines = (list) => list.map((d) => `${d.name}${d.dosage ? " - " + d.dosage : ""}`).join("\n");
  const pushes = [];
  if (due.length) {
    pushes.push({
      title: due.length === 1 ? `Time for ${due[0].name}` : `${due.length} supplements due`,
      body: due.length === 1 ? `${due[0].dosage || ""} (${formatTime12(due[0].doseMin)})`.trim() : lines(due),
      tag: `due-${local.date}-${due.map((d) => d.key).join(",")}`.slice(0, 200),
      url: "./#supplements",
    });
  }
  if (reminders.length) {
    pushes.push({
      title: "Reminder: not marked as taken yet",
      body: lines(reminders),
      tag: `reminder-${local.date}-${reminders.map((d) => d.key).join(",")}`.slice(0, 200),
      url: "./#supplements",
    });
  }

  for (const p of pushes) {
    const res = await sendWebPush(row, p, vapid);
    if (res.status === 404 || res.status === 410) {
      await env.DB.prepare("DELETE FROM subscriptions WHERE id = ?1").bind(row.id).run();
      return;
    }
    if (!res.ok) console.log("push failed", res.status, await res.text().catch(() => ""));
  }
  due.forEach((d) => { notified.stages[d.key] = 1; });
  reminders.forEach((d) => { notified.stages[d.key] = 2; });
  await env.DB.prepare("UPDATE subscriptions SET notified = ?1 WHERE id = ?2").bind(JSON.stringify(notified), row.id).run();
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const { pathname } = new URL(request.url);

    if (request.method === "GET" && pathname === "/vapid-public-key") {
      return json({ key: env.VAPID_PUBLIC_KEY }, 200, cors);
    }
    if (request.method !== "POST") return json({ error: "not found" }, 404, cors);
    if (!cors["Access-Control-Allow-Origin"]) return json({ error: "origin not allowed" }, 403, cors);

    let body;
    try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400, cors); }

    const routes = { "/sync": handleSync, "/unsubscribe": handleUnsubscribe, "/test": handleTest };
    const handler = routes[pathname];
    if (!handler) return json({ error: "not found" }, 404, cors);
    try {
      const [data, status] = await handler(body, env);
      return json(data, status, cors);
    } catch (e) {
      console.log("error", pathname, e && e.stack);
      return json({ error: "server error" }, 500, cors);
    }
  },

  async scheduled(event, env, ctx) {
    const vapid = vapidFromEnv(env);
    const now = new Date(event.scheduledTime || Date.now());
    const { results } = await env.DB.prepare("SELECT * FROM subscriptions").all();
    await Promise.all((results || []).map((row) =>
      processSubscription(row, env, vapid, now).catch((e) => console.log("cron error", row.id, e && e.stack))
    ));
  },
};
