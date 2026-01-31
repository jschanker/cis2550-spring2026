require("dotenv").config();
const fs = require("fs");
const path = require("path");
const prefix = "dir-traversal";
const rootDir = "root";
const simRootDir = fs.realpathSync(path.join(process.cwd(), rootDir));
const labDir = path.join(simRootDir, "var", "www", "images", "highres");

function getFiles(dir, fileList = []) {
  try {
    const fileDir = path.resolve(labDir, dir || ".");

    if (!fileDir.startsWith(simRootDir)) {
      throw new Error("Nice try, but you're still in the jail!");
    }

    const files = fs.readdirSync(fileDir, { withFileTypes: true });

    files.forEach((file) => {
      const name = path.join(dir, file.name);
      if (file.isDirectory()) {
        if (file.name !== "node_modules" && file.name !== ".git") {
          getFiles(name, fileList);
        }
      } else {
        fileList.push(path.join("/", name));
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
      const rootDir = request.query.root;
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
        const actualFilePath = path.resolve(labDir, filePath);

        if (!actualFilePath.startsWith(simRootDir)) {
          throw new Error("Nice try, but you're still in the jail!");
        }

        if (fs.statSync(actualFilePath).size > 250000) {
          throw new Error("File size exceeds 250KB limit");
        }
        const contents = fs.readFileSync(actualFilePath);
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
