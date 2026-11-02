const admin = require("firebase-admin");

const DATABASE_URL = process.env.FIREBASE_DATABASE_URL;
const SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!DATABASE_URL || !SERVICE_ACCOUNT_JSON) {
  console.error(
    "Missing FIREBASE_DATABASE_URL or FIREBASE_SERVICE_ACCOUNT env vars. " +
      "See server/README.md for setup."
  );
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(SERVICE_ACCOUNT_JSON)),
    databaseURL: DATABASE_URL,
  });
}

module.exports = { admin, db: admin.database() };
