import process from "node:process";
import { loadLocalEnv } from "./env.mjs";

await loadLocalEnv();
process.env.AI_PROVIDER = "ollama";
process.env.OLLAMA_URL ||= "http://127.0.0.1:11434";
process.env.OLLAMA_MODEL ||= "qwen3-vl:4b";
process.env.OLLAMA_THINK ||= "false";

const { startServer } = await import("./local-api.mjs");
startServer();
