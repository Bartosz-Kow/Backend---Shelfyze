const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");
const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email i hasło są wymagane!" });
  }

  try {
    const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
    const user = stmt.get(email);

    if (!user) {
      return res.status(400).json({ error: "Nieprawidłowy email lub hasło." });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: "Nieprawidłowy email lub hasło." });
    }

    const token = jwt.sign(
      { userId: user.userId, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Zalogowano pomyślnie!",
      token,
      userId: user.userId,
      username: user.username,
      email: user.email,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Błąd serwera" });
  }
});

module.exports = router;
