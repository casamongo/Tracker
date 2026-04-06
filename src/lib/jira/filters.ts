import { jiraFetch } from "./client";
import type { JiraFilter } from "@/types/jira";

interface FiltersResponse {
  values: Array<{ id: string; name: string; jql: string }>;
  total: number;
  isLast: boolean;
}

export async function getFilters(): Promise<JiraFilter[]> {
  const prefix = process.env.JIRA_FILTER_PREFIX ?? "";
  const params = new URLSearchParams({
    expand: "jql",
    orderBy: "name",
    maxResults: "100",
  });
  if (prefix) params.set("filterName", prefix);

  const data = await jiraFetch<FiltersResponse>(`/filter/search?${params.toString()}`);
  return data.values.map((f) => ({ id: f.id, name: f.name, jql: f.jql }));
}

export async function getFilterById(filterId: string): Promise<JiraFilter> {
  const data = await jiraFetch<{ id: string; name: string; jql: string }>(
    `/filter/${filterId}?expand=jql`
  );
  return { id: data.id, name: data.name, jql: data.jql };
}
