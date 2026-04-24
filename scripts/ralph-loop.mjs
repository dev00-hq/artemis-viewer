import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { chromium } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const artifactsDir = path.join(root, "artifacts");
const referencePath = path.join(root, "reference", "artemis-academic-proposal.png");
const currentPath = path.join(artifactsDir, "ralph-current.png");
const diffPath = path.join(artifactsDir, "ralph-diff.png");
const sideBySidePath = path.join(artifactsDir, "ralph-side-by-side.png");
const reportPath = path.join(artifactsDir, "ralph-report.json");
const args = new Map(
  process.argv.slice(2).map((arg, index, all) => {
    if (!arg.startsWith("--")) return [arg, true];
    const [key, inline] = arg.slice(2).split("=");
    return [key, inline ?? all[index + 1]];
  })
);
const target = Number(args.get("target") || 80);
const port = Number(args.get("port") || 5174);
await mkdir(artifactsDir, { recursive: true });
const referenceMeta = PNG.sync.read(await readFile(referencePath));
const viewport = { width: referenceMeta.width, height: referenceMeta.height };

const server = startServer(port);
try {
  await waitForServer(`http://127.0.0.1:${port}`);
  await captureApp(`http://127.0.0.1:${port}`);
  const report = await compareScreenshots();
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  printReport(report);
  process.exitCode = report.score >= target ? 0 : 1;
} finally {
  server.kill("SIGTERM");
}

function startServer(serverPort) {
  const npmExec = process.env.npm_execpath || path.join(root, ".tools", "npm", "bin", "npm-cli.js");
  const child = spawn(process.execPath, [npmExec, "run", "dev", "--", "--port", String(serverPort), "--strictPort"], {
    cwd: root,
    env: { ...process.env, BROWSER: "none" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => process.stdout.write(`[vite] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[vite] ${chunk}`));
  child.on("exit", (code) => {
    if (code && code !== 143 && code !== null) {
      console.error(`Vite exited with code ${code}`);
    }
  });
  return child;
}

async function waitForServer(url) {
  const started = Date.now();
  while (Date.now() - started < 30000) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function captureApp(url) {
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("artemis-three-time", "42");
    localStorage.setItem("artemis-three-view", "cinematic");
    localStorage.setItem("artemis-three-playing", "false");
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("#game canvas");
  await page.waitForFunction(() => {
    const canvas = document.querySelector("#game canvas");
    return canvas && canvas.width > 500 && canvas.height > 300;
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: currentPath, fullPage: false, animations: "disabled" });
  await browser.close();
}

async function launchBrowser() {
  try {
    return await chromium.launch();
  } catch (error) {
    const message = String(error?.message || error);
    if (!message.includes("Executable doesn't exist")) throw error;
    return chromium.launch({ channel: "chrome" });
  }
}

async function compareScreenshots() {
  const reference = PNG.sync.read(await readFile(referencePath));
  const current = PNG.sync.read(await readFile(currentPath));
  if (reference.width !== current.width || reference.height !== current.height) {
    throw new Error(`Screenshot size mismatch. Reference is ${reference.width}x${reference.height}; current is ${current.width}x${current.height}.`);
  }
  const diff = new PNG({ width: reference.width, height: reference.height });
  const mismatchedPixels = pixelmatch(reference.data, current.data, diff.data, reference.width, reference.height, {
    threshold: 0.18,
    includeAA: false,
  });
  const totalPixels = reference.width * reference.height;
  const mismatchRatio = mismatchedPixels / totalPixels;
  const score = Number(Math.max(0, (100 * (1 - mismatchRatio))).toFixed(2));
  await writeFile(diffPath, PNG.sync.write(diff));
  await writeFile(sideBySidePath, PNG.sync.write(makeSideBySide(reference, current, diff)));
  return {
    target,
    score,
    status: score >= target ? "ready for user review" : score >= 50 ? "review needed" : "expectation check needed",
    mismatchRatio: Number(mismatchRatio.toFixed(5)),
    mismatchedPixels,
    totalPixels,
    viewport,
    files: {
      reference: referencePath,
      current: currentPath,
      diff: diffPath,
      sideBySide: sideBySidePath,
      report: reportPath,
    },
  };
}

function makeSideBySide(reference, current, diff) {
  const gutter = 18;
  const width = reference.width * 3 + gutter * 2;
  const height = reference.height;
  const out = new PNG({ width, height });
  fill(out, 7, 10, 15, 255);
  blit(reference, out, 0, 0);
  blit(current, out, reference.width + gutter, 0);
  blit(diff, out, reference.width * 2 + gutter * 2, 0);
  return out;
}

function blit(source, targetPng, offsetX, offsetY) {
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const sourceIndex = (source.width * y + x) << 2;
      const targetIndex = (targetPng.width * (y + offsetY) + x + offsetX) << 2;
      targetPng.data[targetIndex] = source.data[sourceIndex];
      targetPng.data[targetIndex + 1] = source.data[sourceIndex + 1];
      targetPng.data[targetIndex + 2] = source.data[sourceIndex + 2];
      targetPng.data[targetIndex + 3] = source.data[sourceIndex + 3];
    }
  }
}

function fill(png, red, green, blue, alpha) {
  for (let index = 0; index < png.data.length; index += 4) {
    png.data[index] = red;
    png.data[index + 1] = green;
    png.data[index + 2] = blue;
    png.data[index + 3] = alpha;
  }
}

function printReport(report) {
  console.log(`\nRalph visual score: ${report.score} / 100`);
  console.log(`Target: ${report.target}`);
  console.log(`Status: ${report.status}`);
  console.log(`Current: ${report.files.current}`);
  console.log(`Diff: ${report.files.diff}`);
  console.log(`Review: ${report.files.sideBySide}`);
  if (report.score < report.target) {
    console.log("\nScore is below target. Inspect the review image, adjust the UI/scene holistically, then rerun npm run ralph.");
  }
}
