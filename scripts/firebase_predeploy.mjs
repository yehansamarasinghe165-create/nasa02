// Firebase Hosting predeploy hook: installs web deps (if missing) and builds web/dist.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.join(rootDir, "web");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const opts = { cwd: webDir, stdio: "inherit", shell: process.platform === "win32" };

if (!fs.existsSync(path.join(webDir, "node_modules"))) {
  execFileSync(npmCmd, ["ci", "--no-audit", "--no-fund"], opts);
}
execFileSync(npmCmd, ["run", "build"], opts);
