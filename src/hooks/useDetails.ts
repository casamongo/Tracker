"use client";

import useSWR from "swr";
import type { JiraEpic } from "@/types/jira";
import type { MilestoneItem } from "@/types/ai";

interface DetailsResult {
  milestones?: MilestoneItem[];
  error?: string;
}

async function postFetcher([, epicKey, epic]: [string, string, JiraEpic]) {
  const res = await fetch("/api/ai/details", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ epicKey, epic }),
  });
  const data = (await res.json()) as DetailsResult;
  if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export function useDetails(epicKey: string | null, epic: JiraEpic | null) {
  const key = epicKey && epic ? ["details", epicKey, epic] : null;
  const { data, error, isLoading } = useSWR<DetailsResult>(key, postFetcher);
  return { milestones: data?.milestones ?? [], error, isLoading };
}
