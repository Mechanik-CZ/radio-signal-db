const crypto = require("crypto");
const express = require("express");
const { admin } = require("../firebase");
const { requireRole } = require("../auth");

const router = express.Router();

// Promoting someone to admin is intentionally NOT possible through the API -
// only via server/scripts/create-admin.js, run by hand with the real
// service account. These routes can only create/grant/revoke "moderator".

// Invite a new moderator: creates their account (with a password nobody
// ever sees, not even us) and returns a one-time password-reset link the
// admin can send them so they can set their own password.
router.post("/users", requireRole("admin"), async (req, res) => {
  const email = String(req.body?.email || "").trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "A valid email is required" });
  }

  try {
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
    } catch (err) {
      if (err.code !== "auth/user-not-found") throw err;
      user = await admin.auth().createUser({
        email,
        password: crypto.randomBytes(24).toString("hex"),
      });
    }

    const currentRole = (user.customClaims && user.customClaims.role) || null;
    if (currentRole === "admin") {
      return res.status(403).json({ error: "That account is already an admin" });
    }

    await admin.auth().setCustomUserClaims(user.uid, { role: "moderator" });
    const resetLink = await admin.auth().generatePasswordResetLink(email);
    return res.status(201).json({ ok: true, uid: user.uid, resetLink });
  } catch (err) {
    console.error("Failed to invite moderator", err);
    return res.status(500).json({ error: "Could not create the account" });
  }
});

router.get("/users", requireRole("admin"), async (req, res) => {
  try {
    const result = await admin.auth().listUsers(1000);
    const users = result.users.map((u) => ({
      uid: u.uid,
      email: u.email,
      disabled: u.disabled,
      role: (u.customClaims && u.customClaims.role) || null,
    }));
    return res.json({ users });
  } catch (err) {
    console.error("Failed to list users", err);
    return res.status(500).json({ error: "Could not load users" });
  }
});

router.post("/users/:uid/role", requireRole("admin"), async (req, res) => {
  const { uid } = req.params;
  const { role } = req.body || {};

  if (role !== "moderator" && role !== null) {
    return res.status(400).json({ error: "role must be 'moderator' or null" });
  }

  try {
    const user = await admin.auth().getUser(uid);
    const currentRole = (user.customClaims && user.customClaims.role) || null;
    if (currentRole === "admin") {
      return res
        .status(403)
        .json({ error: "Admin roles can't be changed through the website" });
    }

    await admin.auth().setCustomUserClaims(uid, role ? { role } : {});
    return res.json({ ok: true });
  } catch (err) {
    console.error("Failed to set role", err);
    return res.status(500).json({ error: "Could not update the role" });
  }
});

module.exports = router;
