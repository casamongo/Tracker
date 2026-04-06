"use client";

import useSWR from "swr";
import type { JiraStory } from "@/types/jira";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useProjectStories(projectKey: string | null, enabled: boolean, includeDone = false) {
  const key = projectKey && enabled ? `/api/jira/stories?projectKey=${projectKey}&includeDone=${includeDone}` : null;
  const { data, error, isLoading } = useSWR<JiraStory[]>(key, fetcher, { revalidateOnFocus: false });
  return { stories: Array.isArray(data) ? data : [], error, isLoading };
}
