require("dotenv").config();
const alasql = require("alasql");
const prefix = "dir-traversal";
const fs = require("fs");
const path = require("path");

function getFiles(dir, fileList = []) {
  try {
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
  } catch (error) {
    return { error: error.message };
  }
}

module.exports = [
  {
    method: "GET",
    path: `/${prefix}/files`,
    handler: (request, h) => {
      const rootDir = request.query.root || process.cwd();
      const allFiles = getFiles(rootDir);
      if (allFiles.error) {
        console.log(allFiles.error);
        return h
          .response({
            message: "Error retrieving directory structure",
            error: allFiles.error,
          })
          .code(400);
      }
      return h
        .response({
          message: "Directory Structure Retrieved",
          root: rootDir,
          tree: allFiles,
        })
        .code(200);
    },
  },
  {
    method: "GET",
    path: `/${prefix}/read`,
    handler: (request, h) => {
      const filePath = request.query.path;
      try {
        if (fs.statSync(filePath).size > 250000) {
          throw new Error("File size exceeds 250KB limit");
        }
        const contents = fs.readFileSync(filePath);
        return h
          .response({
            data: contents,
          })
          .code(200);
      } catch (error) {
        return h
          .response({
            data: "Error reading file",
            error: error.message,
          })
          .code(400);
      }
    },
  },
];
