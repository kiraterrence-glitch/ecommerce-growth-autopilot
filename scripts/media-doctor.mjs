import { spawnSync } from "node:child_process";
import { findBrowser, findFfmpeg, findFfprobe, findImageMagick } from "./media-tools.mjs";

function version(command) {
  const isMedia = /ffmpeg|ffprobe/i.test(command);
  const isMagick = /magick|convert/i.test(command);
  const arg = isMedia || isMagick ? "-version" : "--version";
  const result = spawnSync(command, [arg], { encoding: "utf8", windowsHide: true });
  return (result.stdout || result.stderr || "unknown").split(/\r?\n/)[0].trim();
}

const browser = findBrowser();
const imageMagick = findImageMagick();
const ffmpeg = findFfmpeg();
const ffprobe = findFfprobe();
const rows = [
  ["Browser", browser, browser ? version(browser) : "not found"],
  ["ImageMagick", imageMagick, imageMagick ? version(imageMagick) : "not found"],
  ["FFmpeg", ffmpeg, ffmpeg ? version(ffmpeg) : "not found"],
  ["ffprobe", ffprobe, ffprobe ? version(ffprobe) : "not found"],
];
for (const [label, command, detail] of rows) {
  const optional = label === "Browser" || label === "ImageMagick";
  const pass = command || (optional && (browser || imageMagick));
  console.log(`${pass ? "[PASS]" : "[FAIL]"} ${label}: ${detail}`);
}
if ((!browser && !imageMagick) || !ffmpeg || !ffprobe) {
  console.error("MEDIA DOCTOR FAILED");
  console.error("A Chromium-family browser OR ImageMagick is required for PNG rendering, plus FFmpeg and ffprobe for MP4 rendering.");
  console.error("Set BROWSER_BIN, IMAGEMAGICK_BIN, FFMPEG_BIN, or FFPROBE_BIN when tools are installed outside PATH.");
  process.exit(1);
}
console.log(`PNG renderer available: ${imageMagick ? "ImageMagick" : "browser"}`);
console.log("MEDIA DOCTOR PASSED");
