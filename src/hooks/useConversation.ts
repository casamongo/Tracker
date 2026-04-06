"use client";

import useSWR from "swr";
import type { ConversationMessage } from "@/types/ai";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useConversation(epicKey: string | null, milestoneName: string | null) {
  const key =
    epicKey && milestoneName
      ? `/api/conversations?epicKey=${encodeURIComponent(epicKey)}&milestone=${encodeURIComponent(milestoneName)}`
      : null;

  const { data, error, isLoading, mutate } = useSWR<ConversationMessage[]>(key, fetcher, {
    revalidateOnFocus: false,
  });

  return { messages: data ?? [], error, isLoading, refresh: mutate };
}
