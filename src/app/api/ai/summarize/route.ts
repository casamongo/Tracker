import { generateSummary } from "@/lib/ai/summarize";
import { getChildIssues } from "@/lib/jira/issues";
import { contentHash, getCached, setCached } from "@/lib/ai/summaryCache";
import { getCustomSummary, clearCustomSummary } from "@/lib/ai/customSummaries";
import {
  hasOurSummarySection,
  extractOurSummaryText,
  buildSummaryAdf,
  buildArchiveCommentAdf,
} from "@/lib/jira/description";
import { jiraFetch } from "@/lib/jira/client";
import type { SummarizeRequest } from "@/types/ai";
import { NextResponse } from "next/server";

async function writeToJiraDescription(epicKey: string, newSummary: string, oldSummary: string | null) {
  try {
    if (oldSummary && oldSummary.trim() !== newSummary.trim()) {
      await jiraFetch(`/issue/${epicKey}/comment`, {
        method: "POST",
        body: JSON.stringify({ body: buildArchiveCommentAdf(oldSummary) }),
      });
    }
    await jiraFetch(`/issue/${epicKey}`, {
      method: "PUT",
      body: JSON.stringify({ fields: { description: buildSummaryAdf(newSummary) } }),
    });
  } catch (err) {
    console.error(`[summarize] failed to write description for ${epicKey}:`, (err as Error).message);
  }
}

export async function POST(request: Request) {
  try {
    const body: SummarizeRequest = await request.json();

    if (!body.workType || !body.issue) {
      return NextResponse.json({ error: "workType and issue are required" }, { status: 400 });
    }

    // For epics: the Jira description is the source of truth.
    // If it already has an "Overall Summary" section (written by us or edited in Jira),
    // return that directly — this ensures Jira-side edits are always reflected.
    if (body.workType === "epic") {
      const currentDesc = body.issue.fields.description;
      if (hasOurSummarySection(currentDesc)) {
        const descText = extractOurSummaryText(currentDesc);
        if (descText) {
          const custom = getCustomSummary(body.issue.key);
          // If the Jira description was edited externally (differs from local cache),
          // clear the stale cache so it doesn't shadow the Jira content.
          if (custom && custom.text !== descText) {
            clearCustomSummary(body.issue.key);
            return NextResponse.json({ summary: descText, isCustom: false });
          }
          return NextResponse.json({ summary: descText, isCustom: !!custom });
        }
      }
    }

    // For epics: fetch child issues filtered to Stories only (skip Tasks)
    let stories = body.stories ?? [];
    if (body.workType === "epic") {
      const allChildren = await getChildIssues(body.issue.key);
      stories = allChildren.filter((s) => s.fields.issuetype.name === "Story");
    }

    const hash = contentHash(body, stories);
    const cached = getCached(body.issue.key, body.workType, hash);
    if (cached) {
      return NextResponse.json({ summary: cached });
    }

    const summary = await generateSummary(body, stories);
    setCached(body.issue.key, body.workType, hash, summary);

    // Write to Jira description (only for epics, only if description is empty or already ours)
    if (body.workType === "epic") {
      const currentDescription = body.issue.fields.description;
      const isEmpty = !currentDescription?.content?.length;
      const isOurs = hasOurSummarySection(currentDescription);

      if (isEmpty || isOurs) {
        const oldSummary = isOurs ? extractOurSummaryText(currentDescription) : null;
        writeToJiraDescription(body.issue.key, summary, oldSummary); // fire-and-forget
      }
    }

    return NextResponse.json({ summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
