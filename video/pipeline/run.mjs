// npm script entry: runs pipeline/build.py with the web/.venv interpreter.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const videoDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const venv = join(videoDir, "..", ".venv");
const python = [join(venv, "Scripts", "python.exe"), join(venv, "bin", "python")].find(existsSync);
if (!python) {
  console.error("Missing web/.venv. Create it and install edge-tts, imageio-ffmpeg, numpy.");
  process.exit(1);
}

const result = spawnSync(python, [join(videoDir, "pipeline", "build.py"), ...process.argv.slice(2)], {
  cwd: videoDir,
  stdio: "inherit",
  env: { ...process.env, PYTHONIOENCODING: "utf-8" },
});
process.exit(result.status ?? 1);
