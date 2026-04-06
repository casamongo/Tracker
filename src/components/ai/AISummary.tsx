"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Sparkles, RefreshCw, Pencil, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AISummarySkeleton } from "./AISummarySkeleton";
import { useSummary } from "@/hooks/useSummary";
import type { WorkType } from "@/types/ai";
import type { JiraEpic, JiraStory } from "@/types/jira";

interface Props {
  issue: JiraEpic | JiraStory;
  workType: WorkType;
  boundaryRef?: React.RefObject<HTMLElement | null>;
}

export function AISummary({ issue, workType, boundaryRef }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { summary, isCustom, error, isLoading, mutate } = useSummary(issue, workType, expanded);

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Collapse when user clicks outside the card boundary (skip if actively editing)
  useEffect(() => {
    if (!expanded || editing) return;
    function handleClickOutside(e: MouseEvent) {
      if (boundaryRef?.current && !boundaryRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expanded, editing, boundaryRef]);

  // Local overrides so the UI updates instantly after save/revert
  const [localSummary, setLocalSummary] = useState<string | null>(null);
  const [localIsCustom, setLocalIsCustom] = useState<boolean | null>(null);

  const displaySummary = localSummary ?? summary;
  const displayIsCustom = localIsCustom ?? isCustom;

  function startEdit() {
    setEditText(displaySummary ?? "");
    setSaveError(null);
    setEditing(true);
  }

  async function handleSave() {
    const text = editText.trim();
    if (!text) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/ai/summarize/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          epicKey: issue.key,
          newSummary: text,
          previousSummary: displaySummary ?? null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to save");
      }
      setLocalSummary(text);
      setLocalIsCustom(true);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleRevert() {
    setSaving(true);
    try {
      await fetch(`/api/ai/summarize/save?epicKey=${issue.key}`, { method: "DELETE" });
      setLocalSummary(null);
      setLocalIsCustom(false);
      // Invalidate SWR cache so AI summary is re-fetched
      await mutate(undefined, { revalidate: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 border-t pt-3">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#9333EA]" />
          Overall Summary
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>

        {expanded && displaySummary && !editing && (
          <div className="flex items-center gap-1 shrink-0">
            {displayIsCustom && (
              <>
                <span className="text-[9px] font-bold uppercase tracking-wide text-[#9333EA] bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                  edited
                </span>
                <button
                  onClick={handleRevert}
                  disabled={saving}
                  title="Revert to AI-generated summary"
                  className="text-gray-300 hover:text-red-400 disabled:opacity-40 transition-colors"
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                </button>
              </>
            )}
            <button
              onClick={startEdit}
              title="Edit summary"
              className="text-gray-300 hover:text-[#9333EA] transition-colors"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {expanded && (
        <div className="mt-2">
          {isLoading && !displaySummary && <AISummarySkeleton />}

          {error && !displaySummary && (
            <div className="flex items-center gap-2 text-xs text-red-600">
              <span>Failed to generate summary.</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setExpanded(false)}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          )}

          {editing ? (
            <div className="space-y-2">
              <textarea
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={4}
                className="w-full text-xs text-gray-700 border border-gray-200 rounded-md px-2.5 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#9333EA] focus:border-transparent leading-relaxed"
              />
              {saveError && <p className="text-xs text-red-600">{saveError}</p>}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !editText.trim()}
                  className="inline-flex items-center gap-1 text-xs font-medium bg-[#9333EA] text-white px-2.5 py-1 rounded-md hover:bg-[#7E22CE] disabled:opacity-50 transition-colors"
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 px-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : displaySummary ? (
            <p className="text-xs text-gray-600 font-medium leading-relaxed">{displaySummary}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
