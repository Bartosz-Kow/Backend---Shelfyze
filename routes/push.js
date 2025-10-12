const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();

module.exports = (db) => {
  router.post("/push/send", async (req, res) => {
    try {
      const { title, body, targetUserId } = req.body;
      console.log("📩 COS PRZYSZŁO", req.body);

      const user = db
        .prepare("SELECT username, pushToken FROM users WHERE userId = ?")
        .get(targetUserId);

      if (!user || !user.pushToken) {
        return res
          .status(400)
          .json({ error: "Brak pushToken dla użytkownika" });
      }

      const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: user.pushToken,
          sound: "default",
          title,
          body,
          data: { userId: targetUserId },
        }),
      });

      const result = await expoResponse.json();
      console.log("📲 Wynik Expo push:", result);

      res.json({ success: true, sentTo: user.username, expo: result });
    } catch (err) {
      console.error("❌ Push send error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  return router;
};
