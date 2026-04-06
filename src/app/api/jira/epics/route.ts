import { getEpicsForProject, getEpicsByLabel } from "@/lib/jira/epics";
import { NextResponse } from "next/server";

const BASE_URL = process.env.JIRA_BASE_URL ?? "";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectKey = searchParams.get("projectKey");
  const label = searchParams.get("label");
  const includeDone = searchParams.get("includeDone") === "true";

  try {
    let epics;
    if (label) {
      epics = await getEpicsByLabel(label, includeDone);
    } else if (projectKey) {
      epics = await getEpicsForProject(projectKey, includeDone);
    } else {
      return NextResponse.json({ error: "projectKey or label is required" }, { status: 400 });
    }

    const withUrls = epics.map((e) => ({ ...e, browseUrl: `${BASE_URL}/browse/${e.key}` }));
    return NextResponse.json(withUrls);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
