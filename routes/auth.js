const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db");
const createTransporter = require("../utils/mailer");
const router = express.Router();
const jwt = require("jsonwebtoken");

router.post("/register", async (req, res) => {
  const { email, password, lang = "pl" } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email i hasło są wymagane!" });
  }

  try {
    const username = "user_" + Date.now();
    const hashedPassword = await bcrypt.hash(password, 10);

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 3 * 60 * 1000; // 3 minuty

    const stmt = db.prepare(
      "INSERT INTO pending_users (email, password, username, code, expires_at) VALUES (?, ?, ?, ?, ?)"
    );
    stmt.run(email, hashedPassword, username, code, expiresAt);

    let textContent = "";
    if (lang === "en") {
      textContent = `Hello!\n\nYour verification code is: ${code}\n\nIt is valid for 3 minutes.`;
    } else {
      textContent = `Cześć!\n\nTwój kod weryfikacyjny to: ${code}\n\nJest ważny przez 3 minuty.`;
    }

    // Tworzymy transporter Ethereal
    const transporter = await createTransporter();

    // Wysyłamy mail
    const info = await transporter.sendMail({
      from: '"Shelfyz Bot" <no-reply@shelfyz.com>',
      to: email,
      subject:
        lang === "en"
          ? "Verification code for Shelfyze"
          : "Kod weryfikacyjny dla Shelfyze",
      text: textContent,
      html: `<p>${textContent.replace(/\n/g, "<br>")}</p>`,
    });

    console.log("Preview URL:", require("nodemailer").getTestMessageUrl(info));

    res.json({
      message:
        lang === "en"
          ? "Verification email sent! Check Preview URL in logs!"
          : "Wysłano email weryfikacyjny! Sprawdź link Preview URL w logach!",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Błąd serwera" });
  }
});

router.post("/verify", (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: "Email i kod są wymagane!" });
  }

  const existingUser = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email);
  if (existingUser) {
    return res
      .status(400)
      .json({ error: "Konto z tym adresem email już istnieje." });
  }

  const stmt = db.prepare(
    "SELECT * FROM pending_users WHERE email = ? AND code = ?"
  );
  const pendingUser = stmt.get(email, code);

  if (!pendingUser) {
    return res.status(400).json({ error: "Nieprawidłowy kod lub email." });
  }

  if (pendingUser.expires_at < Date.now()) {
    db.prepare("DELETE FROM pending_users WHERE id = ?").run(pendingUser.id);
    return res.status(400).json({ error: "Kod wygasł." });
  }

  // ⬇️ DODANE: zapisujemy created_at
  const createdAt = Math.floor(Date.now() / 1000);

  const info = db
    .prepare(
      "INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, ?)"
    )
    .run(
      pendingUser.username,
      pendingUser.email,
      pendingUser.password,
      createdAt
    );

  const user = db
    .prepare("SELECT userId, username, email FROM users WHERE userId = ?")
    .get(info.lastInsertRowid);

  db.prepare("DELETE FROM pending_users WHERE id = ?").run(pendingUser.id);

  const token = jwt.sign(
    { userId: user.userId, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    message: "Konto zostało zweryfikowane i utworzone!",
    token,
    userId: user.userId,
    username: user.username,
    email: user.email,
  });
});

module.exports = router;
