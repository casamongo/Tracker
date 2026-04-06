import { openai } from "@/lib/ai/client";
import { getSlackStatusPromptTemplate } from "@/lib/prompts";
import { NextResponse } from "next/server";
import type { MilestoneItem } from "@/types/ai";
import { CUSTOM_FIELDS } from "@/lib/jira/client";
import type { JiraEpic } from "@/types/jira";

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "N/A");
}

function formatMilestones(milestones: MilestoneItem[]): string {
  if (!milestones.length) return "No milestones.";
  return milestones
    .map((m) => `${m.name} | Status: ${m.status} | Owner: ${m.owner} | Target: ${m.targetDate}${m.statusNote ? ` | Note: ${m.statusNote}` : ""}`)
    .join("\n");
}

export async function POST(request: Request) {
  try {
    const { epic, milestones, tldr } = await request.json() as {
      epic: JiraEpic;
      milestones: MilestoneItem[];
      tldr?: string;
    };

    if (!epic) return NextResponse.json({ error: "epic is required" }, { status: 400 });

    const template = getSlackStatusPromptTemplate();
    const fields = epic.fields;
    const targetDate = (fields as Record<string, unknown>)[CUSTOM_FIELDS.QUARTER_COMPLETION] as string ?? "TBD";

    const vars: Record<string, string> = {
      summary: fields.summary,
      status: fields.status.name,
      targetDate,
      owner: fields.assignee?.displayName ?? "Unassigned",
      milestones: formatMilestones(milestones ?? []),
      tldr: tldr ?? "",
    };

    const userMessage = interpolate(template.userTemplate, vars);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: template.maxTokens ?? 600,
      messages: [
        { role: "system", content: template.system },
        { role: "user", content: userMessage },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "Status unavailable.";
    // Indent bullet lines for visual hierarchy in Slack
    const status = raw.split("\n").map((line) =>
      line.trimStart().startsWith("•") ? "      " + line.trimStart() : line
    ).join("\n");
    return NextResponse.json({ status });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
