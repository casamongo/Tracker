"use client";

import useSWR from "swr";
import type { WorkType, SummarizeRequest } from "@/types/ai";
import type { JiraEpic, JiraStory } from "@/types/jira";

interface SummaryResult {
  summary: string;
  isCustom?: boolean;
}

export function useSummary(
  issue: JiraEpic | JiraStory | null,
  workType: WorkType,
  enabled: boolean
) {
  // Include the epic's `updated` timestamp so the SWR cache invalidates
  // automatically when the epic (including its description) changes in Jira.
  const updated = (issue?.fields as Record<string, unknown>)?.updated as string | undefined;
  const key = enabled && issue ? ["summary", issue.key, workType, updated] : null;

  const { data, error, isLoading, mutate } = useSWR<SummaryResult>(
    key,
    async () => {
      if (!issue) throw new Error("No issue");
      const body: SummarizeRequest = {
        workType,
        issue,
        comments: issue.fields.comment.comments,
      };
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: SummaryResult & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate summary");
      return { summary: data.summary, isCustom: data.isCustom };
    },
    { revalidateOnFocus: false }
  );

  return { summary: data?.summary, isCustom: data?.isCustom ?? false, error, isLoading, mutate };
}
