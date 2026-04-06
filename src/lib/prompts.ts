import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import type { PromptsConfig, PromptTemplate } from "@/types/prompts";
import type { WorkType } from "@/types/ai";

const WORK_TYPES: WorkType[] = ["epic", "story", "subtask", "milestone"];

let cachedConfig: (PromptsConfig & { details?: PromptTemplate }) | null = null;

function loadConfig(): PromptsConfig & { details?: PromptTemplate } {
  if (cachedConfig) return cachedConfig;

  const filePath = path.join(process.cwd(), "prompts.config.yaml");
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = yaml.load(raw) as Record<string, unknown>;

  for (const workType of WORK_TYPES) {
    const template = parsed[workType] as Record<string, unknown> | undefined;
    if (!template || !template.system || !template.userTemplate) {
      throw new Error(
        `prompts.config.yaml is missing required work type: "${workType}". ` +
          `Each type must have "system" and "userTemplate" fields.`
      );
    }
  }

  cachedConfig = parsed as unknown as PromptsConfig & { details?: PromptTemplate };
  return cachedConfig;
}

export function getPromptTemplate(workType: WorkType): PromptTemplate {
  const config = loadConfig();
  return config[workType];
}

export function getDetailsPromptTemplate(): PromptTemplate {
  const config = loadConfig();
  if (!config.details || !config.details.system || !config.details.userTemplate) {
    throw new Error('prompts.config.yaml is missing required "details" template with "system" and "userTemplate" fields.');
  }
  return config.details;
}

export function getSlackStatusPromptTemplate(): PromptTemplate {
  const config = loadConfig();
  const template = (config as Record<string, unknown>).slackStatus as PromptTemplate | undefined;
  if (!template?.system || !template?.userTemplate) {
    throw new Error('prompts.config.yaml is missing "slackStatus" template.');
  }
  return template;
}
