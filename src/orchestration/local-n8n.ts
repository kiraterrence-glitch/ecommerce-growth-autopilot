const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

export function assertLocalN8nBaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Local n8n URL must be a valid URL");
  }
  if (url.protocol !== "http:") throw new Error("Local n8n proof only allows http:// loopback URLs");
  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(`Refusing non-local n8n URL: ${url.hostname}. This proof must not use n8n Cloud.`);
  }
  if (url.username || url.password) throw new Error("Do not place n8n credentials in the local proof URL");
  return url.toString().replace(/\/$/, "");
}

export function buildLocalN8nWebhookUrl(baseUrl: string, webhookPath = "ecom-full-demo", testMode = false): string {
  const base = assertLocalN8nBaseUrl(baseUrl);
  const safePath = webhookPath.trim().replace(/^\/+/, "");
  if (!safePath || !/^[a-z0-9/_-]+$/i.test(safePath)) throw new Error("Invalid local n8n webhook path");
  return `${base}/${testMode ? "webhook-test" : "webhook"}/${safePath}`;
}
