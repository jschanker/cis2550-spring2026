require("dotenv").config();
const crypto = require("crypto");
const prefix = "command-injection";

// Monkey-patching cat and ls to fix bug where permissions aren't being respected in the just-bash implementation
// --- Monkey Patch CAT ---
const monkeyPatchCat = (bash) => {
  const originalCat = bash.commands.get("cat");
  if (originalCat) {
    originalCat.execute = async (args, ctx) => {
      if (!args[0])
        return { stdout: "", stderr: "cat: missing operand\n", exitCode: 1 };
      const path = ctx.fs.resolvePath(ctx.cwd, args[0]);
      try {
        const stat = await ctx.fs.stat(path);

        // check for read permission
        if ((stat.mode & 0o400) === 0) {
          return {
            stdout: "",
            stderr: `cat: ${args[0]}: Permission denied\n`,
            exitCode: 1,
          };
        }
      } catch (e) {
        // throw new Error(`cat: ${args[0]}: No such file or directory`);
      }

      // If check passes, we can use the internal fs to read
      const content = await ctx.fs.readFile(path, "utf8");
      return { stdout: content + "\n", stderr: "", exitCode: 0 };
    };
  }
};

const applyReadOnlyPolicy = (bash) => {
  // Capture the original write methods
  const originalWriteFile = bash.fs.writeFile?.bind(bash.fs);
  const originalMkdir = bash.fs.mkdir?.bind(bash.fs);

  // Intercept writeFile (Used by > and >>)
  bash.fs.writeFile = async (path, content, options) => {
    const resolvedPath = bash.fs.resolvePath(bash.cwd, path);
    if (!resolvedPath.startsWith("/tmp")) {
      throw new Error(`-bash: ${path}: Read-only file system`);
    }
    return originalWriteFile(path, content, options);
  };

  // Intercept Mkdir
  if (originalMkdir) {
    bash.fs.mkdir = async (path, options) => {
      const resolvedPath = bash.fs.resolvePath(bash.cwd, path);
      if (!resolvedPath.startsWith("/tmp")) {
        throw new Error(
          `mkdir: cannot create directory ‘${path}’: Read-only file system`,
        );
      }
      return originalMkdir(path, options);
    };
  }
};

const formatMode = (mode, isDir) => {
  const chars = ["---", "--x", "-w-", "-wx", "r--", "r-x", "rw-", "rwx"];

  const owner = chars[(mode >> 6) & 7];
  const group = chars[(mode >> 3) & 7];
  const other = chars[mode & 7];

  return (isDir ? "d" : "-") + owner + group + other;
};

const timeout = (ms) =>
  new Promise((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(
            `Command took too long to run (Error code ${process.env.COMMAND_INJECTION_TIMEOUT_ERROR_CODE})`,
          ),
        ),
      ms,
    ),
  );
const sessions = new Map();
let ranLs = false; // Flag to indicate if 'ls' was run, so we know when to filter out the rootkit file from the output of 'ls -l'

module.exports = [
  {
    method: "POST",
    path: `/${prefix}/store-credentials`,
    handler: async (request, h) => {
      const { Bash, defineCommand } = await import("just-bash");
      //const x = new Bash({});
      //x.commands.get("cat").execute = cat;
      //console.log((await x.exec("ls")).stdout);
      let result, command;
      // --- Monkey Patch LS ---
      const monkeyPatchLs = (bash) => {
        const originalLs = bash.commands.get("ls");
        if (originalLs) {
          const originalExecute = originalLs.execute;

          originalLs.execute = async (args, ctx) => {
            ranLs = true;
            const result = await originalExecute(args, ctx);
            const isLong = args.some(
              (a) => a.startsWith("-") && a.includes("l"),
            );
            const targetArg = args.find((arg) => !arg.startsWith("-"));
            const searchBase = targetArg
              ? ctx.fs.resolvePath(ctx.cwd, targetArg)
              : ctx.cwd;

            if (isLong && result.stdout) {
              const lines = result.stdout.split("\n");
              //.filter((line) => !line.includes(process.env.HIDDEN_FILE_NAME));
              const patchedLines = await Promise.all(
                lines.map(async (line, index) => {
                  // lines.slice(0, index).reverse().find(line.split())
                  const match = line.match(/\s(\S+)$/);
                  if (line.startsWith("total") || !match) return line;

                  const fileName = match[1];
                  try {
                    // console.log("Checking permissions for:", fileName);
                    const fullPath = searchBase.endsWith(fileName)
                      ? searchBase
                      : ctx.fs.resolvePath(searchBase, fileName);
                    const exists = await ctx.fs.exists(fullPath);
                    if (!exists) return line; // + " (file not found)";
                    const stat = await ctx.fs.stat(fullPath);
                    const actualMode = formatMode(stat.mode, stat.isDirectory);
                    return line.replace(/^[d-][rwx-]{9}/, actualMode);
                  } catch (e) {
                    console.log(e);
                    return line; // Fallback to original if stat fails
                  }
                }),
              );

              result.stdout = patchedLines.join("\n");
            }
            return result;
          };
        }
      };
      const openssl = defineCommand("openssl", async (args, ctx) => {
        // openssl dgst -sha256
        if (args[0] === "dgst" && args[1] === "-sha256") {
          const hash = crypto
            .createHash("sha256")
            .update(ctx.stdin)
            .digest("hex");

          return {
            stdout: `${hash}\n`,
            stderr: "",
            exitCode: 0,
          };
        }

        return {
          stdout: "",
          stderr: "Error: Only 'dgst -sha256' is supported in this lab.\n",
          exitCode: 1,
        };
      });

      try {
        const { username, password, sessionId } = request.payload;
        if (!username || !password || sessionId.toString().length < 5) {
          throw new Error(
            "Username, password, and valid session id are required",
          );
        }

        ranLs = false; // Reset the flag on each command execution

        if (!sessions.get(sessionId)) {
          const bashInstance = new Bash({
            customCommands: [openssl],
            files: {
              "/var/lib/hashes.txt": "",
              "/home/jdoe/secret.txt": {
                content:
                  /*"Secret is " + */ process.env
                    .COMMAND_INJECTION_PROTECTED_SECRET,
                mode: 0o000,
              },
              /*"/home/jdoe/\x1b[1A\x1b[2Khidden_flag.txt":
                "CTF{terminal_wizardry}",*/
              [process.env.COMMAND_INJECTION_HIDDEN_ROOT_KIT_DIR +
              "/" +
              process.env.COMMAND_INJECTION_HIDDEN_FILE_NAME +
              "-ROOTKIT"]:
                //                "This is a hidden file with a secret value: " +
                process.env.COMMAND_INJECTION_HIDDEN_SECRET,
            },
          });
          monkeyPatchCat(bashInstance);
          monkeyPatchLs(bashInstance);
          applyReadOnlyPolicy(bashInstance);
          sessions.set(sessionId, bashInstance);
          // await sessions.get(sessionId).exec(`chmod 000 /home/jdoe/secret.txt`);
        }

        command = `echo -n "${username}:${password}" | openssl dgst -sha256 >> /var/lib/hashes.txt`;
        result = await Promise.race([
          sessions.get(sessionId).exec(command),
          timeout(3000),
        ]);

        return h
          .response({
            data: !ranLs
              ? result.stdout
              : result.stdout
                  ?.toString()
                  .split("\n")
                  .filter(
                    (line) =>
                      !line.includes(
                        process.env.COMMAND_INJECTION_HIDDEN_FILE_NAME,
                      ),
                  )
                  .join("\n"),
            error: result.stderr,
            command: command,
          })
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
