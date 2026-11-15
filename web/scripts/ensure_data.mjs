// Ensures web/public/data has the JSON files the frontend expects before dev/build.
// Never overwrites real model output (meta.sample === false).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(webDir, "public", "data");
const required = [
  "crops.json",
  "national.json",
  "backtest_2021.json",
  "outlook.json",
  "datasets.json",
  path.join("packs", "anuradhapura.json"),
];

const missing = required.filter((f) => !fs.existsSync(path.join(dataDir, f)));
if (missing.length === 0) {
  process.exit(0);
}

const nationalPath = path.join(dataDir, "national.json");
if (fs.existsSync(nationalPath)) {
  try {
    const nat = JSON.parse(fs.readFileSync(nationalPath, "utf8"));
    if (nat?.meta?.sample === false) {
      console.warn("Real data detected (meta.sample === false); skipping sample generation. Missing:", missing.join(", "));
      process.exit(0);
    }
  } catch {
    // Regenerate sample data if existing file is unreadable
  }
}

console.log("Generating sample data in web/public/data (missing:", missing.join(", ") + ")...");
execFileSync(process.execPath, [path.join("scripts", "make_sample.mjs")], { cwd: webDir, stdio: "inherit" });
