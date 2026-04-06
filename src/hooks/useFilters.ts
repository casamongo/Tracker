"use client";

import useSWR from "swr";
import type { JiraFilter } from "@/types/jira";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useFilters() {
  const { data, error, isLoading } = useSWR<JiraFilter[]>("/api/jira/filters", fetcher);
  return { filters: data ?? [], error, isLoading };
}
