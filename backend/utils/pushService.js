import webpush from "web-push";
import dotenv from "dotenv";
dotenv.config();

// Set VAPID keys for push notifications
webpush.setVapidDetails(
  "mailto:your-email@example.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Function to send push notifications
export const sendNotification = async (subscription, payload) => {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log("✅ Notification sent successfully");
  } catch (error) {
    console.error("❌ Error sending notification:", error);
  }
};
