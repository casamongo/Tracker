import { NextRequest, NextResponse } from "next/server";
import { jiraFetch, CUSTOM_FIELDS } from "@/lib/jira/client";

const PRIORITY_MAP: Record<string, string> = {
  P0: "Top",
  P1: "Highest",
  P2: "High",
  P3: "Medium",
  P4: "Low",
};

const OUTCOME_PREFIX: Record<string, string> = {
  POC: "[POC]",
  Dogfooding: "[Dogfooding]",
  Preview: "[Preview]",
  GA: "[GA]",
};

interface CreateEpicBody {
  projectKey: string;
  summary: string;
  outcome?: string;
  priority?: string;
  quarterStart?: string;
  quarterEnd?: string;
  assigneeAccountId?: string;
  labels?: string[];
}

export async function POST(req: NextRequest) {
  const body: CreateEpicBody = await req.json();
  const { projectKey, summary, outcome, priority, quarterStart, quarterEnd, assigneeAccountId, labels } = body;

  if (!projectKey || !summary) {
    return NextResponse.json({ error: "projectKey and summary are required" }, { status: 400 });
  }

  const prefix = outcome ? (OUTCOME_PREFIX[outcome] ?? "") : "";
  const fullSummary = prefix ? `${prefix} ${summary}` : summary;

  const fields: Record<string, unknown> = {
    project: { key: projectKey },
    summary: fullSummary,
    issuetype: { name: "Epic" },
  };

  if (priority && PRIORITY_MAP[priority]) {
    fields.priority = { name: PRIORITY_MAP[priority] };
  }

  if (assigneeAccountId) {
    fields.assignee = { accountId: assigneeAccountId };
  }

  if (labels && labels.length > 0) {
    fields.labels = labels;
  }

  try {
    const created = await jiraFetch<{ id: string; key: string; self: string }>("/issue", {
      method: "POST",
      body: JSON.stringify({ fields }),
    });

    // Quarter fields are not on the create screen — update them separately
    if (quarterStart || quarterEnd) {
      const updateFields: Record<string, unknown> = {};
      if (quarterStart) updateFields[CUSTOM_FIELDS.QUARTER_START] = quarterStart;
      if (quarterEnd) updateFields[CUSTOM_FIELDS.QUARTER_COMPLETION] = quarterEnd;
      await jiraFetch(`/issue/${created.key}`, {
        method: "PUT",
        body: JSON.stringify({ fields: updateFields }),
      }).catch(() => {/* best-effort — don't fail the whole create */});
    }

    const baseUrl = process.env.JIRA_BASE_URL ?? "";
    return NextResponse.json({ ...created, browseUrl: `${baseUrl}/browse/${created.key}` });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
