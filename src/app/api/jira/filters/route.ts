import { getFilters } from "@/lib/jira/filters";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const filters = await getFilters();
    return NextResponse.json(filters);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
