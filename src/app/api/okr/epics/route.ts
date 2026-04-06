import { NextRequest, NextResponse } from "next/server";
import { paginatedJiraSearch, CUSTOM_FIELDS } from "@/lib/jira/client";
import type { JiraEpic } from "@/types/jira";

const EPIC_FIELDS = [
  "summary",
  "status",
  "priority",
  "labels",
  "assignee",
  "issuetype",
  CUSTOM_FIELDS.QUARTER_START,
  CUSTOM_FIELDS.QUARTER_COMPLETION,
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const label = searchParams.get("label");

  if (!label) {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }

  try {
    const jql = `issuetype = Epic AND labels = "${label}" ORDER BY created DESC`;
    const epics = await paginatedJiraSearch<JiraEpic>(jql, EPIC_FIELDS);

    const baseUrl = process.env.JIRA_BASE_URL ?? "";
    const epicsWithUrl = epics.map((epic) => ({
      ...epic,
      browseUrl: `${baseUrl}/browse/${epic.key}`,
    }));

    return NextResponse.json(epicsWithUrl);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
