import { NextRequest, NextResponse } from "next/server";
import { jiraFetch } from "@/lib/jira/client";

interface TransitionsResponse {
  transitions: { id: string; name: string }[];
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ key: string }> }
) {
  const { key } = await context.params;
  try {
    const data = await jiraFetch<TransitionsResponse>(`/issue/${key}/transitions`);
    return NextResponse.json(data.transitions.map((t) => ({ id: t.id, name: t.name })));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
