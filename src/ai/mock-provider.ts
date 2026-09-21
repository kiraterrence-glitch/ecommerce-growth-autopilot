import type { AiGenerateRequest, AiProvider } from "./provider.js";

export class MockAiProvider implements AiProvider {
  readonly name = "mock";
  readonly #response: unknown;

  constructor(response: unknown) {
    this.#response = response;
  }

  async generateJson(_request: AiGenerateRequest): Promise<unknown> {
    return structuredClone(this.#response);
  }
}
