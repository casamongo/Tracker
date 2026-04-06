"use client";

import { useState, useRef } from "react";
import { Search, Loader2, Check, X } from "lucide-react";
import { getStatusColor } from "@/lib/utils";
import type { JiraEpic } from "@/types/jira";

const OUTCOME_TERMS = ["POC", "Dogfooding", "Preview", "GA", "Windows"];
const OUTCOME_TERMS_RE = OUTCOME_TERMS.join("|");
const OUTCOME_PREFIX_REGEX = new RegExp(`^\\[(${OUTCOME_TERMS_RE})\\]\\s*`, "i");
const OUTCOME_SUFFIX_REGEX = new RegExp(`\\s*[-–]\\s*(${OUTCOME_TERMS_RE})\\s*$`, "i");

function extractOutcome(summary: string): { outcome: string | null; title: string } {
  const prefix = summary.match(OUTCOME_PREFIX_REGEX);
  if (prefix) return { outcome: prefix[1], title: summary.replace(OUTCOME_PREFIX_REGEX, "").trim() };
  const suffix = summary.match(OUTCOME_SUFFIX_REGEX);
  if (suffix) return { outcome: suffix[1], title: summary.replace(OUTCOME_SUFFIX_REGEX, "").trim() };
  return { outcome: null, title: summary };
}

const OUTCOME_BADGE: Record<string, string> = {
  POC: "bg-orange-100 text-orange-700",
  Dogfooding: "bg-blue-100 text-blue-700",
  Preview: "bg-yellow-100 text-yellow-700",
  GA: "bg-green-100 text-green-700",
  Windows: "bg-sky-100 text-sky-700",
};

type SearchResult = JiraEpic & { browseUrl?: string };

import type { ProjectEntry } from "@/lib/projects";

interface Props {
  projectKey: string;
  objectiveNumber: number;
  krIndex: number;
  quarter: string;
  okrPrefix: string;
  programLabel?: string | null;
  availableProjects?: ProjectEntry[];
  onLinked: (epic: JiraEpic & { browseUrl?: string }) => void;
}

export function OKREpicLinkForm({ projectKey, objectiveNumber, krIndex, quarter, okrPrefix, programLabel, availableProjects, onLinked }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult[]>([]);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function toggleEpic(epic: SearchResult) {
    setSelected((prev) =>
      prev.some((e) => e.key === epic.key)
        ? prev.filter((e) => e.key !== epic.key)
        : [...prev, epic]
    );
  }

  function handleQuery(q: string) {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const params = new URLSearchParams({ q: q.trim() });
        if (availableProjects && availableProjects.length > 0) {
          params.set("projectKeys", availableProjects.map((p) => p.key).join(","));
        } else if (projectKey) {
          params.set("projectKey", projectKey);
        }
        const res = await fetch(`/api/jira/epics/search?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Search failed"); setResults([]); return; }
        setResults(Array.isArray(data) ? data : []);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  async function handleLink() {
    if (selected.length === 0) return;
    setLinking(true);
    setError(null);
    const quarterSlug = quarter.toLowerCase().replace("_", "-");
    const okrLabel = `${okrPrefix}-${quarterSlug}-o${objectiveNumber}-kr${krIndex}`;
    const errors: string[] = [];

    for (const epic of selected) {
      const existing = epic.fields.labels ?? [];
      const merged = Array.from(new Set([...existing, "okr", okrLabel]));
      try {
        const res = await fetch(`/api/jira/issues/${epic.key}/update`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ labels: merged }),
        });
        if (!res.ok) {
          const d = await res.json();
          errors.push(`${epic.key}: ${d.error ?? "failed"}`);
        } else {
          onLinked({ ...epic, fields: { ...epic.fields, labels: merged } });
        }
      } catch (err) {
        errors.push(`${epic.key}: ${(err as Error).message}`);
      }
    }

    setLinking(false);
    if (errors.length > 0) setError(errors.join(" · "));
  }

  const inputClass =
    "w-full border border-gray-300 rounded-md pl-8 pr-8 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7] focus:border-transparent";

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleQuery(e.target.value)}
          placeholder="Search by key (PROJ-123) or title…"
          className={inputClass}
          autoFocus
          autoComplete="off"
        />
        {searching && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Results list */}
      {results.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden max-h-52 overflow-y-auto divide-y divide-gray-100">
          {results.map((epic) => {
            const { outcome, title } = extractOutcome(epic.fields.summary);
            const isSelected = selected.some((e) => e.key === epic.key);

            return (
              <button
                key={epic.key}
                type="button"
                onClick={() => toggleEpic(epic)}
                className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors ${
                  isSelected ? "bg-purple-50" : "hover:bg-gray-50"
                }`}
              >
                {/* Checkbox */}
                <div className={`shrink-0 mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${
                  isSelected ? "bg-[#A855F7] border-[#A855F7]" : "border-gray-300"
                }`}>
                  {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className="text-[10px] font-mono text-gray-400 shrink-0">{epic.key}</span>
                    {outcome && (
                      <span className={`text-[10px] font-semibold px-1 py-0 rounded uppercase tracking-wide ${OUTCOME_BADGE[outcome] ?? "bg-gray-100 text-gray-600"}`}>
                        {outcome}
                      </span>
                    )}
                    <span className={`text-[10px] font-medium px-1.5 py-0 rounded-full border ${getStatusColor(epic.fields.status.name)}`}>
                      {epic.fields.status.name}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-800 truncate">{title}</p>
                  {epic.fields.assignee && (
                    <p className="text-[10px] text-gray-400 mt-0.5">{epic.fields.assignee.displayName}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {query.trim().length >= 2 && !searching && results.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">No epics found</p>
      )}

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-purple-50 rounded-lg border border-[#A855F7]/20">
          <span className="text-[10px] text-purple-500 font-semibold self-center">Selected:</span>
          {selected.map((e) => (
            <span key={e.key} className="inline-flex items-center gap-1 text-xs bg-white border border-[#A855F7]/30 text-[#7E22CE] rounded px-1.5 py-0.5">
              {e.key}
              <button type="button" onClick={() => toggleEpic(e)} className="hover:text-red-500">
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleLink}
          disabled={selected.length === 0 || linking}
          className="px-4 py-1.5 text-sm font-medium bg-[#A855F7] text-white rounded-md hover:bg-[#9333EA] disabled:opacity-50 flex items-center gap-1.5"
        >
          {linking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {selected.length > 1 ? `Link ${selected.length} Epics` : "Link Epic"}
        </button>
      </div>
    </div>
  );
}
