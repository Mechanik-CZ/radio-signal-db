const express = require("express");
const rateLimit = require("express-rate-limit");
const { admin, db } = require("../firebase");
const { requireRole } = require("../auth");
const { withTimeout, hashIp, isHoneypotTripped } = require("../util");
const {
  validateNewSignal,
  validateVoteDirection,
  isValidSignalId,
} = require("../validation");

const router = express.Router();

// --- Add a new frequency (public, anyone can do this) --------------------
const createLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "You're adding frequencies too quickly. Please wait a bit." },
});

router.post("/", createLimiter, async (req, res) => {
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

// --- Vote on a frequency (public, one vote per IP per signal) ------------
const voteLimiter = rateLimit({
  windowMs: 5 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Please slow down." },
});

router.post("/:id/vote", voteLimiter, async (req, res) => {
  const { id } = req.params;
  const { dir } = req.body || {};

  if (!isValidSignalId(id)) {
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

// --- Edit a signal directly (admin or moderator) --------------------------
const mutateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

router.put("/:id", mutateLimiter, requireRole("admin", "moderator"), async (req, res) => {
  const { id } = req.params;
  if (!isValidSignalId(id)) {
    return res.status(400).json({ error: "Invalid signal id" });
  }
  const result = validateNewSignal(req.body);
  if (!result.ok) {
    return res.status(400).json({ error: result.error });
  }

  try {
    const signalRef = db.ref(`signals/${id}`);
    const snapshot = await withTimeout(signalRef.once("value"));
    if (!snapshot.exists()) {
      return res.status(404).json({ error: "Signal not found" });
    }
    // .update() merges - votes/timestamp/voters are left untouched.
    await withTimeout(signalRef.update(result.data));
    return res.json({ ok: true });
  } catch (err) {
    console.error("Failed to update signal", err);
    return res.status(500).json({ error: "Could not update the frequency" });
  }
});

// --- Delete a signal (admin only) -----------------------------------------
router.delete("/:id", mutateLimiter, requireRole("admin"), async (req, res) => {
  const { id } = req.params;
  if (!isValidSignalId(id)) {
    return res.status(400).json({ error: "Invalid signal id" });
  }
  try {
    const signalRef = db.ref(`signals/${id}`);
    const snapshot = await withTimeout(signalRef.once("value"));
    if (!snapshot.exists()) {
      return res.status(404).json({ error: "Signal not found" });
    }
    await withTimeout(signalRef.remove());
    return res.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete signal", err);
    return res.status(500).json({ error: "Could not delete the frequency" });
  }
});

module.exports = router;
