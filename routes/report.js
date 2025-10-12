// routes/report.js
const express = require("express");
const router = express.Router();

module.exports = (db) => {
  router.get("/user-report", (req, res) => {
    try {
      const { fields } = req.query;
      // np. ?fields=username,email,books,answers,messages

      // domyślnie wszystkie
      const selected = fields ? fields.split(",") : [];

      const baseQuery = `
        SELECT
          u.userId,
          u.username,
          u.email,
          u.created_at,
          COUNT(DISTINCT b.id) AS book_count,
          COUNT(DISTINCT q.id) AS question_count,
          COUNT(DISTINCT a.id) AS answer_count,
          AVG(a.answer) AS avg_answer,
          MAX(p.updated_at) AS last_progress_update,
          COUNT(DISTINCT m.id) AS message_count
        FROM users u
        LEFT JOIN books b ON b.user_id = u.userId
        LEFT JOIN book_questions q ON q.book_id = b.id
        LEFT JOIN book_answers a ON a.user_id = u.userId
        LEFT JOIN book_progress p ON p.user_id = u.userId
        LEFT JOIN messages m ON m.sender_user_id = u.userId OR m.receiver_user_id = u.userId
        GROUP BY u.userId
        ORDER BY u.userId DESC
        LIMIT 100;
      `;

      const rows = db.prepare(baseQuery).all();

      // Jeśli user chce tylko wybrane pola
      const filteredRows = selected.length
        ? rows.map((r) => {
            const obj = {};
            for (const key of selected) if (key in r) obj[key] = r[key];
            return obj;
          })
        : rows;

      res.json({ data: filteredRows });
    } catch (err) {
      console.error("❌ Error generating report:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
};
