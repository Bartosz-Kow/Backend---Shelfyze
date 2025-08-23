const express = require("express");
const app = express();
require("dotenv").config();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Serwer działa 🚀");
});

const db = require("./db/index");

const authMiddleware = require("./middleware/auth");
app.use(authMiddleware);

const registerRoutes = require("./routes/auth");
const loginRoutes = require("./routes/login");
const adminAuthRoutes = require("./routes/adminAuth");

app.use("/auth", registerRoutes);
app.use("/auth", loginRoutes);
app.use("/auth", adminAuthRoutes);

const { buildMessengerRouter } = require("./routes/messages");
app.use("/messenger", buildMessengerRouter(db));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serwer działa na porcie ${PORT}`);
});
