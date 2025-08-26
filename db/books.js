module.exports = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      publisher TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(userId)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS book_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      FOREIGN KEY (book_id) REFERENCES books(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS book_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      answer INTEGER CHECK(answer BETWEEN 1 AND 5),
      answered_at INTEGER,
      FOREIGN KEY (book_id) REFERENCES books(id),
      FOREIGN KEY (question_id) REFERENCES book_questions(id),
      FOREIGN KEY (user_id) REFERENCES users(userId)
    )
  `);
};
