const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
}

export async function getChannels(): Promise<SlackChannel[]> {
  const all: SlackChannel[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL("https://slack.com/api/conversations.list");
    url.searchParams.set("types", "public_channel,private_channel");
    url.searchParams.set("limit", "1000");
    url.searchParams.set("exclude_archived", "true");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` } });
    const data = await res.json() as {
      ok: boolean;
      channels?: SlackChannel[];
      error?: string;
      response_metadata?: { next_cursor?: string };
    };
    if (!data.ok) throw new Error(`Slack error: ${data.error}`);
    all.push(...(data.channels ?? []));
    cursor = data.response_metadata?.next_cursor || undefined;
  } while (cursor);

  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function sendChannelMessage(channel: string, text: string): Promise<void> {
  const channelRef = channel.startsWith("#") || channel.startsWith("C") ? channel : `#${channel}`;

  // Try to join the channel first (works for public channels; silently fails for private)
  await fetch("https://slack.com/api/conversations.join", {
    method: "POST",
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel: channelRef }),
  }).catch(() => {});

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel: channelRef, text, mrkdwn: true }),
  });
  const data = await res.json() as { ok: boolean; error?: string };
  if (!data.ok) {
    if (data.error === "not_in_channel") {
      throw new Error("Bot is not in this channel. In Slack, type: /invite @TPM Tooling - notifications");
    }
    throw new Error(`Slack error: ${data.error}`);
  }
}

export async function lookupUserByEmail(email: string): Promise<string | null> {
  const res = await fetch(
    `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` } }
  );
  const data = await res.json() as { ok: boolean; user?: { id: string }; error?: string };
  if (!data.ok) return null;
  return data.user?.id ?? null;
}

export async function sendDirectMessage(userId: string, text: string): Promise<void> {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel: userId, text }),
  });
  const data = await res.json() as { ok: boolean; error?: string };
  if (!data.ok) throw new Error(`Slack error: ${data.error}`);
}
