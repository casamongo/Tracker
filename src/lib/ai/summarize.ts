import { openai } from "./client";
import { getPromptTemplate } from "@/lib/prompts";
import { adfToPlainText } from "@/lib/utils";
import { stripOurSummarySection } from "@/lib/jira/description";
import { CUSTOM_FIELDS } from "@/lib/jira/client";
import type { SummarizeRequest } from "@/types/ai";
import type { AdfDoc, JiraComment, JiraStory } from "@/types/jira";

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "N/A");
}

function formatComments(comments: JiraComment[]): string {
  if (!comments.length) return "No recent comments.";
  return comments
    .slice(-5)
    .map((c) => {
      const body = typeof c.body === "string" ? c.body : adfToPlainText(c.body);
      return `${c.author.displayName}: ${body}`;
    })
    .join("\n---\n");
}

function formatStories(stories: JiraStory[]): string {
  if (!stories.length) return "No stories found.";

  const milestones = stories.filter((s) =>
    s.fields.labels.map((l) => l.toLowerCase()).includes("milestone")
  );
  const regular = stories.filter(
    (s) => !s.fields.labels.map((l) => l.toLowerCase()).includes("milestone")
  );

  const lines: string[] = [];

  if (milestones.length) {
    lines.push("=== Milestones ===");
    milestones.forEach((s) => {
      const f = s.fields;
      const target = f.duedate ? ` | Target: ${f.duedate}` : "";
      const statusNotes = adfToPlainText((f as Record<string, unknown>)[CUSTOM_FIELDS.STATUS_NOTES] as AdfDoc | string | null | undefined);
      const latestComment = f.comment?.comments?.slice(-1)[0];
      const comment = latestComment
        ? `${latestComment.author.displayName}: ${typeof latestComment.body === "string" ? latestComment.body : adfToPlainText(latestComment.body)}`
        : "";
      const update = statusNotes || comment || "";
      lines.push(`${f.summary} | Status: ${f.status.name} | Owner: ${f.assignee?.displayName ?? "Unassigned"}${target}${update ? `\nStatus Notes: ${update}` : ""}`);
    });
  }

  if (regular.length) {
    lines.push("=== Engineering Stories ===");
    regular.forEach((s) => {
      const f = s.fields;
      lines.push(`${f.summary} | Status: ${f.status.name} | Assignee: ${f.assignee?.displayName ?? "Unassigned"}`);
    });
  }

  return lines.join("\n\n");
}

function buildPromptVars(
  issue: SummarizeRequest["issue"],
  comments: JiraComment[],
  stories: JiraStory[] = []
): Record<string, string> {
  const fields = issue.fields;
  const quarterStart = (fields as Record<string, unknown>)[CUSTOM_FIELDS.QUARTER_START];
  const quarterCompletion = (fields as Record<string, unknown>)[CUSTOM_FIELDS.QUARTER_COMPLETION];

  return {
    summary: fields.summary,
    status: fields.status.name,
    priority: fields.priority?.name ?? "N/A",
    assignee: fields.assignee?.displayName ?? "Unassigned",
    labels: fields.labels.join(", ") || "None",
    quarterStart: typeof quarterStart === "string" ? quarterStart : "N/A",
    quarterCompletion: typeof quarterCompletion === "string" ? quarterCompletion : "N/A",
    // Strip our own "Overall Summary" section from description so the AI
    // doesn't echo its previous output as if it were the epic's description.
    description: adfToPlainText(stripOurSummarySection(fields.description)) || "No description provided.",
    comments: formatComments(comments),
    stories: formatStories(stories),
  };
}

export async function generateSummary(req: SummarizeRequest, stories: JiraStory[] = []): Promise<string> {
  const template = getPromptTemplate(req.workType);
  const vars = buildPromptVars(req.issue, req.comments, stories);
  const userMessage = interpolate(template.userTemplate, vars);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: template.maxTokens ?? 250,
      messages: [
        { role: "system", content: template.system },
        { role: "user", content: userMessage },
      ],
    });

    return response.choices[0]?.message?.content ?? "Summary unavailable.";
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("rate_limit") || message.includes("429")) {
      return "Summary unavailable — OpenAI API rate limit reached. Please try again shortly.";
    }
    throw err;
  }
}
