import { NextRequest, NextResponse } from "next/server";
import { jiraFetch } from "@/lib/jira/client";
import { CUSTOM_FIELDS } from "@/lib/jira/client";

interface UpdateBody {
  transitionId?: string;
  summary?: string;
  duedate?: string | null;
  statusNote?: string | null;
  assigneeAccountId?: string | null;
  labels?: string[];
  priorityName?: string | null;
  quarterStart?: string | null;
  quarterEnd?: string | null;
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ key: string }> }
) {
  const { key } = await context.params;
  const body: UpdateBody = await req.json();

  try {
    // 1. Status transition
    if (body.transitionId) {
      await jiraFetch(`/issue/${key}/transitions`, {
        method: "POST",
        body: JSON.stringify({ transition: { id: body.transitionId } }),
      });
    }

    // 2. Field updates (duedate, status notes, assignee)
    const fields: Record<string, unknown> = {};

    if ("summary" in body && body.summary) {
      fields.summary = body.summary;
    }

    if ("duedate" in body) {
      fields.duedate = body.duedate ?? null;
    }

    if ("statusNote" in body) {
      fields[CUSTOM_FIELDS.STATUS_NOTES] = body.statusNote
        ? {
            version: 1,
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: body.statusNote }],
              },
            ],
          }
        : null;
    }

    if ("assigneeAccountId" in body) {
      fields.assignee = body.assigneeAccountId
        ? { accountId: body.assigneeAccountId }
        : null;
    }

    if ("labels" in body) {
      fields.labels = body.labels ?? [];
    }

    if ("priorityName" in body) {
      fields.priority = body.priorityName ? { name: body.priorityName } : null;
    }

    if (body.quarterStart) {
      fields[CUSTOM_FIELDS.QUARTER_START] = body.quarterStart;
    }

    if (body.quarterEnd) {
      fields[CUSTOM_FIELDS.QUARTER_COMPLETION] = body.quarterEnd;
    }

    if (Object.keys(fields).length > 0) {
      await jiraFetch(`/issue/${key}`, {
        method: "PUT",
        body: JSON.stringify({ fields }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
