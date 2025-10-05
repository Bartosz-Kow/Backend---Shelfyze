module.exports = (db) => {
  // 🔹 Tworzymy tabelę users, jeśli nie istnieje
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      userId INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      email TEXT,
      password TEXT
    )
  `);

  // 🔹 Sprawdzamy, czy istnieje kolumna created_at — jeśli nie, to dodajemy
  try {
    const columns = db.prepare("PRAGMA table_info(users)").all();
    const hasCreatedAt = columns.some((col) => col.name === "created_at");

    if (!hasCreatedAt) {
      console.log("🛠️ Dodaję kolumnę 'created_at' do tabeli 'users'...");
      db.exec("ALTER TABLE users ADD COLUMN created_at INTEGER DEFAULT 0");
    }
  } catch (err) {
    console.error("❌ Błąd podczas sprawdzania / dodawania kolumny:", err);
  }

  // 🔹 Tworzymy tabelę pending_users (dla użytkowników weryfikujących się)
  db.exec(`
    CREATE TABLE IF NOT EXISTS pending_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT,
      password TEXT,
      username TEXT,
      code TEXT,
      expires_at INTEGER
    )
  `);
};
