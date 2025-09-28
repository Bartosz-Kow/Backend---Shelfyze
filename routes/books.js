const express = require("express");

const defaultQuestions = [
  "Historia była dla mnie łatwa do zrozumienia.",
  "Byłem(-am) zaangażowany(-a) w fabułę przez większość książki.",
  "Bohaterowie byli wiarygodni i realistyczni.",
  "Styl pisania autora był przystępny i przyjemny.",
  "Miałem(-am) ochotę kontynuować czytanie bez przerw.",
  "Książka wzbudziła we mnie silne emocje.",
  "Czułem(-am) więź z głównymi bohaterami.",
  "Były momenty, które mnie zaskoczyły lub wstrząsnęły.",
  "Humor/klimat książki odpowiadał mi.",
  "Treść książki skłoniła mnie do refleksji.",
  "Książka poszerzyła moją wiedzę lub horyzonty.",
  "Treści książki były inspirujące lub motywujące.",
  "Uważam, że książka miała głębsze przesłanie.",
  "Znalazłem(-am) w niej wartości, które są dla mnie istotne.",
  "Książka zmieniła mój sposób patrzenia na pewne sprawy.",
  "Książka była oryginalna w porównaniu do innych.",
  "Tempo akcji / narracji było odpowiednie.",
  "Chciał(a)bym polecić tę książkę znajomym.",
  "Chciał(a)bym przeczytać coś jeszcze od tego autora.",
  "Ogólnie jestem zadowolony(-a) z przeczytania tej książki.",
];

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

  // ➕ Dodaj książkę
  router.post("/", (req, res) => {
    if (!req.user || !req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
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

    if (Array.isArray(questions) && questions.length > 0) {
      for (const q of questions) {
        if (typeof q === "string" && q.trim()) {
          insertQuestion.run(bookId, q.trim());
        }
      }
    } else {
      for (const q of defaultQuestions) {
        insertQuestion.run(bookId, q);
      }
    }

    res.status(201).json({ bookId });
  });
  // 📌 Zapis progresu użytkownika
  router.post("/:bookId/progress", (req, res) => {
    console.log("📥 PROGRESS request", {
      params: req.params,
      body: req.body,
      user: req.user,
    });
    if (!req.user || !req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const bookId = Number(req.params.bookId);
    const { lastQuestionId } = req.body || {}; // 👈 tu fallback na pusty obiekt

    if (!Number.isInteger(bookId) || !Number.isInteger(lastQuestionId)) {
      return res.status(400).json({ error: "invalid ids" });
    }

    try {
      const existing = db
        .prepare(
          `SELECT id FROM book_progress WHERE book_id = ? AND user_id = ?`
        )
        .get(bookId, req.user.id);

      if (existing) {
        db.prepare(
          `
        UPDATE book_progress
        SET last_question_id = ?,
            answered_count = (SELECT COUNT(*) FROM book_answers WHERE book_id = ? AND user_id = ?),
            updated_at = ?
        WHERE book_id = ? AND user_id = ?
      `
        ).run(
          lastQuestionId,
          bookId,
          req.user.id,
          Date.now(),
          bookId,
          req.user.id
        );
      } else {
        db.prepare(
          `
        INSERT INTO book_progress (book_id, user_id, last_question_id, answered_count, updated_at)
        VALUES (?, ?, ?, 
          (SELECT COUNT(*) FROM book_answers WHERE book_id = ? AND user_id = ?),
          ?
        )
      `
        ).run(
          bookId,
          req.user.id,
          lastQuestionId,
          bookId,
          req.user.id,
          Date.now()
        );
      }

      res.json({ ok: true });
    } catch (e) {
      console.error("❌ Error saving progress:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.get("/:bookId/progress", (req, res) => {
    if (!req.user || !req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const bookId = Number(req.params.bookId);
    const row = db
      .prepare(
        `SELECT last_question_id, answered_count 
       FROM book_progress 
       WHERE book_id = ? AND user_id = ?`
      )
      .get(bookId, req.user.id);

    const total = db
      .prepare(`SELECT COUNT(*) as cnt FROM book_questions WHERE book_id = ?`)
      .get(bookId).cnt;

    const answered = row?.answered_count ?? 0;
    const progressPercent =
      total > 0 ? Math.round((answered / total) * 100) : 0;

    res.json({
      last_question_id: row?.last_question_id || null,
      answered_count: answered,
      total_questions: total,
      progress_percent: progressPercent,
    });
  });

  // 📖 Lista książek usera
  router.get("/", (req, res) => {
    if (!req.user || !req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const books = listBooksForUser.all(req.user.id);
    res.json(books);
  });

  // ❓ Pytania dla książki
  router.get("/:bookId/questions", (req, res) => {
    if (!req.user || !req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const bookId = Number(req.params.bookId);
    if (!Number.isInteger(bookId)) {
      return res.status(400).json({ error: "invalid bookId" });
    }

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

  // ✍️ Odpowiedź na pytanie
  router.post("/:bookId/questions/:questionId/answer", (req, res) => {
    console.log("📥 ANSWER request", {
      params: req.params,
      body: req.body,
      user: req.user,
    });
    if (!req.user || !req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
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

  // 🗑️ Usuń książkę całkowicie
  router.delete("/:bookId", (req, res) => {
    if (!req.user || !req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const bookId = Number(req.params.bookId);
    if (!Number.isInteger(bookId)) {
      return res.status(400).json({ error: "invalid bookId" });
    }

    try {
      const trx = db.transaction(() => {
        // usuń progres
        db.prepare(
          "DELETE FROM book_progress WHERE book_id = ? AND user_id = ?"
        ).run(bookId, req.user.id);

        // usuń odpowiedzi
        db.prepare(
          "DELETE FROM book_answers WHERE book_id = ? AND user_id = ?"
        ).run(bookId, req.user.id);

        // usuń pytania
        db.prepare("DELETE FROM book_questions WHERE book_id = ?").run(bookId);

        // usuń książkę
        const result = db
          .prepare("DELETE FROM books WHERE id = ? AND user_id = ?")
          .run(bookId, req.user.id);

        return result;
      });

      const result = trx();
      if (result.changes === 0) {
        return res.status(404).json({ error: "Book not found" });
      }

      return res.json({ success: true, message: "Book deleted with all data" });
    } catch (e) {
      console.error("❌ Error deleting book:", e);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

module.exports = { buildBooksRouter };
