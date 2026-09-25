CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,          -- sha256 of the push endpoint
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  tz TEXT NOT NULL,             -- IANA time zone of the phone, e.g. Australia/Sydney
  doses TEXT NOT NULL,          -- JSON [{key, name, dosage, time: "HH:MM"}]
  taken TEXT NOT NULL,          -- JSON {date: "YYYY-MM-DD", keys: [...]}
  notified TEXT NOT NULL,       -- JSON {date, stages: {doseKey: 1|2}}
  updated_at INTEGER NOT NULL
);
