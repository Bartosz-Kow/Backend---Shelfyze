const Database = require("better-sqlite3");
const db = new Database("./database.db");

try {
  db.exec("ALTER TABLE users ADD COLUMN pushToken TEXT;");
  console.log("✅ Dodano kolumnę 'pushToken' do tabeli 'users'!");
} catch (err) {
  if (err.message.includes("duplicate column")) {
    console.log("⚠️ Kolumna 'pushToken' już istnieje — pomijam.");
  } else {
    console.error("❌ Błąd podczas dodawania kolumny:", err);
  }
}
