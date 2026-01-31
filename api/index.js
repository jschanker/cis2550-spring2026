const Hapi = require("@hapi/hapi");
const path = require("path");
const fs = require("fs");

const init = async () => {
  const server = Hapi.server({
    port: 55688,
    routes: {
      cors: {
        origin: ["*"],
      },
    },
  });

  const routes = [];
  const routesPath = path.join(__dirname, "routes");

  fs.readdirSync(routesPath).forEach((fileName) =>
    routes.push(...require(path.join(routesPath, fileName))),
  );

  server.route(routes);

  await server.start();
  console.log("Server running on %s", server.info.uri);
};

process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

init();
