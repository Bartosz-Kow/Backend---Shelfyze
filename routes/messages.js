const express = require("express");

function buildMessengerRouter(db) {
  const router = express.Router();

  function requireAuth(req, res, next) {
    if (!req.user) return res.status(401).json({ error: "unauthorized" });
    next();
  }

  function requireRole(role) {
    return (req, res, next) => {
      if (!req.user || req.user.role !== role) {
        return res.status(403).json({ error: "forbidden" });
      }
      next();
    };
  }

  const nowMs = () => Date.now();

  // --- prepared statements ---
  const insertMessageUserToAdmin = db.prepare(`
    INSERT INTO messages (
      sender_user_id, receiver_admin_id, content, sent_at, is_read
    ) VALUES (?, ?, ?, ?, 0)
  `);

  const insertMessageAdminToUser = db.prepare(`
    INSERT INTO messages (
      sender_admin_id, receiver_user_id, content, sent_at, is_read
    ) VALUES (?, ?, ?, ?, 0)
  `);

  const markReadById = db.prepare(`
    UPDATE messages
       SET is_read = 1, read_at = ?
     WHERE id = ?
       AND (
         -- user can only mark messages they received
         (receiver_user_id = @meUserId) OR
         (receiver_admin_id = @meAdminId)
       )
  `);

  const getMessageById = db.prepare(`SELECT * FROM messages WHERE id = ?`);

  // Conversation list (for a user: list admins they spoke with; for an admin: list users)
  const listPartnersForUser = db.prepare(`
    SELECT a.adminId AS partnerId, a.username AS partnerName,
           MAX(m.sent_at) AS lastMessageAt,
           SUM(CASE WHEN m.receiver_user_id = @me AND m.is_read = 0 THEN 1 ELSE 0 END) AS unread
      FROM admins a
      JOIN messages m
        ON (m.sender_user_id = @me AND m.receiver_admin_id = a.adminId)
        OR (m.sender_admin_id = a.adminId AND m.receiver_user_id = @me)
  GROUP BY a.adminId
  ORDER BY lastMessageAt DESC NULLS LAST
  `);

  const listPartnersForAdmin = db.prepare(`
    SELECT u.userId AS partnerId, u.username AS partnerName,
           MAX(m.sent_at) AS lastMessageAt,
           SUM(CASE WHEN m.receiver_admin_id = @me AND m.is_read = 0 THEN 1 ELSE 0 END) AS unread
      FROM users u
      JOIN messages m
        ON (m.sender_user_id = u.userId AND m.receiver_admin_id = @me)
        OR (m.sender_admin_id = @me AND m.receiver_user_id = u.userId)
  GROUP BY u.userId
  ORDER BY lastMessageAt DESC NULLS LAST
  `);

  // Message history between current user and a partner (admin or user)
  const listMessagesUserWithAdmin = db.prepare(`
    SELECT * FROM messages
     WHERE (sender_user_id = @me AND receiver_admin_id = @partner)
        OR (sender_admin_id = @partner AND receiver_user_id = @me)
       AND (@before IS NULL OR sent_at < @before)
     ORDER BY sent_at DESC
     LIMIT @limit
  `);

  const listMessagesAdminWithUser = db.prepare(`
    SELECT * FROM messages
     WHERE (sender_admin_id = @me AND receiver_user_id = @partner)
        OR (sender_user_id = @partner AND receiver_admin_id = @me)
       AND (@before IS NULL OR sent_at < @before)
     ORDER BY sent_at DESC
     LIMIT @limit
  `);

  const countUnreadForMe = db.prepare(`
    SELECT (
      SELECT COUNT(*) FROM messages WHERE receiver_user_id = @meUser AND is_read = 0
    ) AS userUnread,
    (
      SELECT COUNT(*) FROM messages WHERE receiver_admin_id = @meAdmin AND is_read = 0
    ) AS adminUnread
  `);

  const markReadUpTo = db.prepare(`
    UPDATE messages
       SET is_read = 1, read_at = @now
     WHERE is_read = 0
       AND (
         (receiver_user_id = @meUser AND sender_admin_id = @partnerAdmin)
         OR
         (receiver_admin_id = @meAdmin AND sender_user_id = @partnerUser)
       )
       AND (sent_at <= @until)
  `);

  // --- routes ---

  // Send a message (user -> admin) or (admin -> user)
  router.post("/messages", requireAuth, (req, res) => {
    const { content, toAdminId, toUserId } = req.body || {};
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "content required" });
    }

    const sent_at = nowMs();
    let result;

    if (req.user.role === "user") {
      if (!toAdminId)
        return res.status(400).json({ error: "toAdminId required for users" });
      result = insertMessageUserToAdmin.run(
        req.user.id,
        toAdminId,
        content.trim(),
        sent_at
      );
    } else if (req.user.role === "admin") {
      if (!toUserId)
        return res.status(400).json({ error: "toUserId required for admins" });
      result = insertMessageAdminToUser.run(
        req.user.id,
        toUserId,
        content.trim(),
        sent_at
      );
    } else {
      return res.status(403).json({ error: "invalid role" });
    }

    return res.status(201).json({ id: result.lastInsertRowid, sent_at });
  });

  // List conversation partners (with unread counts)
  router.get("/conversations", requireAuth, (req, res) => {
    if (req.user.role === "user") {
      const rows = listPartnersForUser.all({ me: req.user.id });
      return res.json(rows);
    }
    if (req.user.role === "admin") {
      const rows = listPartnersForAdmin.all({ me: req.user.id });
      return res.json(rows);
    }
    return res.status(403).json({ error: "invalid role" });
  });

  // Get messages in a conversation with a specific partner
  // For users: :partnerId is adminId
  // For admins: :partnerId is userId
  router.get("/conversations/:partnerId/messages", requireAuth, (req, res) => {
    const partnerId = Number(req.params.partnerId);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const before = req.query.before ? Number(req.query.before) : null; // paginate backwards by sent_at

    if (!Number.isInteger(partnerId) || partnerId <= 0) {
      return res.status(400).json({ error: "invalid partnerId" });
    }

    if (req.user.role === "user") {
      const rows = listMessagesUserWithAdmin.all({
        me: req.user.id,
        partner: partnerId,
        limit,
        before,
      });
      return res.json(rows.reverse()); // chronological ascending for UI
    }
    if (req.user.role === "admin") {
      const rows = listMessagesAdminWithUser.all({
        me: req.user.id,
        partner: partnerId,
        limit,
        before,
      });
      return res.json(rows.reverse());
    }
    return res.status(403).json({ error: "invalid role" });
  });

  // Mark a single message as read (only if you are the receiver)
  router.patch("/messages/:id/read", requireAuth, (req, res) => {
    const messageId = Number(req.params.id);
    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json({ error: "invalid id" });
    }
    const meUserId = req.user.role === "user" ? req.user.id : null;
    const meAdminId = req.user.role === "admin" ? req.user.id : null;

    const info = markReadById.run(
      { "@meUserId": meUserId, "@meAdminId": meAdminId },
      nowMs(),
      messageId
    );
    if (info.changes === 0) {
      // either not found, or you are not the receiver
      return res.status(404).json({ error: "not found" });
    }
    return res.json({ ok: true });
  });

  // Bulk mark as read up to a timestamp per-conversation (useful when opening a chat)
  router.post("/conversations/:partnerId/read", requireAuth, (req, res) => {
    const partnerId = Number(req.params.partnerId);
    const until = Number(req.body?.until) || nowMs();
    const now = nowMs();

    if (!Number.isInteger(partnerId) || partnerId <= 0) {
      return res.status(400).json({ error: "invalid partnerId" });
    }

    if (req.user.role === "user") {
      const info = markReadUpTo.run({
        "@now": now,
        "@meUser": req.user.id,
        "@partnerAdmin": partnerId,
        "@meAdmin": null,
        "@partnerUser": null,
        "@until": until,
      });
      return res.json({ changed: info.changes });
    }
    if (req.user.role === "admin") {
      const info = markReadUpTo.run({
        "@now": now,
        "@meAdmin": req.user.id,
        "@partnerUser": partnerId,
        "@meUser": null,
        "@partnerAdmin": null,
        "@until": until,
      });
      return res.json({ changed: info.changes });
    }
    return res.status(403).json({ error: "invalid role" });
  });

  // Unread counters (global)
  router.get("/unread-count", requireAuth, (req, res) => {
    const counts = countUnreadForMe.get({
      meUser: req.user.role === "user" ? req.user.id : null,
      meAdmin: req.user.role === "admin" ? req.user.id : null,
    });
    const total =
      req.user.role === "user" ? counts.userUnread : counts.adminUnread;
    res.json({ total });
  });

  // (Optional) simple health check
  router.get("/_health", (req, res) => res.json({ ok: true }));

  return router;
}

module.exports = { buildMessengerRouter };
