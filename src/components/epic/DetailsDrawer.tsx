"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2, ChevronDown, X, Pencil } from "lucide-react";
import { getStatusColor } from "@/lib/utils";
import { useDetails } from "@/hooks/useDetails";
import { SlackMessageDialog } from "./SlackMessageDialog";
import { SlackStatusDialog } from "./SlackStatusDialog";
import { extractOurSummaryText } from "@/lib/jira/description";
import type { JiraEpic } from "@/types/jira";
import type { MilestoneItem } from "@/types/ai";

// ── Status badge ──────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  done: "bg-emerald-50 text-emerald-700",
  complete: "bg-emerald-50 text-emerald-700",
  "in progress": "bg-blue-50 text-blue-700",
  "in review": "bg-[#F0EBF8] text-[#9333EA]",
  backlog: "bg-gray-50 text-gray-500",
  "to do": "bg-gray-50 text-gray-500",
  blocked: "bg-red-50 text-red-700",
  "won't do": "bg-red-50 text-red-700",
  "parking lot": "bg-amber-50 text-amber-700",
  "intake/backlog": "bg-gray-50 text-gray-500",
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status.toLowerCase()] ?? "bg-gray-50 text-gray-500";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${color}`}>
      {status}
    </span>
  );
}

// ── Struck value helper ───────────────────────────────────────
function StruckThen({ prev, current }: { prev: string; current: string }) {
  return (
    <div className="space-y-0.5">
      <div className="line-through text-gray-300 text-xs">{prev}</div>
      <div>{current}</div>
    </div>
  );
}

// ── Status dropdown cell ──────────────────────────────────────
function StatusCell({
  canEdit, effectiveStatus, posted, loading, transitions, open,
  onOpen, onSelect, onClose,
}: {
  canEdit: boolean;
  effectiveStatus: string;
  posted?: { prev: string; current: string };
  loading: boolean;
  transitions: { id: string; name: string }[] | null;
  open: boolean;
  onOpen: () => void;
  onSelect: (id: string, name: string) => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, onClose]);

  return (
    <div ref={menuRef} className="relative inline-block">
      <div
        className={canEdit ? "cursor-pointer group inline-flex items-center gap-1 rounded px-1 py-0.5 -mx-1 hover:bg-[#F0EBF8] transition-colors" : ""}
        onClick={canEdit ? onOpen : undefined}
        title={canEdit ? "Click to change status" : ""}
      >
        {posted ? (
          <StruckThen prev={posted.prev} current={posted.current} />
        ) : (
          <StatusBadge status={effectiveStatus} />
        )}
        {canEdit && (
          loading
            ? <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
            : <ChevronDown className="h-3 w-3 text-[#9333EA]/30 group-hover:text-[#9333EA]/80 transition-colors" />
        )}
      </div>
      {open && !loading && transitions && transitions.length > 0 && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-xl min-w-[160px] py-1 overflow-hidden">
          {transitions.map((t) => (
            <button
              key={t.id}
              className="w-full text-left px-3 py-2 hover:bg-[#F0EBF8] transition-colors"
              onMouseDown={() => onSelect(t.id, t.name)}
            >
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(t.name)}`}>
                {t.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Per-row state ─────────────────────────────────────────────
interface PostedField {
  prev: string;
  current: string;
}

interface PostedState {
  status?: PostedField;
  owner?: PostedField;
  targetDate?: PostedField;
  statusNote?: PostedField;
}

// ── Milestone row ─────────────────────────────────────────────
function MilestoneRow({
  milestone,
  onOpenConversation,
  slackConfigured,
}: {
  milestone: MilestoneItem;
  onOpenConversation: () => void;
  slackConfigured: boolean;
}) {
  const canEdit = !!milestone.issueKey;

  const [posted, setPosted] = useState<PostedState>({});
  const [savingField, setSavingField] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Story title editing ───────────────────────────────────────
  const [storyTitle, setStoryTitle] = useState(milestone.name);
  const [editingStoryTitle, setEditingStoryTitle] = useState(false);
  const [storyTitleText, setStoryTitleText] = useState(milestone.name);
  const [savingStoryTitle, setSavingStoryTitle] = useState(false);

  async function saveStoryTitle() {
    const trimmed = storyTitleText.trim();
    if (!trimmed || trimmed === storyTitle || !milestone.issueKey) { setEditingStoryTitle(false); return; }
    setSavingStoryTitle(true);
    try {
      await fetch(`/api/jira/issues/${milestone.issueKey}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: trimmed }),
      });
      setStoryTitle(trimmed);
    } finally {
      setSavingStoryTitle(false);
      setEditingStoryTitle(false);
    }
  }

  // Active edit field
  const [activeField, setActiveField] = useState<"status" | "owner" | "date" | "notes" | null>(null);

  // Transitions
  const [transitions, setTransitions] = useState<{ id: string; name: string }[] | null>(null);
  const [loadingTransitions, setLoadingTransitions] = useState(false);

  // User search
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<{ accountId: string; displayName: string }[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userInputRef = useRef<HTMLInputElement>(null);

  // Field value refs for blur-save
  const dateValueRef = useRef<string>("");
  const noteRef = useRef<HTMLTextAreaElement>(null);

  // Effective current values
  const effectiveStatus = posted.status?.current ?? milestone.status;
  const effectiveOwner = posted.owner?.current ?? milestone.owner;
  const effectiveDate = posted.targetDate?.current ?? milestone.targetDate;
  const effectiveNote = posted.statusNote?.current ?? milestone.statusNote;

  // ── Per-field save functions ──────────────────────────────────

  async function saveTransition(transitionId: string, transitionName: string) {
    const prev = posted.status?.current ?? milestone.status;
    setPosted((p) => ({ ...p, status: { prev, current: transitionName } }));
    setActiveField(null);
    setSavingField("status");
    setSaveError(null);
    try {
      const res = await fetch(`/api/jira/issues/${milestone.issueKey}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transitionId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save status");
    } finally {
      setSavingField(null);
    }
  }

  async function saveOwner(user: { accountId: string; displayName: string }) {
    const prev = posted.owner?.current ?? milestone.owner;
    setPosted((p) => ({ ...p, owner: { prev, current: user.displayName } }));
    setUserQuery(user.displayName);
    setShowUserDropdown(false);
    setActiveField(null);
    setSavingField("owner");
    setSaveError(null);
    try {
      const res = await fetch(`/api/jira/issues/${milestone.issueKey}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeAccountId: user.accountId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save owner");
    } finally {
      setSavingField(null);
    }
  }

  async function saveDate() {
    const date = dateValueRef.current;
    const prev = posted.targetDate?.current ?? milestone.targetDate;
    const display = date || "TBD";
    setPosted((p) => ({ ...p, targetDate: { prev, current: display } }));
    setActiveField(null);
    setSavingField("date");
    setSaveError(null);
    try {
      const res = await fetch(`/api/jira/issues/${milestone.issueKey}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duedate: date || null }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save date");
    } finally {
      setSavingField(null);
    }
  }

  async function saveNote() {
    const note = (noteRef.current?.value ?? "").trim();
    const prev = (posted.statusNote?.current ?? milestone.statusNote ?? "").trim();

    if (note === prev) { setActiveField(null); return; }
    setPosted((p) => ({ ...p, statusNote: { prev, current: note } }));
    setActiveField(null);
    setSavingField("notes");
    setSaveError(null);
    try {
      const res = await fetch(`/api/jira/issues/${milestone.issueKey}/status-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = "Failed to save";
        try { msg = (JSON.parse(text) as { error?: string }).error ?? msg; } catch { msg = `HTTP ${res.status}`; }
        throw new Error(msg);
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save note");

    } finally {
      setSavingField(null);
    }
  }

  async function openStatusEdit() {
    if (!canEdit) return;
    setActiveField("status");
    if (!transitions && !loadingTransitions) {
      setLoadingTransitions(true);
      try {
        const res = await fetch(`/api/jira/issues/${milestone.issueKey}/transitions`);
        const data = await res.json();
        setTransitions(Array.isArray(data) ? data : []);
      } finally {
        setLoadingTransitions(false);
      }
    }
  }

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

  return (
    <tr className="border-b last:border-0 hover:bg-muted/20 transition-colors align-top">
      {/* Story ID */}
      <td className="py-3 pr-3 align-top">
        {milestone.issueKey && milestone.browseUrl ? (
          <a
            href={milestone.browseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono text-[#9333EA]/70 hover:text-[#9333EA] hover:underline whitespace-nowrap"
          >
            {milestone.issueKey}
          </a>
        ) : (
          <span className="text-[10px] font-mono text-gray-400">{milestone.issueKey || "—"}</span>
        )}
      </td>

      {/* Milestone / story name — editable */}
      <td className="py-3 pr-4 text-xs font-semibold text-gray-800 align-top">
        {editingStoryTitle ? (
          <input
            autoFocus
            value={storyTitleText}
            onChange={(e) => setStoryTitleText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); saveStoryTitle(); }
              if (e.key === "Escape") { setEditingStoryTitle(false); setStoryTitleText(storyTitle); }
            }}
            onBlur={saveStoryTitle}
            disabled={savingStoryTitle}
            className="text-xs font-semibold w-full bg-transparent border-0 outline-none p-0"
          />
        ) : (
          <div className="group/stitle flex items-start gap-1">
            <span className="flex-1">{storyTitle}</span>
            {canEdit && (
              <button
                onClick={() => { setStoryTitleText(storyTitle); setEditingStoryTitle(true); }}
                className="opacity-0 group-hover/stitle:opacity-50 hover:!opacity-100 shrink-0 text-gray-400 hover:text-[#9333EA] transition-opacity"
                title="Edit story title"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </td>

      {/* Status */}
      <td className="py-3 pr-4 align-top">
        <StatusCell
          canEdit={canEdit}
          effectiveStatus={effectiveStatus}
          posted={posted.status}
          loading={loadingTransitions}
          transitions={transitions}
          open={activeField === "status"}
          onOpen={openStatusEdit}
          onSelect={(id, name) => saveTransition(id, name)}
          onClose={() => setActiveField(null)}
        />
      </td>

      {/* Owner */}
      <td className="py-3 pr-4 align-top min-w-[130px]">
        {activeField === "owner" ? (
          <div className="relative">
            <input
              ref={userInputRef}
              autoFocus
              type="text"
              className="text-xs border border-gray-200 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
              value={userQuery}
              onChange={(e) => handleUserQueryChange(e.target.value)}
              onBlur={() => setTimeout(() => { setActiveField(null); setShowUserDropdown(false); }, 150)}
              placeholder="Search name…"
            />
            {showUserDropdown && userResults.length > 0 && (
              <div className="absolute z-50 left-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg w-48 max-h-40 overflow-y-auto">
                {userResults.map((u) => (
                  <button
                    key={u.accountId}
                    className="w-full text-left text-xs px-3 py-2 hover:bg-[#F0EBF8] hover:text-[#9333EA]"
                    onMouseDown={() => saveOwner(u)}
                  >
                    {u.displayName}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            className={canEdit ? "cursor-pointer group inline-flex items-center gap-1 rounded px-1 py-0.5 -mx-1 hover:bg-[#F0EBF8] transition-colors text-gray-600 text-xs" : "text-gray-600 text-xs"}
            onClick={() => canEdit && setActiveField("owner")}
            title={canEdit ? "Click to change owner" : ""}
          >
            {posted.owner ? (
              <StruckThen prev={posted.owner.prev} current={posted.owner.current} />
            ) : (
              <span className="">{effectiveOwner}</span>
            )}
            {canEdit && (
              <ChevronDown className="h-3 w-3 text-[#9333EA]/30 group-hover:text-[#9333EA]/80 transition-colors" />
            )}
          </div>
        )}
      </td>

      {/* Target Date */}
      <td className="py-3 pr-4 align-top whitespace-nowrap">
        {activeField === "date" ? (
          <input
            autoFocus
            type="date"
            className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
            defaultValue={effectiveDate !== "TBD" ? effectiveDate : ""}
            onFocus={(e) => { dateValueRef.current = e.target.value; }}
            onChange={(e) => { dateValueRef.current = e.target.value; }}
            onBlur={saveDate}
          />
        ) : (
          <div
            className={canEdit ? "cursor-pointer group inline-flex items-center gap-1 rounded px-1 py-0.5 -mx-1 hover:bg-[#F0EBF8] transition-colors text-gray-600 text-xs" : "text-gray-600 text-xs"}
            onClick={() => canEdit && setActiveField("date")}
            title={canEdit ? "Click to change date" : ""}
          >
            {posted.targetDate ? (
              <StruckThen prev={posted.targetDate.prev} current={posted.targetDate.current} />
            ) : (
              <span className="">{effectiveDate}</span>
            )}
            {canEdit && (
              <ChevronDown className="h-3 w-3 text-[#9333EA]/30 group-hover:text-[#9333EA]/80 transition-colors" />
            )}
          </div>
        )}
      </td>

      {/* Status Notes */}
      <td className="py-3 pr-4 align-top">
        {activeField === "notes" ? (
          <textarea
            ref={noteRef}
            autoFocus
            rows={3}
            className="text-xs border border-gray-200 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-[#9333EA] resize-none"
            defaultValue={effectiveNote ?? ""}
            onBlur={saveNote}
          />
        ) : (
          <div
            className={canEdit ? "cursor-pointer group flex items-start gap-1 rounded px-1 py-0.5 -mx-1 hover:bg-[#F0EBF8] transition-colors text-gray-600 text-xs" : "text-gray-600 text-xs"}
            onClick={() => canEdit && setActiveField("notes")}
            title={canEdit ? "Click to edit status notes" : ""}
          >
            <span className="flex-1">
              {posted.statusNote ? (
                <StruckThen prev={posted.statusNote.prev || "—"} current={posted.statusNote.current || "—"} />
              ) : (
                <span>{effectiveNote || "—"}</span>
              )}
            </span>
            {canEdit && (
              <span className="text-[#9333EA]/30 group-hover:text-[#9333EA]/80 text-xs transition-colors shrink-0 mt-0.5">✎</span>
            )}
          </div>
        )}
      </td>

      {/* Actions */}
      <td className="py-3 align-top text-right">
        <div className="flex items-center justify-end gap-1">
          {savingField && <Loader2 className="h-3 w-3 animate-spin text-[#9333EA]" />}
          {saveError && (
            <span className="text-xs text-red-500 max-w-[120px] truncate" title={saveError}>⚠ {saveError}</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="View conversation / message on Slack"
            onClick={onOpenConversation}
          >
            <MessageSquare className={`h-3.5 w-3.5 ${slackConfigured ? "text-[#9333EA]" : "text-muted-foreground"}`} />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ── Labels editor ─────────────────────────────────────────────
function LabelsEditor({ epicKey, initialLabels }: { epicKey: string; initialLabels: string[] }) {
  const [labels, setLabels] = useState<string[]>(initialLabels);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveLabels(next: string[]) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/jira/issues/${epicKey}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labels: next }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      setLabels(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function addLabel() {
    const val = input.trim().replace(/\s+/g, "-");
    if (!val || labels.includes(val)) { setInput(""); return; }
    saveLabels([...labels, val]);
    setInput("");
  }

  function removeLabel(label: string) {
    saveLabels(labels.filter((l) => l !== label));
  }

  return (
    <div className="py-3 border-b">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium shrink-0">Labels:</span>
        {labels.map((l) => (
          <span key={l} className="inline-flex items-center gap-1 text-xs bg-[#F3EEFF] text-[#9333EA] border border-[#D4B8F0] rounded-full px-2 py-0.5 font-medium">
            {l}
            <button
              onClick={() => removeLabel(l)}
              disabled={saving}
              className="hover:text-red-500 transition-colors disabled:opacity-40"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLabel(); } }}
          onBlur={addLabel}
          placeholder="Add label…"
          disabled={saving}
          className="text-xs border border-gray-200 rounded-full px-2.5 py-0.5 outline-none focus:ring-1 focus:ring-[#9333EA] focus:border-[#9333EA] min-w-[90px] disabled:opacity-40"
        />
        {saving && <Loader2 className="h-3 w-3 animate-spin text-[#9333EA] shrink-0" />}
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    </div>
  );
}

// ── Main drawer ───────────────────────────────────────────────
const SLACK_CONFIGURED = !!process.env.NEXT_PUBLIC_SLACK_CONFIGURED;

interface Props {
  epic: JiraEpic;
  open: boolean;
  onClose: () => void;
}

export function DetailsDrawer({ epic, open, onClose }: Props) {
  const { milestones, error, isLoading } = useDetails(open ? epic.key : null, open ? epic : null);
  const [conversationMilestone, setConversationMilestone] = useState<MilestoneItem | null>(null);
  const [slackStatusOpen, setSlackStatusOpen] = useState(false);

  // ── Epic title editing ────────────────────────────────────────
  const [epicTitle, setEpicTitle] = useState(epic.fields.summary);
  const [editingEpicTitle, setEditingEpicTitle] = useState(false);
  const [epicTitleText, setEpicTitleText] = useState(epic.fields.summary);
  const [savingEpicTitle, setSavingEpicTitle] = useState(false);

  async function saveEpicTitle() {
    const trimmed = epicTitleText.trim();
    if (!trimmed || trimmed === epicTitle) { setEditingEpicTitle(false); return; }
    setSavingEpicTitle(true);
    try {
      await fetch(`/api/jira/issues/${epic.key}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: trimmed }),
      });
      setEpicTitle(trimmed);
    } finally {
      setSavingEpicTitle(false);
      setEditingEpicTitle(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent
          className="w-[92vw] sm:max-w-[92vw] overflow-hidden flex flex-col"
          style={{ maxHeight: "85vh" }}
        >
          <DialogHeader className="shrink-0 pb-2 border-b">
            <div className="flex items-start justify-between gap-3 pr-8">
              <div className="flex-1 min-w-0">
                {epic.browseUrl ? (
                  <a href={epic.browseUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground font-mono hover:text-[#9333EA] hover:underline">{epic.key}</a>
                ) : (
                  <p className="text-xs text-muted-foreground font-mono">{epic.key}</p>
                )}
                {editingEpicTitle ? (
                  <input
                    autoFocus
                    value={epicTitleText}
                    onChange={(e) => setEpicTitleText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); saveEpicTitle(); }
                      if (e.key === "Escape") { setEditingEpicTitle(false); setEpicTitleText(epicTitle); }
                    }}
                    onBlur={saveEpicTitle}
                    disabled={savingEpicTitle}
                    className="text-sm font-semibold w-full bg-transparent border-0 outline-none p-0 leading-tight"
                  />
                ) : (
                  <DialogTitle
                    className="text-sm leading-tight font-semibold cursor-pointer hover:text-[#9333EA] transition-colors"
                    onClick={() => { setEpicTitleText(epicTitle); setEditingEpicTitle(true); }}
                    title="Click to edit title"
                  >
                    {epicTitle}
                  </DialogTitle>
                )}
              </div>
              <button
                onClick={() => setSlackStatusOpen(true)}
                className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#4A154B] hover:bg-[#3a1039] px-3 py-1.5 rounded-lg transition-colors mt-1"
                title="Send status to Slack"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                </svg>
                Send to Slack
              </button>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto flex-1">
            <LabelsEditor epicKey={epic.key} initialLabels={epic.fields.labels ?? []} />
            <div className="flex items-center justify-between py-3">
              <h3 className="text-sm font-semibold">Milestones Status</h3>
              {!isLoading && milestones.some((m) => m.issueKey) && (
                <p className="text-xs text-muted-foreground">Click any field to edit · Changes save automatically</p>
              )}
            </div>

            {isLoading && (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            )}

            {error && <p className="text-sm text-red-600">Failed to load milestone details.</p>}

            {!isLoading && !error && milestones.length === 0 && (
              <p className="text-sm text-muted-foreground">No stories found for this epic.</p>
            )}

            {!isLoading && !error && milestones.length > 0 && (
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 pr-3 font-semibold w-[8%]">ID</th>
                    <th className="text-left py-2 pr-4 font-semibold w-[15%]">Milestone</th>
                    <th className="text-left py-2 pr-4 font-semibold w-[11%]">
                      <span className="flex items-center gap-1">Status <ChevronDown className="h-3 w-3 text-[#9333EA]/50" /></span>
                    </th>
                    <th className="text-left py-2 pr-4 font-semibold w-[12%]">
                      <span className="flex items-center gap-1">Owner <ChevronDown className="h-3 w-3 text-[#9333EA]/50" /></span>
                    </th>
                    <th className="text-left py-2 pr-4 font-semibold w-[9%]">
                      <span className="flex items-center gap-1">Target Date <ChevronDown className="h-3 w-3 text-[#9333EA]/50" /></span>
                    </th>
                    <th className="text-left py-2 pr-4 font-semibold w-[35%]">
                      <span className="flex items-center gap-1">Status Notes <ChevronDown className="h-3 w-3 text-[#9333EA]/50" /></span>
                    </th>
                    <th className="w-[10%]" />
                  </tr>
                </thead>
                <tbody>
                  {milestones.map((m, i) => (
                    <MilestoneRow
                      key={m.issueKey || i}
                      milestone={m}
                      slackConfigured={SLACK_CONFIGURED}
                      onOpenConversation={() => setConversationMilestone(m)}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {conversationMilestone && (
        <SlackMessageDialog
          open={!!conversationMilestone}
          onClose={() => setConversationMilestone(null)}
          epicKey={epic.key}
          epicName={epic.fields.summary}
          milestoneName={conversationMilestone.name}
          ownerName={conversationMilestone.owner}
          ownerEmail={conversationMilestone.ownerEmail}
          slackConfigured={SLACK_CONFIGURED}
        />
      )}

      <SlackStatusDialog
        open={slackStatusOpen}
        onClose={() => setSlackStatusOpen(false)}
        epic={epic}
        milestones={milestones}
        tldr={extractOurSummaryText(epic.fields.description) || undefined}
      />
    </>
  );
}
