import { NextResponse } from "next/server";
import { jiraFetch } from "@/lib/jira/client";

interface JiraPriority {
  id: string;
  name: string;
}

export async function GET() {
  try {
    const priorities = await jiraFetch<JiraPriority[]>("/priority");
    return NextResponse.json(priorities.map((p) => ({ id: p.id, name: p.name })));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
