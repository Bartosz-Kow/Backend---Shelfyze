const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Serwer działa 🚀");
});

const registerRoutes = require("./routes/auth");
const loginRoutes = require("./routes/login");

app.use("/auth", registerRoutes);
app.use("/auth", loginRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serwer działa na porcie ${PORT}`);
});
