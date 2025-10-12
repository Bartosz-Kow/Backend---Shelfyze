// routes/pushRegister.js
const express = require("express");
const router = express.Router();

module.exports = (db) => {
  router.post("/push/register", (req, res) => {
    const { userId, pushToken } = req.body;

    if (!userId || !pushToken) {
      return res
        .status(400)
        .json({ error: "Brakuje danych: userId lub pushToken" });
    }

    try {
      db.prepare("UPDATE users SET pushToken = ? WHERE userId = ?").run(
        pushToken,
        userId
      );
      console.log(`✅ Zarejestrowano pushToken dla userId ${userId}`);
      res.json({ success: true });
    } catch (err) {
      console.error("❌ Błąd przy rejestracji tokena:", err);
      res.status(500).json({ error: "Błąd serwera" });
    }
  });

  return router;
};
