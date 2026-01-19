const prefix = "sql-injection";
module.exports = [
  {
    method: 'GET',
    path: `/${prefix}/login`,
    handler: (request, h) => {
      return `Queried: ${request.query.result}`;
    },
  },
  {
    method: 'GET',
    path: `/${prefix}/products`,
    handler: (request, h) => {
      return `Queried: ${request.query.result}`;
    }
  }
];