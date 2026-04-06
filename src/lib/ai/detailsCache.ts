import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { JiraStory } from "@/types/jira";
import type { MilestoneItem } from "@/types/ai";

interface CacheEntry {
  milestones: MilestoneItem[];
  contentHash: string;
}

type CacheStore = Record<string, CacheEntry>;

const DATA_DIR = path.join(process.cwd(), "data");
const CACHE_FILE = path.join(DATA_DIR, "details-cache.json");

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

export function detailsContentHash(stories: JiraStory[]): string {
  const fingerprint = JSON.stringify(
    stories.map((s) => ({
      key: s.key,
      status: s.fields.status.name,
      summary: s.fields.summary,
      assignee: s.fields.assignee?.displayName,
      duedate: s.fields.duedate,
      updated: (s.fields as Record<string, unknown>).updated,
      lastComment: s.fields.comment.comments.slice(-1)[0]?.updated,
    }))
  );
  return crypto.createHash("sha256").update(fingerprint).digest("hex").slice(0, 16);
}

export function getCachedDetails(epicKey: string, hash: string): MilestoneItem[] | null {
  const entry = load()[epicKey];
  if (entry && entry.contentHash === hash) return entry.milestones;
  return null;
}

export function setCachedDetails(epicKey: string, hash: string, milestones: MilestoneItem[]): void {
  const store = load();
  store[epicKey] = { milestones, contentHash: hash };
  save(store);
}
