import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import webpush from "web-push";
import jwt from "jsonwebtoken";

import authRoutes from "./routes/authRoutes.js";
import medicineRoutes from "./routes/medicineRoutes.js";

dotenv.config();
const app = express();

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());

// ---------- MongoDB Connection ----------
const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/Urban-community-digital";
mongoose
  .connect(mongoURI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// ---------- VAPID Keys (Push Notifications) ----------
webpush.setVapidDetails(
  "mailto:your-email@example.com",
  process.env.VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC || "",
  process.env.VAPID_PRIVATE_KEY || process.env.VAPID_PRIVATE || ""
);

// ---------- Routes ----------
app.use("/api/auth", authRoutes);
app.use("/api/medicines", medicineRoutes);

app.get("/", (req, res) => {
  res.send("Medication Tracker API is running ✅");
});

// ---------- Push Notification Handling ----------
const inMemorySubs = {}; // temporary store (resets on restart)

app.get("/api/subscribe/vapid", (req, res) => {
  res.json({
    publicKey: process.env.VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC || "",
  });
});

app.post("/api/subscribe", express.json(), (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided" });

    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = payload.userId;

    const subscription = req.body;
    if (!subscription || !subscription.endpoint)
      return res.status(400).json({ message: "Invalid subscription body" });

    inMemorySubs[userId] = inMemorySubs[userId] || [];
    if (!inMemorySubs[userId].some((s) => s.endpoint === subscription.endpoint)) {
      inMemorySubs[userId].push(subscription);
    }

    res.json({ message: "Subscribed (in-memory)" });
  } catch (err) {
    console.error("Subscribe error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/notify/test", express.json(), async (req, res) => {
  try {
    const { userId, title = "Test", body = "This is a test push" } = req.body;
    if (!userId) return res.status(400).json({ message: "userId required in body" });

    const subs = inMemorySubs[userId] || [];
    if (!subs.length) return res.status(400).json({ message: "No subscriptions for this user" });

    const payload = JSON.stringify({ title, body, url: "/home" });

    for (const s of subs) {
      try {
        await webpush.sendNotification(s, payload);
      } catch (err) {
        console.error("Push send error:", err);
      }
    }

    res.json({ message: "Push attempted" });
  } catch (err) {
    console.error("Notify test error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- Scheduler (Medicine Reminders) ----------
const sentReminders = new Set();
const MS = 1000;
const CHECK_INTERVAL_MS = 60 * MS;
const REMIND_WINDOW_MINUTES = 30;

const buildDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0);
};

const pruneSentReminders = (now) => {
  for (const key of Array.from(sentReminders)) {
    const iso = key.split("::")[1];
    const dt = new Date(iso);
    if (dt.getTime() < now.getTime() - 24 * 60 * 60 * 1000) sentReminders.delete(key);
  }
};

setInterval(async () => {
  try {
    const MedicineModule = await import("./models/Medicine.js");
    const Medicine = MedicineModule.default || MedicineModule;
    const now = new Date();
    pruneSentReminders(now);

    const windowEnd = new Date(now.getTime() + REMIND_WINDOW_MINUTES * 60 * 1000);
    const todayStr = now.toISOString().slice(0, 10);
    const candidates = await Medicine.find({ endDate: { $gte: todayStr } }).lean();

    for (const med of candidates) {
      const occToday = buildDateTime(todayStr, med.medicineTime);
      const occFromStart = buildDateTime(med.startDate, med.medicineTime);
      const occEnd = buildDateTime(med.endDate, med.medicineTime);

      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const occTomorrow = buildDateTime(tomorrow.toISOString().slice(0, 10), med.medicineTime);

      let occ = null;
      if (occToday && occFromStart && occEnd && occToday >= occFromStart && occToday <= occEnd && occToday >= now && occToday <= windowEnd) {
        occ = occToday;
      } else if (occTomorrow && occFromStart && occEnd && occTomorrow >= occFromStart && occTomorrow <= occEnd && occTomorrow >= now && occTomorrow <= windowEnd) {
        occ = occTomorrow;
      } else continue;

      const occKey = `${med._id}::${occ.toISOString()}`;
      if (sentReminders.has(occKey)) continue;

      const userId = med.userId?.toString();
      const subs = inMemorySubs[userId] || [];
      if (!subs.length) continue;

      const payload = JSON.stringify({
        title: "Medicine Reminder",
        body: `⏰ Time to take ${med.name} at ${med.medicineTime}`,
        url: "/home",
      });

      for (const s of subs) {
        try {
          await webpush.sendNotification(s, payload);
          console.log(`Push sent to user ${userId} for "${med.name}" at ${occ.toISOString()}`);
        } catch (err) {
          console.error("Push send error (scheduler):", err);
        }
      }

      sentReminders.add(occKey);
    }
  } catch (err) {
    console.error("Scheduler loop error:", err);
  }
}, CHECK_INTERVAL_MS);

// ---------- Error Handler ----------
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.message);
  res.status(500).json({ error: "Internal Server Error" });
});

// ---------- Start Server ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
