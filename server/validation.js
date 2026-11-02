// Mirrors the constraints that used to only live in database.rules.json.
// Now that Security Rules deny all direct client writes, this is the one
// place that validates a new signal before it reaches Firebase.

const TYPE_COLORS = {
  // analog
  nfm: "blue", fm: "blue", bfm: "blue", am: "blue", nam: "blue",
  ssb: "blue", usb: "blue", lsb: "blue", dsb: "blue",
  // common digital
  dmr: "red", "d-star": "red", tetra: "red", tetrapol: "red",
  nxdn: "red", c4fm: "red",
  // simple digital
  rtty: "green", ft8: "green", ft4: "green", packet: "green", digi: "green",
  // ctu
  ctu: "violet", "čtú": "violet", "čtu": "violet", "ctú": "violet",
};

function determineColor(type) {
  return TYPE_COLORS[(type || "").toLowerCase()] || "grey";
}

function isFiniteNumber(n) {
  return typeof n === "number" && Number.isFinite(n);
}

// Returns { ok: true, data } or { ok: false, error }
function validateNewSignal(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const frequency = Number(body.frequency);
  const city = String(body.city ?? "").trim();
  const lat = Number(body.lat ?? 0);
  const lon = Number(body.lon ?? 0);
  const type = String(body.type ?? "").trim();
  const description = String(body.description ?? "").trim();
  const radius_km = Number(body.radius_km ?? 5);

  if (!isFiniteNumber(frequency) || frequency <= 0 || frequency >= 300000) {
    return { ok: false, error: "frequency must be a number between 0 and 300000" };
  }
  if (!city || city.length > 120) {
    return { ok: false, error: "city is required and must be at most 120 characters" };
  }
  if (!isFiniteNumber(lat) || lat < -90 || lat > 90) {
    return { ok: false, error: "lat must be a number between -90 and 90" };
  }
  if (!isFiniteNumber(lon) || lon < -180 || lon > 180) {
    return { ok: false, error: "lon must be a number between -180 and 180" };
  }
  if (!type || type.length > 40) {
    return { ok: false, error: "type is required and must be at most 40 characters" };
  }
  if (description.length > 400) {
    return { ok: false, error: "description must be at most 400 characters" };
  }
  if (!isFiniteNumber(radius_km) || radius_km < 1 || radius_km > 80) {
    return { ok: false, error: "radius_km must be a number between 1 and 80" };
  }

  return {
    ok: true,
    data: {
      frequency,
      city,
      lat,
      lon,
      type,
      description,
      radius_km,
      color: determineColor(type),
    },
  };
}

function validateVoteDirection(dir) {
  return dir === "up" || dir === "down";
}

const SIGNAL_ID_RE = /^[a-zA-Z0-9_-]+$/;

function isValidSignalId(id) {
  return typeof id === "string" && SIGNAL_ID_RE.test(id);
}

// A guest suggesting a change to an existing signal (not a brand new one).
function validateReportSubmission(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }
  if (!isValidSignalId(body.signalId)) {
    return { ok: false, error: "Invalid signalId" };
  }
  if (body.action !== "edit" && body.action !== "delete") {
    return { ok: false, error: "action must be 'edit' or 'delete'" };
  }
  const note = String(body.note ?? "").trim();
  if (note.length > 300) {
    return { ok: false, error: "note must be at most 300 characters" };
  }

  if (body.action === "delete") {
    return { ok: true, data: { action: "delete", note } };
  }

  const changes = validateNewSignal(body.proposedChanges);
  if (!changes.ok) {
    return { ok: false, error: `proposedChanges: ${changes.error}` };
  }
  return { ok: true, data: { action: "edit", proposedChanges: changes.data, note } };
}

function validateResolveBody(body, reportAction) {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }
  const { decision } = body;
  if (!["approve", "reject", "modify_approve"].includes(decision)) {
    return { ok: false, error: "decision must be approve, reject or modify_approve" };
  }
  if (decision === "modify_approve") {
    if (reportAction !== "edit") {
      return { ok: false, error: "modify_approve only applies to edit reports" };
    }
    const changes = validateNewSignal(body.changes);
    if (!changes.ok) {
      return { ok: false, error: `changes: ${changes.error}` };
    }
    return { ok: true, decision, changes: changes.data };
  }
  return { ok: true, decision };
}

module.exports = {
  validateNewSignal,
  validateVoteDirection,
  determineColor,
  isValidSignalId,
  validateReportSubmission,
  validateResolveBody,
};
