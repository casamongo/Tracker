import { getProjects, getPrograms } from "@/lib/projects";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const projects = getProjects();
    const programs = getPrograms();
    return NextResponse.json({ projects, programs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
