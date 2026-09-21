import type { AiGenerateRequest, AiProvider } from "./provider.js";

type OllamaChatMessage = Readonly<{
  content?: unknown;
  thinking?: unknown;
}>;

type OllamaResponsePayload = Readonly<{
  message?: OllamaChatMessage;
  response?: unknown;
  thinking?: unknown;
}>;

export type OllamaProviderOptions = Readonly<{
  baseUrl?: string;
  model: string;
  timeoutMs?: number;
  think?: boolean;
}>;

export type OllamaProviderErrorCode =
  | "timeout"
  | "network_error"
  | "http_error"
  | "empty_response"
  | "invalid_json";

export class OllamaProviderError extends Error {
  readonly code: OllamaProviderErrorCode;
  readonly status: number | null;

  constructor(code: OllamaProviderErrorCode, message: string, status: number | null = null) {
    super(message);
    this.name = "OllamaProviderError";
    this.code = code;
    this.status = status;
  }
}

function parseJsonResponse(raw: string): unknown {
  const trimmed = raw.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFence) as unknown;
  } catch {
    const objectStart = withoutFence.indexOf("{");
    const objectEnd = withoutFence.lastIndexOf("}");
    if (objectStart >= 0 && objectEnd > objectStart) {
      try {
        return JSON.parse(withoutFence.slice(objectStart, objectEnd + 1)) as unknown;
      } catch {
        // Fail closed below.
      }
    }
    throw new OllamaProviderError("invalid_json", "Ollama did not return valid JSON");
  }
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function extractJsonCandidate(payload: OllamaResponsePayload): string | null {
  // Prefer normal final-answer fields. Support both /api/chat and /api/generate shapes.
  const primary = nonEmptyString(payload.message?.content) ?? nonEmptyString(payload.response);
  if (primary) return primary;

  // qwen3-vl can place the requested JSON in a thinking field while leaving the
  // normal content field empty even when think:false. Treat this only as a
  // compatibility fallback. The candidate must still pass JSON parsing plus all
  // downstream schema and grounding validation before it can be used.
  return nonEmptyString(payload.message?.thinking) ?? nonEmptyString(payload.thinking);
}

export class OllamaProvider implements AiProvider {
  readonly name = "ollama";
  readonly #baseUrl: string;
  readonly #model: string;
  readonly #timeoutMs: number;
  readonly #think: boolean;

  constructor(options: OllamaProviderOptions) {
    this.#baseUrl = (options.baseUrl ?? "http://127.0.0.1:11434").replace(/\/$/, "");
    this.#model = options.model;
    this.#timeoutMs = options.timeoutMs ?? 90_000;
    this.#think = options.think ?? false;
  }

  async generateJson(request: AiGenerateRequest): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#timeoutMs);

    try {
      let response: Response;
      try {
        response = await fetch(`${this.#baseUrl}/api/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model: this.#model,
            messages: [
              { role: "system", content: request.system },
              { role: "user", content: request.prompt },
            ],
            format: "json",
            stream: false,
            think: this.#think,
            options: { temperature: request.temperature ?? 0.2 },
          }),
          signal: controller.signal,
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new OllamaProviderError("timeout", `Ollama request timed out after ${this.#timeoutMs}ms`);
        }
        throw new OllamaProviderError(
          "network_error",
          `Ollama request failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      if (!response.ok) {
        throw new OllamaProviderError(
          "http_error",
          `Ollama request failed with HTTP ${response.status}`,
          response.status,
        );
      }

      const payload = (await response.json()) as OllamaResponsePayload;
      const candidate = extractJsonCandidate(payload);
      if (!candidate) {
        throw new OllamaProviderError(
          "empty_response",
          "Ollama returned no usable content in message.content, response, message.thinking, or thinking",
        );
      }

      return parseJsonResponse(candidate);
    } finally {
      clearTimeout(timeout);
    }
  }
}
