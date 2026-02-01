require("dotenv").config();
//const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const prefix = "dir-traversal";
const rootDir = "root";
const simRootDir = fs.realpathSync(path.join(process.cwd(), rootDir));
const labDir = path.join(simRootDir, "var", "www", "images", "icons");

function getFiles(dir, includeDir = false) {
  dir = typeof dir === "string" ? dir : "";
  try {
    const requestedPath = path.resolve(labDir, dir);
    const relativeFromSimRoot = path.relative(simRootDir, requestedPath);
    const virtualRelativePath = relativeFromSimRoot.replace(
      /^((\.\.)[/\\]?)+/,
      "",
    );
    // console.log("Resolved path:", relativeFromSimRoot, virtualRelativePath);
    const resolvedPath = path.resolve(simRootDir, virtualRelativePath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`No such file or directory: ${dir}`);
    }
    const fileDir = fs.realpathSync(resolvedPath);

    if (!fileDir.startsWith(simRootDir)) {
      throw new Error("Nice try, but you're still in the jail!");
    }
    const fileList = [];

    /*
    let fileDir = fs.realpathSync(path.resolve(labDir, dir));

    if (!fileDir.startsWith(simRootDir)) {
      const startIndex = Array.from(fileDir).findIndex(
        (c, i) => c !== simRootDir[i],
      );
      fileDir = path.join(simRootDir, fileDir.slice(startIndex));
    }
*/
    const files = fs.readdirSync(fileDir, { withFileTypes: true });

    for (const file of files) {
      const name = path.join(dir, file.name);
      if (file.isDirectory()) {
        if (file.name !== "node_modules" && file.name !== ".git") {
          const dirReadResult = getFiles(name, true);
          if (dirReadResult.error) {
            return dirReadResult;
          }
          fileList.push(...dirReadResult.files);
        }
      } else {
        fileList.push(path.join("/", name));
      }
    }

    return {
      files: includeDir
        ? fileList
        : fileList.map((fullPath) => {
            if (dir === "" || dir === "/" || dir === ".") return fullPath;
            const prefix = path.join("/", dir, "/");
            return fullPath.startsWith(prefix)
              ? fullPath.replace(prefix, "")
              : fullPath.replace(path.join("/", dir), "");
          }),
      error: null,
    };
  } catch (error) {
    return { files: [], error: error.message };
  }
}

module.exports = [
  {
    method: "GET",
    path: `/${prefix}/files`,
    handler: (request, h) => {
      const dir = request.query.root;
      const allFiles = getFiles(dir);
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
        /*
        const tree = execSync("ls -RF ./root", { encoding: "utf8" });
        console.log("--- Physical Directory Tree ---");
        console.log(tree);
        console.log("-------------------------------");
        */
        const requestedPath = path.resolve(labDir, filePath);
        const relativeFromSimRoot = path.relative(simRootDir, requestedPath);
        const virtualRelativePath = relativeFromSimRoot.replace(
          /^((\.\.)[/\\]?)+/,
          "",
        );
        const resolvedPath = path.resolve(simRootDir, virtualRelativePath);
        console.log(
          simRootDir,
          labDir,
          filePath,
          requestedPath,
          relativeFromSimRoot,
          virtualRelativePath,
          resolvedPath,
        );
        if (!fs.existsSync(resolvedPath)) {
          throw new Error(`No such file or directory: ${relativeFromSimRoot}`);
        }
        const actualFilePath = fs.realpathSync(resolvedPath);

        if (!actualFilePath.startsWith(simRootDir)) {
          throw new Error("Nice try, but you're still in the jail!");
        }

        if (fs.statSync(actualFilePath).size > 250000) {
          throw new Error("File size exceeds 250KB limit");
        }
        const contents = fs.readFileSync(actualFilePath);
        const ext = path.extname(actualFilePath).toLowerCase();
        const mimeTypes = {
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".gif": "image/gif",
          ".svg": "image/svg+xml",
        };

        return h
          .response(contents)
          .type(mimeTypes[ext] || "application/octet-stream")
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
