import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

function canRun(command) {
  const result = spawnSync(command, ["--version"], { encoding: "utf8", windowsHide: true });
  return result.status === 0;
}

export function findBrowser() {
  if (process.env.BROWSER_BIN && existsSync(process.env.BROWSER_BIN)) return process.env.BROWSER_BIN;
  const known = [];
  if (process.platform === "win32") {
    const roots = [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA].filter(Boolean);
    for (const root of roots) {
      known.push(`${root}\\Microsoft\\Edge\\Application\\msedge.exe`);
      known.push(`${root}\\Google\\Chrome\\Application\\chrome.exe`);
    }
  } else if (process.platform === "darwin") {
    known.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
    known.push("/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge");
    known.push("/Applications/Chromium.app/Contents/MacOS/Chromium");
  }
  for (const candidate of known) if (existsSync(candidate)) return candidate;
  for (const candidate of ["msedge", "chrome", "chromium", "chromium-browser", "google-chrome"]) {
    if (canRun(candidate)) return candidate;
  }
  return null;
}

function canRunMedia(command) {
  const result = spawnSync(command, ["-version"], { encoding: "utf8", windowsHide: true });
  return result.status === 0;
}


function canRunImageMagick(command) {
  const arg = command.toLowerCase().includes("magick") ? "-version" : "--version";
  const result = spawnSync(command, [arg], { encoding: "utf8", windowsHide: true });
  return result.status === 0;
}

export function findImageMagick() {
  if (process.env.IMAGEMAGICK_BIN && existsSync(process.env.IMAGEMAGICK_BIN)) return process.env.IMAGEMAGICK_BIN;
  for (const candidate of ["magick", "convert"]) {
    if (canRunImageMagick(candidate)) return candidate;
  }
  return null;
}

export async function renderSvgToPng({ imageMagick, svg, svgPath, pngPath, width, height }) {
  await mkdir(dirname(resolve(svgPath)), { recursive: true });
  await mkdir(dirname(resolve(pngPath)), { recursive: true });
  await writeFile(svgPath, svg, "utf8");
  const absolutePng = resolve(pngPath);
  const args = imageMagick.toLowerCase().includes("magick")
    ? [resolve(svgPath), absolutePng]
    : [resolve(svgPath), absolutePng];
  const result = spawnSync(imageMagick, args, { encoding: "utf8", windowsHide: true, timeout: 15_000 });
  if (result.status !== 0 || !existsSync(absolutePng)) {
    throw new Error(`ImageMagick PNG render failed for ${basename(svgPath)}: ${result.stderr || result.stdout || `exit ${result.status}`}`);
  }
  const dimensions = await readPngDimensions(absolutePng);
  if (dimensions.width !== width || dimensions.height !== height) {
    throw new Error(`PNG dimensions ${dimensions.width}x${dimensions.height} do not match expected ${width}x${height}`);
  }
  return { path: absolutePng, ...dimensions };
}
export function findFfmpeg() {
  if (process.env.FFMPEG_BIN && existsSync(process.env.FFMPEG_BIN)) return process.env.FFMPEG_BIN;
  return canRunMedia("ffmpeg") ? "ffmpeg" : null;
}

export function findFfprobe() {
  if (process.env.FFPROBE_BIN && existsSync(process.env.FFPROBE_BIN)) return process.env.FFPROBE_BIN;
  return canRunMedia("ffprobe") ? "ffprobe" : null;
}

export async function renderHtmlToPng({ browser, html, htmlPath, pngPath, width, height }) {
  await mkdir(dirname(resolve(htmlPath)), { recursive: true });
  await mkdir(dirname(resolve(pngPath)), { recursive: true });
  await writeFile(htmlPath, html, "utf8");
  const absolutePng = resolve(pngPath);
  const args = [
    "--headless",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    `--window-size=${width},${height}`,
    `--screenshot=${absolutePng}`,
    pathToFileURL(resolve(htmlPath)).href,
  ];
  const result = spawnSync(browser, args, { encoding: "utf8", windowsHide: true, timeout: 15_000 });
  if (result.status !== 0 || !existsSync(absolutePng)) {
    throw new Error(`Browser PNG render failed for ${basename(htmlPath)}: ${result.stderr || result.stdout || `exit ${result.status}`}`);
  }
  const dimensions = await readPngDimensions(absolutePng);
  if (dimensions.width !== width || dimensions.height !== height) {
    throw new Error(`PNG dimensions ${dimensions.width}x${dimensions.height} do not match expected ${width}x${height}`);
  }
  return { path: absolutePng, ...dimensions };
}

export async function readPngDimensions(path) {
  const data = await readFile(path);
  if (data.length < 24 || data.toString("hex", 0, 8) !== "89504e470d0a1a0a") {
    throw new Error(`Not a valid PNG: ${path}`);
  }
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

function concatPath(path) {
  return resolve(path).replaceAll("\\", "/").replaceAll("'", "'\\''");
}

export async function renderStoryboardToMp4({ ffmpeg, ffprobe, storyboard, scenePaths, outputPath, concatPathFile }) {
  if (scenePaths.length !== storyboard.scenes.length) throw new Error("Scene image count does not match storyboard");
  const lines = [];
  for (let index = 0; index < scenePaths.length; index += 1) {
    lines.push(`file '${concatPath(scenePaths[index])}'`);
    lines.push(`duration ${(storyboard.scenes[index].durationMs / 1000).toFixed(3)}`);
  }
  lines.push(`file '${concatPath(scenePaths.at(-1))}'`);
  await writeFile(concatPathFile, `${lines.join("\n")}\n`, "utf8");
  await mkdir(dirname(resolve(outputPath)), { recursive: true });
  const result = spawnSync(ffmpeg, [
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", resolve(concatPathFile),
    "-vf", `fps=${storyboard.fps},scale=${storyboard.width}:${storyboard.height}:flags=lanczos,format=yuv420p`,
    "-t", (storyboard.totalDurationMs / 1000).toFixed(3),
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    resolve(outputPath),
  ], { encoding: "utf8", windowsHide: true, timeout: 120_000 });
  if (result.status !== 0 || !existsSync(resolve(outputPath))) {
    throw new Error(`FFmpeg render failed: ${result.stderr || result.stdout || `exit ${result.status}`}`);
  }
  const probe = spawnSync(ffprobe, [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    resolve(outputPath),
  ], { encoding: "utf8", windowsHide: true });
  if (probe.status !== 0) throw new Error(`ffprobe failed: ${probe.stderr || probe.stdout}`);
  const durationSeconds = Number(probe.stdout.trim());
  if (!Number.isFinite(durationSeconds) || Math.abs(durationSeconds - storyboard.totalDurationMs / 1000) > 0.25) {
    throw new Error(`Rendered MP4 duration ${durationSeconds}s does not match storyboard ${storyboard.totalDurationMs / 1000}s`);
  }
  return { path: resolve(outputPath), durationSeconds };
}
