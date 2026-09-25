// Round-trips our aes128gcm encryption through the reference http_ece library
// (acting as the browser), and checks the VAPID JWT signature.
import crypto from "node:crypto";
import assert from "node:assert/strict";
import ece from "http_ece";
import { encryptPayload, b64urlEncode, sendWebPush } from "../src/webpush.js";

// Fake "browser" subscription keys.
const ua = crypto.createECDH("prime256v1");
ua.generateKeys();
const authSecret = crypto.randomBytes(16);
const p256dh = b64urlEncode(ua.getPublicKey());
const auth = b64urlEncode(authSecret);

const message = JSON.stringify({ title: "Time for Magnesium", body: "1 capsule (8:00 AM) — ✓ unicode" });
const body = await encryptPayload(new TextEncoder().encode(message), p256dh, auth);
const decrypted = ece.decrypt(Buffer.from(body), { version: "aes128gcm", privateKey: ua, authSecret });
assert.equal(decrypted.toString("utf8"), message);
console.log("✓ payload decrypts with reference implementation");

// VAPID: capture the request instead of sending it.
const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
const pubRaw = publicKey.export({ format: "der", type: "spki" }).subarray(-65);
const vapid = { publicKey: b64urlEncode(pubRaw), privateJwk: privateKey.export({ format: "jwk" }), subject: "https://example.com/" };
let captured;
globalThis.fetch = async (url, init) => { captured = { url, init }; return new Response(null, { status: 201 }); };
const res = await sendWebPush({ endpoint: "https://fcm.googleapis.com/fcm/send/abc", p256dh, auth }, { title: "x" }, vapid);
assert.equal(res.status, 201);
const m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(captured.init.headers.Authorization);
assert.ok(m, "Authorization header shape");
const claims = JSON.parse(Buffer.from(m[2], "base64url").toString());
assert.equal(claims.aud, "https://fcm.googleapis.com");
assert.equal(m[4], vapid.publicKey);
const ok = crypto.verify("sha256", Buffer.from(`${m[1]}.${m[2]}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(m[3], "base64url"));
assert.ok(ok, "JWT signature verifies");
assert.equal(captured.init.headers["Content-Encoding"], "aes128gcm");
console.log("✓ VAPID JWT is valid ES256 with correct audience");
