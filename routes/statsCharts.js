// routes/statsCharts.js
const express = require("express");
const router = express.Router();

/**
 * Dashboard Chart Data
 * Provides datasets for admin dashboard charts (user growth, book ratings, etc.)
 */
module.exports.buildStatsChartsRouter = (db) => {
  /**
   * Chart 1: New users over time (last 30 days)
   */
  router.get("/charts/users_growth", (req, res) => {
    const sql = `
      SELECT 
        strftime('%Y-%m-%d', userId, 'unixepoch') AS date,
        COUNT(*) AS count
      FROM users
      GROUP BY date
      ORDER BY date DESC
      LIMIT 30
    `;
    db.all(sql, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows.reverse()); // ensure chronological order
    });
  });

  /**
   * Chart 2: Top 5 books by average rating
   */
  router.get("/charts/book_ratings", (req, res) => {
    const sql = `
      SELECT 
        b.title, 
        ROUND(AVG(a.answer), 2) AS avg_rating
      FROM books b
      JOIN book_answers a ON b.id = a.book_id
      GROUP BY b.id
      ORDER BY avg_rating DESC
      LIMIT 5
    `;
    db.all(sql, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });

  return router;
};
