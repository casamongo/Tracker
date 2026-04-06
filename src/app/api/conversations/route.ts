import { getConversation, addMessage } from "@/lib/conversations";
import { lookupUserByEmail, sendDirectMessage } from "@/lib/slack/client";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const epicKey = searchParams.get("epicKey");
  const milestoneName = searchParams.get("milestone");

  if (!epicKey || !milestoneName) {
    return NextResponse.json({ error: "epicKey and milestone are required" }, { status: 400 });
  }

  const messages = getConversation(epicKey, milestoneName);
  return NextResponse.json(messages);
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      epicKey: string;
      milestoneName: string;
      message: string;
      sendToSlack: boolean;
      slackEmail?: string;
      slackRecipientName?: string;
    };

    const { epicKey, milestoneName, message, sendToSlack, slackEmail, slackRecipientName } = body;

    if (!epicKey || !milestoneName || !message) {
      return NextResponse.json({ error: "epicKey, milestoneName, and message are required" }, { status: 400 });
    }

    let slackSent = false;

    if (sendToSlack && slackEmail && process.env.SLACK_BOT_TOKEN) {
      const userId = await lookupUserByEmail(slackEmail);
      if (userId) {
        await sendDirectMessage(userId, message);
        slackSent = true;
      }
    }

    const saved = addMessage(epicKey, milestoneName, {
      message,
      sentToSlack: slackSent,
      slackRecipientName: slackSent ? slackRecipientName : undefined,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(saved);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
