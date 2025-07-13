const Database = require("better-sqlite3");
const db = new Database("database.db");
require("./users")(db);
module.exports = db;
