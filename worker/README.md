# Supplement reminder backend

A small Cloudflare Worker that sends push notifications for supplement doses, even with the app closed.
The Worker and its database both run on Cloudflare's free plan.

- The app sends each phone's push subscription, time zone and dose schedule to `POST /sync` whenever anything changes, including when a dose is ticked off.
- A cron job runs every minute. When a dose time arrives it sends one grouped notification. If the dose still isn't ticked off 30 minutes later, it sends one follow-up reminder.
- The database stores the push subscription, supplement names, doses and times. It stores nothing else.

## One-time setup

```bash
cd worker
npm install
npx wrangler login                     # opens the browser to sign in to Cloudflare
node scripts/gen-vapid.mjs             # creates vapid.secret.json (git-ignored; keep it safe)
npx wrangler d1 create sibo-supplement-push
# copy the database_id it prints into wrangler.toml
npx wrangler d1 execute sibo-supplement-push --remote --file=schema.sql
npx wrangler secret put VAPID_PUBLIC_KEY      # paste the value from vapid.secret.json
npx wrangler secret put VAPID_PRIVATE_JWK     # paste the value from vapid.secret.json
npx wrangler deploy
```

After you deploy, put the Worker URL it prints (e.g. `https://sibo-supplement-push.<you>.workers.dev`)
into `../push-config.js` and push the app to GitHub Pages.

Don't regenerate the VAPID keys after launch. New keys invalidate every existing phone subscription.

## Tests

```bash
npm test
```

## iPhone note

iOS only delivers web push to apps added to the Home Screen (Share → Add to Home Screen),
on iOS 16.4 or later. Open the app from the Home Screen icon, go to Supplements, and tap **Enable**.
