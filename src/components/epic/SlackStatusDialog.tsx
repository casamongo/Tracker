"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Send } from "lucide-react";
import type { JiraEpic } from "@/types/jira";
import type { MilestoneItem } from "@/types/ai";

interface Props {
  open: boolean;
  onClose: () => void;
  epic: JiraEpic;
  milestones: MilestoneItem[];
  tldr?: string;
}

export function SlackStatusDialog({ open, onClose, epic, milestones, tldr }: Props) {
  const [statusText, setStatusText] = useState("");
  const [generatingStatus, setGeneratingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [channels, setChannels] = useState<string[]>([]);
  const [selectedChannel, setSelectedChannel] = useState("");

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Generate AI status when dialog opens
  useEffect(() => {
    if (!open) return;
    setSent(false);
    setSendError(null);
    setStatusError(null);
    setGeneratingStatus(true);

    fetch("/api/ai/slack-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ epic, milestones, tldr }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setStatusText(d.status);
      })
      .catch((e) => setStatusError(e.message))
      .finally(() => setGeneratingStatus(false));
  }, [open, epic.key]);

  // Fetch channels only when dialog first opens
  useEffect(() => {
    if (!open || channels.length > 0) return;
    fetch("/api/slack/channels")
      .then((r) => r.json())
      .then((d) => {
        const list: string[] = Array.isArray(d) ? d : [];
        setChannels(list);
        if (list.length > 0) setSelectedChannel(list[0]);
      })
      .catch(() => {});
  }, [open]);

  async function handleSend() {
    if (!selectedChannel || !statusText.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/slack/send-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: selectedChannel, text: statusText }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to send");
      setSent(true);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[600px] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <p className="text-xs font-mono text-muted-foreground">{epic.key}</p>
          <DialogTitle className="text-sm font-semibold leading-tight">{epic.fields.summary}</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">Review and send status update to Slack</p>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-5 overflow-y-auto flex-1">
          {/* Status text area */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
              Status Message
            </label>
            {generatingStatus ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-8 justify-center border rounded-lg bg-gray-50">
                <Loader2 className="h-4 w-4 animate-spin text-[#9333EA]" />
                Generating status with AI…
              </div>
            ) : statusError ? (
              <p className="text-xs text-red-600 py-2">{statusError}</p>
            ) : (
              <textarea
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                rows={12}
                className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#9333EA] focus:border-transparent leading-7 bg-white shadow-sm"
                placeholder="Status message…"
              />
            )}
          </div>

          {/* Channel selector */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
              Send to Channel
            </label>
            {channels.length === 0 ? (
              <p className="text-xs text-gray-400">No channels configured in slack.config.yaml</p>
            ) : (
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9333EA] bg-white text-gray-700"
              >
                {channels.map((c) => (
                  <option key={c} value={c}>#{c}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 shrink-0 flex items-center justify-between gap-3">
          <div className="flex-1">
            {sendError && <p className="text-xs text-red-600">{sendError}</p>}
            {sent && (
              <p className="text-xs text-emerald-600 font-medium">
                ✓ Sent to #{selectedChannel}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 transition-colors"
          >
            {sent ? "Close" : "Cancel"}
          </button>
          {!sent && (
            <button
              onClick={handleSend}
              disabled={sending || !selectedChannel || !statusText.trim() || generatingStatus}
              className="inline-flex items-center gap-2 text-xs font-semibold bg-[#9333EA] text-white px-4 py-2 rounded-lg hover:bg-[#7E22CE] disabled:opacity-40 transition-colors"
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {sending ? "Sending…" : "Send to Slack"}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
