"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useConversation } from "@/hooks/useConversation";

interface Props {
  open: boolean;
  onClose: () => void;
  epicKey: string;
  epicName: string;
  milestoneName: string;
  ownerName: string;
  ownerEmail: string;
  slackConfigured: boolean;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export function SlackMessageDialog({
  open,
  onClose,
  epicKey,
  epicName,
  milestoneName,
  ownerName,
  ownerEmail,
  slackConfigured,
}: Props) {
  const [message, setMessage] = useState("");
  const [sendToSlack, setSendToSlack] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { messages, refresh } = useConversation(open ? epicKey : null, open ? milestoneName : null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handlePost() {
    if (!message.trim()) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          epicKey,
          milestoneName,
          message,
          sendToSlack: sendToSlack && !!ownerEmail,
          slackEmail: ownerEmail,
          slackRecipientName: ownerName,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to post");
      setMessage("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setPosting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handlePost();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg w-full flex flex-col" style={{ maxHeight: "80vh" }}>
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-sm">{milestoneName}</DialogTitle>
          <p className="text-xs text-muted-foreground">{epicName}</p>
        </DialogHeader>

        {/* Message history */}
        <div className="flex-1 overflow-y-auto border rounded-lg bg-muted/20 p-3 space-y-3 min-h-[200px]">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No messages yet</p>
          )}
          {messages.map((m) => (
            <div key={m.id} className="space-y-0.5">
              <p className="text-xs text-muted-foreground">
                {formatTimestamp(m.timestamp)}
                {m.sentToSlack && m.slackRecipientName && (
                  <span className="ml-2 text-green-600">· Sent to {m.slackRecipientName} on Slack</span>
                )}
              </p>
              <p className="text-sm whitespace-pre-wrap">{m.message}</p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="shrink-0 space-y-2 pt-1">
          <textarea
            className="w-full min-h-[80px] text-sm border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder={`Add a note or question… (⌘↵ to send)`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={posting}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex items-center justify-between">
            {slackConfigured && ownerEmail ? (
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sendToSlack}
                  onChange={(e) => setSendToSlack(e.target.checked)}
                  className="rounded"
                />
                Send to {ownerName} on Slack
              </label>
            ) : (
              <span />
            )}
            <Button size="sm" onClick={handlePost} disabled={posting || !message.trim()}>
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {posting ? "Posting…" : "Post"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
