const express = require("express");
const router = express.Router();

module.exports.buildStatsOverviewRouter = (db) => {
  router.get("/overview", async (req, res) => {
    try {
      const queries = {
        users: "SELECT COUNT(*) AS count FROM users",
        pending_users: "SELECT COUNT(*) AS count FROM pending_users",
        admins: "SELECT COUNT(*) AS count FROM admins",
        books: "SELECT COUNT(*) AS count FROM books",
        book_questions: "SELECT COUNT(*) AS count FROM book_questions",
        book_answers: "SELECT COUNT(*) AS count FROM book_answers",
        messages: "SELECT COUNT(*) AS count FROM messages",
      };

      const results = {};
      for (const key in queries) {
        const row = await new Promise((resolve, reject) => {
          db.get(queries[key], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
        results[key] = row.count;
      }

      res.json(results);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
