module.exports = (db) => {
  db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    adminId INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    email TEXT,
    password TEXT
  )
`);
};
