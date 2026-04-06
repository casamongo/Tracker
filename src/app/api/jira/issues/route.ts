import { getMilestonesForEpic } from "@/lib/jira/issues";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const epicKey = searchParams.get("epicKey");

  if (!epicKey) {
    return NextResponse.json({ error: "epicKey is required" }, { status: 400 });
  }

  try {
    const issues = await getMilestonesForEpic(epicKey);
    return NextResponse.json(issues);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
