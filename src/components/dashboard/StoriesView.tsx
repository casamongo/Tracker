"use client";

import React, { useState, useRef } from "react";
import { ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getStatusColor, classifySwimlane, adfToPlainText } from "@/lib/utils";
import { CUSTOM_FIELDS } from "@/lib/jira/client";
import type { JiraEpic, JiraStory, AdfDoc } from "@/types/jira";
import type { SwimlaneKey } from "@/lib/utils";

const SWIMLANE_ORDER: SwimlaneKey[] = ["OKR", "ENG Work", "Intake", "Others"];

const SWIMLANE_HEADER: Record<SwimlaneKey, string> = {
  OKR:        "bg-gradient-to-r from-[#DDD6FE] to-[#EDE9FE]",
  "ENG Work": "bg-gradient-to-r from-[#BFDBFE] to-[#DBEAFE]",
  Intake:     "bg-gradient-to-r from-[#FDE68A] to-[#FEF3C7]",
  Others:     "bg-gradient-to-r from-[#D1D5DB] to-[#E5E7EB]",
};
const SWIMLANE_BORDER: Record<SwimlaneKey, string> = {
  OKR:        "border-[#C4B5FD]",
  "ENG Work": "border-[#93C5FD]",
  Intake:     "border-[#FCD34D]",
  Others:     "border-gray-300",
};
const SWIMLANE_TEXT: Record<SwimlaneKey, string> = {
  OKR:        "text-[#6D28D9]",
  "ENG Work": "text-[#1E3A8A]",
  Intake:     "text-[#78350F]",
  Others:     "text-gray-700",
};
const SWIMLANE_DOT: Record<SwimlaneKey, string> = {
  OKR:        "bg-[#A78BFA]",
  "ENG Work": "bg-[#60A5FA]",
  Intake:     "bg-[#FBBF24]",
  Others:     "bg-gray-400",
};
const SWIMLANE_CONTENT_BG: Record<SwimlaneKey, string> = {
  OKR:        "bg-gradient-to-b from-[#F3EEFF] to-[#FAF7FF]",
  "ENG Work": "bg-gradient-to-b from-[#EFF6FF] to-[#F5F9FF]",
  Intake:     "bg-gradient-to-b from-[#FFFBEB] to-[#FFFDF5]",
  Others:     "bg-gradient-to-b from-gray-100 to-gray-50",
};
const SWIMLANE_COUNT: Record<SwimlaneKey, string> = {
  OKR:        "bg-[#C4B5FD]/50 text-[#6D28D9]",
  "ENG Work": "bg-[#93C5FD]/50 text-[#1E3A8A]",
  Intake:     "bg-[#FCD34D]/50 text-[#78350F]",
  Others:     "bg-gray-300/60 text-gray-700",
};

async function jiraUpdate(key: string, body: Record<string, unknown>) {
  await fetch(`/api/jira/issues/${key}/update`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── Editable story row ─────────────────────────────────────────
function StoryRow({ story, indent = false }: { story: JiraStory; indent?: boolean }) {
  const statusNotes = adfToPlainText(
    (story.fields as Record<string, unknown>)[CUSTOM_FIELDS.STATUS_NOTES] as AdfDoc | string | null | undefined
  );

  const [currentStatus, setCurrentStatus] = useState(story.fields.status.name);
  const [currentAssignee, setCurrentAssignee] = useState(story.fields.assignee?.displayName ?? "");
  const [currentDate, setCurrentDate] = useState(story.fields.duedate ?? "");
  const [currentNotes, setCurrentNotes] = useState(statusNotes);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const [transitions, setTransitions] = useState<{ id: string; name: string }[] | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [loadingTransitions, setLoadingTransitions] = useState(false);

  const [assigneeEditing, setAssigneeEditing] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<{ accountId: string; displayName: string }[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [notesEditing, setNotesEditing] = useState(false);
  const [draftNotes, setDraftNotes] = useState(statusNotes);

  async function openStatus() {
    setStatusOpen(true);
    if (!transitions && !loadingTransitions) {
      setLoadingTransitions(true);
      try {
        const res = await fetch(`/api/jira/issues/${story.key}/transitions`);
        const data = await res.json();
        setTransitions(Array.isArray(data) ? data : []);
      } finally { setLoadingTransitions(false); }
    }
  }

  async function applyTransition(id: string, name: string) {
    setStatusOpen(false); setCurrentStatus(name);
    setSaving((s) => ({ ...s, status: true }));
    await jiraUpdate(story.key, { transitionId: id });
    setSaving((s) => ({ ...s, status: false }));
  }

  function handleUserQuery(q: string) {
    setUserQuery(q); setShowUserDropdown(false);
    if (userSearchTimer.current) clearTimeout(userSearchTimer.current);
    if (q.length < 2) { setUserResults([]); return; }
    userSearchTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/jira/users/search?query=${encodeURIComponent(q)}`);
      const data = await res.json();
      setUserResults(Array.isArray(data) ? data : []);
      setShowUserDropdown(true);
    }, 300);
  }

  async function applyAssignee(user: { accountId: string; displayName: string }) {
    setAssigneeEditing(false); setShowUserDropdown(false); setUserQuery("");
    setCurrentAssignee(user.displayName);
    setSaving((s) => ({ ...s, assignee: true }));
    await jiraUpdate(story.key, { assigneeAccountId: user.accountId });
    setSaving((s) => ({ ...s, assignee: false }));
  }

  async function applyDate(value: string) {
    setCurrentDate(value);
    setSaving((s) => ({ ...s, date: true }));
    await jiraUpdate(story.key, { duedate: value || null });
    setSaving((s) => ({ ...s, date: false }));
  }

  async function applyNotes() {
    setNotesEditing(false); setCurrentNotes(draftNotes);
    setSaving((s) => ({ ...s, notes: true }));
    await jiraUpdate(story.key, { statusNote: draftNotes || null });
    setSaving((s) => ({ ...s, notes: false }));
  }

  const issuetype = story.fields.issuetype.name;
  const typeColor = issuetype.toLowerCase().includes("sub") || issuetype.toLowerCase().includes("task")
    ? "text-blue-500 bg-blue-50 border-blue-200"
    : "text-purple-500 bg-purple-50 border-purple-200";

  const cell = "px-3 py-2 align-top";

  return (
    <tr className={`border-b border-gray-50 hover:bg-gray-50/70 transition-colors align-top ${indent ? "bg-gray-50/30" : ""}`}>
      <td className={cell}>
        <div className="flex items-start gap-2" style={{ paddingLeft: indent ? "1.5rem" : "0" }}>
          {indent && <span className="text-gray-300 shrink-0 mt-0.5 text-xs">↳</span>}
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border shrink-0 mt-0.5 ${typeColor}`}>
            {issuetype}
          </span>
          <div className="min-w-0">
            {story.browseUrl ? (
              <a
                href={story.browseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-blue-500 hover:text-blue-700 text-xs mr-1 hover:underline"
              >
                {story.key}
              </a>
            ) : (
              <span className="font-mono text-gray-400 text-xs mr-1">{story.key}</span>
            )}
            <span className="text-xs text-gray-800 font-medium leading-snug">{story.fields.summary}</span>
          </div>
        </div>
      </td>

      <td className={cell}>
        <div className="relative inline-block">
          <button onClick={openStatus} className="group inline-flex items-center gap-0.5 hover:opacity-80 transition-opacity">
            {saving.status ? <Loader2 className="h-3 w-3 animate-spin text-gray-400" /> : (
              <>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(currentStatus)}`}>
                  {loadingTransitions ? <Loader2 className="h-3 w-3 animate-spin" /> : currentStatus}
                </span>
                <ChevronDown className="h-3 w-3 text-gray-400 group-hover:text-[#9333EA]" />
              </>
            )}
          </button>
          {statusOpen && transitions && (
            <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-xl min-w-[160px] py-1">
              {transitions.map((t) => (
                <button key={t.id} className="w-full text-left px-3 py-2 hover:bg-[#F0EBF8] transition-colors" onMouseDown={() => applyTransition(t.id, t.name)}>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(t.name)}`}>{t.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </td>

      <td className={cell}>
        {assigneeEditing ? (
          <div className="relative">
            <input autoFocus type="text" className="text-xs border border-gray-200 rounded px-2 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
              value={userQuery} onChange={(e) => handleUserQuery(e.target.value)}
              onBlur={() => setTimeout(() => { setAssigneeEditing(false); setShowUserDropdown(false); setUserQuery(""); }, 150)}
              placeholder="Search…" />
            {showUserDropdown && userResults.length > 0 && (
              <div className="absolute z-50 left-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg w-44 max-h-40 overflow-y-auto">
                {userResults.map((u) => (
                  <button key={u.accountId} className="w-full text-left text-xs px-3 py-2 hover:bg-[#F0EBF8]" onMouseDown={() => applyAssignee(u)}>{u.displayName}</button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => { setAssigneeEditing(true); setUserQuery(""); }} className="group inline-flex items-center gap-0.5 hover:opacity-80 transition-opacity text-left">
            {saving.assignee ? <Loader2 className="h-3 w-3 animate-spin text-gray-400" /> : (
              <>
                <span className="text-xs text-gray-600 truncate max-w-[110px]">{currentAssignee || <span className="text-gray-300">Unassigned</span>}</span>
                <ChevronDown className="h-3 w-3 text-gray-400 group-hover:text-[#9333EA]" />
              </>
            )}
          </button>
        )}
      </td>

      <td className={`${cell} whitespace-nowrap`}>
        {saving.date ? <Loader2 className="h-3 w-3 animate-spin text-gray-400" /> : (
          <input type="date" className="text-xs text-gray-600 border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-[#9333EA] rounded px-1 cursor-pointer hover:bg-gray-100 transition-colors"
            value={currentDate} onChange={(e) => applyDate(e.target.value)} />
        )}
      </td>

      <td className={cell}>
        {notesEditing ? (
          <textarea autoFocus rows={3} className="text-xs border border-gray-200 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-[#9333EA] resize-none"
            value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} onBlur={applyNotes} />
        ) : (
          <button onClick={() => { setNotesEditing(true); setDraftNotes(currentNotes); }} className="group flex items-start gap-1 w-full text-left hover:bg-gray-100 rounded px-1 py-0.5 -mx-1 transition-colors">
            {saving.notes ? <Loader2 className="h-3 w-3 animate-spin text-gray-400 shrink-0 mt-0.5" /> : (
              <>
                <span className="text-xs text-gray-600 leading-relaxed flex-1">{currentNotes || <span className="text-gray-300">—</span>}</span>
                <span className="text-gray-300 group-hover:text-[#9333EA] text-xs shrink-0 mt-0.5 transition-colors">✎</span>
              </>
            )}
          </button>
        )}
      </td>
    </tr>
  );
}

// ── Sorting ────────────────────────────────────────────────────
type SortCol = "summary" | "status" | "assignee" | "duedate";
type SortDir = "asc" | "desc";

function sortStories(items: JiraStory[], col: SortCol, dir: SortDir): JiraStory[] {
  return [...items].sort((a, b) => {
    let av = "";
    let bv = "";
    if (col === "summary") { av = a.fields.summary; bv = b.fields.summary; }
    else if (col === "status") { av = a.fields.status.name; bv = b.fields.status.name; }
    else if (col === "assignee") { av = a.fields.assignee?.displayName ?? ""; bv = b.fields.assignee?.displayName ?? ""; }
    else if (col === "duedate") { av = a.fields.duedate ?? ""; bv = b.fields.duedate ?? ""; }
    const cmp = av.localeCompare(bv, undefined, { sensitivity: "base" });
    return dir === "asc" ? cmp : -cmp;
  });
}

// ── Story table shared header ──────────────────────────────────
function TableHeader({ sortCol, sortDir, onSort }: {
  sortCol: SortCol | null;
  sortDir: SortDir;
  onSort: (col: SortCol) => void;
}) {
  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col) return <ChevronsUpDown className="h-3 w-3 opacity-30 group-hover:opacity-60" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 text-[#9333EA]" />
      : <ChevronDown className="h-3 w-3 text-[#9333EA]" />;
  }

  function SortableTh({ col, label, className }: { col: SortCol; label: string; className?: string }) {
    return (
      <th className={`text-left px-3 py-2 font-semibold ${className ?? ""}`}>
        <button
          onClick={() => onSort(col)}
          className="group inline-flex items-center gap-1 hover:text-[#9333EA] transition-colors"
        >
          {label}
          <SortIcon col={col} />
        </button>
      </th>
    );
  }

  return (
    <thead>
      <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wide text-xs">
        <SortableTh col="summary" label="Item" className="w-[32%]" />
        <SortableTh col="status" label="Status" className="w-[13%]" />
        <SortableTh col="assignee" label="Assignee" className="w-[14%]" />
        <SortableTh col="duedate" label="Due Date" className="w-[11%]" />
        <th className="text-left px-3 py-2 font-semibold w-[30%]">Status Notes</th>
      </tr>
    </thead>
  );
}

const EPIC_HEADER: Record<SwimlaneKey, string> = {
  OKR:        "bg-[#EDE9FE] hover:bg-[#DDD6FE]",
  "ENG Work": "bg-[#DBEAFE] hover:bg-[#BFDBFE]",
  Intake:     "bg-[#FEF3C7] hover:bg-[#FDE68A]",
  Others:     "bg-gray-100 hover:bg-gray-200",
};

const EPIC_HEADER_TEXT: Record<SwimlaneKey, string> = {
  OKR:        "text-[#A855F7]",
  "ENG Work": "text-[#1E3A8A]",
  Intake:     "text-[#78350F]",
  Others:     "text-gray-700",
};

// ── Epic section with nested children ─────────────────────────
function EpicSection({
  epic, directChildren, childrenByParent, expanded, onToggle, lane,
}: {
  epic: JiraEpic;
  directChildren: JiraStory[];
  childrenByParent: Map<string, JiraStory[]>;
  expanded: boolean;
  onToggle: () => void;
  lane: SwimlaneKey;
}) {
  const [sortCol, setSortCol] = useState<SortCol | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  const sorted = sortCol ? sortStories(directChildren, sortCol, sortDir) : directChildren;
  const totalCount = directChildren.reduce((sum, c) => sum + 1 + (childrenByParent.get(c.key)?.length ?? 0), 0);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-3 bg-white shadow-sm">
      <button onClick={onToggle} className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors text-left ${EPIC_HEADER[lane]}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          {expanded ? <ChevronDown className={`h-3.5 w-3.5 shrink-0 ${EPIC_HEADER_TEXT[lane]}`} /> : <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${EPIC_HEADER_TEXT[lane]}`} />}
          {epic.browseUrl ? (
            <a
              href={epic.browseUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`text-sm font-mono font-semibold shrink-0 opacity-60 hover:opacity-100 underline underline-offset-2 ${EPIC_HEADER_TEXT[lane]}`}
            >
              {epic.key}
            </a>
          ) : (
            <span className={`text-sm font-mono font-semibold shrink-0 opacity-60 ${EPIC_HEADER_TEXT[lane]}`}>{epic.key}</span>
          )}
          <span className={`text-sm font-semibold truncate ${EPIC_HEADER_TEXT[lane]}`}>{epic.fields.summary}</span>
        </div>
        <span className={`ml-3 shrink-0 text-xs font-medium opacity-70 ${EPIC_HEADER_TEXT[lane]}`}>{totalCount} items</span>
      </button>
      {expanded && (
        <div className="overflow-x-auto">
          {directChildren.length === 0 ? (
            <p className="text-xs text-gray-400 italic px-4 py-3">No stories or tasks linked to this epic.</p>
          ) : (
            <table className="w-full text-xs border-collapse">
              <TableHeader sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <tbody>
                {sorted.map((item) => (
                  <React.Fragment key={item.id}>
                    <StoryRow story={item} />
                    {(childrenByParent.get(item.key) ?? []).map((sub) => (
                      <StoryRow key={sub.id} story={sub} indent />
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ── Orphan group ───────────────────────────────────────────────
function OrphanGroup({ title, items, expanded, onToggle }: { title: string; items: JiraStory[]; expanded: boolean; onToggle: () => void }) {
  const [sortCol, setSortCol] = useState<SortCol | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  if (!items.length) return null;
  const sorted = sortCol ? sortStories(items, sortCol, sortDir) : items;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 border-b border-gray-200 hover:bg-gray-200 transition-colors text-left">
        <div className="flex items-center gap-2.5">
          {expanded ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
          <span className="h-2 w-2 rounded-full bg-gray-400" />
          <span className="font-semibold text-sm text-gray-600">{title}</span>
          <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-gray-200 text-gray-500">{items.length}</span>
        </div>
      </button>
      {expanded && (
        <div className="bg-gray-50 p-4">
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <TableHeader sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <tbody>{sorted.map((item) => <StoryRow key={item.id} story={item} />)}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main view ──────────────────────────────────────────────────
interface Props {
  epics: JiraEpic[];
  stories: JiraStory[];
  isLoading: boolean;
}

export function StoriesView({ epics, stories, isLoading }: Props) {
  const [expandedLanes, setExpandedLanes] = useState<Record<string, boolean>>(
    Object.fromEntries(SWIMLANE_ORDER.map((l) => [l, true]))
  );
  const [expandedEpics, setExpandedEpics] = useState<Record<string, boolean>>({});

  function toggleEpic(key: string) {
    setExpandedEpics((v) => ({ ...v, [key]: !(v[key] ?? true) }));
  }

  function collapseAll() {
    setExpandedLanes(Object.fromEntries(SWIMLANE_ORDER.map((l) => [l, false])));
    setExpandedEpics(Object.fromEntries([
      ...epics.map((e) => [e.key, false]),
      ["__orphan_stories", false],
      ["__orphan_tasks", false],
    ]));
  }

  function expandAll() {
    setExpandedLanes(Object.fromEntries(SWIMLANE_ORDER.map((l) => [l, true])));
    setExpandedEpics(Object.fromEntries([
      ...epics.map((e) => [e.key, true]),
      ["__orphan_stories", true],
      ["__orphan_tasks", true],
    ]));
  }

  const epicKeys = new Set(epics.map((e) => e.key));
  const allIssueKeys = new Set(stories.map((s) => s.key));

  // Group all items by their direct parent
  const childrenByParent = new Map<string, JiraStory[]>();
  for (const story of stories) {
    const pk = story.fields.parent?.key;
    if (!pk) continue;
    if (!childrenByParent.has(pk)) childrenByParent.set(pk, []);
    childrenByParent.get(pk)!.push(story);
  }

  // Direct children of epics — stories-first, tasks-fallback per epic
  const epicDirectChildren = new Map<string, JiraStory[]>();
  for (const epic of epics) {
    const all = childrenByParent.get(epic.key) ?? [];
    const epicStories = all.filter((i) => i.fields.issuetype.name.toLowerCase() === "story");
    epicDirectChildren.set(epic.key, epicStories.length > 0 ? epicStories : all);
  }

  // Orphans: no parent at all. If a parent key exists but belongs to a different
  // project's epic (not in our loaded epics), it's still linked — not an orphan.
  const orphans = stories.filter((s) => {
    const pk = s.fields.parent?.key;
    if (!pk) return true; // no parent at all
    if (epicKeys.has(pk)) return false; // direct child of a loaded epic
    if (allIssueKeys.has(pk)) return false; // child of another story/task (subtask)
    return false; // parent exists but is in a different project — still linked
  });

  const orphanStories = orphans.filter((s) => s.fields.issuetype.name.toLowerCase() === "story");
  const orphanTasks = orphans.filter((s) => s.fields.issuetype.name.toLowerCase() !== "story");

  // Swimlane grouping for epics
  const laneEpics: Record<SwimlaneKey, JiraEpic[]> = { OKR: [], "ENG Work": [], Intake: [], Others: [] };
  for (const epic of epics) {
    laneEpics[classifySwimlane(epic.fields.labels)].push(epic);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border rounded-xl overflow-hidden">
            <Skeleton className="h-11 w-full" />
            <div className="p-4 space-y-2">{[...Array(4)].map((_, j) => <Skeleton key={j} className="h-8 w-full" />)}</div>
          </div>
        ))}
      </div>
    );
  }

  const activeLanes = SWIMLANE_ORDER.filter((lane) => laneEpics[lane].length > 0);

  return (
    <div className="space-y-4">
      {/* Collapse / Expand All */}
      <div className="flex items-center justify-end gap-2">
        <button onClick={collapseAll} className="text-xs font-medium text-gray-500 hover:text-[#9333EA] transition-colors px-2 py-1 rounded hover:bg-[#F0EBF8]">
          Collapse All
        </button>
        <span className="text-gray-300 text-xs">|</span>
        <button onClick={expandAll} className="text-xs font-medium text-gray-500 hover:text-[#9333EA] transition-colors px-2 py-1 rounded hover:bg-[#F0EBF8]">
          Expand All
        </button>
      </div>

      {activeLanes.map((lane) => {
        const expanded = expandedLanes[lane];
        const laneItemCount = laneEpics[lane].reduce((sum, e) => {
          const direct = epicDirectChildren.get(e.key) ?? [];
          return sum + direct.reduce((s2, c) => s2 + 1 + (childrenByParent.get(c.key)?.length ?? 0), 0);
        }, 0);

        return (
          <div key={lane} id={`swimlane-${lane}`} className={`rounded-xl border-2 shadow-md overflow-hidden ${SWIMLANE_BORDER[lane]}`}>
            <button onClick={() => setExpandedLanes((v) => ({ ...v, [lane]: !v[lane] }))}
              className={`w-full flex items-center justify-between px-5 py-3.5 transition-opacity hover:opacity-95 ${SWIMLANE_HEADER[lane]}`}>
              <div className="flex items-center gap-2.5">
                {expanded ? <ChevronDown className={`h-4 w-4 ${SWIMLANE_TEXT[lane]}`} /> : <ChevronRight className={`h-4 w-4 ${SWIMLANE_TEXT[lane]}`} />}
                <span className={`h-2 w-2 rounded-full ${SWIMLANE_DOT[lane]}`} />
                <span className={`font-semibold text-sm tracking-wide ${SWIMLANE_TEXT[lane]}`}>{lane}</span>
                <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${SWIMLANE_COUNT[lane]}`}>{laneItemCount} items</span>
              </div>
            </button>
            {expanded && (
              <div className={`p-4 ${SWIMLANE_CONTENT_BG[lane]}`}>
                {laneEpics[lane].map((epic) => (
                  <EpicSection key={epic.key} epic={epic}
                    directChildren={epicDirectChildren.get(epic.key) ?? []}
                    childrenByParent={childrenByParent}
                    expanded={expandedEpics[epic.key] ?? true}
                    onToggle={() => toggleEpic(epic.key)}
                    lane={lane} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Orphan groups — outside swimlanes */}
      {(orphanStories.length > 0 || orphanTasks.length > 0) && (
        <div className="space-y-3 pt-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">Not linked to an epic</p>
          <OrphanGroup title="Stories (no epic)" items={orphanStories}
            expanded={expandedEpics["__orphan_stories"] ?? true}
            onToggle={() => toggleEpic("__orphan_stories")} />
          <OrphanGroup title="Tasks (no epic)" items={orphanTasks}
            expanded={expandedEpics["__orphan_tasks"] ?? true}
            onToggle={() => toggleEpic("__orphan_tasks")} />
        </div>
      )}

      {activeLanes.length === 0 && orphanStories.length === 0 && orphanTasks.length === 0 && (
        <p className="text-center text-muted-foreground py-16">No open items found for this team.</p>
      )}
    </div>
  );
}
