const express = require("express");

function buildUsersRouter(db) {
  const router = express.Router();

  // PATCH /users/username -> zmiana nazwy użytkownika
  router.patch("/username", (req, res) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const userId = req.user.id;
    const { username } = req.body;

    if (!username || typeof username !== "string" || username.length < 3) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid username" });
    }

    try {
      const stmt = db.prepare("UPDATE users SET username = ? WHERE userId = ?");
      const result = stmt.run(username, userId);

      if (result.changes === 0) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      return res.json({ success: true, username });
    } catch (e) {
      console.error("❌ Error updating username:", e);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  });

  // DELETE /users -> usuń konto i powiązane dane
  router.delete("/", (req, res) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const userId = req.user.id;

    try {
      // Najpierw usuń powiązane dane, żeby nie blokowały FK
      db.prepare("DELETE FROM book_answers WHERE user_id = ?").run(userId);
      db.prepare("DELETE FROM books WHERE user_id = ?").run(userId);

      // Na końcu usuń użytkownika
      const stmt = db.prepare("DELETE FROM users WHERE userId = ?");
      const result = stmt.run(userId);

      if (result.changes === 0) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      return res.json({
        success: true,
        message: "Account and related data deleted",
      });
    } catch (e) {
      console.error("❌ Error deleting user:", e);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  });

  return router;
}

module.exports = { buildUsersRouter };
