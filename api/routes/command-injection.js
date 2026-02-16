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
        // console.log(stat.mode);
        // check for read permission
        if ((stat.mode & 0o400) === 0) {
          return {
            stdout: "",
            stderr: `cat: ${args[0]}: Permission denied\n`,
            exitCode: 1,
          };
        }
      } catch (e) {}

      // If check passes, we can use the internal fs to read
      const content = await ctx.fs.readFile(path, "utf8");
      return { stdout: content + "\n", stderr: "", exitCode: 0 };
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

// --- Monkey Patch LS ---
const monkeyPatchLs = (bash) => {
  const originalLs = bash.commands.get("ls");
  if (originalLs) {
    const originalExecute = originalLs.execute;

    originalLs.execute = async (args, ctx) => {
      const result = await originalExecute(args, ctx);
      const isLong = args.some((a) => a.startsWith("-") && a.includes("l"));

      if (isLong && result.stdout) {
        const lines = result.stdout.split("\n");
        const patchedLines = await Promise.all(
          lines.map(async (line) => {
            const match = line.match(/\s(\S+)$/);
            if (!match) return line;

            const fileName = match[1];
            try {
              const fullPath = ctx.fs.resolvePath(ctx.cwd, fileName);
              const stat = await ctx.fs.stat(fullPath);

              const actualMode = formatMode(stat.mode, stat.isDirectory);

              // Replace the hardcoded start (e.g., "-rw-r--r--" or "drwxr-xr-x")
              // with our real mode bits
              return line.replace(/^[d-][rwx-]{9}/, actualMode);
            } catch (e) {
              // console.log(e);
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

const timeout = (ms) =>
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Command took too long to run")), ms),
  );
const sessions = new Map();
module.exports = [
  {
    method: "GET",
    path: `/${prefix}/store-credentials`,
    handler: async (request, h) => {
      const { Bash, defineCommand } = await import("just-bash");
      //const x = new Bash({});
      //x.commands.get("cat").execute = cat;
      //console.log((await x.exec("ls")).stdout);
      let result, command;
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
        const { username, password, sessionId } = request.query;
        if (!username || !password || sessionId.toString().length < 5) {
          throw new Error(
            "Username, password, and valid session id are required",
          );
        }

        if (!sessions.get(sessionId)) {
          const bashInstance = new Bash({
            customCommands: [openssl],
            files: {
              "/var/lib/hashes.txt": "",
              "/home/jdoe/secret.txt": {
                content:
                  "Secret is " + process.env.COMMAND_INJECTION_PROTECTED_SECRET,
                mode: 0o000,
              },
            },
          });
          monkeyPatchCat(bashInstance);
          monkeyPatchLs(bashInstance);
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
            data: result.stdout,
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
