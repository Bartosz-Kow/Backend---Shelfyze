const express = require("express");

module.exports = (db) => {
  const router = express.Router();

  // 🔹 Ostatnie aktywności
  router.get("/recent-activity", (req, res) => {
    try {
      const messageActivity = db
        .prepare(
          `
          SELECT u.username AS user, m.sent_at AS timestamp,
                 'message' AS type,
                 'Wysłał wiadomość' AS text
          FROM messages m
          JOIN users u ON m.sender_user_id = u.userId
          WHERE m.sender_user_id IS NOT NULL
        `
        )
        .all();

      const bookActivity = db
        .prepare(
          `
          SELECT u.username AS user, b.created_at AS timestamp,
                 'book' AS type,
                 'Dodał książkę "' || b.title || '"' AS text
          FROM books b
          JOIN users u ON b.user_id = u.userId
        `
        )
        .all();

      const answersActivity = db
        .prepare(
          `
          SELECT u.username AS user, a.answered_at AS timestamp,
                 'answer' AS type,
                 'Udzielił odpowiedzi w książce (ID: ' || a.book_id || ')' AS text
          FROM book_answers a
          JOIN users u ON a.user_id = u.userId
        `
        )
        .all();

      const merged = [...messageActivity, ...bookActivity, ...answersActivity]
        .filter((e) => e.timestamp)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);

      res.json(merged);
    } catch (err) {
      console.error("❌ Błąd przy pobieraniu aktywności:", err);
      res.status(500).json({ error: "Nie udało się pobrać aktywności" });
    }
  });

  // 🔹 Top aktywni użytkownicy
  router.get("/top-users", (req, res) => {
    try {
      const topUsers = db
        .prepare(
          `
          SELECT 
            u.username AS user,
            (
              (SELECT COUNT(*) FROM messages m WHERE m.sender_user_id = u.userId)
              +
              (SELECT COUNT(*) FROM books b WHERE b.user_id = u.userId)
              +
              (SELECT COUNT(*) FROM book_answers a WHERE a.user_id = u.userId)
            ) AS activity_count
          FROM users u
          ORDER BY activity_count DESC
          LIMIT 3
        `
        )
        .all();

      res.json(topUsers);
    } catch (err) {
      console.error("❌ Błąd przy pobieraniu top użytkowników:", err);
      res.status(500).json({ error: "Nie udało się pobrać top użytkowników" });
    }
  });

  return router;
};
