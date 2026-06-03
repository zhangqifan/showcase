import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = path.join(root, ".npm-cache");

const requiredPackages = ["@sveltejs/kit", "vite"];
const missingPackages = requiredPackages.filter((packageName) => {
  return !existsSync(path.join(root, "node_modules", ...packageName.split("/"), "package.json"));
});

if (missingPackages.length === 0) {
  process.exit(0);
}

console.log(`Missing dependencies: ${missingPackages.join(", ")}`);
console.log("Running npm ci...");

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npmCommand, ["ci", "--cache", cacheDir], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    npm_config_cache: cacheDir,
  },
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
