import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { buildWindowsCommand } from "./windows-cmd.mjs";

const isWindows = process.platform === "win32";
const npmCommand = "npm";
const n8nCommand = "n8n";
const workflowId = "EcomEngineProof0920";
const workflowPath = resolve("n8n/workflows/engine-proof-cli.local.json");
const apiBase = "http://127.0.0.1:3011";
const runId = randomUUID();
const n8nProfileRoot = resolve(`.runtime/n8n-engine-profile-${runId}`);
const n8nCliEnv = {
  ...process.env,
  N8N_USER_FOLDER: n8nProfileRoot,
  N8N_DIAGNOSTICS_ENABLED: "false",
  N8N_PERSONALIZATION_ENABLED: "false",
  N8N_VERSION_NOTIFICATIONS_ENABLED: "false",
};

function run(command, args, options = {}) {
  const common = {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    windowsHide: true,
    ...options,
  };
  const result = isWindows && (command === "npm" || command === "n8n")
    ? spawnSync(
        process.env.ComSpec || "cmd.exe",
        ["/d", "/c", buildWindowsCommand(command, args)],
        common,
      )
    : spawnSync(command, args, common);
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result;
}

async function waitForHealth(child) {
  const deadline = Date.now() + 20_000;
  let lastError = "no response";
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`proof API exited early with code ${child.exitCode}`);
    try {
      const response = await fetch(`${apiBase}/health`);
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 200));
  }
  throw new Error(`proof API did not become healthy: ${lastError}`);
}

async function stop(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolveExit) => child.once("exit", resolveExit)),
    new Promise((resolveWait) => setTimeout(resolveWait, 1500)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

console.log("==============================================");
console.log("Ecom Growth Autopilot - Local n8n Engine Proof");
console.log("==============================================");
console.log("Safety: local n8n only; deterministic mock AI; external writes disabled.");

await mkdir(n8nProfileRoot, { recursive: true });
console.log(`[PASS] isolated n8n proof profile ${n8nProfileRoot}`);

const n8nVersionResult = run(n8nCommand, ["--version"], { env: n8nCliEnv });
if (n8nVersionResult.status !== 0) {
  throw new Error("local n8n command is unavailable; install Community Edition and ensure n8n is on PATH");
}
const n8nVersion = (n8nVersionResult.stdout || "").trim();
console.log(`[PASS] n8n ${n8nVersion || "version detected"}`);

if (run(n8nCommand, ["import:workflow", "--help"], { stdio: "ignore", env: n8nCliEnv }).status !== 0) {
  throw new Error("this local n8n build does not expose the import:workflow CLI command");
}
if (run(n8nCommand, ["execute", "--help"], { stdio: "ignore", env: n8nCliEnv }).status !== 0) {
  throw new Error("this local n8n build does not expose the execute CLI command");
}
console.log("[PASS] n8n import and execute CLI commands are available");

let result;
if (existsSync("dist/index.js")) {
  console.log("[PASS] packaged build output is present; no dependency download is needed for the engine proof");
} else {
  result = run(npmCommand, ["run", "deps:check"]);
  if (result.status !== 0) {
    console.log("Build output and local development dependency are missing; running project setup once.");
    result = run(npmCommand, ["run", "setup"]);
    if (result.status !== 0) throw new Error("project setup failed");
  }
  result = run(npmCommand, ["run", "build"]);
  if (result.status !== 0) throw new Error("project build failed");
}
result = run(process.execPath, ["scripts/check-n8n.mjs"]);
if (result.status !== 0) throw new Error("n8n workflow preflight failed");

await mkdir(".runtime", { recursive: true });
const api = spawn(process.execPath, ["scripts/local-api.mjs"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    LOCAL_API_PORT: "3011",
    AI_PROVIDER: "mock",
    LOG_LEVEL: "silent",
    PROJECT_HISTORY_PATH: `.runtime/n8n-engine-proof-${runId}.jsonl`,
    AUDIT_PATH: `.runtime/n8n-engine-proof-audit-${runId}.jsonl`,
  },
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});
let apiStdout = "";
let apiStderr = "";
api.stdout?.setEncoding("utf8");
api.stderr?.setEncoding("utf8");
api.stdout?.on("data", (chunk) => { apiStdout += chunk; });
api.stderr?.on("data", (chunk) => { apiStderr += chunk; });

try {
  await waitForHealth(api);
  console.log(`[PASS] isolated proof API ${apiBase}`);

  const importResult = run(n8nCommand, ["import:workflow", `--input=${workflowPath}`], { env: n8nCliEnv });
  if (importResult.status !== 0) {
    console.log("[WARN] import returned non-zero; attempting execution in case the stable workflow ID already exists.");
  } else {
    console.log(`[PASS] imported ${workflowId}`);
  }

  const executeResult = run(n8nCommand, ["execute", `--id=${workflowId}`], { env: n8nCliEnv });
  if (executeResult.status !== 0) {
    throw new Error("n8n engine execution failed; see the n8n output above");
  }
  console.log("[PASS] actual n8n engine executed the proof workflow");

  const env = {
    ...process.env,
    N8N_VERSION: n8nVersion,
    N8N_ENGINE_PROOF_API: apiBase,
    N8N_ENGINE_PROOF_RUN_ID: runId,
  };
  const receiptResult = run(process.execPath, ["scripts/capture-n8n-engine-proof.mjs"], { env });
  if (receiptResult.status !== 0) throw new Error("proof receipt capture failed");

  console.log("");
  console.log("N8N ENGINE PROOF PASSED");
  console.log("Receipt: .runtime/n8n-engine-proof.json");
  console.log("n8n Cloud executions used: 0");
} catch (error) {
  if (apiStdout.trim()) console.error(`proof API stdout:\n${apiStdout.trim()}`);
  if (apiStderr.trim()) console.error(`proof API stderr:\n${apiStderr.trim()}`);
  throw error;
} finally {
  await stop(api);
}
