"use client";

import { ExternalLink, Pencil } from "lucide-react";
import { getStatusColor } from "@/lib/utils";
import { CUSTOM_FIELDS } from "@/lib/jira/client";
import type { JiraEpic } from "@/types/jira";

const OUTCOME_TERMS = ["POC", "Dogfooding", "Preview", "GA", "Windows"];
const OUTCOME_TERMS_RE = OUTCOME_TERMS.join("|");
const OUTCOME_PREFIX_REGEX = new RegExp(`^\\[(${OUTCOME_TERMS_RE})\\]\\s*`, "i");
const OUTCOME_SUFFIX_REGEX = new RegExp(`\\s*[-–]\\s*(${OUTCOME_TERMS_RE})\\s*$`, "i");

function extractOutcome(summary: string): { outcome: string | null; displaySummary: string } {
  const prefix = summary.match(OUTCOME_PREFIX_REGEX);
  if (prefix) {
    return { outcome: prefix[1].toUpperCase() === prefix[1] ? prefix[1] : prefix[1], displaySummary: summary.replace(OUTCOME_PREFIX_REGEX, "").trim() };
  }
  const suffix = summary.match(OUTCOME_SUFFIX_REGEX);
  if (suffix) {
    return { outcome: suffix[1], displaySummary: summary.replace(OUTCOME_SUFFIX_REGEX, "").trim() };
  }
  return { outcome: "GA", displaySummary: summary };
}

const OUTCOME_BADGE: Record<string, string> = {
  POC: "bg-orange-100 text-orange-700",
  Dogfooding: "bg-blue-100 text-blue-700",
  Preview: "bg-yellow-100 text-yellow-700",
  GA: "bg-green-100 text-green-700",
  Windows: "bg-sky-100 text-sky-700",
};

interface Props {
  epic: JiraEpic & { browseUrl?: string };
  onEdit: () => void;
}

export function OKREpicCard({ epic, onEdit }: Props) {
  const { fields, key, browseUrl } = epic;

  const { outcome, displaySummary } = extractOutcome(fields.summary);

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 hover:border-[#9333EA]/30 transition-colors">
      {/* Single line */}
      <div className="flex items-center gap-2 min-w-0">

        {/* Outcome badge */}
        {outcome && (
          <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${OUTCOME_BADGE[outcome] ?? "bg-gray-100 text-gray-600"}`}>
            {outcome}
          </span>
        )}

        {/* Summary + custom labels — takes remaining space */}
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate min-w-0" title={displaySummary}>
            {displaySummary}
          </p>
          {(fields.labels ?? []).map((l) => (
            <span key={l} className="shrink-0 text-[10px] text-gray-400">[{l}]</span>
          ))}
        </div>

        {/* Divider group: key | status | assignee */}
        <div className="shrink-0 flex items-center gap-2 text-[11px] text-gray-400 divide-x divide-gray-200">
          {browseUrl ? (
            <a href={browseUrl} target="_blank" rel="noopener noreferrer" className="font-mono pl-2 hover:text-[#9333EA] hover:underline transition-colors">
              {key}
            </a>
          ) : (
            <span className="font-mono pl-2">{key}</span>
          )}
          <span className={`pl-2 font-medium px-1.5 py-0.5 rounded-full border ${getStatusColor(fields.status.name)}`}>
            {fields.status.name}
          </span>
          {fields.assignee && (
            <span className="pl-2">{fields.assignee.displayName}</span>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-0.5">
          <button onClick={onEdit} title="Edit" className="p-1 rounded hover:bg-purple-50 text-gray-400 hover:text-[#9333EA]">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {browseUrl && (
            <a href={browseUrl} target="_blank" rel="noopener noreferrer" title="Open in Jira" className="p-1 rounded hover:bg-purple-50 text-gray-400 hover:text-[#9333EA]">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

    </div>
  );
}
