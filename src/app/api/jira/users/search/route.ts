import { NextRequest, NextResponse } from "next/server";
import { jiraFetch } from "@/lib/jira/client";

interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query") ?? "";
  if (query.length < 2) return NextResponse.json([]);
  try {
    const users = await jiraFetch<JiraUser[]>(
      `/user/search?query=${encodeURIComponent(query)}&maxResults=8`
    );
    return NextResponse.json(users);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
