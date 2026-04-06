import { NextResponse } from "next/server";
import { jiraFetch } from "@/lib/jira/client";
import { setCustomSummary, clearCustomSummary } from "@/lib/ai/customSummaries";
import { buildSummaryAdf, buildArchiveCommentAdf } from "@/lib/jira/description";

// POST — save a user-edited summary: archive old to Jira comment, write new to description
export async function POST(request: Request) {
  try {
    const { epicKey, newSummary, previousSummary } = await request.json();

    if (!epicKey || !newSummary?.trim()) {
      return NextResponse.json({ error: "epicKey and newSummary are required" }, { status: 400 });
    }

    // Archive previous summary as a Jira comment
    if (previousSummary?.trim()) {
      await jiraFetch(`/issue/${epicKey}/comment`, {
        method: "POST",
        body: JSON.stringify({ body: buildArchiveCommentAdf(previousSummary.trim()) }),
      });
    }

    // Write new summary to Jira description
    await jiraFetch(`/issue/${epicKey}`, {
      method: "PUT",
      body: JSON.stringify({ fields: { description: buildSummaryAdf(newSummary.trim()) } }),
    });

    // Track as custom so the app shows "edited" badge
    setCustomSummary(epicKey, newSummary.trim());

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// DELETE — clear custom override, revert to AI-generated on next load
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const epicKey = searchParams.get("epicKey");
    if (!epicKey) return NextResponse.json({ error: "epicKey is required" }, { status: 400 });

    clearCustomSummary(epicKey);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
