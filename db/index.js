const Database = require("better-sqlite3");
const db = new Database("database.db");
require("./users")(db);
require("./admins")(db);
require("./messages")(db);
module.exports = db;
