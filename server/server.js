if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const cors = require("cors");
require("./firebase"); // fails fast if env vars are missing
const { authenticate } = require("./auth");
const signalsRouter = require("./routes/signals");
const reportsRouter = require("./routes/reports");
const adminRouter = require("./routes/admin");

const PORT = process.env.PORT || 4000;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const app = express();
app.set("trust proxy", 1); // Render sits behind a proxy; needed for correct req.ip
app.use(express.json({ limit: "10kb" }));
app.use(cors({ origin: ALLOWED_ORIGINS, methods: ["GET", "POST", "PUT", "DELETE"] }));
app.use(authenticate); // sets req.user (or null) on every request

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.get("/api/me", (req, res) => {
  if (!req.user) return res.json({ role: null });
  return res.json(req.user);
});

app.use("/api/signals", signalsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/admin", adminRouter);

app.listen(PORT, () => {
  console.log(`radio-signal-db-api listening on port ${PORT}`);
});
