if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const admin = require("firebase-admin");
const { validateNewSignal, validateVoteDirection } = require("./validation");

const PORT = process.env.PORT || 4000;
const DATABASE_URL = process.env.FIREBASE_DATABASE_URL;
const SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT;
// Pepper used to hash IPs before storing them, so the database never holds
// raw IP addresses - just an opaque per-signal "has this IP voted" flag.
const IP_HASH_SECRET = process.env.IP_HASH_SECRET || "change-me-in-render-env";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!DATABASE_URL || !SERVICE_ACCOUNT_JSON) {
  console.error(
    "Missing FIREBASE_DATABASE_URL or FIREBASE_SERVICE_ACCOUNT env vars. " +
      "See server/README.md for setup."
  );
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(SERVICE_ACCOUNT_JSON)),
  databaseURL: DATABASE_URL,
});
const db = admin.database();

const app = express();
app.set("trust proxy", 1); // Render sits behind a proxy; needed for correct req.ip
app.use(express.json({ limit: "10kb" }));
app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
  })
);

function hashIp(ip) {
  return crypto.createHmac("sha256", IP_HASH_SECRET).update(ip).digest("hex");
}

// Firebase's SDK retries auth/network failures internally and can hang a
// request far longer than a client will wait. Fail fast instead.
function withTimeout(promise, ms = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database request timed out")), ms)
    ),
  ]);
}

function isHoneypotTripped(body) {
  return typeof body.company === "string" && body.company.trim().length > 0;
}

app.get("/api/health", (req, res) => res.json({ ok: true }));

// --- Add a new frequency -----------------------------------------------
const createLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "You're adding frequencies too quickly. Please wait a bit." },
});

app.post("/api/signals", createLimiter, async (req, res) => {
  if (isHoneypotTripped(req.body)) {
    // Pretend it worked so simple bots don't learn to leave the field empty.
    return res.status(201).json({ ok: true });
  }

  const result = validateNewSignal(req.body);
  if (!result.ok) {
    return res.status(400).json({ error: result.error });
  }

  try {
    const newRef = db.ref("signals").push();
    await withTimeout(
      newRef.set({
        ...result.data,
        timestamp: admin.database.ServerValue.TIMESTAMP,
        votes: { up: 0, down: 0 },
      })
    );
    return res.status(201).json({ ok: true, id: newRef.key });
  } catch (err) {
    console.error("Failed to create signal", err);
    return res.status(500).json({ error: "Could not save the frequency" });
  }
});

// --- Vote on a frequency -------------------------------------------------
const voteLimiter = rateLimit({
  windowMs: 5 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Please slow down." },
});

app.post("/api/signals/:id/vote", voteLimiter, async (req, res) => {
  const { id } = req.params;
  const { dir } = req.body || {};

  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return res.status(400).json({ error: "Invalid signal id" });
  }
  if (!validateVoteDirection(dir)) {
    return res.status(400).json({ error: "dir must be 'up' or 'down'" });
  }

  try {
    const signalRef = db.ref(`signals/${id}`);
    const snapshot = await withTimeout(signalRef.once("value"));
    if (!snapshot.exists()) {
      return res.status(404).json({ error: "Signal not found" });
    }

    const ipHash = hashIp(req.ip || "unknown");
    const voterRef = signalRef.child(`voters/${ipHash}`);

    // Atomically claim the "this IP voted on this signal" slot. If it's
    // already taken, the transaction aborts and we know not to count the vote.
    const claim = await withTimeout(
      voterRef.transaction((current) => (current === null ? true : undefined))
    );

    if (!claim.committed) {
      return res.status(409).json({ error: "You've already voted on this frequency." });
    }

    const voteRef = signalRef.child(`votes/${dir}`);
    await withTimeout(voteRef.transaction((current) => (current || 0) + 1));

    return res.json({ ok: true });
  } catch (err) {
    console.error("Failed to record vote", err);
    return res.status(500).json({ error: "Could not record the vote" });
  }
});

app.listen(PORT, () => {
  console.log(`radio-signal-db-api listening on port ${PORT}`);
});
