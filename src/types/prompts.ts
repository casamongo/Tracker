import type { WorkType } from "./ai";

export interface PromptTemplate {
  system: string;
  userTemplate: string;
  maxTokens?: number;
}

export type PromptsConfig = Record<WorkType, PromptTemplate>;
