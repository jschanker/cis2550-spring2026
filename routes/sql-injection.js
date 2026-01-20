require("dotenv").config();
const alasql = require("alasql");
const prefix = "sql-injection";

module.exports = [
  {
    method: "GET",
    path: `/${prefix}/products`,
    handler: (request, h) => {
      const { category = "" } = request.query;

      const products = JSON.parse(
        process.env.SQL_INJECTION_PRODUCT_TABLE || "[]",
      );
      const users = JSON.parse(process.env.SQL_INJECTION_USERS_TABLE || "[]");
      const sqlQuery =
        `SELECT id, product, price FROM products WHERE category = '${category}' AND price=1`.split(
          "--",
        )[0];

      try {
        alasql("DROP TABLE IF EXISTS products");
        alasql("DROP TABLE IF EXISTS users");
        alasql(
          "CREATE TABLE products (id INT, product STRING, price INT, category STRING)",
        );
        alasql("CREATE TABLE users (username STRING, password STRING)");

        products.forEach((p) => {
          alasql("INSERT INTO products VALUES (?, ?, ?, ?)", [
            p.ID,
            p.PRODUCT,
            p.PRICE,
            p.CATEGORY,
          ]);
        });

        users.forEach((u) => {
          alasql("INSERT INTO users VALUES (?, ?)", [u.username, u.password]);
        });

        // console.log('running', products, users, sqlQuery);
        const results = alasql(sqlQuery);
        if (
          results.length != 3 ||
          results.filter(({ id }) => id).length > 1 ||
          results.filter(({ product }) =>
            String(product).replace(/\s/g).startsWith("admin@"),
          ).length !== 1
        ) {
          results.forEach((result) => {
            if (result.id > 10) {
              result.id = "hidden";
              result.product = "product name hidden";
              result.price = "hidden";
            }
            if (result.product.includes("Password")) {
              result.product = "user credentials hidden";
            }
          });
        }

        results.push({ query: sqlQuery });

        return h.response(results).code(200);
      } catch (error) {
        return h
          .response([{ query: sqlQuery + " is an invalid Query" }])
          .code(400);
      }
    },
  },
  {
    method: "POST",
    path: `/${prefix}/login`,
    handler: (request, h) => {
      const { username, password } = request.payload;
      const sqlQuery =
        `SELECT username FROM products WHERE username = '${username}' AND password=${password}`.split(
          "--",
        )[0];
      try {
        alasql("DROP TABLE IF EXISTS logins");
        alasql("CREATE TABLE logins (username STRING, password STRING)");
        alasql("INSERT INTO logins VALUES (?, ?, ?, ?)", [
          "administrator",
          process.env.SQL_INJECTION_ADMIN_PASSWORD,
        ]);
        const results = alasql(sqlQuery);
        if (results.length === 1 && results[0].username === "administrator") {
          return h
            .response({
              success: true,
              query: sqlQuery,
              message:
                "Login as administrator successful. The secret is " +
                process.env.SQL_INJECTION_SECRET,
              query: sqlQuery,
            })
            .code(200);
        } else {
          return h
            .response({
              success: false,
              message: "Invalid credentials",
              query: sqlQuery,
            })
            .code(401);
        }
      } catch (error) {
        return h
          .response({
            success: false,
            query: sqlQuery,
            message: "Error processing login",
            error: error.message,
          })
          .code(400);
      }
    },
  },
];
