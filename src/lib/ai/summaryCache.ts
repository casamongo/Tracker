import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { SummarizeRequest } from "@/types/ai";
import type { JiraStory } from "@/types/jira";

interface CacheEntry {
  summary: string;
  contentHash: string;
}

type CacheStore = Record<string, CacheEntry>;

const DATA_DIR = path.join(process.cwd(), "data");
const CACHE_FILE = path.join(DATA_DIR, "summary-cache.json");

function load(): CacheStore {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(CACHE_FILE)) return {};
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8")) as CacheStore;
  } catch {
    return {};
  }
}

function save(store: CacheStore): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(store, null, 2));
}

export function contentHash(req: SummarizeRequest, stories: JiraStory[]): string {
  const { fields } = req.issue;
  const fingerprint = JSON.stringify({
    status: fields.status.name,
    summary: fields.summary,
    // description intentionally excluded — we write the AI summary there, so
    // including it would cause the hash to change on every write → infinite regen
    priority: fields.priority?.name,
    assignee: fields.assignee?.displayName,
    labels: fields.labels,
    comments: req.comments.map((c) => ({ id: c.id, updated: c.updated })),
    stories: stories.map((s) => ({ key: s.key, status: s.fields.status.name, updated: (s.fields as Record<string, unknown>).updated })),
  });
  return crypto.createHash("sha256").update(fingerprint).digest("hex").slice(0, 16);
}

function cacheKey(issueKey: string, workType: string): string {
  return `${issueKey}::${workType}`;
}

export function getCached(issueKey: string, workType: string, hash: string): string | null {
  const entry = load()[cacheKey(issueKey, workType)];
  if (entry && entry.contentHash === hash) return entry.summary;
  return null;
}

export function setCached(issueKey: string, workType: string, hash: string, summary: string): void {
  const store = load();
  store[cacheKey(issueKey, workType)] = { summary, contentHash: hash };
  save(store);
}
