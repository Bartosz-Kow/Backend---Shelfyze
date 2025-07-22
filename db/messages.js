module.exports = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_user_id INTEGER,
      sender_admin_id INTEGER,
      receiver_user_id INTEGER,
      receiver_admin_id INTEGER,
      content TEXT NOT NULL,
      sent_at INTEGER NOT NULL,
      FOREIGN KEY (sender_user_id) REFERENCES users(userId),
      FOREIGN KEY (receiver_user_id) REFERENCES users(userId),
      FOREIGN KEY (sender_admin_id) REFERENCES admins(adminId),
      FOREIGN KEY (receiver_admin_id) REFERENCES admins(adminId)
    )
  `);
};
