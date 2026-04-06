"use client";

import useSWR from "swr";

export type StoryCounts = Record<string, { total: number; done: number }>;

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useStoryCounts(projectKey: string | null) {
  const key = projectKey ? `/api/jira/story-counts?projectKey=${projectKey}` : null;
  const { data, error, isLoading } = useSWR<StoryCounts>(key, fetcher, {
    revalidateOnFocus: false,
  });
  return { counts: (data && !("error" in data) ? data : {}) as StoryCounts, error, isLoading };
}
