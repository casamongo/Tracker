"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff, Pencil, Check, X } from "lucide-react";
import { OKRKeyResult } from "./OKRKeyResult";
import type { OKRObjective as OKRObjectiveType } from "@/types/okr";
import type { ProjectEntry } from "@/lib/projects";

interface Props {
  objective: OKRObjectiveType;
  projectKey: string;
  quarter: string;
  programLabel?: string | null;
  okrPrefix: string;
  availableProjects?: ProjectEntry[];
}

export function OKRObjective({ objective, projectKey, quarter, programLabel, okrPrefix, availableProjects }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [hidden, setHidden] = useState(false);

  const storageKey = `okr-o-title-${okrPrefix}-${quarter}-o${objective.number}`;
  const [displayText, setDisplayText] = useState(objective.text);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(objective.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) { setDisplayText(saved); setDraft(saved); }
  }, [storageKey]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commitEdit() {
    const val = draft.trim() || objective.text;
    setDisplayText(val);
    setDraft(val);
    if (val === objective.text) localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, val);
    setEditing(false);
  }

  function cancelEdit() {
    setDraft(displayText);
    setEditing(false);
  }

  if (hidden) {
    return (
      <div className="rounded-xl overflow-hidden border border-[#C4B5FD] shadow-sm opacity-50">
        <div className="w-full flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-[#DDD6FE] to-[#EDE9FE] text-[#6D28D9]">
          <span className="text-xs font-bold uppercase tracking-widest opacity-70 shrink-0">O{objective.number}</span>
          <span className="text-sm font-semibold leading-snug line-through opacity-60">{displayText}</span>
          <button
            onClick={() => setHidden(false)}
            className="ml-auto shrink-0 flex items-center gap-1 text-xs opacity-70 hover:opacity-100 transition-opacity"
            title="Show"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-[#C4B5FD] shadow-sm">
      {/* Header */}
      <div className="w-full flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-[#DDD6FE] to-[#EDE9FE] text-[#6D28D9]">
        <button onClick={() => setCollapsed((v) => !v)} className="shrink-0">
          {collapsed ? <ChevronRight className="h-4 w-4 opacity-80" /> : <ChevronDown className="h-4 w-4 opacity-80" />}
        </button>
        <span className="text-xs font-bold uppercase tracking-widest opacity-70 shrink-0">
          O{objective.number}
        </span>

        {editing ? (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") cancelEdit();
              }}
              className="flex-1 min-w-0 bg-white/60 border border-[#A855F7]/50 rounded px-2 py-0.5 text-sm font-semibold text-[#6D28D9] focus:outline-none focus:ring-1 focus:ring-[#A855F7]"
            />
            <button onClick={commitEdit} className="shrink-0 text-[#6D28D9] hover:text-[#4C1D95]" title="Save">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={cancelEdit} className="shrink-0 text-[#6D28D9]/50 hover:text-[#6D28D9]" title="Cancel">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => setCollapsed((v) => !v)}
            className="group/otitle flex items-center gap-2 flex-1 text-left min-w-0 cursor-pointer"
          >
            <span className="text-sm font-semibold leading-snug">{displayText}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setDraft(displayText); setEditing(true); }}
              className="opacity-0 group-hover/otitle:opacity-60 hover:!opacity-100 shrink-0 transition-opacity"
              title="Edit objective title (local only)"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}

        <span className="shrink-0 text-xs opacity-60">
          {objective.krs.length} KR{objective.krs.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => setHidden(true)}
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          title="Hide"
        >
          <EyeOff className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* KRs */}
      {!collapsed && (
        <div className="bg-gradient-to-b from-[#F3EEFF] to-[#FAF7FF] px-5 py-4 space-y-5">
          {objective.krs.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No key results defined for this objective.</p>
          ) : (
            objective.krs.map((kr, i) => (
              <OKRKeyResult
                key={`${kr.index}-${i}`}
                kr={kr}
                objectiveNumber={objective.number}
                projectKey={projectKey}
                quarter={quarter}
                programLabel={programLabel}
                okrPrefix={okrPrefix}
                availableProjects={availableProjects}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
