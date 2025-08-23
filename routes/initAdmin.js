require("dotenv").config();
const bcrypt = require("bcrypt");
const db = require("../db");
async function initAdmin() {
  const email = "admin@shelfyz.com";
  const username = "Admin";
  const password = process.env.ADMIN_PASSWORD;

  console.log("🧪 ADMIN_PASSWORD:", password ? "(ustawione)" : "(brak)");

  if (!password) {
    const msg = "❌ Brakuje ADMIN_PASSWORD w .env / zmiennych środowiskowych!";
    console.error(msg);

    throw new Error(msg);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const exists = db.prepare("SELECT 1 FROM admins WHERE email = ?").get(email);

  if (!exists) {
    db.prepare(
      "INSERT INTO admins (username, email, password) VALUES (?, ?, ?)"
    ).run(username, email, hashedPassword);
    console.log("✅ Admin dodany:", { email, username });
  } else {
    console.log("⚠️ Admin już istnieje:", { email });
  }
}

module.exports = initAdmin;

if (require.main === module) {
  initAdmin()
    .then(() => {
      console.log("🏁 Seed zakończony.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed nie powiódł się:", err.message);
      process.exit(1);
    });
}
