import { cp, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(scriptPath), "..");
const npmCliPath = path.join(projectRoot, ".tools", "npm", "bin", "npm-cli.js");
const hasUnsafePathCharacters = /[#?]/.test(projectRoot);

const run = (cwd, ...args) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [npmCliPath, ...args], {
      cwd,
      stdio: "inherit",
      env: process.env
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`npm ${args.join(" ")} failed with exit code ${code ?? "unknown"}`));
    });
    child.on("error", reject);
  });

if (!hasUnsafePathCharacters) {
  await run(projectRoot, "run", "build:inner");
  process.exit(0);
}

const tempRoot = path.join(os.tmpdir(), "greenfire-range-build");

await rm(tempRoot, { recursive: true, force: true });
await mkdir(tempRoot, { recursive: true });

await cp(projectRoot, tempRoot, {
  recursive: true,
  filter: (source) => {
    const relative = path.relative(projectRoot, source);

    if (!relative) {
      return true;
    }

    const firstSegment = relative.split(path.sep)[0];
    return firstSegment !== ".git" && firstSegment !== "dist";
  }
});

await run(tempRoot, "run", "build:inner");

await rm(path.join(projectRoot, "dist"), { recursive: true, force: true });
await cp(path.join(tempRoot, "dist"), path.join(projectRoot, "dist"), { recursive: true });
