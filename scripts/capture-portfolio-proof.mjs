import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { findBrowser, readPngDimensions, renderHtmlToPng } from "./media-tools.mjs";

const host = "127.0.0.1";
const port = 3001;
const baseUrl = `http://${host}:${port}`;
const outputDir = resolve("docs/screenshots");
const runtimeDir = resolve(`.runtime/portfolio-capture-${process.pid}`);
const browserProfile = resolve(runtimeDir, "browser-profile");
const dashboardShots = [
  ["run", "dashboard-run-timeline.png"],
  ["research", "research-unit-economics.png"],
  ["brain", "product-brain.png"],
  ["meta", "campaign-drafts.png"],
  ["delivery", "approval-delivery-blocked.png"],
];

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

async function waitFor(predicate, label, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const value = await predicate();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await delay(150);
  }
  throw new Error(`${label} did not become ready${lastError ? `: ${lastError.message}` : ""}`);
}

async function isApiHealthy() {
  try {
    const response = await fetch(`${baseUrl}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

function startApi() {
  return spawn(process.execPath, ["scripts/local-api.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      LOCAL_API_HOST: host,
      LOCAL_API_PORT: String(port),
      AI_PROVIDER: "mock",
      LOG_LEVEL: "silent",
      PROJECT_HISTORY_PATH: resolve(runtimeDir, "history.jsonl"),
      AUDIT_PATH: resolve(runtimeDir, "audit.jsonl"),
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}

async function readDevToolsAddress() {
  const file = resolve(browserProfile, "DevToolsActivePort");
  return waitFor(async () => {
    if (!existsSync(file)) return null;
    const [debugPort, socketPath] = (await readFile(file, "utf8")).trim().split(/\r?\n/);
    if (!debugPort || !socketPath) return null;
    return `ws://127.0.0.1:${debugPort}${socketPath}`;
  }, "headless browser debugger");
}

async function connectCdp(address) {
  const socket = new WebSocket(address);
  await new Promise((resolveOpen, rejectOpen) => {
    socket.addEventListener("open", resolveOpen, { once: true });
    socket.addEventListener("error", () => rejectOpen(new Error("headless browser connection failed")), { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (!message.id || !pending.has(message.id)) return;
    const { resolveRequest, rejectRequest } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) rejectRequest(new Error(`${message.error.message} (${message.error.code})`));
    else resolveRequest(message.result);
  });

  function send(method, params = {}, sessionId = undefined) {
    const id = ++nextId;
    return new Promise((resolveRequest, rejectRequest) => {
      pending.set(id, { resolveRequest, rejectRequest });
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  return { socket, send };
}

async function evaluate(send, sessionId, expression) {
  const response = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  }, sessionId);
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || "browser evaluation failed");
  return response.result?.value;
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolveExit) => child.once("exit", resolveExit)),
    delay(2_000),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

async function captureDashboard(browser) {
  const target = await browser.send("Target.createTarget", { url: "about:blank" });
  const attached = await browser.send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
  const sessionId = attached.sessionId;
  await browser.send("Page.enable", {}, sessionId);
  await browser.send("Runtime.enable", {}, sessionId);
  await browser.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  }, sessionId);
  await browser.send("Page.navigate", { url: `${baseUrl}/dashboard` }, sessionId);
  await waitFor(
    () => evaluate(browser.send, sessionId, "document.readyState === 'complete' && document.querySelector('#generateBtn') !== null"),
    "dashboard page",
  );
  await evaluate(browser.send, sessionId, "document.querySelector('#generateBtn').click(); true");
  await waitFor(
    () => evaluate(browser.send, sessionId, "!document.querySelector('#results').classList.contains('hidden') && !document.querySelector('#generateBtn').disabled && document.querySelector('#content').innerText.includes('Human approval')"),
    "dashboard demo run",
    30_000,
  );

  for (const [tab, filename] of dashboardShots) {
    const changed = await evaluate(
      browser.send,
      sessionId,
      `(() => { const button = document.querySelector('[data-tab="${tab}"]'); if (!button) return false; button.click(); window.scrollTo(0, 0); return Boolean(document.querySelector('[data-tab="${tab}"].active')); })()`,
    );
    if (!changed) throw new Error(`dashboard tab ${tab} was not available`);
    await delay(250);
    const image = await browser.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
    }, sessionId);
    const path = resolve(outputDir, filename);
    await writeFile(path, Buffer.from(image.data, "base64"));
    const dimensions = await readPngDimensions(path);
    if (dimensions.width !== 1440 || dimensions.height !== 1000) {
      throw new Error(`${filename} dimensions must be 1440x1000`);
    }
    console.log(`[PASS] captured ${filename}`);
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

async function captureEngineProof(browserPath) {
  const receipt = JSON.parse(await readFile(".runtime/n8n-engine-proof.json", "utf8"));
  const proof = receipt.proof;
  if (
    receipt.n8nVersion !== "2.39.8" ||
    receipt.cloudExecutionsUsed !== 0 ||
    proof?.coreStagesPassed !== true ||
    proof?.externalWrites !== false ||
    proof?.livePublishing !== false ||
    proof?.approvalStatus !== "WAITING" ||
    proof?.deliveryStatus !== "BLOCKED"
  ) {
    throw new Error("n8n receipt does not satisfy the portfolio safety contract");
  }

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;background:#0a1014;color:#f5f1e8;font-family:Arial,sans-serif}.frame{height:900px;padding:64px;background:radial-gradient(circle at 80% 10%,#183129 0,transparent 34%),#0a1014}.eyebrow{color:#f2a93c;font:700 15px monospace;letter-spacing:.12em;text-transform:uppercase}.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #314047;padding-bottom:28px}.head h1{font-size:54px;line-height:1;margin:14px 0 12px}.head p{color:#aeb9bd;font-size:20px;margin:0}.badge{border:1px solid #3bce85;border-radius:999px;color:#3bce85;padding:12px 18px;font:700 16px monospace}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:34px}.card{border:1px solid #314047;border-radius:18px;background:#11191e;padding:24px;min-height:150px}.card span{display:block;color:#8fa0a6;font:13px monospace;text-transform:uppercase;letter-spacing:.08em}.card strong{display:block;margin-top:16px;color:#3bce85;font:700 27px monospace}.card small{display:block;margin-top:12px;color:#aeb9bd;font-size:15px}.footer{display:flex;justify-content:space-between;align-items:center;margin-top:34px;padding:22px 26px;border-left:3px solid #f2a93c;background:#11191e;color:#aeb9bd;font-size:17px}.footer strong{color:#f5f1e8}</style></head><body><main class="frame"><div class="head"><div><div class="eyebrow">Machine-executed evidence · synthetic local run</div><h1>Local n8n engine proof</h1><p>Captured from the runtime receipt generated by the project proof command.</p></div><div class="badge">VERIFIED</div></div><section class="grid"><div class="card"><span>n8n Community Edition</span><strong>${escapeHtml(receipt.n8nVersion)}</strong><small>Actual local CLI engine execution</small></div><div class="card"><span>Core stages</span><strong>PASS</strong><small>Research → Product Brain → Campaign → Quality</small></div><div class="card"><span>Cloud executions</span><strong>${escapeHtml(receipt.cloudExecutionsUsed)}</strong><small>Local-only proof path</small></div><div class="card"><span>External writes</span><strong>false</strong><small>Publisher adapters remain disabled</small></div><div class="card"><span>Live publishing</span><strong>false</strong><small>No ad or store platforms were contacted</small></div><div class="card"><span>Human gate</span><strong>WAITING → BLOCKED</strong><small>Delivery stays blocked before approval</small></div></section><div class="footer"><span><strong>Proof source:</strong> ${escapeHtml(receipt.source)}</span><span>${escapeHtml(receipt.capturedAt)}</span></div></main></body></html>`;
  await renderHtmlToPng({
    browser: browserPath,
    html,
    htmlPath: resolve(runtimeDir, "local-n8n-engine-proof.html"),
    pngPath: resolve(outputDir, "local-n8n-engine-proof.png"),
    width: 1440,
    height: 900,
  });
  console.log("[PASS] captured local-n8n-engine-proof.png");
  console.log("[PASS] receipt safety: externalWrites=false; livePublishing=false");
}

const browserPath = findBrowser();
if (!browserPath) throw new Error("Chrome or Edge is required to capture portfolio screenshots");
await mkdir(outputDir, { recursive: true });
await mkdir(browserProfile, { recursive: true });

let api = null;
let browserProcess = null;
let cdp = null;
try {
  if (!(await isApiHealthy())) {
    api = startApi();
    let apiError = "";
    api.stderr?.setEncoding("utf8");
    api.stderr?.on("data", (chunk) => { apiError += chunk; });
    await waitFor(async () => {
      if (api.exitCode !== null) throw new Error(`local API exited with ${api.exitCode}: ${apiError.trim()}`);
      return isApiHealthy();
    }, "local API");
  }

  browserProcess = spawn(browserPath, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    "--remote-debugging-address=127.0.0.1",
    "--remote-debugging-port=0",
    `--user-data-dir=${browserProfile}`,
    "--window-size=1440,1000",
    "about:blank",
  ], { stdio: "ignore", windowsHide: true });
  const address = await readDevToolsAddress();
  cdp = await connectCdp(address);
  await captureDashboard(cdp);
  await captureEngineProof(browserPath);
  console.log(`PORTFOLIO SCREENSHOTS CAPTURED: ${outputDir}`);
} finally {
  if (cdp?.socket?.readyState === WebSocket.OPEN) {
    try { await cdp.send("Browser.close"); } catch {}
    cdp.socket.close();
  }
  await stopProcess(browserProcess);
  await stopProcess(api);
  await rm(runtimeDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
}
