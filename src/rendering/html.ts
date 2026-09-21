import type { Product } from "../domain/product.js";
import type { StaticCreativeDraft } from "../creatives/static.js";
import type { VideoSceneDraft } from "../creatives/video.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function offerText(product: Product): string {
  if (product.offer.type === "percentage") return `${product.offer.value}% OFF`;
  if (product.offer.type === "fixed") return `SAVE ${product.currency} ${product.offer.value}`;
  return `${product.currency} ${product.price}`;
}

function initials(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function renderCreativeHtml(creative: StaticCreativeDraft, product: Product): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${creative.width},initial-scale=1">
<style>
*{box-sizing:border-box}html,body{margin:0;width:${creative.width}px;height:${creative.height}px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;background:#f3efe8;color:#151515}
body{position:relative;background:linear-gradient(145deg,#f7f2ea 0%,#eee6d9 55%,#e0d5c4 100%)}
.shell{position:absolute;inset:5%;border:2px solid #171717;border-radius:34px;padding:6%;display:flex;flex-direction:column;justify-content:space-between;background:rgba(255,255,255,.48)}
.top{display:flex;justify-content:space-between;align-items:center;font-size:${Math.max(20, Math.round(Math.min(creative.width, creative.height) * 0.022))}px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.tag{padding:.55em .8em;border:1px solid #171717;border-radius:999px}.offer{font-size:1.25em}
.visual{display:flex;align-items:center;justify-content:center;min-height:38%;position:relative}.orb{width:min(42vw,42vh);height:min(42vw,42vh);max-width:520px;max-height:520px;border-radius:50%;background:#151515;display:flex;align-items:center;justify-content:center;color:#fff;font-size:${Math.max(56, Math.round(Math.min(creative.width, creative.height) * 0.13))}px;font-weight:800;box-shadow:0 32px 80px rgba(0,0,0,.16)}.orb:after{content:"";position:absolute;width:min(50vw,50vh);height:min(50vw,50vh);max-width:620px;max-height:620px;border:2px solid #151515;border-radius:50%;opacity:.15}.demo{position:absolute;bottom:0;font-size:${Math.max(18, Math.round(Math.min(creative.width, creative.height) * 0.018))}px;letter-spacing:.14em;text-transform:uppercase;opacity:.58}
.copy h1{margin:0 0 .22em;font-size:${Math.max(44, Math.round(Math.min(creative.width, creative.height) * 0.064))}px;line-height:1.02;max-width:90%;letter-spacing:-.035em}.copy p{margin:0;max-width:86%;font-size:${Math.max(26, Math.round(Math.min(creative.width, creative.height) * 0.033))}px;line-height:1.18;color:#3a3834}.bottom{display:flex;align-items:center;justify-content:space-between;margin-top:4%}.cta{display:inline-flex;background:#151515;color:#fff;padding:.85em 1.3em;border-radius:999px;font-size:${Math.max(22, Math.round(Math.min(creative.width, creative.height) * 0.026))}px;font-weight:800}.sku{font-size:${Math.max(16, Math.round(Math.min(creative.width, creative.height) * 0.018))}px;opacity:.5}
</style>
</head>
<body>
<div class="shell">
  <div class="top"><span class="tag">Portfolio demo</span><span class="offer">${escapeHtml(offerText(product))}</span></div>
  <div class="visual"><div class="orb">${escapeHtml(initials(product.title))}</div><div class="demo">Demo product visual</div></div>
  <div class="copy"><h1>${escapeHtml(creative.headline)}</h1><p>${escapeHtml(creative.subheadline)}</p></div>
  <div class="bottom"><span class="cta">${escapeHtml(creative.cta)}</span><span class="sku">${escapeHtml(product.sku)} · ${escapeHtml(creative.format)}</span></div>
</div>
</body>
</html>`;
}

export function renderVideoSceneHtml(scene: VideoSceneDraft, product: Product, width = 1080, height = 1920): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;background:#111;color:#fff}body{position:relative;background:radial-gradient(circle at 70% 20%,#45403a 0,#1a1918 35%,#0d0d0d 72%)}
.frame{position:absolute;inset:70px;border:2px solid rgba(255,255,255,.35);border-radius:42px;padding:72px;display:flex;flex-direction:column;justify-content:space-between}.meta{display:flex;justify-content:space-between;text-transform:uppercase;letter-spacing:.12em;font-size:28px;opacity:.72}.purpose{border:1px solid rgba(255,255,255,.5);border-radius:999px;padding:14px 22px}.center{display:flex;flex-direction:column;gap:44px}.mark{width:260px;height:260px;border-radius:50%;background:#f2e8da;color:#111;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:78px}.text{font-size:92px;line-height:1.03;font-weight:800;letter-spacing:-.04em;max-width:880px}.hint{font-size:32px;line-height:1.3;color:#d5cec4;max-width:850px}.footer{display:flex;justify-content:space-between;align-items:flex-end;font-size:28px;opacity:.72}.brand{font-weight:700;opacity:1}
</style></head><body><div class="frame">
<div class="meta"><span class="purpose">${escapeHtml(scene.purpose)}</span><span>Scene ${scene.scene}</span></div>
<div class="center"><div class="mark">${escapeHtml(initials(product.title))}</div><div class="text">${escapeHtml(scene.onScreenText)}</div><div class="hint">${escapeHtml(scene.assetHint)}</div></div>
<div class="footer"><span class="brand">${escapeHtml(product.title)}</span><span>Portfolio demo · ${scene.durationMs / 1000}s</span></div>
</div></body></html>`;
}
function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapSvgText(value: string, maxChars = 24): readonly string[] {
  const words = value.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 5);
}

export function renderVideoSceneSvg(scene: VideoSceneDraft, product: Product, width = 1080, height = 1920): string {
  const lines = wrapSvgText(scene.onScreenText);
  const lineHeight = 104;
  const startY = 820 - ((lines.length - 1) * lineHeight) / 2;
  const textLines = lines
    .map((line, index) => `<tspan x="90" y="${Math.round(startY + index * lineHeight)}">${escapeXml(line)}</tspan>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#171717"/><stop offset="1" stop-color="#403b35"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect x="70" y="70" width="${width - 140}" height="${height - 140}" rx="42" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2"/>
  <rect x="90" y="110" width="260" height="64" rx="32" fill="none" stroke="#ffffff" stroke-opacity="0.55"/>
  <text x="220" y="152" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" fill="#ffffff" letter-spacing="2">${escapeXml(scene.purpose.toUpperCase())}</text>
  <text x="930" y="150" text-anchor="end" font-family="Arial, sans-serif" font-size="28" fill="#ffffff" opacity="0.72">SCENE ${scene.scene}</text>
  <circle cx="220" cy="500" r="130" fill="#f2e8da"/>
  <text x="220" y="528" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="76" fill="#111111">${escapeXml(initials(product.title))}</text>
  <text font-family="Arial, sans-serif" font-weight="700" font-size="86" fill="#ffffff">${textLines}</text>
  <text x="90" y="1370" font-family="Arial, sans-serif" font-size="32" fill="#d5cec4">${escapeXml(scene.assetHint)}</text>
  <text x="90" y="1760" font-family="Arial, sans-serif" font-weight="700" font-size="30" fill="#ffffff">${escapeXml(product.title)}</text>
  <text x="930" y="1760" text-anchor="end" font-family="Arial, sans-serif" font-size="26" fill="#ffffff" opacity="0.72">PORTFOLIO DEMO · ${scene.durationMs / 1000}s</text>
</svg>`;
}

