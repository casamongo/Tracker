"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useOKRDoc, useOKRQuarters } from "@/hooks/useOKRDoc";
import { OKRObjective } from "./OKRObjective";
import type { ProjectEntry } from "@/lib/projects";

interface Props {
  projectKey: string;
  projectName: string;
  programName?: string | null;
  programLabel?: string | null;
  availableProjects?: ProjectEntry[];
}

export function OKRPage({ projectKey, projectName, programName, programLabel, availableProjects }: Props) {
  const { quarters, currentQuarter, isLoading: quartersLoading } = useOKRQuarters();
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);

  useEffect(() => {
    if (currentQuarter && !selectedQuarter) {
      setSelectedQuarter(currentQuarter);
    }
  }, [currentQuarter, selectedQuarter]);

  // In program mode, look up OKR doc tab by program name; otherwise by team name
  const docTeamName = programName || projectName;
  const { okrDoc, error, isLoading } = useOKRDoc(selectedQuarter, docTeamName || null);

  const isProgram = !!programName;
  const nothingSelected = !projectKey && !programName;
  const noQuarterConfigured = !quartersLoading && quarters.length === 0;

  return (
    <div className="space-y-5">
      {/* Quarter selector bar */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-600">Quarter</span>
        {quartersLoading ? (
          <Skeleton className="h-8 w-48 rounded-md" />
        ) : (
          <select
            value={selectedQuarter ?? ""}
            onChange={(e) => setSelectedQuarter(e.target.value || null)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9333EA] focus:border-transparent bg-white"
          >
            {!selectedQuarter && <option value="">Select a quarter</option>}
            {quarters.map((q) => (
              <option key={q.value} value={q.value}>
                {q.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {nothingSelected && (
        <div className="text-center py-16">
          <p className="text-muted-foreground">Select a team or program from the header to view OKRs.</p>
        </div>
      )}

      {!nothingSelected && noQuarterConfigured && (
        <div className="text-center py-16">
          <p className="text-gray-500 font-medium">No OKR documents configured.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Set <code className="bg-gray-100 px-1 rounded">OKR_CURRENT_QUARTER</code> and{" "}
            <code className="bg-gray-100 px-1 rounded">OKR_DOC_*</code> environment variables.
          </p>
        </div>
      )}

      {!nothingSelected && !noQuarterConfigured && !selectedQuarter && !quartersLoading && (
        <div className="text-center py-16">
          <p className="text-muted-foreground">Select a quarter to view OKRs.</p>
        </div>
      )}

      {!nothingSelected && selectedQuarter && isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!nothingSelected && selectedQuarter && error && !isLoading && (
        <div className="text-center py-12">
          <p className="text-red-600 font-medium">Failed to load OKR document</p>
          <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
        </div>
      )}

      {!nothingSelected && okrDoc && okrDoc.objectives.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No objectives found for <strong>{docTeamName}</strong> in {selectedQuarter?.replace("_", " ")}.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Make sure the document tab title matches the {isProgram ? "program" : "team"} name exactly.
          </p>
        </div>
      )}

      {!nothingSelected && okrDoc && okrDoc.objectives.length > 0 && (
        <div className="space-y-4">
          {okrDoc.objectives.map((obj, i) => {
            // Derive unique OKR prefix: program label, or team's configured label, or fallback to projectKey lowercase
            const okrPrefix = programLabel
              || availableProjects?.find((p) => p.key === projectKey)?.label
              || projectKey.toLowerCase()
              || "okr";
            return (
            <OKRObjective
              key={`${obj.number}-${i}`}
              objective={obj}
              projectKey={projectKey}
              quarter={selectedQuarter!}
              programLabel={programLabel}
              okrPrefix={okrPrefix}
              availableProjects={isProgram ? availableProjects : undefined}
            />
            );
          })}
          </div>
      )}
    </div>
  );
}
