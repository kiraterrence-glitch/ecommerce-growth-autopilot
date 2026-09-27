export type AiGenerateRequest = Readonly<{
  system: string;
  prompt: string;
  temperature?: number;
  schema?: Readonly<Record<string, unknown>>;
}>;

export interface AiProvider {
  readonly name: string;
  generateJson(request: AiGenerateRequest): Promise<unknown>;
}
