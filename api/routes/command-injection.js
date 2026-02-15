require("dotenv").config();
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const prefix = "command-injection";
const rootDir = process.env.DIRECTORY_TRAVERSAL_ROOT || "root";
const simRootDir = fs.realpathSync(path.join(process.cwd(), rootDir));

function getPathWithRespectToSimRoot(dir) {
  const virtualNormalized = path.normalize(dir).replace(/^((\.\.)[/\\]?)+/, "");
  console.log(simRootDir, virtualNormalized);
  return path.join(simRootDir, virtualNormalized);
}

module.exports = [
  {
    method: "GET",
    path: `/${prefix}/store-credentials`,
    handler: (request, h) => {
      let { username, password } = request.query;
      let command = `echo -n "${username}:${password}" | openssl dgst -sha256 >> ${getPathWithRespectToSimRoot("var/lib/hashes.txt")}`;
      let error, stdout, stderr;
      return h.response({
        data: "Error saving credentials",
        error: "not available",
        command: command,
      });
      try {
        if (!username || !password) {
          throw new Error("Username and password are required");
        }
        const allowedCommandsAndSymbols = [
          "cd",
          "pwd",
          "whoami",
          "sleep",
          "chmod",
          "ls",
          "cat",
          "echo",
          ">",
          "|",
          "&",
          "#",
          "-lt",
          "-tl",
          "-l",
          "-t",
        ];
        username = username
          .split(/\s+/)
          .map((part) =>
            allowedCommandsAndSymbols.includes(part) || part.match(/^[0-9]+$/)
              ? part
              : getPathWithRespectToSimRoot(part),
          )
          .join(" ");
        password = password
          .split(/\s+/)
          .map((part) =>
            allowedCommandsAndSymbols.includes(part) || part.match(/^[0-9]+$/)
              ? part
              : getPathWithRespectToSimRoot(part),
          )
          .join(" ");
        if (
          `${username} ${password}`
            .trim()
            .split(/\s+/)
            .some(
              (part) =>
                (!allowedCommandsAndSymbols.includes(part) &&
                  !part.match(/^[0-9]+$/) &&
                  !getPathWithRespectToSimRoot(part).startsWith(simRootDir)) ||
                ["jdoe1", "jdoe2", "jdoe3", "jdoe4", "jdoe5"].some((u) =>
                  part.includes(u),
                ),
            )
        ) {
          throw new Error(
            `Command contains disallowed commands, symbols, or paths`,
          );
        }
        command = command.replace(/[\r\n]+/g, " ");
        const output = execSync(command, { timeout: 3000 });

        return h
          .response({ data: output.toString(), command: command })
          .code(200);
      } catch (error) {
        return h
          .response({
            data: "Error saving credentials",
            error: error.message,
            command: command,
          })
          .code(400);
      }
    },
  },
];
