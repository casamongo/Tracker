import { NextRequest, NextResponse } from "next/server";
import { paginatedJiraSearch } from "@/lib/jira/client";

interface StoryRecord {
  id: string;
  key: string;
  fields: {
    status: { statusCategory: { key: string } };
    parent?: { key: string };
    issuetype?: { name: string };
  };
}

export async function GET(req: NextRequest) {
  const projectKey = req.nextUrl.searchParams.get("projectKey");
  if (!projectKey) {
    return NextResponse.json({ error: "projectKey required" }, { status: 400 });
  }

  try {
    const jql = `project = ${projectKey} AND issuetype not in (Epic, Sub-task) AND parent is not EMPTY`;
    const issues = await paginatedJiraSearch<StoryRecord>(jql, ["status", "parent", "issuetype"], 500);

    // Group by parent
    const grouped = new Map<string, StoryRecord[]>();
    for (const issue of issues) {
      const pk = issue.fields.parent?.key;
      if (!pk) continue;
      if (!grouped.has(pk)) grouped.set(pk, []);
      grouped.get(pk)!.push(issue);
    }

    // Per epic: use Stories if any exist, otherwise use Tasks
    const counts: Record<string, { total: number; done: number }> = {};
    for (const [parentKey, items] of grouped) {
      const stories = items.filter((i) => i.fields.issuetype?.name?.toLowerCase() === "story");
      const milestones = stories.length > 0 ? stories : items;
      counts[parentKey] = { total: milestones.length, done: 0 };
      for (const m of milestones) {
        if (m.fields.status.statusCategory.key === "done") counts[parentKey].done++;
      }
    }

    return NextResponse.json(counts);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
