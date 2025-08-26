const express = require("express");
const app = express();
require("dotenv").config();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Serwer działa 🚀");
});

const db = require("./db/index");

const initAdmin = require("./routes/initAdmin");
(async () => {
  try {
    await initAdmin();
  } catch (e) {
    console.warn("⚠️ Init admin warning:", e.message);
  }
})();

// 🔑 Middleware JWT
const authMiddleware = require("./middleware/auth");
app.use(authMiddleware);

// 🔑 Auth routes
const registerRoutes = require("./routes/auth");
const loginRoutes = require("./routes/login");
const adminAuthRoutes = require("./routes/adminAuth");

app.use("/auth", registerRoutes);
app.use("/auth", loginRoutes);
app.use("/auth", adminAuthRoutes);

// 🔑 Messenger routes
const { buildMessengerRouter } = require("./routes/messages");
app.use("/messenger", buildMessengerRouter(db));

// 🔑 Books routes
const { buildBooksRouter } = require("./routes/books");
app.use("/books", buildBooksRouter(db));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serwer działa na porcie ${PORT}`);
});
