require("dotenv").config();

const bcrypt = require("bcrypt");
const db = require("../db");

const email = "admin@shelfyz.com";
const username = "Admin";
const password = process.env.ADMIN_PASSWORD;
console.log("🧪 ADMIN_PASSWORD:", password);
(async () => {
  if (!password) {
    console.error("❌ Brakuje ADMIN_PASSWORD w pliku .env!");
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const exists = db.prepare("SELECT * FROM admins WHERE email = ?").get(email);

  if (!exists) {
    db.prepare(
      "INSERT INTO admins (username, email, password) VALUES (?, ?, ?)"
    ).run(username, email, hashedPassword);
    console.log("✅ Admin dodany");
  } else {
    console.log("⚠️ Admin już istnieje");
  }

  process.exit();
})();
