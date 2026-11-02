const crypto = require("crypto");

const IP_HASH_SECRET = process.env.IP_HASH_SECRET || "change-me-in-render-env";

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

module.exports = { hashIp, withTimeout, isHoneypotTripped };
