// One-off script to create (or promote) the first admin account.
// Run this yourself, locally, with your real server/.env filled in -
// it is NOT exposed over HTTP, on purpose: promoting someone to admin
// should never be something the website itself can do.
//
// Usage:
//   cd server
//   node scripts/create-admin.js you@example.com "a strong password"
//
// If the email already has an account (e.g. you signed up once to test),
// the password argument is ignored and only the admin role is granted.

require("dotenv").config();
const { admin } = require("../firebase");

async function main() {
  const [, , email, password] = process.argv;
  if (!email) {
    console.error('Usage: node scripts/create-admin.js you@example.com "password"');
    process.exit(1);
  }

  let user;
  try {
    user = await admin.auth().getUserByEmail(email);
    console.log(`Found existing user ${email} (${user.uid})`);
  } catch (err) {
    if (err.code !== "auth/user-not-found") throw err;
    if (!password || password.length < 8) {
      console.error("No existing user with that email - provide a password (8+ chars) to create one.");
      process.exit(1);
    }
    user = await admin.auth().createUser({ email, password });
    console.log(`Created user ${email} (${user.uid})`);
  }

  await admin.auth().setCustomUserClaims(user.uid, { role: "admin" });
  console.log(`${email} is now an admin. They can log in from the website.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
