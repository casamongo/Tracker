import { openai } from "./client";
import { getDetailsPromptTemplate } from "@/lib/prompts";
import { adfToPlainText } from "@/lib/utils";
import { CUSTOM_FIELDS } from "@/lib/jira/client";
import type { AdfDoc } from "@/types/jira";
import type { JiraEpic, JiraStory } from "@/types/jira";
import type { MilestoneItem } from "@/types/ai";

// Replace double quotes with typographic equivalents to prevent JSON parse failures
function sanitizeForJson(text: string): string {
  return text.replace(/"/g, "\u201c").replace(/"/g, "\u201d").replace(/"/g, "'");
}

function formatStoriesForDetails(stories: JiraStory[]): string {
  if (!stories.length) return "No stories found.";

  return stories
    .map((s) => {
      const f = s.fields;
      const statusNotes = sanitizeForJson(
        adfToPlainText((f as Record<string, unknown>)[CUSTOM_FIELDS.STATUS_NOTES] as AdfDoc | string | null | undefined)
      );
      const latestComment = f.comment?.comments?.slice(-1)[0];
      const rawComment = latestComment
        ? `${latestComment.author.displayName}: ${typeof latestComment.body === "string" ? latestComment.body : adfToPlainText(latestComment.body)}`
        : "";
      const comment = rawComment ? sanitizeForJson(rawComment) : "";
      return [
        `Story: ${sanitizeForJson(f.summary)}`,
        `Jira Status: ${f.status.name}`,
        `Owner: ${f.assignee?.displayName ?? "Unassigned"} | Email: ${f.assignee?.emailAddress ?? ""}`,
        `Due Date: ${f.duedate ?? "TBD"}`,
        statusNotes ? `Status Notes: ${statusNotes}` : "",
        comment ? `Latest comment: ${comment}` : "",
      ].filter(Boolean).join("\n");
    })
    .join("\n\n---\n\n");
}

export async function generateDetails(epic: JiraEpic, stories: JiraStory[]): Promise<MilestoneItem[]> {
  const template = getDetailsPromptTemplate();
  const fields = epic.fields;
  // Cap at 40 stories to avoid oversized prompts / timeouts
  const cappedStories = stories.slice(0, 40);
  const quarterStart = (fields as Record<string, unknown>)[CUSTOM_FIELDS.QUARTER_START];
  const quarterCompletion = (fields as Record<string, unknown>)[CUSTOM_FIELDS.QUARTER_COMPLETION];

  const vars: Record<string, string> = {
    summary: fields.summary,
    status: fields.status.name,
    quarterStart: typeof quarterStart === "string" ? quarterStart : "N/A",
    quarterCompletion: typeof quarterCompletion === "string" ? quarterCompletion : "N/A",
    stories: formatStoriesForDetails(cappedStories),
  };

  const userMessage = template.userTemplate.replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => vars[key] ?? "N/A"
  );

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: template.maxTokens ?? 800,
      messages: [
        { role: "system", content: template.system },
        { role: "user", content: userMessage },
      ],
    });

    const raw = (response.choices[0]?.message?.content ?? "[]")
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    try {
      return JSON.parse(raw) as MilestoneItem[];
    } catch {
      console.error("[details] JSON parse failed, raw response:", raw.slice(0, 500));
      throw new Error("AI returned invalid JSON. Please try again.");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("rate_limit") || msg.includes("429")) {
      throw new Error("OpenAI API rate limit reached. Please try again shortly.");
    }
    throw err;
  }
}
