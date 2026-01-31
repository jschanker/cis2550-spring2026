require("dotenv").config();
const alasql = require("alasql");
const prefix = "dir-traversal";
const fs = require("fs");
const path = require("path");

function getFiles(dir, fileList = []) {
  const rootDir = process.cwd();
  const files = fs.readdirSync(dir || rootDir);
  files.forEach((file) => {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      if (file !== "node_modules" && file !== ".git") {
        getFiles(name, fileList);
      }
    } else {
      fileList.push(name.replace(rootDir, ""));
    }
  });
  return fileList;
}

module.exports = [
  {
    method: "GET",
    path: `/${prefix}/files`,
    handler: (request, h) => {
      const rootDir = request.query.root || process.cwd();
      const allFiles = getFiles(rootDir);
      return h
        .response({
          message: "Directory Structure Retrieved",
          root: rootDir,
          tree: allFiles,
        })
        .code(200);
    },
  },
];
