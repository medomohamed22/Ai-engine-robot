export type ProviderKind = "openrouter" | "gemini" | "openai-compatible";

export type ProviderConfig = {
  id: string;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  apiKey: string;
  selectedModel: string;
};

export type ModelOption = {
  id: string;
  name: string;
  description?: string;
  contextLength?: number;
  provider?: string;
};

export type TrainingSample = {
  ts: string;
  episode: number;
  step: number;
  reward: number;
  balance: number;
  distance: number;
  energy: number;
  fallRisk: number;
  hip: number;
  knee: number;
  ankle: number;
  event: "step" | "fall" | "checkpoint";
};
