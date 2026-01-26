require("dotenv").config();
const alasql = require("alasql");
const prefix = "xss";
let entries = [];

module.exports = [
  {
    method: "POST",
    path: `/${prefix}/comments`,
    handler: (request, h) => {
      const { username, message } = request.payload;
      const messageWithoutScript = message.replace(
        /<script.*?>.*?<\/script>/gi,
        "",
      );
      try {
        alasql(
          "CREATE TABLE IF NOT EXISTS messages (id INT AUTOINCREMENT, username STRING, message STRING, timestamp STRING)",
        );
        alasql(
          "INSERT INTO messages (username, message, timestamp) VAlUES (?, ?, ?)",
          [username, messageWithoutScript, new Date().toISOString()],
        );
        entries = alasql("SELECT * FROM messages");

        return h
          .response({
            success: true,
          })
          .code(200);
      } catch (error) {
        return h
          .response({
            success: false,
            message: "Error processing message",
            error: error.message,
          })
          .code(400);
      }
    },
  },
  {
    method: "GET",
    path: `/${prefix}/comments`,
    handler: (request, h) => {
      return entries;
    },
  },
];
