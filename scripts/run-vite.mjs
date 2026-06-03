import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const command = process.argv[2];
const commandArgs = process.argv.slice(3);

if (!command) {
  console.error("Usage: node scripts/run-vite.mjs <dev|build|preview> [...args]");
  process.exit(1);
}

const nodePath = selectNodeRuntime();

run(process.execPath, [path.join(root, "scripts", "ensure-deps.mjs")]);

if (command === "dev" || command === "build") {
  run(nodePath, [path.join(root, "node_modules", "@sveltejs", "kit", "svelte-kit.js"), "sync"]);
}

run(nodePath, [path.join(root, "node_modules", "vite", "bin", "vite.js"), command, ...commandArgs]);

function selectNodeRuntime() {
  if (!isCodexBundledNode()) {
    return process.execPath;
  }

  for (const candidate of ["/usr/local/bin/node", "/opt/homebrew/bin/node"]) {
    if (existsSync(candidate) && candidate !== process.execPath) {
      return candidate;
    }
  }

  return process.execPath;
}

function isCodexBundledNode() {
  return process.platform === "darwin" && process.execPath.includes("/Applications/Codex.app/");
}

function run(executable, args) {
  const result = spawnSync(executable, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.signal) {
    process.kill(process.pid, result.signal);
    return;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
