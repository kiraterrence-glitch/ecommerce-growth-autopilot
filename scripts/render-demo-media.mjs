import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderCreativeHtml, renderVideoSceneHtml, renderVideoSceneSvg } from "../dist/index.js";
import {
  findBrowser,
  findFfmpeg,
  findFfprobe,
  findImageMagick,
  renderHtmlToPng,
  renderStoryboardToMp4,
  renderSvgToPng,
} from "./media-tools.mjs";

const args = new Set(process.argv.slice(2));
const root = args.has("--live") ? ".runtime/demo-live" : ".runtime/demo";
const kit = JSON.parse(await readFile(`${root}/campaign-kit.json`, "utf8"));
const browser = findBrowser();
const imageMagick = findImageMagick();
const ffmpeg = findFfmpeg();
const ffprobe = findFfprobe();
if ((!browser && !imageMagick) || !ffmpeg || !ffprobe) {
  throw new Error("Media tools missing. Run: npm run media:doctor");
}

const mediaRoot = `${root}/media`;
const htmlRoot = `${mediaRoot}/html`;
const svgRoot = `${mediaRoot}/svg`;
const pngRoot = `${mediaRoot}/png`;
const sceneRoot = `${mediaRoot}/video-scenes`;
await mkdir(htmlRoot, { recursive: true });
await mkdir(svgRoot, { recursive: true });
await mkdir(pngRoot, { recursive: true });
await mkdir(sceneRoot, { recursive: true });

const rendererAttempts = [];

async function renderWithFallback({ html, svg, baseName, pngPath, width, height }) {
  if (imageMagick) {
    try {
      const rendered = await renderSvgToPng({
        imageMagick,
        svg,
        svgPath: `${svgRoot}/${baseName}.svg`,
        pngPath,
        width,
        height,
      });
      rendererAttempts.push({ baseName, renderer: "imagemagick", status: "PASS" });
      return rendered;
    } catch (error) {
      rendererAttempts.push({ baseName, renderer: "imagemagick", status: "FAIL", message: error instanceof Error ? error.message : String(error) });
    }
  }
  if (browser) {
    const rendered = await renderHtmlToPng({
      browser,
      html,
      htmlPath: `${htmlRoot}/${baseName}.html`,
      pngPath,
      width,
      height,
    });
    rendererAttempts.push({ baseName, renderer: "browser", status: "PASS" });
    return rendered;
  }
  throw new Error(`No working PNG renderer for ${baseName}`);
}

const pngs = [];
for (const creative of kit.creatives) {
  const result = await renderWithFallback({
    html: renderCreativeHtml(creative, kit.product),
    svg: creative.svg,
    baseName: creative.id,
    pngPath: `${pngRoot}/${creative.id}.png`,
    width: creative.width,
    height: creative.height,
  });
  pngs.push({ id: creative.id, ...result });
}

const scenePaths = [];
for (const scene of kit.videoStoryboard.scenes) {
  const id = `scene-${String(scene.scene).padStart(2, "0")}`;
  const result = await renderWithFallback({
    html: renderVideoSceneHtml(scene, kit.product, kit.videoStoryboard.width, kit.videoStoryboard.height),
    svg: renderVideoSceneSvg(scene, kit.product, kit.videoStoryboard.width, kit.videoStoryboard.height),
    baseName: id,
    pngPath: `${sceneRoot}/${id}.png`,
    width: kit.videoStoryboard.width,
    height: kit.videoStoryboard.height,
  });
  scenePaths.push(result.path);
}

const video = await renderStoryboardToMp4({
  ffmpeg,
  ffprobe,
  storyboard: kit.videoStoryboard,
  scenePaths,
  outputPath: `${mediaRoot}/${kit.product.sku}-vertical-demo.mp4`,
  concatPathFile: `${mediaRoot}/video-scenes.txt`,
});

const report = {
  passed: true,
  browser,
  imageMagick,
  ffmpeg,
  ffprobe,
  source: args.has("--live") ? "live_ollama_demo" : "deterministic_demo",
  rendererAttempts,
  pngs: pngs.map(({ id, path, width, height }) => ({ id, path: resolve(path), width, height })),
  video,
};
await writeFile(`${mediaRoot}/media-verification.json`, JSON.stringify(report, null, 2), "utf8");
console.log(`Rendered ${pngs.length} PNG creatives and ${video.durationSeconds.toFixed(2)}s MP4`);
console.log(`Media artifacts written to ${mediaRoot}`);
