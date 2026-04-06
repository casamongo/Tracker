import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { AdfNode, AdfDoc } from "@/types/jira"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type SwimlaneKey = "Intake" | "OKR" | "ENG Work" | "Others";

export function classifySwimlane(labels: string[]): SwimlaneKey {
  const normalized = labels.map((l) => l.toLowerCase());
  if (normalized.includes("intake")) return "Intake";
  if (normalized.includes("okr")) return "OKR";
  if (normalized.includes("eng")) return "ENG Work";
  return "Others";
}

export const STATUS_COLOR_MAP: Record<string, string> = {
  "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
  "Complete": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Done": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Parking Lot": "bg-amber-50 text-amber-700 border-amber-200",
  "Won't Do": "bg-red-50 text-red-700 border-red-200",
  "Under Review": "bg-[#F0EBF8] text-[#9333EA] border-[#D4B8F0]",
  "Intake/Backlog": "bg-gray-50 text-gray-500 border-gray-200",
  "Backlog": "bg-gray-50 text-gray-500 border-gray-200",
  "To Do": "bg-gray-50 text-gray-500 border-gray-200",
};

export function getStatusColor(statusName: string): string {
  return STATUS_COLOR_MAP[statusName] ?? "bg-gray-100 text-gray-600 border-gray-200";
}

function extractTextFromNode(node: AdfNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  if (!node.content) return "";
  return node.content.map(extractTextFromNode).join("");
}

export function adfToPlainText(adf: AdfDoc | string | null | undefined): string {
  if (!adf) return "";
  if (typeof adf === "string") return adf;
  if (!adf.content) return "";
  return adf.content.map(extractTextFromNode).join("\n").trim();
}
