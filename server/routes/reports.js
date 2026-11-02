const express = require("express");
const rateLimit = require("express-rate-limit");
const { admin, db } = require("../firebase");
const { requireRole } = require("../auth");
const { withTimeout, isHoneypotTripped } = require("../util");
const { validateReportSubmission, validateResolveBody } = require("../validation");

const router = express.Router();

// --- Submit a report: suggest an edit or deletion (public) ---------------
const reportLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "You're submitting reports too quickly. Please wait a bit." },
});

router.post("/", reportLimiter, async (req, res) => {
  if (isHoneypotTripped(req.body)) {
    return res.status(201).json({ ok: true });
  }

  const result = validateReportSubmission(req.body);
  if (!result.ok) {
    return res.status(400).json({ error: result.error });
  }

  try {
    const signalRef = db.ref(`signals/${req.body.signalId}`);
    const snapshot = await withTimeout(signalRef.once("value"));
    if (!snapshot.exists()) {
      return res.status(404).json({ error: "Signal not found" });
    }

    const reportRef = db.ref("reports").push();
    await withTimeout(
      reportRef.set({
        signalId: req.body.signalId,
        action: result.data.action,
        proposedChanges: result.data.proposedChanges || null,
        note: result.data.note || "",
        originalSnapshot: snapshot.val(),
        status: "pending",
        createdAt: admin.database.ServerValue.TIMESTAMP,
      })
    );
    return res.status(201).json({ ok: true, id: reportRef.key });
  } catch (err) {
    console.error("Failed to submit report", err);
    return res.status(500).json({ error: "Could not submit the report" });
  }
});

// --- List reports (admin or moderator) ------------------------------------
router.get("/", requireRole("admin", "moderator"), async (req, res) => {
  const statusFilter = req.query.status || "pending";
  try {
    const snapshot = await withTimeout(db.ref("reports").once("value"));
    const data = snapshot.val() || {};
    const list = Object.entries(data)
      .map(([id, val]) => ({ id, ...val }))
      .filter((r) => statusFilter === "all" || r.status === statusFilter)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return res.json({ reports: list });
  } catch (err) {
    console.error("Failed to list reports", err);
    return res.status(500).json({ error: "Could not load reports" });
  }
});

// --- Resolve a report: reject / approve / modify & approve -----------------
router.post("/:id/resolve", requireRole("admin", "moderator"), async (req, res) => {
  const { id } = req.params;

  try {
    const reportRef = db.ref(`reports/${id}`);
    const snapshot = await withTimeout(reportRef.once("value"));
    if (!snapshot.exists()) {
      return res.status(404).json({ error: "Report not found" });
    }
    const report = snapshot.val();
    if (report.status !== "pending") {
      return res.status(409).json({ error: "This report was already resolved" });
    }

    const result = validateResolveBody(req.body, report.action);
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }

    // Moderators may only edit, never delete - so approving a deletion
    // (the only way a report can cause one) is admin-only. Rejecting is
    // always safe since it changes no signal data.
    if (
      report.action === "delete" &&
      result.decision !== "reject" &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ error: "Only an admin can approve a deletion" });
    }

    const resolution = {
      status: result.decision === "reject" ? "rejected" : "approved",
      resolvedBy: req.user.email || req.user.uid,
      resolvedAt: admin.database.ServerValue.TIMESTAMP,
    };

    if (result.decision === "reject") {
      await withTimeout(reportRef.update(resolution));
      return res.json({ ok: true, status: "rejected" });
    }

    const signalRef = db.ref(`signals/${report.signalId}`);
    const signalSnapshot = await withTimeout(signalRef.once("value"));
    if (!signalSnapshot.exists()) {
      return res.status(404).json({ error: "The reported signal no longer exists" });
    }

    if (report.action === "delete") {
      await withTimeout(signalRef.remove());
    } else {
      const changes =
        result.decision === "modify_approve" ? result.changes : report.proposedChanges;
      await withTimeout(signalRef.update(changes));
      resolution.appliedChanges = changes;
    }

    await withTimeout(reportRef.update(resolution));
    return res.json({ ok: true, status: "approved" });
  } catch (err) {
    console.error("Failed to resolve report", err);
    return res.status(500).json({ error: "Could not resolve the report" });
  }
});

module.exports = router;
