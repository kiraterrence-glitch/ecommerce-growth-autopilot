import { assertLocalN8nBaseUrl } from "../dist/index.js";

const rawBaseUrl = process.env.N8N_LOCAL_URL || "http://127.0.0.1:5678";
const baseUrl = assertLocalN8nBaseUrl(rawBaseUrl);
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 3000);

try {
  const response = await fetch(`${baseUrl}/healthz`, { signal: controller.signal });
  if (!response.ok) {
    console.error(`LOCAL N8N RUNTIME NOT READY: HTTP ${response.status} from ${baseUrl}/healthz`);
    process.exit(2);
  }
  console.log(`local n8n runtime reachable: ${baseUrl}`);
  console.log("runtime check passed");
} catch (error) {
  console.error("LOCAL N8N RUNTIME NOT READY");
  console.error(error instanceof Error ? error.message : String(error));
  console.error("Start local/community n8n on http://127.0.0.1:5678, then rerun this check.");
  process.exit(2);
} finally {
  clearTimeout(timer);
}
