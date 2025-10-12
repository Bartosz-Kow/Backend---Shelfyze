// index.js
const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();

// Middleware JSON
app.use(express.json());

// ✅ Konfiguracja CORS – musi być PRZED routes i middleware JWT
app.use(
  cors({
    origin: true, // lub '*' jeśli nie używasz credentials
    credentials: true,
  })
);

// ✅ Testowy endpoint bazowy
app.get("/", (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  res.json({
    message: "Serwer działa 🚀",
    baseUrl,
  });
});

// ✅ Inicjalizacja bazy danych
const db = require("./db/index");

// ✅ Tworzenie domyślnego admina
const initAdmin = require("./routes/initAdmin");
(async () => {
  try {
    await initAdmin();
  } catch (e) {
    console.warn("⚠️ Init admin warning:", e.message);
  }
})();

// ✅ PUBLICZNE ROUTES (bez JWT)
const reportRouter = require("./routes/report")(db);
app.use("/admin", reportRouter);

const buildPushRouter = require("./routes/push");
app.use("/api", buildPushRouter(db));

const pushRegisterRouter = require("./routes/pushRegister")(db);
app.use("/api", pushRegisterRouter);

// 🔑 Middleware JWT (chroni wszystko poniżej)
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

// 🔑 Users routes
const { buildUsersRouter } = require("./routes/users");
app.use("/users", buildUsersRouter(db));

// 🔑 Statystyki
const { buildStatsOverviewRouter } = require("./routes/statsOverview");
const { buildStatsChartsRouter } = require("./routes/statsCharts");
app.use("/admin/stats", buildStatsOverviewRouter(db));
app.use("/admin/stats", buildStatsChartsRouter(db));

const statsRouter = require("./routes/stats")(db);
app.use("/admin/stats", statsRouter);

// ✅ Uruchomienie serwera
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serwer działa na porcie ${PORT}`);
});
