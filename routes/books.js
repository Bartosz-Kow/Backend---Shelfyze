const express = require("express");

function buildBooksRouter(db) {
  const router = express.Router();

  const now = () => Date.now();

  const insertBook = db.prepare(`
    INSERT INTO books (user_id, title, author, publisher, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertQuestion = db.prepare(`
    INSERT INTO book_questions (book_id, question_text)
    VALUES (?, ?)
  `);

  const insertAnswer = db.prepare(`
    INSERT INTO book_answers (book_id, question_id, user_id, answer, answered_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const listBooksForUser = db.prepare(`
    SELECT * FROM books WHERE user_id = ?
  `);

  const listQuestionsForBook = db.prepare(`
    SELECT * FROM book_questions WHERE book_id = ?
  `);

  const listAnswersForBook = db.prepare(`
    SELECT * FROM book_answers WHERE book_id = ? AND user_id = ?
  `);

  router.post("/books", (req, res) => {
    if (!req.user || req.user.role !== "user") {
      return res.status(403).json({ error: "only users can add books" });
    }
    const { title, author, publisher, questions } = req.body;

    if (!title || !author || !publisher) {
      return res
        .status(400)
        .json({ error: "title, author, publisher required" });
    }

    const result = insertBook.run(
      req.user.id,
      title.trim(),
      author.trim(),
      publisher.trim(),
      now()
    );
    const bookId = result.lastInsertRowid;

    if (Array.isArray(questions)) {
      for (const q of questions) {
        if (typeof q === "string" && q.trim()) {
          insertQuestion.run(bookId, q.trim());
        }
      }
    }

    res.status(201).json({ bookId });
  });

  router.get("/books", (req, res) => {
    if (!req.user || req.user.role !== "user") {
      return res.status(403).json({ error: "forbidden" });
    }
    const books = listBooksForUser.all(req.user.id);
    res.json(books);
  });

  router.get("/books/:bookId/questions", (req, res) => {
    const bookId = Number(req.params.bookId);
    if (!Number.isInteger(bookId))
      return res.status(400).json({ error: "invalid bookId" });

    const questions = listQuestionsForBook.all(bookId);
    const answers = listAnswersForBook.all(bookId, req.user.id);

    const merged = questions.map((q) => {
      const ans = answers.find((a) => a.question_id === q.id);
      return {
        ...q,
        answer: ans ? ans.answer : null,
      };
    });

    res.json(merged);
  });

  router.post("/books/:bookId/questions/:questionId/answer", (req, res) => {
    if (!req.user || req.user.role !== "user") {
      return res.status(403).json({ error: "forbidden" });
    }

    const bookId = Number(req.params.bookId);
    const questionId = Number(req.params.questionId);
    const { answer } = req.body;

    if (!Number.isInteger(bookId) || !Number.isInteger(questionId)) {
      return res.status(400).json({ error: "invalid ids" });
    }
    if (![1, 2, 3, 4, 5].includes(answer)) {
      return res.status(400).json({ error: "answer must be 1-5" });
    }

    insertAnswer.run(bookId, questionId, req.user.id, answer, now());
    res.json({ ok: true });
  });

  return router;
}

module.exports = { buildBooksRouter };
