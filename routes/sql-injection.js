require("dotenv").config();
const alasql = require('alasql');
const prefix = "sql-injection";

module.exports = [
  {
    method: 'GET',
    path: `/${prefix}/products`,
    handler: (request, h) => {
      const { category = '' } = request.query;

      const products = JSON.parse(process.env.SQL_INJECTION_PRODUCT_TABLE || '[]');
      const users = JSON.parse(process.env.SQL_INJECTION_USERS_TABLE || '[]');

      try {
        alasql('DROP TABLE IF EXISTS products');
        alasql('DROP TABLE IF EXISTS users');
        alasql('CREATE TABLE products (id INT, product STRING, price INT, category STRING)');
        alasql('CREATE TABLE users (username STRING, password STRING)');

        products.forEach(p => {
          alasql('INSERT INTO products VALUES (?, ?, ?, ?)', [p.ID, p.PRODUCT, p.PRICE, p.CATEGORY]);
        });

        users.forEach(u => {
          alasql('INSERT INTO users VALUES (?, ?)', [u.username, u.password]);
        });

        const sqlQuery = `SELECT id, product, price FROM products WHERE category = '${category}' AND price=1`.split('--')[0];

        // console.log('running', products, users, sqlQuery);
        const results = alasql(sqlQuery);
        if (results.length != 3 || results.filter(({ id }) => id).length > 1 || !results.every(({ id, product }) => id || product.includes('@'))) {
          results.forEach(result => {
            if (result.id > 10) {
              result.id = 'hidden';
              result.product = 'product name hidden';
              result.price = 'hidden';
            }
            if (result.product.includes('Password')) {
              result.product = 'user credentials hidden'
            }
          })
        }

        return h.response(results).code(200);

      } catch (error) {
        return h.response('Invalid Query').code(400);
      }
    },
  },
  {
    method: 'GET',
    path: `/${prefix}/login`,
    handler: (request, h) => {
      return `Queried: ${request.query.result}`;
    }
  }
];