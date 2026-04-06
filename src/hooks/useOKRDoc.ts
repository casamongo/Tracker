"use client";

import useSWR from "swr";
import type { OKRDoc, OKRQuarterOption } from "@/types/okr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useOKRDoc(quarter: string | null, team: string | null) {
  const key =
    quarter && team
      ? `/api/okr/doc?quarter=${quarter}&team=${encodeURIComponent(team)}`
      : null;
  const { data, error, isLoading } = useSWR<OKRDoc>(key, fetcher);

  const hasError = !!error || !!(data as { error?: string } | undefined)?.error;
  const apiError = hasError
    ? error ?? new Error((data as { error?: string }).error ?? "Unknown error")
    : null;

  return {
    okrDoc: hasError ? null : (data ?? null),
    error: apiError,
    isLoading,
  };
}

export function useOKRQuarters() {
  const { data, error, isLoading } = useSWR<{
    quarters: OKRQuarterOption[];
    currentQuarter: string | null;
  }>("/api/okr/quarters", fetcher);

  return {
    quarters: data?.quarters ?? [],
    currentQuarter: data?.currentQuarter ?? null,
    isLoading,
    error,
  };
}
