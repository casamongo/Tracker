"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableEpicCard } from "@/components/epic/SortableEpicCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { JiraEpic } from "@/types/jira";
import type { SwimlaneKey } from "@/lib/utils";
import type { StoryCounts } from "@/hooks/useStoryCounts";

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

const SWIMLANE_CONTENT_BG: Record<SwimlaneKey, string> = {
  OKR:        "bg-gradient-to-b from-[#F3EEFF] to-[#FAF7FF]",
  "ENG Work": "bg-gradient-to-b from-[#EFF6FF] to-[#F5F9FF]",
  Intake:     "bg-gradient-to-b from-[#FFFBEB] to-[#FFFDF5]",
  Others:     "bg-gradient-to-b from-gray-100 to-gray-50",
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

const SWIMLANE_COUNT: Record<SwimlaneKey, string> = {
  OKR:        "bg-[#C4B5FD]/50 text-[#6D28D9]",
  "ENG Work": "bg-[#93C5FD]/50 text-[#1E3A8A]",
  Intake:     "bg-[#FCD34D]/50 text-[#78350F]",
  Others:     "bg-gray-300/60 text-gray-700",
};

interface Props {
  title: SwimlaneKey;
  epics: JiraEpic[];
  storyCounts?: StoryCounts;
  defaultExpanded?: boolean;
  empty?: boolean;
  loading?: boolean;
  onStatusChange?: (epicKey: string, newStatus: string) => void;
}

export function Swimlane({ title, epics, storyCounts = {}, defaultExpanded = true, empty, loading, onStatusChange }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const { setNodeRef } = useDroppable({ id: `lane-${title}` });

  return (
    <div id={`swimlane-${title}`} className={`rounded-xl border-2 shadow-md overflow-hidden ${SWIMLANE_BORDER[title]}`}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className={`w-full flex items-center justify-between px-5 py-3.5 transition-opacity hover:opacity-95 ${SWIMLANE_HEADER[title]}`}
      >
        <div className="flex items-center gap-2.5">
          {expanded ? (
            <ChevronDown className={`h-4 w-4 ${SWIMLANE_TEXT[title]}`} />
          ) : (
            <ChevronRight className={`h-4 w-4 ${SWIMLANE_TEXT[title]}`} />
          )}
          <span className={`h-2 w-2 rounded-full ${SWIMLANE_DOT[title]}`} />
          <span className={`font-semibold text-sm tracking-wide ${SWIMLANE_TEXT[title]}`}>{title}</span>
          <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${SWIMLANE_COUNT[title]}`}>
            {epics.length}
          </span>
        </div>
      </button>

      {expanded && (
        <div ref={setNodeRef} className={`p-4 ${SWIMLANE_CONTENT_BG[title]}`}>
          {loading ? (
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border rounded-xl p-4 space-y-2 bg-white">
                  <Skeleton className="h-3 w-1/4" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : empty ? (
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex items-center justify-center h-24">
                  <p className="text-xs text-gray-300 text-center">Select a team to load epics</p>
                </div>
              ))}
            </div>
          ) : epics.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No epics</p>
          ) : (
            <SortableContext items={epics.map((e) => e.id)} strategy={rectSortingStrategy}>
              <div className="grid gap-3 items-start" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
                {epics.map((epic) => (
                  <SortableEpicCard key={epic.id} epic={epic} storyProgress={storyCounts[epic.key]} onStatusChange={onStatusChange} lane={title} />
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      )}
    </div>
  );
}
