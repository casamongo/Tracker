import { sendChannelMessage } from "@/lib/slack/client";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    if (!process.env.SLACK_BOT_TOKEN) {
      return NextResponse.json({ error: "Slack not configured. Add SLACK_BOT_TOKEN to .env.local." }, { status: 503 });
    }
    const { channelId, text } = await request.json() as { channelId: string; text: string };
    if (!channelId || !text?.trim()) {
      return NextResponse.json({ error: "channelId and text are required" }, { status: 400 });
    }
    await sendChannelMessage(channelId, text);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
