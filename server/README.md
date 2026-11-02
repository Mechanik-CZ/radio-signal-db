# radio-signal-db-api

Small Express API that is the **only** thing allowed to write to the
Firebase Realtime Database. The frontend still reads directly from Firebase
(that's public and fine), but "Add Frequency" and voting now go through
this API instead of writing to Firebase from the browser.

Why: with direct client writes, anyone could open devtools (or just `curl`
the Firebase REST URL) and write or spam arbitrary data straight into the
database - the `apiKey` in the frontend bundle is not a secret, so hiding it
doesn't help. This API holds the real secret (a Firebase service account),
validates every request, and rate-limits by IP, and `database.rules.json`
now denies writes from anyone else.

## Local development

```
cd server
npm install
cp .env.example .env   # then fill in the real values
npm start
```

## Deploying on Render (separate Web Service)

The existing `radio-signal-db` Render service stays a **Static Site**
serving the React app - don't change it. Add a **second**, new service for
this API:

1. Render Dashboard → New → Web Service → pick the same GitHub repo.
2. **Root Directory**: `server`
3. **Build Command**: `npm install`
4. **Start Command**: `npm start`
5. **Environment variables** (Render → your new service → Environment):
   - `FIREBASE_SERVICE_ACCOUNT` - the full JSON from Firebase Console →
     Project settings → Service accounts → "Generate new private key",
     pasted as one value. Paste it directly into Render's dashboard,
     never into a chat or a committed file.
   - `FIREBASE_DATABASE_URL` - `https://radiosignaldb-default-rtdb.europe-west1.firebasedatabase.app`
   - `ALLOWED_ORIGIN` - `https://radio-signal-db.onrender.com`
   - `IP_HASH_SECRET` - any random long string (e.g. `openssl rand -hex 32`)
6. Deploy. Note the service's URL, e.g. `https://radio-signal-db-api.onrender.com`.

Then on the **existing frontend** service:

7. Add an environment variable `REACT_APP_API_URL` =
   `https://radio-signal-db-api.onrender.com` (the URL from step 6).
8. Trigger a redeploy (env var changes need a rebuild for Create React App).

Then publish the locked-down rules:

9. Firebase Console → Realtime Database → Rules → paste the contents of
   `database.rules.json` from the repo root → Publish.

## Roles: guest / moderator / admin

Guests (not logged in) can still only add new frequencies and vote, exactly
like before. Logging in (email+password, via the "Login" link) unlocks:

- **moderator**: edit any existing frequency directly, and approve/reject/
  edit "suggest a change" reports from guests (except deletions).
- **admin**: everything a moderator can, plus delete frequencies directly
  and approve deletion reports, plus manage who is a moderator.

10. Firebase Console → Authentication → Sign-in method → enable
    **Email/Password**.
11. Create the first admin account yourself, locally (never through the
    website - there's no API for this, on purpose):
    ```
    cd server
    npm install
    cp .env.example .env   # fill in the real values, same as step 5 above
    node scripts/create-admin.js you@example.com "a strong password"
    ```
    Log in with that email/password from the website's "Login" page.
12. From then on, that admin can invite moderators from the website's
    "Users" page: enter their email, the site creates the account and
    shows a one-time password-reset link to send them so they can set
    their own password and log in.

A role change (promoting/demoting) applies the next time that person logs
in - their browser is holding an older token until then.

## Notes

- Render's free Web Service tier sleeps after ~15 minutes of no traffic; the
  first request after that takes 30-50s to wake up. Fine for a low-traffic
  hobby site; upgrade to a paid instance if that's ever annoying.
- Voter IPs are never stored in plain text - only an HMAC hash keyed by
  `IP_HASH_SECRET`, under `signals/{id}/voters/{hash}`, just to block a
  given IP from voting twice on the same signal.
