import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import process from "node:process";

const cmd = process.env.ComSpec || "cmd.exe";
function run(label, command) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(cmd, ["/d", "/s", "/c", command], { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${label} failed with exit ${result.status}`);
}

async function freePort() {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function waitFor(url, child, getOut, getErr) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`API exited early\nstdout:\n${getOut()}\nstderr:\n${getErr()}`);
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`API health timeout\nstdout:\n${getOut()}\nstderr:\n${getErr()}`);
}

console.log("Ecom Growth Autopilot - Windows Diagnostic");
console.log(`Node ${process.version}`);
run("DEPENDENCIES", "npm run deps:check");
run("BUILD", "npm run build");

const port = await freePort();
const child = spawn(process.execPath, ["scripts/local-api.mjs"], {
  env: { ...process.env, LOCAL_API_PORT: String(port), AI_PROVIDER: "mock", LOG_LEVEL: "info" },
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});
let out = ""; let err = "";
child.stdout?.on("data", (c) => { out += c; });
child.stderr?.on("data", (c) => { err += c; });
try {
  const health = await waitFor(`http://127.0.0.1:${port}/health`, child, () => out, () => err);
  console.log("[PASS] Local API /health", await health.text());
} finally {
  if (child.exitCode === null) child.kill("SIGTERM");
}
run("OLLAMA DOCTOR", "npm run doctor:ollama");
let ollamaSmokePassed = true;
try {
  run("OLLAMA PRODUCT BRAIN SMOKE", "npm run ollama:smoke");
} catch (error) {
  ollamaSmokePassed = false;
  console.warn("\n[WARN] Live Ollama smoke did not complete. Deterministic verification will continue.");
  console.warn("Run `npm run ollama:smoke` separately when you want to recheck the local model.");
  if ((process.env.STRICT_OLLAMA_SMOKE || "").toLowerCase() === "true") throw error;
}
run("FULL VERIFY", "npm run verify");
console.log(ollamaSmokePassed ? "\nDIAGNOSTIC PASSED" : "\nDIAGNOSTIC PASSED WITH OLLAMA SMOKE WARNING");
