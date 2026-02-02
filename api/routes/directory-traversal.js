require("dotenv").config();
//const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const prefix = "dir-traversal";
const rootDir = process.env.DIRECTORY_TRAVERSAL_ROOT || "root";
const simRootDir = fs.realpathSync(path.join(process.cwd(), rootDir));
const virtualLabDir = path.join("/var", "www", "images", "icons");
const actualLabDir = getPathWithRespectToSimRoot(virtualLabDir);

function getPathWithRespectToSimRoot(dir) {
  const virtualNormalized = path.normalize(dir).replace(/^((\.\.)[/\\]?)+/, "");
  console.log(simRootDir, virtualNormalized);
  return path.join(simRootDir, virtualNormalized);
}

function getFiles(dir, includeDir = false) {
  dir = typeof dir === "string" ? dir : "./";
  try {
    const actualPath = getPathWithRespectToSimRoot(
      path.resolve(virtualLabDir, dir),
    );

    console.log("Accessing path:", actualPath);

    if (
      (fs.existsSync(actualPath) &&
        !fs.realpathSync(actualPath).startsWith(simRootDir)) ||
      (!fs.existsSync(actualPath) && !actualPath.startsWith(simRootDir))
    ) {
      throw new Error("Nice try, but you're still in the jail!");
    }

    if (!fs.existsSync(actualPath)) {
      throw new Error(`No such file or directory: ${dir}`);
    }

    const fileList = [];

    const files = fs.readdirSync(actualPath, { withFileTypes: true });

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
      try {
        let requestedPath = String(request.query.path || "./");
        if (requestedPath.includes("jdoe1") && path.isAbsolute(requestedPath)) {
          throw new Error("Absolute paths to jdoe1 are not allowed");
        } else if (
          requestedPath.includes("jdoe2") &&
          !path.isAbsolute(requestedPath)
        ) {
          throw new Error("Relative paths to jdoe2 are not allowed");
        } else if (requestedPath.includes("jdoe3")) {
          requestedPath = requestedPath.replace(/\.\.[\/\\]/g, "");
          if (path.isAbsolute(requestedPath)) {
            throw new Error("Absolute paths to jdoe3 are not allowed");
          }
        } else if (requestedPath.includes("jdoe4")) {
          requestedPath = decodeURIComponent(
            requestedPath.replace(/\./g, "%252e").replace(/\//g, "%252f"),
          );
          if (path.isAbsolute(requestedPath)) {
            throw new Error("Absolute paths to jdoe4 are not allowed");
          }
        } else if (requestedPath.includes("jdoe5")) {
          requestedPath = (requestedPath + ".svg").split("\0")[0];
        }
        const actualFilePath = getPathWithRespectToSimRoot(
          path.resolve(virtualLabDir, requestedPath || "./"),
        );
        if (
          (fs.existsSync(actualFilePath) &&
            !fs.realpathSync(actualFilePath).startsWith(simRootDir)) ||
          (!fs.existsSync(actualFilePath) &&
            !actualFilePath.startsWith(simRootDir))
        ) {
          throw new Error("Nice try, but you're still in the jail!");
        }

        if (!fs.existsSync(actualFilePath)) {
          throw new Error(
            `No such file or directory: ${requestedPath || "./"}`,
          );
        }

        //        const actualFilePath = fs.realpathSync(resolvedPath);

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
