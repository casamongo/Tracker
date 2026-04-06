"use client";

import { useState } from "react";
import { X, Plus, Link } from "lucide-react";
import { OKREpicForm } from "./OKREpicForm";
import { OKREpicLinkForm } from "./OKREpicLinkForm";
import type { JiraEpic } from "@/types/jira";
import type { ProjectEntry } from "@/lib/projects";

type Mode = "create" | "link";

interface Props {
  projectKey: string;
  objectiveNumber: number;
  krIndex: number;
  quarter: string;
  defaultQuarterStart?: string;
  defaultQuarterEnd?: string;
  programLabel?: string | null;
  okrPrefix: string;
  availableProjects?: ProjectEntry[];
  onCreated: (epic: JiraEpic & { browseUrl?: string }) => void;
  onCancel: () => void;
}

export function OKREpicPanel({
  projectKey,
  objectiveNumber,
  krIndex,
  quarter,
  defaultQuarterStart,
  defaultQuarterEnd,
  programLabel,
  okrPrefix,
  availableProjects,
  onCreated,
  onCancel,
}: Props) {
  const [mode, setMode] = useState<Mode>("create");

  return (
    <div className="bg-white border border-[#A855F7]/30 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2.5 border-b border-gray-100">
        <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              mode === "create"
                ? "bg-[#A855F7] text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Plus className="h-3 w-3" />
            Create new
          </button>
          <button
            type="button"
            onClick={() => setMode("link")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              mode === "link"
                ? "bg-[#A855F7] text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Link className="h-3 w-3" />
            Link existing
          </button>
        </div>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4">
        {mode === "create" ? (
          <OKREpicForm
            projectKey={projectKey}
            objectiveNumber={objectiveNumber}
            krIndex={krIndex}
            quarter={quarter}
            defaultQuarterStart={defaultQuarterStart}
            defaultQuarterEnd={defaultQuarterEnd}
            okrPrefix={okrPrefix}
            availableProjects={availableProjects}
            embedded
            onCreated={onCreated}
            onCancel={onCancel}
          />
        ) : (
          <OKREpicLinkForm
            projectKey={projectKey}
            objectiveNumber={objectiveNumber}
            krIndex={krIndex}
            quarter={quarter}
            programLabel={programLabel}
            okrPrefix={okrPrefix}
            availableProjects={availableProjects}
            onLinked={onCreated}
          />
        )}
      </div>
    </div>
  );
}
