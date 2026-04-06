"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Calendar, ChevronDown, Loader2, Pencil } from "lucide-react";
import { getStatusColor } from "@/lib/utils";
import { AISummary } from "@/components/ai/AISummary";
import { DetailsDrawer } from "./DetailsDrawer";
import { CUSTOM_FIELDS } from "@/lib/jira/client";
import type { JiraEpic } from "@/types/jira";

// Index-based priority colors (order from Jira: highest → lowest)
const PRIORITY_COLOR_BY_INDEX = [
  "bg-red-50 text-red-700 border-red-200",
  "bg-orange-50 text-orange-700 border-orange-200",
  "bg-amber-50 text-amber-700 border-amber-200",
  "bg-blue-50 text-blue-700 border-blue-200",
  "bg-gray-50 text-gray-500 border-gray-200",
];

const PRIORITY_META: Record<string, { num?: number; display?: string; className: string }> = {
  Top:     { num: 0, className: "bg-red-50 text-red-700 border border-red-200" },
  Highest: {         className: "bg-orange-50 text-orange-700 border border-orange-200" },
  High:    {         className: "bg-amber-50 text-amber-700 border border-amber-200" },
  Medium:  { num: 1, display: "Med", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  Low:     { num: 2, className: "bg-gray-50 text-gray-500 border border-gray-200" },
};

function PriorityBadge({ name }: { name: string }) {
  const meta = PRIORITY_META[name];
  if (!meta) return <span className="text-xs font-semibold text-gray-600">{name}</span>;
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded ${meta.className}`}>
      {meta.display ?? name}{meta.num !== undefined && <span className="ml-0.5 opacity-50">[{meta.num}]</span>}
    </span>
  );
}

import type { SwimlaneKey } from "@/lib/utils";

const MILESTONE_BTN: Record<SwimlaneKey, string> = {
  OKR:       "from-[#A855F7] to-[#C4B5FD] hover:from-[#9333EA] hover:to-[#A78BFA]",
  "ENG Work":"from-[#1E40AF] to-[#93C5FD] hover:from-[#1E3A8A] hover:to-[#60A5FA]",
  Intake:    "from-[#B45309] to-[#FCD34D] hover:from-[#92400E] hover:to-[#FBBF24]",
  Others:    "from-[#374151] to-[#9CA3AF] hover:from-[#1F2937] hover:to-[#6B7280]",
};

interface Props {
  epic: JiraEpic;
  storyProgress?: { total: number; done: number };
  onStatusChange?: (epicKey: string, newStatus: string) => void;
  lane?: SwimlaneKey;
}

async function jiraUpdate(key: string, body: Record<string, unknown>) {
  await fetch(`/api/jira/issues/${key}/update`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Portal-based dropdown — escapes card overflow clipping
function OptionMenu({
  anchorRef,
  options,
  onSelect,
  onClose,
  align = "right",
  getColor,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  options: { id: string; label: string; color?: string }[];
  onSelect: (id: string, label: string) => void;
  onClose: () => void;
  align?: "left" | "right";
  getColor?: (label: string, index: number) => string | undefined;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setPos({
        top: r.bottom + window.scrollY + 4,
        left: align === "left" ? r.left + window.scrollX : r.right + window.scrollX,
      });
    }
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose, align, anchorRef]);

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: "absolute",
        width: "fit-content",
        top: pos.top,
        ...(align === "left" ? { left: pos.left } : { right: `calc(100vw - ${pos.left}px)` }),
      }}
      className="z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl py-1 overflow-hidden"
    >
      {options.map((o, i) => {
        const color = getColor ? getColor(o.label, i) : undefined;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        return (
          <button
            key={o.id}
            className="block w-full text-left px-3 py-2 hover:bg-[#F0EBF8] transition-colors whitespace-nowrap"
            onMouseDown={() => onSelect(o.id, o.label)}
          >
            {color ? (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
                {o.label}
              </span>
            ) : (
              <span className="text-xs font-medium text-gray-700">{o.label}</span>
            )}
          </button>
        );
      })}
    </div>,
    document.body
  );
}

export function EpicCard({ epic, storyProgress, onStatusChange, lane = "Others" }: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const fields = epic.fields;
  const quarterStart = fields[CUSTOM_FIELDS.QUARTER_START] as string | null;
  const quarterCompletion = fields[CUSTOM_FIELDS.QUARTER_COMPLETION] as string | null;

  const cardRef = useRef<HTMLDivElement>(null);
  const statusBtnRef = useRef<HTMLButtonElement>(null);
  const priorityBtnRef = useRef<HTMLButtonElement>(null);

  // ── Title editing ─────────────────────────────────────────────
  const [currentSummary, setCurrentSummary] = useState(fields.summary);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(fields.summary);
  const [savingTitle, setSavingTitle] = useState(false);

  async function saveTitle() {
    const trimmed = titleText.trim();
    if (!trimmed || trimmed === currentSummary) { setEditingTitle(false); return; }
    setSavingTitle(true);
    try {
      await jiraUpdate(epic.key, { summary: trimmed });
      setCurrentSummary(trimmed);
    } finally {
      setSavingTitle(false);
      setEditingTitle(false);
    }
  }

  // ── Status editing ──────────────────────────────────────────
  const [currentStatus, setCurrentStatus] = useState(fields.status.name);
  const [statusOpen, setStatusOpen] = useState(false);
  const [transitions, setTransitions] = useState<{ id: string; name: string }[] | null>(null);
  const [loadingTransitions, setLoadingTransitions] = useState(false);

  async function openStatusMenu() {
    setStatusOpen(true);
    if (!transitions && !loadingTransitions) {
      setLoadingTransitions(true);
      try {
        const res = await fetch(`/api/jira/issues/${epic.key}/transitions`);
        const data = await res.json();
        setTransitions(Array.isArray(data) ? data : []);
      } finally {
        setLoadingTransitions(false);
      }
    }
  }

  async function applyTransition(id: string, name: string) {
    setStatusOpen(false);
    setCurrentStatus(name);
    onStatusChange?.(epic.key, name);
    await jiraUpdate(epic.key, { transitionId: id });
  }

  // ── Priority editing ─────────────────────────────────────────
  const [currentPriority, setCurrentPriority] = useState(fields.priority?.name ?? "");
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [priorities, setPriorities] = useState<{ id: string; name: string }[] | null>(null);
  const [loadingPriorities, setLoadingPriorities] = useState(false);

  async function openPriorityMenu() {
    setPriorityOpen(true);
    if (!priorities && !loadingPriorities) {
      setLoadingPriorities(true);
      try {
        const res = await fetch("/api/jira/priorities");
        const data = await res.json();
        setPriorities(Array.isArray(data) ? data : []);
      } finally {
        setLoadingPriorities(false);
      }
    }
  }

  async function applyPriority(name: string) {
    setPriorityOpen(false);
    setCurrentPriority(name);
    await jiraUpdate(epic.key, { priorityName: name });
  }

  // ── Assignee editing ─────────────────────────────────────────
  const [currentAssignee, setCurrentAssignee] = useState(fields.assignee?.displayName ?? "");
  const [assigneeEditing, setAssigneeEditing] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<{ accountId: string; displayName: string }[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleUserQueryChange(q: string) {
    setUserQuery(q);
    setShowUserDropdown(false);
    if (userSearchTimer.current) clearTimeout(userSearchTimer.current);
    if (q.length < 2) { setUserResults([]); return; }
    userSearchTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/jira/users/search?query=${encodeURIComponent(q)}`);
      const data = await res.json();
      setUserResults(Array.isArray(data) ? data : []);
      setShowUserDropdown(true);
    }, 300);
  }

  async function selectAssignee(user: { accountId: string; displayName: string }) {
    setAssigneeEditing(false);
    setShowUserDropdown(false);
    setUserQuery("");
    setCurrentAssignee(user.displayName);
    await jiraUpdate(epic.key, { assigneeAccountId: user.accountId });
  }

  const isIntakeAttention =
    fields.labels.map((l) => l.toLowerCase()).includes("intake") &&
    (currentStatus.toLowerCase().includes("intake") || currentStatus.toLowerCase().includes("backlog"));

  return (
    <>
      <div ref={cardRef}>
      <Card className={`min-h-[210px] transition-all duration-200 ${isIntakeAttention ? "border border-gray-200 border-l-4 border-l-red-500 bg-white shadow-lg" : "border border-gray-200/80 bg-gradient-to-br from-white to-gray-50/60 shadow-md hover:shadow-xl hover:-translate-y-0.5 hover:border-[#9333EA]/40"}`}>
        {isIntakeAttention && (
          <div className="px-3 pt-2 pb-0 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wide text-red-600">New Intake</span>
          </div>
        )}
        <CardHeader className="pb-1.5 pt-3 px-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <a
                href={epic.browseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-[#9333EA]/70 font-mono mb-0.5 font-semibold tracking-wide uppercase hover:text-[#9333EA] hover:underline"
              >{epic.key}</a>
              {editingTitle ? (
                <input
                  autoFocus
                  value={titleText}
                  onChange={(e) => setTitleText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); saveTitle(); }
                    if (e.key === "Escape") { setEditingTitle(false); setTitleText(currentSummary); }
                  }}
                  onBlur={saveTitle}
                  disabled={savingTitle}
                  className="text-xs font-bold w-full bg-transparent border-0 outline-none p-0 leading-snug text-gray-900"
                />
              ) : (
                <div className="group/title flex items-start gap-1">
                  <h3 className="text-xs font-bold leading-snug line-clamp-3 text-gray-900 flex-1" style={{ minHeight: "3lh" }}>
                    {currentSummary}
                  </h3>
                  <button
                    onClick={() => { setTitleText(currentSummary); setEditingTitle(true); }}
                    className="opacity-0 group-hover/title:opacity-50 hover:!opacity-100 shrink-0 text-gray-400 hover:text-[#9333EA] transition-opacity mt-0.5"
                    title="Edit title"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Editable status badge */}
            <div className="relative shrink-0">
              <button
                ref={statusBtnRef}
                onClick={openStatusMenu}
                className="group inline-flex items-center gap-0.5 hover:opacity-80 transition-opacity"
                title="Click to change status"
              >
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(currentStatus)}`}>
                  {loadingTransitions ? <Loader2 className="h-3 w-3 animate-spin" /> : currentStatus}
                </span>
                <ChevronDown className="h-3 w-3 text-gray-400 group-hover:text-[#9333EA] transition-colors" />
              </button>
              {statusOpen && transitions && (
                <OptionMenu
                  anchorRef={statusBtnRef}
                  options={transitions.map((t) => ({ id: t.id, label: t.name }))}
                  onSelect={(id, label) => applyTransition(id, label)}
                  onClose={() => setStatusOpen(false)}
                  align="right"
                  getColor={(label) => getStatusColor(label) as string}
                />
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-3 pb-3 flex flex-col flex-1">
          {/* Priority (left) + Assignee (right) */}
          <div className="flex items-center gap-2 mb-1.5">
            {/* Editable priority — fixed width so assignee stays aligned */}
            <div className="w-28 shrink-0">
            {currentPriority && (
              <div className="relative">
                <button
                  ref={priorityBtnRef}
                  onClick={openPriorityMenu}
                  className="group inline-flex items-center gap-0.5 hover:opacity-80 transition-opacity"
                  title="Click to change priority"
                >
                  <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                    Priority: {loadingPriorities ? <Loader2 className="inline h-3 w-3 animate-spin" /> : <PriorityBadge name={currentPriority} />}
                  </span>
                  <ChevronDown className="h-3 w-3 text-gray-400 group-hover:text-[#9333EA] transition-colors" />
                </button>
                {priorityOpen && priorities && (
                  <OptionMenu
                    anchorRef={priorityBtnRef}
                    options={priorities.map((p) => ({ id: p.id, label: p.name }))}
                    onSelect={(_, label) => applyPriority(label)}
                    onClose={() => setPriorityOpen(false)}
                    align="left"
                    getColor={(_, index) => PRIORITY_COLOR_BY_INDEX[index] ?? "bg-gray-50 text-gray-500 border-gray-200"}
                  />
                )}
              </div>
            )}
            </div>

            {/* Editable assignee */}
            {assigneeEditing ? (
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  className="text-xs border border-gray-200 rounded px-2 py-0.5 w-36 focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
                  value={userQuery}
                  onChange={(e) => handleUserQueryChange(e.target.value)}
                  onBlur={() => setTimeout(() => { setAssigneeEditing(false); setShowUserDropdown(false); setUserQuery(""); }, 150)}
                  placeholder="Search name…"
                />
                {showUserDropdown && userResults.length > 0 && (
                  <div className="absolute z-50 right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg w-48 max-h-40 overflow-y-auto">
                    {userResults.map((u) => (
                      <button
                        key={u.accountId}
                        className="w-full text-left text-xs px-3 py-2 hover:bg-[#F0EBF8] hover:text-[#9333EA]"
                        onMouseDown={() => selectAssignee(u)}
                      >
                        {u.displayName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => { setAssigneeEditing(true); setUserQuery(""); }}
                className="group inline-flex items-center gap-0.5 hover:opacity-80 transition-opacity"
                title="Click to change assignee"
              >
                <span className="text-xs text-gray-600 font-medium truncate max-w-[120px]">
                  {currentAssignee || <span className="text-gray-400">Unassigned</span>}
                </span>
                <ChevronDown className="h-3 w-3 text-gray-400 group-hover:text-[#9333EA] transition-colors" />
              </button>
            )}
          </div>

          {(quarterStart || quarterCompletion) && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-1.5">
              <Calendar className="h-3 w-3" />
              {quarterStart && <span>{quarterStart}</span>}
              {quarterStart && quarterCompletion && <span>→</span>}
              {quarterCompletion && <span>{quarterCompletion}</span>}
            </div>
          )}

          <div className="flex-1" />

          <AISummary issue={epic} workType="epic" boundaryRef={cardRef} />

          <Button
            variant="ghost"
            size="sm"
            className={`mt-2 w-full justify-between text-xs h-7 font-semibold bg-gradient-to-r text-white hover:text-white shadow-sm ${MILESTONE_BTN[lane]}`}
            onClick={() => setDetailsOpen(true)}
          >
            <span>
              Milestones Status
              {storyProgress && storyProgress.total > 0 && (
                <span className="ml-1.5 text-white font-bold">
                  ({storyProgress.done}/{storyProgress.total})
                </span>
              )}
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-white" />
          </Button>
        </CardContent>
      </Card>
      </div>

      <DetailsDrawer
        epic={epic}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
      />
    </>
  );
}
