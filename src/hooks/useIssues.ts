"use client";

import useSWR from "swr";
import type { JiraStory } from "@/types/jira";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useIssues(epicKey: string | null) {
  const key = epicKey ? `/api/jira/issues?epicKey=${epicKey}` : null;
  const { data, error, isLoading } = useSWR<JiraStory[]>(key, fetcher);
  return { issues: data ?? [], error, isLoading };
}
