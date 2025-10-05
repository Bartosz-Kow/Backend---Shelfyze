// routes/statsOverview.js
const express = require("express");
const router = express.Router();

/**
 * Dashboard Overview Stats
 * Returns single-number metrics for admin dashboard (users, books, messages, etc.)
 */
module.exports.buildStatsOverviewRouter = (db) => {
  router.get("/overview", (req, res) => {
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
        const row = db.prepare(queries[key]).get(); // ✅ sync call
        results[key] = row ? row.count : 0;
      }

      res.json(results);
    } catch (err) {
      console.error("Stats overview error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
