import fs from "fs";
import path from "path";

interface CustomSummaryEntry {
  text: string;
  savedAt: string;
}

type Store = Record<string, CustomSummaryEntry>;

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "custom-summaries.json");

function load(): Store {
  try {
    if (!fs.existsSync(FILE)) return {};
    return JSON.parse(fs.readFileSync(FILE, "utf-8")) as Store;
  } catch {
    return {};
  }
}

function persist(store: Store): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(store, null, 2));
}

export function getCustomSummary(epicKey: string): CustomSummaryEntry | null {
  return load()[epicKey] ?? null;
}

export function setCustomSummary(epicKey: string, text: string): void {
  const store = load();
  store[epicKey] = { text, savedAt: new Date().toISOString() };
  persist(store);
}

export function clearCustomSummary(epicKey: string): void {
  const store = load();
  delete store[epicKey];
  persist(store);
}
