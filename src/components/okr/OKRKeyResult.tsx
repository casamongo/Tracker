"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { Plus, EyeOff, Eye, Pencil, Check, X, ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { OKREpicCard } from "./OKREpicCard";
import { OKREpicForm } from "./OKREpicForm";
import { OKREpicPanel } from "./OKREpicPanel";
import type { OKRKeyResult as OKRKRType } from "@/types/okr";
import type { JiraEpic } from "@/types/jira";
import type { ProjectEntry } from "@/lib/projects";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type OKRStatus = "On Track" | "Deprioritized" | "Deferred";

const OKR_STATUS_STYLES: Record<OKRStatus, string> = {
  "On Track": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Deprioritized": "bg-amber-50 text-amber-700 border-amber-200",
  "Deferred": "bg-gray-100 text-gray-500 border-gray-200",
};

interface Props {
  kr: OKRKRType;
  objectiveNumber: number;
  projectKey: string;
  quarter: string;
  programLabel?: string | null;
  okrPrefix: string;
  availableProjects?: ProjectEntry[];
}

export function OKRKeyResult({ kr, objectiveNumber, projectKey, quarter, programLabel, okrPrefix, availableProjects }: Props) {
  const quarterSlug = quarter.toLowerCase().replace("_", "-"); // e.g. "q2-2026"
  const label = `${okrPrefix}-${quarterSlug}-o${objectiveNumber}-kr${kr.index}`;
  const swrKey = `/api/okr/epics?label=${label}`;

  const { data, isLoading, mutate } = useSWR<(JiraEpic & { browseUrl?: string })[]>(
    swrKey,
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: false }
  );

  const orderKey = `okr-kr-epic-order-${label}`;
  const [orderedEpics, setOrderedEpics] = useState<(JiraEpic & { browseUrl?: string })[]>([]);
  // Epics added locally that haven't yet appeared in server data (Jira label propagation delay)
  const localEpicsRef = useRef<Map<string, JiraEpic & { browseUrl?: string }>>(new Map());

  useEffect(() => {
    const raw = Array.isArray(data) ? data : [];
    // Evict from localEpicsRef any epics now confirmed by server
    for (const key of localEpicsRef.current.keys()) {
      if (raw.some((e) => e.key === key)) localEpicsRef.current.delete(key);
    }
    // Merge server data with locally-added epics not yet reflected in Jira
    const localOnly = Array.from(localEpicsRef.current.values());
    const all = [...raw, ...localOnly];
    const saved: string[] = JSON.parse(localStorage.getItem(orderKey) ?? "[]");
    if (saved.length === 0) { setOrderedEpics(all); return; }
    const map = new Map(all.map((e) => [e.key, e]));
    const sorted = saved.flatMap((k) => (map.has(k) ? [map.get(k)!] : []));
    const unseen = all.filter((e) => !saved.includes(e.key));
    setOrderedEpics([...sorted, ...unseen]);
  }, [data, orderKey]);

  const dragKey = useRef<string | null>(null);
  const dragOver = useRef<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<string | null>(null);

  function handleDragStart(key: string) {
    dragKey.current = key;
    setDragging(key);
  }

  function handleDragEnter(key: string) {
    dragOver.current = key;
    setDragTarget(key);
  }

  function handleDrop() {
    const from = dragKey.current;
    const to = dragOver.current;
    if (!from || !to || from === to) { resetDrag(); return; }
    setOrderedEpics((prev) => {
      const list = [...prev];
      const fromIdx = list.findIndex((e) => e.key === from);
      const toIdx = list.findIndex((e) => e.key === to);
      const [item] = list.splice(fromIdx, 1);
      list.splice(toIdx, 0, item);
      localStorage.setItem(orderKey, JSON.stringify(list.map((e) => e.key)));
      return list;
    });
    resetDrag();
  }

  function resetDrag() {
    dragKey.current = null;
    dragOver.current = null;
    setDragging(null);
    setDragTarget(null);
  }

  const [showForm, setShowForm] = useState(false);
  const [editingEpic, setEditingEpic] = useState<JiraEpic | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [hidden, setHidden] = useState(false);

  const [okrStatus, setOkrStatus] = useState<OKRStatus>("On Track");
  const [comment, setComment] = useState("");
  const [editingComment, setEditingComment] = useState(false);
  const [draftComment, setDraftComment] = useState("");

  // KR title local override
  const titleKey = `okr-kr-title-${label}`;
  const [krTitle, setKrTitle] = useState(kr.text);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(kr.text);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedStatus = localStorage.getItem(`okr-kr-status-${label}`) as OKRStatus | null;
    const savedComment = localStorage.getItem(`okr-kr-comment-${label}`) ?? "";
    const savedTitle = localStorage.getItem(titleKey);
    if (savedStatus) setOkrStatus(savedStatus);
    setComment(savedComment);
    setDraftComment(savedComment);
    if (savedTitle) { setKrTitle(savedTitle); setDraftTitle(savedTitle); }
  }, [label, titleKey]);

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.select();
  }, [editingTitle]);

  function commitTitleEdit() {
    const val = draftTitle.trim() || kr.text;
    setKrTitle(val);
    setDraftTitle(val);
    if (val === kr.text) localStorage.removeItem(titleKey);
    else localStorage.setItem(titleKey, val);
    setEditingTitle(false);
  }

  function cancelTitleEdit() {
    setDraftTitle(krTitle);
    setEditingTitle(false);
  }

  function handleStatusChange(val: OKRStatus) {
    setOkrStatus(val);
    localStorage.setItem(`okr-kr-status-${label}`, val);
    if (val === "On Track") {
      setComment("");
      setDraftComment("");
      localStorage.removeItem(`okr-kr-comment-${label}`);
      setEditingComment(false);
    } else {
      setDraftComment(comment);
      setEditingComment(true);
    }
  }

  function saveComment() {
    setComment(draftComment);
    localStorage.setItem(`okr-kr-comment-${label}`, draftComment);
    setEditingComment(false);
  }

  function handleCreated(epic: JiraEpic & { browseUrl?: string }) {
    setShowForm(false);
    setEditingEpic(null);
    // Register locally so re-fetches don't wipe this epic before Jira propagates the label
    localEpicsRef.current.set(epic.key, epic);
    mutate((current) => {
      const list = Array.isArray(current) ? current : [];
      const idx = list.findIndex((e) => e.key === epic.key);
      if (idx >= 0) {
        const updated = [...list];
        updated[idx] = epic;
        return updated;
      }
      return [...list, epic];
    }, { revalidate: false });
    setOrderedEpics((prev) => {
      const idx = prev.findIndex((e) => e.key === epic.key);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = epic;
        return updated;
      }
      return [...prev, epic];
    });
  }

  const showingForm = showForm || !!editingEpic;

  return (
    <div className={`border-l-2 border-[#A855F7]/30 pl-4 py-1 ${hidden ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <button onClick={() => setCollapsed((v) => !v)} className="shrink-0 mt-0.5">
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-[#A855F7]/60" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-[#A855F7]/60" />
            )}
          </button>
          <span className="shrink-0 mt-0.5 text-[10px] font-bold text-white bg-[#A855F7] px-1.5 py-0.5 rounded uppercase tracking-wider">
            KR {kr.index}
          </span>
          {editingTitle ? (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <input
                ref={titleInputRef}
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitTitleEdit();
                  if (e.key === "Escape") cancelTitleEdit();
                }}
                className="flex-1 min-w-0 border border-[#A855F7]/40 rounded px-2 py-0.5 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#A855F7]"
              />
              <button onClick={commitTitleEdit} className="shrink-0 text-[#A855F7] hover:text-[#7E22CE]" title="Save"><Check className="h-3.5 w-3.5" /></button>
              <button onClick={cancelTitleEdit} className="shrink-0 text-gray-400 hover:text-gray-600" title="Cancel"><X className="h-3.5 w-3.5" /></button>
            </div>
          ) : (
            <div
              onClick={() => setCollapsed((v) => !v)}
              className="group/krtitle flex items-start gap-1.5 flex-1 min-w-0 cursor-pointer"
            >
              <p className={`text-sm font-semibold text-gray-700 leading-snug ${hidden ? "line-through" : ""}`}>{krTitle}</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setDraftTitle(krTitle); setEditingTitle(true); }}
                className="opacity-0 group-hover/krtitle:opacity-60 hover:!opacity-100 shrink-0 mt-0.5 transition-opacity text-gray-400 hover:text-[#9333EA]"
                title="Edit KR title (local only)"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* OKR status dropdown */}
          <select
            value={okrStatus}
            onChange={(e) => handleStatusChange(e.target.value as OKRStatus)}
            className={`text-[11px] font-semibold border rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#9333EA] ${OKR_STATUS_STYLES[okrStatus]}`}
          >
            <option value="On Track">On Track</option>
            <option value="Deprioritized">Deprioritized</option>
            <option value="Deferred">Deferred</option>
          </select>

          {!showingForm && !hidden && (
            <button
              onClick={() => { setEditingEpic(null); setShowForm(true); }}
              className="flex items-center gap-1 text-xs text-[#9333EA] hover:text-[#7E22CE] font-medium transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Epic
            </button>
          )}
          <button
            onClick={() => setHidden((v) => !v)}
            className="text-gray-400 hover:text-[#A855F7] transition-colors"
            title={hidden ? "Show epics" : "Hide epics"}
          >
            {hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* KR comment — only when not On Track */}
      {!collapsed && okrStatus !== "On Track" && (
        <div className="mb-2 pl-0.5">
          {editingComment ? (
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <textarea
                  value={draftComment}
                  onChange={(e) => setDraftComment(e.target.value)}
                  placeholder="Required — brief explanation..."
                  rows={2}
                  className={`w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#9333EA] resize-none ${!draftComment.trim() ? "border-amber-400 bg-amber-50" : "border-gray-300"}`}
                  autoFocus
                />
                {!draftComment.trim() && (
                  <p className="text-[10px] text-amber-600 mt-0.5">A note is required for this status.</p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={saveComment} disabled={!draftComment.trim()} className="text-[11px] px-2 py-1 bg-[#9333EA] text-white rounded hover:bg-[#7E22CE] disabled:opacity-40 disabled:cursor-not-allowed">Save</button>
                <button onClick={() => { setDraftComment(comment); setEditingComment(false); }} className="text-[11px] px-2 py-1 text-gray-500 hover:text-gray-700">Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setDraftComment(comment); setEditingComment(true); }}
              className="group flex items-start gap-1 text-xs text-left"
            >
              <span className={`italic ${comment ? "text-red-400 hover:text-red-500" : "text-gray-400 hover:text-gray-500"}`}>
                {comment || "Add a note..."}
              </span>
              <Pencil className="shrink-0 h-3 w-3 mt-0.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </button>
          )}
        </div>
      )}

      {!collapsed && !hidden && isLoading && (
        <div className="space-y-2 mb-2 pl-6">
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      )}

      {!collapsed && !hidden && !isLoading && orderedEpics.length > 0 && (
        <div className="space-y-2 mb-2 pl-6">
          {orderedEpics.map((epic) =>
            editingEpic?.key === epic.key ? (
              <OKREpicForm
                key={epic.key}
                projectKey={projectKey}
                objectiveNumber={objectiveNumber}
                krIndex={kr.index}
                quarter={quarter}
                okrPrefix={okrPrefix}
                editingEpic={editingEpic}
                onCreated={handleCreated}
                onCancel={() => setEditingEpic(null)}
              />
            ) : (
              <div
                key={epic.key}
                draggable
                onDragStart={() => handleDragStart(epic.key)}
                onDragEnter={() => handleDragEnter(epic.key)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onDragEnd={resetDrag}
                className={`group flex items-center gap-1 transition-opacity ${
                  dragging === epic.key ? "opacity-40" : "opacity-100"
                } ${dragTarget === epic.key && dragging !== epic.key ? "ring-2 ring-[#A855F7]/50 rounded-lg" : ""}`}
              >
                <GripVertical className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-gray-400 cursor-grab active:cursor-grabbing transition-colors" />
                <div className="flex-1 min-w-0">
                  <OKREpicCard
                    epic={epic}
                    onEdit={() => { setShowForm(false); setEditingEpic(epic); }}
                  />
                </div>
              </div>
            )
          )}
        </div>
      )}

      {!collapsed && !hidden && showForm && !editingEpic && (
        <div className="pl-6">
        <OKREpicPanel
          projectKey={projectKey}
          objectiveNumber={objectiveNumber}
          krIndex={kr.index}
          quarter={quarter}
          programLabel={programLabel}
          okrPrefix={okrPrefix}
          availableProjects={availableProjects}
          onCreated={handleCreated}
          onCancel={() => setShowForm(false)}
        />
        </div>
      )}
    </div>
  );
}
