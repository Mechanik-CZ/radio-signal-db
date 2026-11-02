const { admin } = require("./firebase");

// Verifies the Firebase ID token in the Authorization header, if present.
// Never rejects the request by itself - routes that need a specific role
// use requireRole() after this. req.user is null when there's no (valid)
// token, so public routes keep working the same as before.
async function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer (.+)$/);
  if (!match) {
    req.user = null;
    return next();
  }
  try {
    const decoded = await admin.auth().verifyIdToken(match[1]);
    req.user = {
      uid: decoded.uid,
      email: decoded.email || null,
      // Role lives in a custom claim set by an admin (see
      // scripts/create-admin.js and the /api/admin/users endpoint) -
      // it's part of the signed token, so the client can't forge it.
      role: decoded.role || null,
    };
  } catch (err) {
    req.user = null;
  }
  next();
}

// requireRole('admin') - only admins
// requireRole('admin', 'moderator') - admins or moderators
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
