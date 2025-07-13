module.exports = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      userId INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      email TEXT,
      password TEXT
    )
  `);

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
