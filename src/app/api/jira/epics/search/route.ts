import { NextRequest, NextResponse } from "next/server";
import { jiraFetch } from "@/lib/jira/client";

const FIELDS = ["summary", "status", "priority", "labels", "assignee", "issuetype"];

interface JiraSearchResponse {
  issues: unknown[];
}

const JIRA_KEY_RE = /^[A-Z]+-\d+$/i;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const projectKey = searchParams.get("projectKey");
  const programLabel = searchParams.get("programLabel");
  const projectKeys = searchParams.get("projectKeys")?.split(",").filter(Boolean) ?? [];

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  let jql: string;
  if (JIRA_KEY_RE.test(q)) {
    // Exact key lookup — no issuetype filter; trust the user knows what they're linking
    jql = `key = "${q.toUpperCase()}"`;

  } else {
    let projectFilter = "";
    if (projectKeys.length > 0) {
      projectFilter = ` AND project in (${projectKeys.join(", ")})`;
    } else if (projectKey) {
      projectFilter = ` AND project = "${projectKey}"`;
    }
    const labelFilter = programLabel ? ` AND labels = "${programLabel}"` : "";
    jql = `issuetype = Epic${projectFilter}${labelFilter} AND summary ~ "${q.replace(/"/g, '\\"')}*" ORDER BY updated DESC`;
  }

  try {
    const data = await jiraFetch<JiraSearchResponse>("/search/jql", {
      method: "POST",
      body: JSON.stringify({ jql, fields: FIELDS, maxResults: 50 }),
    });

    const baseUrl = process.env.JIRA_BASE_URL ?? "";
    const issues = (data.issues ?? []).map((issue: unknown) => {
      const i = issue as { id: string; key: string };
      return { ...i, browseUrl: `${baseUrl}/browse/${i.key}` };
    });

    return NextResponse.json(issues);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
