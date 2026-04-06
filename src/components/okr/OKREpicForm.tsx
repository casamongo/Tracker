"use client";

import { useState, useRef } from "react";
import { Loader2, X } from "lucide-react";
import type { OKROutcome, OKRPriority } from "@/types/okr";
import type { JiraEpic } from "@/types/jira";
import type { ProjectEntry } from "@/lib/projects";
import { CUSTOM_FIELDS } from "@/lib/jira/client";

const OUTCOMES: OKROutcome[] = ["POC", "Dogfooding", "Preview", "GA"];
const PRIORITIES: OKRPriority[] = ["P0", "P1", "P2", "P3", "P4"];

const QUARTER_OPTIONS = Array.from({ length: 3 }, (_, yi) => 2025 + yi)
  .flatMap((year) => [1, 2, 3, 4].map((q) => `Q${q} ${year}`));

const OUTCOME_PREFIX_REGEX = /^\[(POC|Dogfooding|Preview|GA)\]\s*/;

function stripOutcomePrefix(summary: string): { summary: string; outcome: OKROutcome } {
  const match = summary.match(OUTCOME_PREFIX_REGEX);
  if (match) {
    return {
      summary: summary.replace(OUTCOME_PREFIX_REGEX, "").trim(),
      outcome: match[1] as OKROutcome,
    };
  }
  return { summary, outcome: "GA" };
}

const PRIORITY_REVERSE: Record<string, OKRPriority> = {
  Top: "P0",
  Highest: "P1",
  High: "P2",
  Medium: "P3",
  Low: "P4",
};

interface Props {
  projectKey: string;
  objectiveNumber: number;
  krIndex: number;
  quarter: string;
  okrPrefix: string;
  /** When set, the form is in edit mode */
  editingEpic?: JiraEpic | null;
  defaultQuarterStart?: string;
  defaultQuarterEnd?: string;
  /** When true, hides the outer container and header — used inside OKREpicPanel */
  embedded?: boolean;
  /** When provided, shows a project selector (program mode) */
  availableProjects?: ProjectEntry[];
  onCreated: (epic: JiraEpic & { browseUrl?: string }) => void;
  onCancel: () => void;
}

export function OKREpicForm({
  projectKey: projectKeyProp,
  objectiveNumber,
  krIndex,
  quarter,
  okrPrefix,
  editingEpic,
  defaultQuarterStart = "",
  defaultQuarterEnd = "",
  embedded = false,
  availableProjects,
  onCreated,
  onCancel,
}: Props) {
  const isProgramMode = !!availableProjects && availableProjects.length > 0 && !editingEpic;
  const [selectedProjectKey, setSelectedProjectKey] = useState(projectKeyProp || "");
  const projectKey = isProgramMode ? selectedProjectKey : projectKeyProp;
  const isEdit = !!editingEpic;

  const parsed = editingEpic
    ? stripOutcomePrefix(editingEpic.fields.summary)
    : { summary: "", outcome: "GA" as OKROutcome };

  const [summary, setSummary] = useState(parsed.summary);
  const [outcome, setOutcome] = useState<OKROutcome>(parsed.outcome);
  const [priority, setPriority] = useState<OKRPriority>(
    editingEpic
      ? (PRIORITY_REVERSE[editingEpic.fields.priority?.name ?? ""] ?? "P2")
      : "P2"
  );
  const [quarterStart, setQuarterStart] = useState(() => {
    if (!editingEpic) return defaultQuarterStart;
    return (
      localStorage.getItem(`okr-qs-${editingEpic.key}`) ||
      String((editingEpic.fields as Record<string, unknown>)[CUSTOM_FIELDS.QUARTER_START] ?? "") ||
      defaultQuarterStart
    );
  });
  const [quarterEnd, setQuarterEnd] = useState(() => {
    if (!editingEpic) return defaultQuarterEnd;
    return (
      localStorage.getItem(`okr-qe-${editingEpic.key}`) ||
      String((editingEpic.fields as Record<string, unknown>)[CUSTOM_FIELDS.QUARTER_COMPLETION] ?? "") ||
      defaultQuarterEnd
    );
  });

  const [assigneeAccountId, setAssigneeAccountId] = useState(
    editingEpic?.fields.assignee ? (editingEpic.fields.assignee as { accountId?: string }).accountId ?? "" : ""
  );
  const [assigneeDisplay, setAssigneeDisplay] = useState(
    editingEpic?.fields.assignee?.displayName ?? ""
  );
  const [userQuery, setUserQuery] = useState(editingEpic?.fields.assignee?.displayName ?? "");
  const [userResults, setUserResults] = useState<{ accountId: string; displayName: string }[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const OKR_LABEL_REGEX = /^[a-z]+-q\d+-\d+-o\d+-kr\d+$|^[a-z]+-o\d+-kr\d+$|^okr$/;
  const [extraLabels, setExtraLabels] = useState<string[]>(() => {
    if (!editingEpic) return [];
    return (editingEpic.fields.labels ?? []).filter((l) => !OKR_LABEL_REGEX.test(l));
  });
  const [labelInput, setLabelInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleUserQuery(q: string) {
    setUserQuery(q);
    setShowUserDropdown(false);
    setAssigneeAccountId("");
    setAssigneeDisplay("");
    if (userTimer.current) clearTimeout(userTimer.current);
    if (q.length < 2) { setUserResults([]); return; }
    userTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/jira/users/search?query=${encodeURIComponent(q)}`);
      const data = await res.json();
      setUserResults(Array.isArray(data) ? data : []);
      setShowUserDropdown(true);
    }, 300);
  }

  function selectUser(user: { accountId: string; displayName: string }) {
    setAssigneeAccountId(user.accountId);
    setAssigneeDisplay(user.displayName);
    setUserQuery(user.displayName);
    setShowUserDropdown(false);
    setUserResults([]);
  }

  function addLabel(raw: string) {
    const val = raw.trim().replace(/\s+/g, "-").toLowerCase();
    if (!val || extraLabels.includes(val) || OKR_LABEL_REGEX.test(val)) return;
    setExtraLabels((prev) => [...prev, val]);
  }

  function handleLabelKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addLabel(labelInput);
      setLabelInput("");
    } else if (e.key === "Backspace" && labelInput === "" && extraLabels.length > 0) {
      setExtraLabels((prev) => prev.slice(0, -1));
    }
  }

  function removeLabel(label: string) {
    setExtraLabels((prev) => prev.filter((l) => l !== label));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!summary.trim()) return;

    if (isProgramMode && !selectedProjectKey) return;
    setSaving(true);
    setError(null);

    const quarterSlug = quarter.toLowerCase().replace("_", "-");
    const label = `${okrPrefix}-${quarterSlug}-o${objectiveNumber}-kr${krIndex}`;

    try {
      if (isEdit && editingEpic) {
        const prefix = `[${outcome}]`;
        const newSummary = `${prefix} ${summary.trim()}`;
        const mergedLabels = [...new Set(["okr", okrPrefix, label, ...extraLabels])];

        const updateBody: Record<string, unknown> = {
          summary: newSummary,
          priorityName: { P0: "Top", P1: "Highest", P2: "High", P3: "Medium", P4: "Low" }[priority],
          assigneeAccountId: assigneeAccountId || null,
          labels: mergedLabels,
        };
        if (quarterStart) updateBody.quarterStart = quarterStart;
        if (quarterEnd) updateBody.quarterEnd = quarterEnd;

        const res = await fetch(`/api/jira/issues/${editingEpic.key}/update`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateBody),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error ?? `Jira update failed (${res.status})`);
        }

        // Persist quarter values locally so re-edit always has them
        if (quarterStart) localStorage.setItem(`okr-qs-${editingEpic.key}`, quarterStart);
        else localStorage.removeItem(`okr-qs-${editingEpic.key}`);
        if (quarterEnd) localStorage.setItem(`okr-qe-${editingEpic.key}`, quarterEnd);
        else localStorage.removeItem(`okr-qe-${editingEpic.key}`);

        onCreated({
          ...editingEpic,
          fields: {
            ...editingEpic.fields,
            summary: newSummary,
            labels: mergedLabels,
            assignee: assigneeAccountId
              ? { displayName: assigneeDisplay }
              : editingEpic.fields.assignee,
          },
        });
      } else {
        const mergedLabels: string[] = [...new Set(["okr", okrPrefix, label, ...extraLabels])];
        const res = await fetch("/api/jira/epics/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectKey,
            summary: summary.trim(),
            outcome,
            priority,
            quarterStart: quarterStart || undefined,
            quarterEnd: quarterEnd || undefined,
            assigneeAccountId: assigneeAccountId || undefined,
            labels: mergedLabels,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to create epic");

        // Persist quarter values locally for the new epic
        if (quarterStart) localStorage.setItem(`okr-qs-${data.key}`, quarterStart);
        if (quarterEnd) localStorage.setItem(`okr-qe-${data.key}`, quarterEnd);

        const prefix = `[${outcome}]`;
        const fullSummary = `${prefix} ${summary.trim()}`;
        const PRIORITY_MAP: Record<string, string> = { P0: "Top", P1: "Highest", P2: "High", P3: "Medium", P4: "Low" };
        onCreated({
          ...data,
          fields: {
            summary: fullSummary,
            status: { name: "To Do" },
            priority: { name: PRIORITY_MAP[priority] ?? "Medium" },
            labels: mergedLabels,
            assignee: assigneeAccountId ? { displayName: assigneeDisplay } : null,
            description: null,
            comment: { comments: [] },
            subtasks: [],
          },
        });
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9333EA] focus:border-transparent";
  const labelClass = "block text-xs font-medium text-gray-600 mb-1";

  const formContent = (
    <>
      {!embedded && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-gray-700">
            {isEdit ? "Edit Epic" : "Add Epic"}
          </span>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Project selector — program mode only */}
      {isProgramMode && (
        <div>
          <label className={labelClass}>Jira Project *</label>
          <select
            value={selectedProjectKey}
            onChange={(e) => setSelectedProjectKey(e.target.value)}
            required
            className={inputClass}
          >
            <option value="">Select project…</option>
            {availableProjects!.map((p) => (
              <option key={p.key} value={p.key}>
                {p.key} — {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Summary */}
      <div>
        <label className={labelClass}>Summary *</label>
        <input
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Epic summary..."
          required
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Outcome */}
        <div>
          <label className={labelClass}>Outcome</label>
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as OKROutcome)}
            className={inputClass}
          >
            {OUTCOMES.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className={labelClass}>Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as OKRPriority)}
            className={inputClass}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Quarter Start */}
        <div>
          <label className={labelClass}>Quarter Start</label>
          <select
            value={quarterStart}
            onChange={(e) => setQuarterStart(e.target.value)}
            className={inputClass}
          >
            <option value="">—</option>
            {QUARTER_OPTIONS.map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>

        {/* Quarter End */}
        <div>
          <label className={labelClass}>Quarter End</label>
          <select
            value={quarterEnd}
            onChange={(e) => setQuarterEnd(e.target.value)}
            className={inputClass}
          >
            <option value="">—</option>
            {QUARTER_OPTIONS.map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Assignee */}
      <div className="relative">
        <label className={labelClass}>Assignee</label>
        <input
          type="text"
          value={userQuery}
          onChange={(e) => handleUserQuery(e.target.value)}
          placeholder="Search by name..."
          className={inputClass}
          autoComplete="off"
        />
        {showUserDropdown && userResults.length > 0 && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
            {userResults.map((u) => (
              <button
                key={u.accountId}
                type="button"
                onClick={() => selectUser(u)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 hover:text-[#9333EA]"
              >
                {u.displayName}
              </button>
            ))}
          </div>
        )}
        {assigneeDisplay && assigneeAccountId && (
          <p className="text-xs text-[#9333EA] mt-1">✓ {assigneeDisplay}</p>
        )}
      </div>

      {/* Labels */}
      <div>
        <label className={labelClass}>Labels</label>
        <div className="flex flex-wrap gap-1.5 border border-gray-300 rounded-md px-3 py-1.5 min-h-[34px] focus-within:ring-2 focus-within:ring-[#9333EA] focus-within:border-transparent">
          {/* Auto-generated OKR labels (read-only) */}
          {[...new Set(["okr", okrPrefix, `${okrPrefix}-${quarter.toLowerCase().replace("_", "-")}-o${objectiveNumber}-kr${krIndex}`])].map((l) => (
            <span key={l} className="inline-flex items-center text-xs bg-purple-100 text-purple-700 rounded px-1.5 py-0.5">
              {l}
            </span>
          ))}
          {/* User-added labels */}
          {extraLabels.map((l) => (
            <span key={l} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 rounded px-1.5 py-0.5">
              {l}
              <button type="button" onClick={() => removeLabel(l)} className="hover:text-red-500">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            onKeyDown={handleLabelKeyDown}
            onBlur={() => { if (labelInput) { addLabel(labelInput); setLabelInput(""); } }}
            placeholder={extraLabels.length === 0 ? "Add label, press Enter..." : ""}
            className="flex-1 min-w-[120px] text-sm outline-none bg-transparent"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        {!embedded && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving || !summary.trim() || (isProgramMode && !selectedProjectKey)}
          className="px-4 py-1.5 text-sm font-medium bg-[#A855F7] text-white rounded-md hover:bg-[#9333EA] disabled:opacity-50 flex items-center gap-1.5"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isEdit ? "Save" : "Create Epic"}
        </button>
      </div>
    </>
  );

  if (embedded) {
    return <form onSubmit={handleSubmit} className="space-y-3">{formContent}</form>;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-[#A855F7]/30 rounded-lg p-4 space-y-3 shadow-sm"
    >
      {formContent}
    </form>
  );
}
