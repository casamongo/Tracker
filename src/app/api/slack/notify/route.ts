import { lookupUserByEmail, sendDirectMessage } from "@/lib/slack/client";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, message } = await request.json() as { email: string; message: string };

    if (!email || !message) {
      return NextResponse.json({ error: "email and message are required" }, { status: 400 });
    }

    if (!process.env.SLACK_BOT_TOKEN) {
      return NextResponse.json({ error: "Slack is not configured. Add SLACK_BOT_TOKEN to .env.local." }, { status: 503 });
    }

    const userId = await lookupUserByEmail(email);
    if (!userId) {
      return NextResponse.json({ error: "Slack user not found for this email address." }, { status: 404 });
    }

    await sendDirectMessage(userId, message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
