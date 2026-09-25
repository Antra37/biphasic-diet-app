// Generates a VAPID key pair into vapid.secret.json (git-ignored) and .dev.vars for local dev.
import crypto from "node:crypto";
import fs from "node:fs";

if (fs.existsSync("vapid.secret.json")) {
  console.log("vapid.secret.json already exists - keeping the existing keys.");
  process.exit(0);
}
const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
const pub = publicKey.export({ format: "der", type: "spki" }).subarray(-65).toString("base64url");
const jwk = JSON.stringify(privateKey.export({ format: "jwk" }));
fs.writeFileSync("vapid.secret.json", JSON.stringify({ VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_JWK: jwk }, null, 2));
fs.writeFileSync(".dev.vars", `VAPID_PUBLIC_KEY=${pub}\nVAPID_PRIVATE_JWK='${jwk}'\n`);
console.log("Wrote vapid.secret.json and .dev.vars. Public key:", pub);
