export interface OKRKeyResult {
  index: number; // 1-based within objective
  text: string;
}

export interface OKRObjective {
  number: number; // from "O{n}:"
  text: string;
  krs: OKRKeyResult[];
}

export interface OKRDoc {
  quarter: string;
  team: string;
  objectives: OKRObjective[];
  error?: string;
}

export type OKROutcome = "POC" | "Dogfooding" | "Preview" | "GA";
export type OKRPriority = "P0" | "P1" | "P2" | "P3" | "P4";

export interface OKREpicFormData {
  summary: string;
  outcome: OKROutcome;
  priority: OKRPriority;
  quarterStart: string;
  quarterEnd: string;
  assigneeAccountId?: string;
  assigneeDisplayName?: string;
}

export interface OKRQuarterOption {
  value: string;
  label: string;
}
