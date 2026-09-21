export type AiGenerateRequest = Readonly<{
  system: string;
  prompt: string;
  temperature?: number;
}>;

export interface AiProvider {
  readonly name: string;
  generateJson(request: AiGenerateRequest): Promise<unknown>;
}
