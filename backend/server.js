import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";
import medicineRoutes from "./routes/medicineRoutes.js";
import webpush from "web-push";
import jwt from "jsonwebtoken"
dotenv.config();

const app = express(); // ✅ Moved above route mounting

// ✅ middleware
app.use(cors());
app.use(express.json());

// ✅ MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/Urban-community-digital")
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

  //push notification
  webpush.setVapidDetails(
  `mailto:your-email@example.com`, // informational only — can stay as is
  process.env.VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC || "",
  process.env.VAPID_PRIVATE_KEY || process.env.VAPID_PRIVATE || ""
);

// ✅ Correct route mounting order
app.use("/api/auth", authRoutes);
app.use("/api/medicines", medicineRoutes);

// ✅ Test Route
app.get("/", (req, res) => {
  res.send("Medication Tracker API is running ✅");
});
// ----------------- PUSH NOTIFICATIONS: minimal in-memory subscribe & test routes -----------------
// (Paste this block AFTER your existing route mounts & test route. This block does NOT modify your existing code.)
const inMemorySubs = {}; // { userId: [ subscriptionObj, ... ] }  (ephemeral; cleared on server restart)

/**
 * GET /api/subscribe/vapid
 * returns the VAPID public key for the client to use for pushManager.subscribe()
 */
app.get("/api/subscribe/vapid", (req, res) => {
  return res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC || "" });
});

/**
 * POST /api/subscribe
 * Save subscription in memory for the logged-in user.
 * Expects Authorization: Bearer <token> header and the subscription JSON body.
 */
app.post("/api/subscribe", express.json(), async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided" });

    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid token" });
    }
    const userId = payload.userId;

    const subscription = req.body;
    if (!subscription || !subscription.endpoint) return res.status(400).json({ message: "Invalid subscription body" });

    // store subscription in memory (avoid duplicates)
    inMemorySubs[userId] = inMemorySubs[userId] || [];
    if (!inMemorySubs[userId].some(s => s.endpoint === subscription.endpoint)) {
      inMemorySubs[userId].push(subscription);
    }

    return res.json({ message: "Subscribed (in-memory)" });
  } catch (err) {
    console.error("Subscribe error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/notify/test
 * Manual test endpoint to send a push immediately to a user's subscriptions.
 * Body: { "userId": "<userId>", "title": "Test", "body": "Hello" }
 */
app.post("/api/notify/test", express.json(), async (req, res) => {
  try {
    const { userId, title = "Test", body = "This is a test push" } = req.body;
    if (!userId) return res.status(400).json({ message: "userId required in body" });

    const subs = inMemorySubs[userId] || [];
    if (!subs.length) return res.status(400).json({ message: "No subscriptions for this user (in-memory)" });

    const payload = JSON.stringify({ title, body, url: "/home" });

    for (const s of subs) {
      try {
        await webpush.sendNotification(s, payload);
      } catch (err) {
        console.error("Push send error:", err);
        // We do not remove here because store is in-memory; in production handle 410/404.
      }
    }

    return res.json({ message: "Push attempted" });
  } catch (err) {
    console.error("Notify test error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});
// ----------------- end push block -----------------
const sentReminders = new Set(); // stores keys like `${med._id}::2025-10-27T09:50:00.000Z`
const MS = 1000;
const CHECK_INTERVAL_MS = 60 * MS;           // every minute
const REMIND_WINDOW_MINUTES = 30;            // notify if occurrence within next 30 minutes

// helper: build JS Date for a given dateStr "YYYY-MM-DD" and timeStr "HH:MM"
const buildDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0);
};

// prune old sent keys to avoid memory growth
const pruneSentReminders = (now) => {
  for (const key of Array.from(sentReminders)) {
    const iso = key.split("::")[1];
    if (!iso) { sentReminders.delete(key); continue; }
    const dt = new Date(iso);
    // remove if older than 1 day
    if (dt.getTime() < now.getTime() - 24*60*60*1000) sentReminders.delete(key);
  }
};

setInterval(async () => {
  try {
    const MedicineModule = await import('./models/Medicine.js');
    const Medicine = MedicineModule.default || MedicineModule;
    const now = new Date();
    pruneSentReminders(now);
    const windowEnd = new Date(now.getTime() + REMIND_WINDOW_MINUTES * 60 * 1000);

    // simple prefilter: medicines whose endDate >= today
    const todayStr = now.toISOString().slice(0, 10);
    const candidates = await Medicine.find({ endDate: { $gte: todayStr } }).lean();

    for (const med of candidates) {
      // build occurrences for today and tomorrow
      const occToday = buildDateTime(now.toISOString().slice(0,10), med.medicineTime);
      const occFromStart = buildDateTime(med.startDate, med.medicineTime);
      const occEnd = buildDateTime(med.endDate, med.medicineTime);

      const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
      const tomStr = tomorrow.toISOString().slice(0,10);
      const occTomorrow = buildDateTime(tomStr, med.medicineTime);

      let occ = null;
      if (occToday && occFromStart && occEnd && occToday >= occFromStart && occToday <= occEnd && occToday >= now && occToday <= windowEnd) {
        occ = occToday;
      } else if (occTomorrow && occFromStart && occEnd && occTomorrow >= occFromStart && occTomorrow <= occEnd && occTomorrow >= now && occTomorrow <= windowEnd) {
        occ = occTomorrow;
      } else {
        continue;
      }

      const occKey = `${med._id}::${occ.toISOString()}`;
      if (sentReminders.has(occKey)) {
        // already sent for this occurrence
        continue;
      }

      const userId = med.userId?.toString();
      const subs = inMemorySubs[userId] || [];
      if (!subs.length) continue; // no subscription for this user

      const payload = JSON.stringify({
        title: "Medicine Reminder",
        body: `⏰ Time to take ${med.name} at ${med.medicineTime}`,
        url: "/home"
      });

      for (const s of subs) {
        try {
          await webpush.sendNotification(s, payload);
          console.log(`Push sent to user ${userId} for "${med.name}" at ${occ.toISOString()}`);
        } catch (err) {
          console.error("Push send error (scheduler):", err);
        }
      }

      // mark as sent
      sentReminders.add(occKey);
    }
  } catch (err) {
    console.error("Scheduler loop error:", err);
  }
}, CHECK_INTERVAL_MS);


// ✅ Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.message);
  res.status(500).json({ error: "Internal Server Error" });
});

// ✅ Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
