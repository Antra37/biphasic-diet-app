// Exercises the /sync endpoint and the cron against an in-memory stand-in for D1.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import worker from "../src/index.js";
import { b64urlEncode } from "../src/webpush.js";

// --- tiny fake D1 that understands just the statements the worker uses ---
const rows = new Map();
const DB = {
  prepare(sql) {
    let args = [];
    const stmt = {
      bind(...a) { args = a; return stmt; },
      async run() {
        if (sql.startsWith("INSERT")) {
          const [id, endpoint, p256dh, auth, tz, doses, taken, updated_at] = args;
          const prev = rows.get(id);
          rows.set(id, { id, endpoint, p256dh, auth, tz, doses, taken, notified: prev ? prev.notified : "{}", updated_at });
        } else if (sql.startsWith("UPDATE")) {
          rows.get(args[1]).notified = args[0];
        } else if (sql.startsWith("DELETE")) {
          rows.delete(args[0]);
        }
        return {};
      },
      async first() { return rows.get(args[0]) || null; },
      async all() { return { results: [...rows.values()] }; },
    };
    return stmt;
  },
};

const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
const env = {
  DB,
  ALLOWED_ORIGINS: "https://antra37.github.io",
  VAPID_SUBJECT: "https://example.com/",
  VAPID_PUBLIC_KEY: publicKey.export({ format: "der", type: "spki" }).subarray(-65).toString("base64url"),
  VAPID_PRIVATE_JWK: JSON.stringify(privateKey.export({ format: "jwk" })),
};

const ua = crypto.createECDH("prime256v1"); ua.generateKeys();
const subscription = { endpoint: "https://fcm.googleapis.com/fcm/send/test123", keys: { p256dh: b64urlEncode(ua.getPublicKey()), auth: b64urlEncode(crypto.randomBytes(16)) } };

let sent = [];
let pushStatus = 201;
globalThis.fetch = async (url) => { sent.push(url); return new Response(null, { status: pushStatus }); };

const post = (path, body, origin = "https://antra37.github.io") => worker.fetch(new Request("https://w.example" + path, {
  method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body),
}), env);
const cronAt = (iso) => worker.scheduled({ scheduledTime: Date.parse(iso) }, env, {});

// Rejects other origins and non-push endpoints.
assert.equal((await post("/sync", { subscription, tz: "Australia/Sydney", doses: [] }, "https://evil.example")).status, 403);
assert.equal((await post("/sync", { subscription: { ...subscription, endpoint: "https://evil.example/x" }, tz: "UTC", doses: [] })).status, 400);

// Sydney is UTC+10 on 2026-05-01 (no DST). Dose at 08:00 local = 22:00 UTC the day before.
const doses = [
  { key: "mag__08:00", name: "Magnesium", dosage: "1 capsule", time: "08:00" },
  { key: "zinc__08:00", name: "Zinc", dosage: "15 mg", time: "08:00" },
];
let r = await post("/sync", { subscription, tz: "Australia/Sydney", doses, taken: { date: "2026-05-01", keys: [] } });
assert.equal(r.status, 200);

await cronAt("2026-04-30T21:59:00Z"); // 07:59 local
assert.equal(sent.length, 0, "nothing before dose time");
await cronAt("2026-04-30T22:00:00Z"); // 08:00 local
assert.equal(sent.length, 1, "one grouped 'due' push");
await cronAt("2026-04-30T22:01:00Z");
assert.equal(sent.length, 1, "no duplicate on the next minute");

// She marks Magnesium taken in the app -> sync.
await post("/sync", { subscription, tz: "Australia/Sydney", doses, taken: { date: "2026-05-01", keys: ["mag__08:00"] } });
await cronAt("2026-04-30T22:30:00Z"); // 08:30 -> reminder for Zinc only
assert.equal(sent.length, 2, "follow-up reminder");
const notified = JSON.parse([...rows.values()][0].notified);
assert.deepEqual(notified.stages, { "mag__08:00": 1, "zinc__08:00": 2 });
await cronAt("2026-04-30T22:45:00Z");
assert.equal(sent.length, 2, "only one reminder");

// Next day resets.
await cronAt("2026-05-01T22:00:00Z");
assert.equal(sent.length, 3, "fires again the next day");

// Missed cron minutes still deliver within the window.
rows.clear(); sent = [];
await post("/sync", { subscription, tz: "UTC", doses: [{ key: "a__09:00", name: "A", dosage: "", time: "09:00" }], taken: {} });
await cronAt("2026-05-02T09:07:00Z");
assert.equal(sent.length, 1, "late cron still sends");

// Expired subscription is cleaned up.
pushStatus = 410;
await post("/sync", { subscription, tz: "UTC", doses: [{ key: "b__10:00", name: "B", dosage: "", time: "10:00" }], taken: {} });
await cronAt("2026-05-02T10:00:00Z");
assert.equal(rows.size, 0, "410 deletes the subscription");

console.log("✓ cron schedule, grouping, reminders, taken-sync, day rollover, cleanup");
