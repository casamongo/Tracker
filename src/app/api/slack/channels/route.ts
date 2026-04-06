import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

function loadChannels(): string[] {
  try {
    const filePath = path.join(process.cwd(), "slack.config.yaml");
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = yaml.load(raw) as { channels?: { name: string }[] };
    return (parsed.channels ?? []).map((c) => c.name).filter(Boolean);
  } catch {
    return [];
  }
}

export async function GET() {
  const channels = loadChannels();
  return NextResponse.json(channels);
}
