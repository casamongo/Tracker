import { getStoriesForProject } from "@/lib/jira/issues";
import { NextResponse } from "next/server";

const BASE_URL = process.env.JIRA_BASE_URL ?? "";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectKey = searchParams.get("projectKey");

  if (!projectKey) {
    return NextResponse.json({ error: "projectKey is required" }, { status: 400 });
  }

  try {
    const includeDone = searchParams.get("includeDone") === "true";
    const stories = await getStoriesForProject(projectKey, includeDone);
    const withUrls = stories.map((s) => ({ ...s, browseUrl: `${BASE_URL}/browse/${s.key}` }));
    return NextResponse.json(withUrls);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
