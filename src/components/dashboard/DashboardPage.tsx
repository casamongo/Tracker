"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEpics } from "@/hooks/useEpics";
import { useStoryCounts } from "@/hooks/useStoryCounts";
import { usePersistedFilters } from "@/hooks/usePersistedFilters";
import { useProjects } from "@/hooks/useProjects";
import { classifySwimlane } from "@/lib/utils";
import { Swimlane } from "./Swimlane";
import { TrackerSwimlanes } from "./TrackerSwimlanes";
import { ProgramView } from "./ProgramView";
import { FilterBar } from "./FilterBar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LayoutDashboard, Users, AlertCircle, LayoutGrid, List, Layers } from "lucide-react";
import { useProjectStories } from "@/hooks/useProjectStories";
import { StoriesView } from "./StoriesView";
import { OKRPage } from "@/components/okr/OKRPage";
import type { JiraEpic } from "@/types/jira";
import type { SwimlaneKey } from "@/lib/utils";

const SWIMLANE_ORDER: SwimlaneKey[] = ["OKR", "ENG Work", "Intake", "Others"];

// Selection encoded as "team:IDMPL" or "program:ssi" in the Select value
type SelectionType =
  | { type: "team"; key: string; name: string }
  | { type: "program"; name: string; label: string }
  | null;

function encodeSelection(s: SelectionType): string {
  if (!s) return "";
  return s.type === "team" ? `team:${s.key}` : `program:${s.label}`;
}

interface Props {
  initialProjectKey?: string;
  initialProjectName?: string;
  initialProgramLabel?: string;
  initialProgramName?: string;
}

export function DashboardPage({
  initialProjectKey,
  initialProjectName,
  initialProgramLabel,
  initialProgramName,
}: Props) {
  const router = useRouter();
  const { projects, programs } = useProjects();

  const [selection, setSelection] = useState<SelectionType>(() => {
    if (initialProgramLabel && initialProgramName) {
      return { type: "program", name: initialProgramName, label: initialProgramLabel };
    }
    if (initialProjectKey) {
      return { type: "team", key: initialProjectKey, name: initialProjectName ?? "" };
    }
    return null;
  });

  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});
  const [mainTab, setMainTab] = useState<"tracker" | "okr">("tracker");
  const [view, setView] = useState<"epics" | "stories">("epics");
  const [includeDone, setIncludeDone] = useState(false);

  const isTeam = selection?.type === "team";
  const isProgram = selection?.type === "program";
  const projectKey = isTeam ? selection.key : "";
  const projectName = isTeam ? selection.name : "";
  const programLabel = isProgram ? selection.label : null;
  const programName = isProgram ? selection.name : "";
  const somethingSelected = !!selection;

  function handleStatusChange(epicKey: string, newStatus: string) {
    setStatusOverrides((prev) => ({ ...prev, [epicKey]: newStatus }));
  }

  const { epics, isLoading, error } = useEpics(
    isTeam ? projectKey : null,
    includeDone,
    isProgram ? programLabel : null
  );
  const { counts } = useStoryCounts(isTeam ? projectKey : null);
  const { stories, isLoading: storiesLoading } = useProjectStories(
    isTeam ? projectKey : null,
    view === "stories",
    includeDone
  );
  const { filters, setFilters, presets, savePreset, deletePreset, loadPreset, ready } =
    usePersistedFilters(projectKey || programLabel || "");

  function handleSelectionChange(value: string) {
    setIncludeDone(false);
    setStatusOverrides({});

    if (!value || value === "__none__") {
      setSelection(null);
      router.replace("/dashboard");
      return;
    }

    if (value.startsWith("team:")) {
      const key = value.slice(5);
      const found = projects.find((p) => p.key === key);
      const name = found?.name ?? key;
      setSelection({ type: "team", key, name });
      const params = new URLSearchParams({ projectKey: key, projectName: name });
      router.replace(`/dashboard?${params.toString()}`);
    } else if (value.startsWith("program:")) {
      const label = value.slice(8);
      const found = programs.find((p) => p.label === label);
      const name = found?.name ?? label;
      setSelection({ type: "program", name, label });
      const params = new URLSearchParams({ programLabel: label, programName: name });
      router.replace(`/dashboard?${params.toString()}`);
    }
  }

  const DONE_STATUSES = new Set(["done", "won't do", "canceled", "closed", "complete"]);

  // Apply filters
  const filteredEpics = epics.filter((epic) => {
    const effectiveStatus = (statusOverrides[epic.key] ?? epic.fields.status.name);
    // Hide locally-marked-done epics when includeDone is off
    if (!includeDone && DONE_STATUSES.has(effectiveStatus.toLowerCase())) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(epic.fields.status.name)) return false;
    if (filters.priorities.length > 0 && !filters.priorities.includes(epic.fields.priority?.name ?? "")) return false;
    if (filters.assignees.length > 0 && !filters.assignees.includes(epic.fields.assignee?.displayName ?? "")) return false;
    if (filters.excludedLabels.length > 0 && epic.fields.labels.some((l) => filters.excludedLabels.includes(l))) return false;
    return true;
  });

  const grouped = filteredEpics.reduce<Record<SwimlaneKey, JiraEpic[]>>(
    (acc, epic) => {
      const lane = classifySwimlane(epic.fields.labels);
      acc[lane].push(epic);
      return acc;
    },
    { Intake: [], OKR: [], "ENG Work": [], Others: [] }
  );

  const totalActive =
    filters.statuses.length + filters.priorities.length + filters.assignees.length + filters.excludedLabels.length;

  const needsAttentionCount = filteredEpics.filter((e) => {
    const status = (statusOverrides[e.key] ?? e.fields.status.name).toLowerCase();
    return (
      e.fields.labels.map((l) => l.toLowerCase()).includes("intake") &&
      (status.includes("intake") || status.includes("backlog"))
    );
  }).length;

  function scrollToIntake() {
    document.getElementById("swimlane-Intake")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const dropdownLabel = selection
    ? selection.type === "team"
      ? selection.name
      : `${selection.name}`
    : undefined;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-t-4 border-t-[#9333EA] bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between gap-6">

            {/* Left: logo + title */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#9333EA] to-[#8B5CF6] flex items-center justify-center shrink-0 shadow-md">
                <LayoutDashboard className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 leading-tight">
                Program Dashboard
              </h1>
            </div>

            {/* Center: selector */}
            <div className="flex flex-col gap-1 w-96">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <Users className="h-3.5 w-3.5" />
                Select Team or Program
              </label>
              <Select value={encodeSelection(selection)} onValueChange={handleSelectionChange}>
                <SelectTrigger className="h-11 w-full text-sm font-medium [&>span]:truncate border-2 border-[#9333EA] ring-2 ring-[#9333EA]/20 bg-[#F9F5FF]">
                  <SelectValue placeholder="← Select a team or program">
                    {selection && (
                      <span className="flex items-center gap-2">
                        {isProgram && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">
                            Program
                          </span>
                        )}
                        {dropdownLabel}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]">
                  <SelectItem value="__none__" className="text-gray-400 italic">None</SelectItem>

                  {/* Teams group */}
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 py-1.5">
                      <Users className="h-3 w-3" />
                      Teams
                    </SelectLabel>
                    {projects.map((p) => (
                      <SelectItem key={p.key} value={`team:${p.key}`} className="whitespace-normal pl-4">
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-gray-400">{p.key}</span>
                          {p.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>

                  {/* Programs group */}
                  {programs.length > 0 && (
                    <>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 py-1.5">
                          <Layers className="h-3 w-3" />
                          Programs
                        </SelectLabel>
                        {programs.map((p) => (
                          <SelectItem key={p.label} value={`program:${p.label}`} className="whitespace-normal pl-4">
                            <span className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-violet-500">{p.label}</span>
                              {p.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* View toggle */}
            {somethingSelected && !isLoading && (
              <div className={`shrink-0 flex items-center gap-1 bg-gray-100 rounded-lg p-1 ${mainTab !== "tracker" ? "invisible" : ""}`}>
                <button
                  onClick={() => setView("epics")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${view === "epics" ? "bg-white text-[#9333EA] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Epics
                </button>
                <button
                  onClick={() => setView("stories")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${view === "stories" ? "bg-white text-[#9333EA] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  <List className="h-3.5 w-3.5" />
                  Stories
                </button>
              </div>
            )}

            {/* Right: count */}
            <div className={`shrink-0 text-right w-28 ${mainTab !== "tracker" ? "invisible" : ""}`}>
              {somethingSelected && !isLoading && (
                <>
                  {view === "epics" ? (
                    <>
                      <p className="text-3xl font-bold text-[#9333EA] leading-none">
                        {filteredEpics.length}
                        {totalActive > 0 && (
                          <span className="text-lg text-gray-300 font-normal"> / {epics.length}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 font-medium mt-0.5 uppercase tracking-wide">Epics</p>
                      {needsAttentionCount > 0 && (
                        <button
                          onClick={scrollToIntake}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
                        >
                          <AlertCircle className="h-3.5 w-3.5" />
                          {needsAttentionCount} New Intake
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-[#9333EA] leading-none">
                        {storiesLoading ? "…" : stories.length}
                      </p>
                      <p className="text-xs text-gray-400 font-medium mt-0.5 uppercase tracking-wide">Stories</p>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="bg-slate-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex">
            {(["tracker", "okr"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setMainTab(tab)}
                className={`px-5 py-2 text-xs font-semibold border-r border-gray-200 transition-colors ${
                  mainTab === tab
                    ? "bg-[#A855F7] text-white"
                    : "bg-[#F3EEFF] text-[#A855F7]/60 hover:bg-[#EDE5FF] hover:text-[#A855F7]"
                }`}
              >
                {tab === "tracker" ? "Tracker" : "OKR"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      {mainTab === "tracker" && somethingSelected && ready && !isLoading && !error && epics.length > 0 && (
        <div className="bg-[#FAFAFA] border-b border-gray-200 px-6 py-3">
          <div className="max-w-7xl mx-auto">
            <FilterBar
              epics={epics}
              filters={filters}
              onChange={setFilters}
              presets={presets}
              onSavePreset={savePreset}
              onDeletePreset={deletePreset}
              onLoadPreset={loadPreset}
              includeDone={includeDone}
              onToggleIncludeDone={() => setIncludeDone((v) => !v)}
            />
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-6 bg-white">
        {/* OKR tab */}
        {mainTab === "okr" && (
          <OKRPage
            projectKey={projectKey}
            projectName={projectName}
            programName={programName}
            programLabel={programLabel}
            availableProjects={projects}
          />
        )}

        {/* Tracker tab content */}
        {mainTab === "tracker" && (
          <>
            {!somethingSelected && (
              <div className="space-y-4">
                {SWIMLANE_ORDER.map((lane) => (
                  <Swimlane key={lane} title={lane} epics={[]} storyCounts={{}} empty />
                ))}
              </div>
            )}

            {somethingSelected && isLoading && (
              <div className="space-y-4">
                {SWIMLANE_ORDER.map((lane) => (
                  <Swimlane key={lane} title={lane} epics={[]} storyCounts={{}} loading />
                ))}
              </div>
            )}

            {somethingSelected && error && (
              <div className="text-center py-12">
                <p className="text-red-600 font-medium">Failed to load epics</p>
                <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
              </div>
            )}

            {somethingSelected && !isLoading && !error && view === "epics" && isProgram && (
              <ProgramView epics={filteredEpics} storyCounts={counts} storageKey={`program-${programLabel}`} />
            )}

            {somethingSelected && !isLoading && !error && view === "epics" && !isProgram && (
              <TrackerSwimlanes
                grouped={grouped}
                storyCounts={counts}
                storageKeyPrefix={projectKey}
                onStatusChange={handleStatusChange}
              />
            )}

            {somethingSelected && !isLoading && !error && view === "stories" && (
              <StoriesView epics={epics} stories={stories} isLoading={storiesLoading} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
