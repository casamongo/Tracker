import type { AdfDoc, AdfNode } from "@/types/jira";

function nodeText(node: AdfNode): string {
  if (node.type === "text") return node.text ?? "";
  if (!node.content) return "";
  return node.content.map(nodeText).join("");
}

// Match both old ("overall summary") and new ("overall status summary") heading text.
const SUMMARY_HEADING_TEXTS = ["overall summary", "overall status summary"];

function isSummaryHeading(node: AdfNode): boolean {
  return node.type === "heading" && SUMMARY_HEADING_TEXTS.includes(nodeText(node).trim().toLowerCase());
}

function isPanelWithSummaryHeading(node: AdfNode): boolean {
  return node.type === "panel" && !!node.content?.some(isSummaryHeading);
}

/** True if the ADF document contains an "Overall Status Summary" panel (or legacy heading) we wrote. */
export function hasOurSummarySection(description: AdfDoc | null | undefined): boolean {
  if (!description?.content) return false;
  return description.content.some((node) => isSummaryHeading(node) || isPanelWithSummaryHeading(node));
}

/** Extract the summary paragraph text from either a panel block or a legacy heading section. */
export function extractOurSummaryText(description: AdfDoc | null | undefined): string {
  if (!description?.content) return "";

  // New format: panel containing heading + paragraph(s)
  for (const node of description.content) {
    if (isPanelWithSummaryHeading(node)) {
      const parts: string[] = [];
      let foundHeading = false;
      for (const child of node.content ?? []) {
        if (!foundHeading && isSummaryHeading(child)) {
          foundHeading = true;
          continue;
        }
        if (foundHeading) parts.push(nodeText(child));
      }
      return parts.join("\n").trim();
    }
  }

  // Legacy format: top-level heading followed by paragraphs
  let inSection = false;
  const parts: string[] = [];
  for (const node of description.content) {
    if (node.type === "heading") {
      if (isSummaryHeading(node)) {
        inSection = true;
        continue;
      }
      if (inSection) break;
    }
    if (inSection) parts.push(nodeText(node));
  }
  return parts.join("\n").trim();
}

/**
 * Return a copy of the ADF doc with the "Overall Status Summary" section stripped out,
 * so the AI doesn't see its own previous output as epic description.
 */
export function stripOurSummarySection(description: AdfDoc | null | undefined): AdfDoc | null {
  if (!description?.content) return description ?? null;
  let skip = false;
  const filtered: AdfNode[] = [];
  for (const node of description.content) {
    // New format: strip the panel block entirely
    if (isPanelWithSummaryHeading(node)) continue;

    // Legacy format: skip heading + following nodes until next heading
    if (node.type === "heading") {
      if (isSummaryHeading(node)) {
        skip = true;
        continue;
      }
      skip = false;
    }
    if (!skip) filtered.push(node);
  }
  return { ...description, content: filtered };
}

/** Build an ADF document with an "Overall Status Summary" info panel. */
export function buildSummaryAdf(summaryText: string): AdfDoc {
  return {
    version: 1,
    type: "doc",
    content: [
      {
        type: "panel",
        attrs: { panelType: "info" },
        content: [
          {
            type: "heading",
            attrs: { level: 3 },
            content: [{ type: "text", text: "Overall Status Summary" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: summaryText }],
          },
        ],
      },
    ],
  };
}

// ── Status Note panel (for stories) ─────────────────────────────────────────

const STATUS_NOTE_HEADING_TEXT = "status summary";

function isPanelWithStatusNoteHeading(node: AdfNode): boolean {
  return (
    node.type === "panel" &&
    !!node.content?.some(
      (n) => n.type === "heading" && nodeText(n).trim().toLowerCase() === STATUS_NOTE_HEADING_TEXT
    )
  );
}

export function extractStatusNoteText(description: AdfDoc | null | undefined): string {
  if (!description?.content) return "";
  for (const node of description.content) {
    if (isPanelWithStatusNoteHeading(node)) {
      const parts: string[] = [];
      let foundHeading = false;
      for (const child of node.content ?? []) {
        if (!foundHeading && child.type === "heading") { foundHeading = true; continue; }
        if (foundHeading) parts.push(nodeText(child));
      }
      return parts.join("\n").trim();
    }
  }
  return "";
}

/** Return a copy of the ADF doc with the status note panel prepended (replacing any existing one). */
export function upsertStatusNoteInDescription(
  description: AdfDoc | null | undefined,
  newNote: string
): AdfDoc {
  const existing = description?.content ?? [];
  const stripped = existing.filter((n) => !isPanelWithStatusNoteHeading(n));
  const panel: AdfNode = {
    type: "panel",
    attrs: { panelType: "note" },
    content: [
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Status Summary" }] },
      { type: "paragraph", content: [{ type: "text", text: newNote }] },
    ],
  };
  return { version: 1, type: "doc", content: [panel, ...stripped] };
}

export function buildStatusNoteArchiveCommentAdf(oldNote: string): AdfDoc {
  return {
    version: 1,
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: `[Status Summary archived] ${oldNote}` }] },
    ],
  };
}

/** Build an ADF comment body to archive an old summary. */
export function buildArchiveCommentAdf(oldSummary: string): AdfDoc {
  return {
    version: 1,
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: `[Overall Summary archived] ${oldSummary}` },
        ],
      },
    ],
  };
}
