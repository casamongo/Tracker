import { google } from "googleapis";
import fs from "fs";
import type { OKRObjective } from "@/types/okr";

export interface ParsedOKRDoc {
  objectives: OKRObjective[];
}

function getAuth() {
  const filePath = process.env.GOOGLE_SERVICE_ACCOUNT_FILE;
  if (filePath) {
    return new google.auth.GoogleAuth({
      keyFile: filePath,
      scopes: ["https://www.googleapis.com/auth/documents.readonly"],
    });
  }
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error("Set GOOGLE_SERVICE_ACCOUNT_FILE or GOOGLE_SERVICE_ACCOUNT_JSON");
  return new google.auth.GoogleAuth({
    credentials: JSON.parse(json),
    scopes: ["https://www.googleapis.com/auth/documents.readonly"],
  });
}

function paragraphText(elements: unknown[]): string {
  return (elements as Array<{ textRun?: { content?: string } }>)
    .map((e) => e.textRun?.content ?? "")
    .join("")
    .replace(/\n$/, "")
    .trim();
}

function parseContent(content: unknown[]): OKRObjective[] {
  const objectives: OKRObjective[] = [];
  let currentObjective: OKRObjective | null = null;
  let krIndex = 0;

  for (const element of content as Array<{ paragraph?: { elements?: unknown[] } }>) {
    const paragraph = element.paragraph;
    if (!paragraph?.elements) continue;

    const text = paragraphText(paragraph.elements);
    if (!text) continue;

    const objMatch = text.match(/^O\s*(\d+)\s*:\s*(.+)/i);
    if (objMatch) {
      currentObjective = {
        number: parseInt(objMatch[1], 10),
        text: objMatch[2].trim(),
        krs: [],
      };
      objectives.push(currentObjective);
      krIndex = 0;
      continue;
    }

    const krMatch = text.match(/^KR\s*\d*\s*:\s*(.+)/i);
    if (krMatch && currentObjective) {
      krIndex++;
      currentObjective.krs.push({ index: krIndex, text: krMatch[1].trim() });
    }
  }

  return objectives;
}

type TabNode = {
  tabProperties?: { title?: string };
  documentTab?: { body?: { content?: unknown[] } };
  childTabs?: TabNode[];
};

/** Flatten all tabs (including nested child tabs) into a single depth-first list. */
function flattenTabs(tabs: TabNode[]): TabNode[] {
  const result: TabNode[] = [];
  for (const tab of tabs) {
    result.push(tab);
    if (tab.childTabs?.length) result.push(...flattenTabs(tab.childTabs));
  }
  return result;
}

function normalize(s: string) {
  return s.toLowerCase().trim();
}

/**
 * Find the best-matching tab for a given name across ALL tabs and sub-tabs.
 * Matching priority:
 *   1. Exact (case-insensitive, trimmed)
 *   2. Tab title starts with the name  (e.g. "IDM Planning - Details" ← "IDM Planning")
 *   3. Name starts with the tab title  (e.g. "IDM Planning Team" ← tab "IDM Planning")
 *   4. Either string contains the other (loose fallback, min 4 chars to avoid false positives)
 */
function pickTab(allTabs: TabNode[], name: string): TabNode | null {
  const needle = normalize(name);

  const exact = allTabs.find((t) => normalize(t.tabProperties?.title ?? "") === needle);
  if (exact) return exact;

  const tabStartsWith = allTabs.find((t) =>
    normalize(t.tabProperties?.title ?? "").startsWith(needle)
  );
  if (tabStartsWith) return tabStartsWith;

  const nameStartsWith = allTabs.find((t) => {
    const title = normalize(t.tabProperties?.title ?? "");
    return title.length >= 4 && needle.startsWith(title);
  });
  if (nameStartsWith) return nameStartsWith;

  return (
    allTabs.find((t) => {
      const title = normalize(t.tabProperties?.title ?? "");
      return title.length >= 4 && (title.includes(needle) || needle.includes(title));
    }) ?? null
  );
}

function summarizeTabs(tabs: TabNode[]): unknown[] {
  return tabs.map((t) => ({
    title: t.tabProperties?.title,
    children: t.childTabs?.length ? summarizeTabs(t.childTabs) : [],
  }));
}

export async function getTabTree(docId: string): Promise<unknown> {
  const auth = getAuth();
  const docs = google.docs({ version: "v1", auth });
  const response = await (docs.documents.get as unknown as (p: Record<string, unknown>) => Promise<{ data: Record<string, unknown> }>)({
    documentId: docId,
    includeTabsContent: true,
  });
  const tabs = response.data.tabs as TabNode[] | undefined;
  return summarizeTabs(tabs ?? []);
}

export async function parseOKRDoc(docId: string, teamName: string): Promise<ParsedOKRDoc> {
  const auth = getAuth();
  const docs = google.docs({ version: "v1", auth });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (docs.documents.get as unknown as (p: Record<string, unknown>) => Promise<{ data: Record<string, unknown> }>)({
    documentId: docId,
    includeTabsContent: true,
  });
  const docData = response.data;

  const tabs = docData.tabs as TabNode[] | undefined;

  if (tabs && tabs.length > 0) {
    const allTabs = flattenTabs(tabs);
    const match = pickTab(allTabs, teamName);

    if (!match) {
      const available = allTabs
        .map((t) => t.tabProperties?.title)
        .filter(Boolean)
        .join(", ");
      throw new Error(`No tab matching "${teamName}" found. Available tabs: ${available}`);
    }

    const content = match.documentTab?.body?.content ?? [];
    return { objectives: parseContent(content) };
  }

  // Single-tab / legacy doc: fall back to root body
  const body = docData.body as { content?: unknown[] } | undefined;
  return { objectives: parseContent(body?.content ?? []) };
}
