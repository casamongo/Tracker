import { NextRequest, NextResponse } from "next/server";
import { jiraFetch, CUSTOM_FIELDS } from "@/lib/jira/client";
import {
  extractStatusNoteText,
  upsertStatusNoteInDescription,
  buildStatusNoteArchiveCommentAdf,
} from "@/lib/jira/description";
import type { AdfDoc } from "@/types/jira";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ key: string }> }
) {
  const { key } = await context.params;
  const { note } = await req.json() as { note: string };


  try {
    // 1. Always save to the STATUS_NOTES custom field (primary)
    const statusNoteAdf = note.trim()
      ? {
          version: 1,
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: note.trim() }] }],
        }
      : null;

    await jiraFetch(`/issue/${key}`, {
      method: "PUT",
      body: JSON.stringify({
        fields: { [CUSTOM_FIELDS.STATUS_NOTES]: statusNoteAdf },
      }),
    });

    // 2. Best-effort: update description panel + archive old note as comment
    try {
      const issue = await jiraFetch<{ fields: { description: AdfDoc | null } }>(
        `/issue/${key}?fields=description`
      );
      const currentDescription = issue.fields?.description ?? null;
      const existingNote = extractStatusNoteText(currentDescription);

      if (existingNote.trim()) {
        await jiraFetch(`/issue/${key}/comment`, {
          method: "POST",
          body: JSON.stringify({ body: buildStatusNoteArchiveCommentAdf(existingNote.trim()) }),
        });
      }

      const newDescription = upsertStatusNoteInDescription(currentDescription, note.trim());
      await jiraFetch(`/issue/${key}`, {
        method: "PUT",
        body: JSON.stringify({ fields: { description: newDescription } }),
      });
    } catch {
      // Description update is non-critical — custom field already saved above
    }

    return NextResponse.json({ success: true });
  } catch (err) {

    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
