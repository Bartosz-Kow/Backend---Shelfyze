const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");
const router = express.Router();

router.post("/admin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email i hasło są wymagane!" });
  }

  try {
    const stmt = db.prepare("SELECT * FROM admins WHERE email = ?");
    const admin = stmt.get(email);

    if (!admin) {
      return res.status(400).json({ error: "Nieprawidłowy email lub hasło." });
    }

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return res.status(400).json({ error: "Nieprawidłowy email lub hasło." });
    }

    const token = jwt.sign(
      {
        adminId: admin.adminId,
        email: admin.email,
        username: admin.username,
        isAdmin: true,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Zalogowano jako admin!",
      token,
      adminId: admin.adminId,
      username: admin.username,
      email: admin.email,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Błąd serwera" });
  }
});

module.exports = router;
