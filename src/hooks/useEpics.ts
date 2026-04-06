"use client";

import useSWR from "swr";
import type { JiraEpic } from "@/types/jira";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useEpics(
  projectKey: string | null,
  includeDone = false,
  programLabel?: string | null
) {
  const key = programLabel
    ? `/api/jira/epics?label=${programLabel}&includeDone=${includeDone}`
    : projectKey
    ? `/api/jira/epics?projectKey=${projectKey}&includeDone=${includeDone}`
    : null;

  const { data, error, isLoading } = useSWR<JiraEpic[]>(key, fetcher);
  const epics = Array.isArray(data) ? data : [];
  const apiError =
    !Array.isArray(data) && data ? new Error((data as { error?: string }).error ?? "Unknown error") : error;
  return { epics, error: apiError, isLoading };
}
