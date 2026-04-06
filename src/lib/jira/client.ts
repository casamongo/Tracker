interface JiraSearchJqlResponse<T> {
  issues: T[];
  total: number;
  nextPageToken?: string;
}

const JIRA_BASE_URL = process.env.JIRA_BASE_URL!;
const JIRA_EMAIL = process.env.JIRA_EMAIL!;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN!;

// Discovered via GET /rest/api/3/field — update these IDs after running discovery
export const CUSTOM_FIELDS = {
  QUARTER_START: "customfield_22598",
  QUARTER_COMPLETION: "customfield_22599",
  STATUS_NOTES: "customfield_16366",
} as const;

function getAuthHeader(): string {
  return "Basic " + Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");
}

export async function jiraFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${JIRA_BASE_URL}/rest/api/3${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Jira API error ${res.status}: ${text}`);
  }

  if (res.status === 204 || res.status === 205) return undefined as T;
  return res.json() as Promise<T>;
}

export async function paginatedJiraSearch<T>(
  jql: string,
  fields: string[],
  maxTotal = 200
): Promise<T[]> {
  const allIssues: T[] = [];
  let nextPageToken: string | undefined;
  const pageSize = 100;

  while (allIssues.length < maxTotal) {
    const body: Record<string, unknown> = { jql, fields, maxResults: pageSize };
    if (nextPageToken) body.nextPageToken = nextPageToken;

    const data = await jiraFetch<JiraSearchJqlResponse<T>>("/search/jql", {
      method: "POST",
      body: JSON.stringify(body),
    });

    allIssues.push(...data.issues);

    if (!data.nextPageToken || data.issues.length < pageSize) break;
    nextPageToken = data.nextPageToken;
  }

  return allIssues;
}
