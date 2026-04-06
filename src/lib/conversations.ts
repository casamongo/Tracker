import fs from "fs";
import path from "path";
import type { ConversationMessage } from "@/types/ai";

type Store = Record<string, ConversationMessage[]>;

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "conversations.json");

function load(): Store {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as Store;
  } catch {
    return {};
  }
}

function save(store: Store): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

function storeKey(epicKey: string, milestoneName: string): string {
  return `${epicKey}::${milestoneName}`;
}

export function getConversation(epicKey: string, milestoneName: string): ConversationMessage[] {
  return load()[storeKey(epicKey, milestoneName)] ?? [];
}

export function addMessage(
  epicKey: string,
  milestoneName: string,
  msg: Omit<ConversationMessage, "id">
): ConversationMessage {
  const store = load();
  const key = storeKey(epicKey, milestoneName);
  const newMsg: ConversationMessage = { ...msg, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` };
  store[key] = [...(store[key] ?? []), newMsg];
  save(store);
  return newMsg;
}
