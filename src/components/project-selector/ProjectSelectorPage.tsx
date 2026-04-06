"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutDashboard, Layers, Zap, BarChart3, ArrowRight } from "lucide-react";

const FEATURES = [
  {
    icon: Layers,
    title: "Epic Swimlanes",
    description: "Visualize epics organized by OKR, Eng Work, and Intake across a single view.",
  },
  {
    icon: Zap,
    title: "AI Summaries",
    description: "Instantly generate stakeholder-ready summaries for any epic with one click.",
  },
  {
    icon: BarChart3,
    title: "Story Counts",
    description: "See done vs. total stories per epic to gauge progress at a glance.",
  },
];

export function ProjectSelectorPage() {
  const router = useRouter();
  const { projects, isLoading, error } = useProjects();
  const [selectedKey, setSelectedKey] = useState<string>("");

  function handleLoad() {
    if (!selectedKey) return;
    const selected = projects.find((p) => p.key === selectedKey);
    const params = new URLSearchParams({ projectKey: selectedKey });
    if (selected) params.set("projectName", selected.name);
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex">

      {/* ── Left: Hero panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-14 relative overflow-hidden">
        {/* Subtle gradient orbs */}
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-[#9333EA]/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[#8B5CF6]/10 blur-[100px] pointer-events-none" />

        {/* Wordmark */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#9333EA] to-[#8B5CF6] flex items-center justify-center shadow-lg shadow-purple-900/40">
            <LayoutDashboard className="h-5 w-5 text-white" />
          </div>
          <p className="text-lg font-bold text-white leading-none">Program Dashboard</p>
        </div>

        {/* Feature list */}
        <div className="relative z-10">
          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="mt-0.5 h-8 w-8 rounded-lg bg-[#9333EA]/20 border border-[#9333EA]/30 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-[#A78BFA]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom badge */}
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 text-xs text-gray-600 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Connected to Jira
          </span>
        </div>
      </div>

      {/* ── Right: Selector panel ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#0F0F17] relative">
        {/* Faint grid */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10 w-full max-w-md space-y-8">

          {/* Mobile wordmark */}
          <div className="flex lg:hidden items-center gap-3 justify-center">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#9333EA] to-[#8B5CF6] flex items-center justify-center shadow-lg">
              <LayoutDashboard className="h-4 w-4 text-white" />
            </div>
            <p className="text-base font-bold text-white leading-none">Program Dashboard</p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-8 shadow-2xl shadow-black/40">
            <div className="mb-7">
              <h2 className="text-xl font-bold text-white">Select a project</h2>
              <p className="text-sm text-gray-500 mt-1.5">Load the open epics dashboard for a Jira project.</p>
            </div>

            <div className="space-y-3">
              {isLoading ? (
                <Skeleton className="h-11 w-full bg-white/5" />
              ) : error ? (
                <p className="text-sm text-red-400">
                  Failed to load projects. Check your projects.config.yaml.
                </p>
              ) : (
                <Select value={selectedKey} onValueChange={(v) => setSelectedKey(v ?? "")}>
                  <SelectTrigger className="w-full h-11 bg-white/5 border-white/10 text-white focus:ring-[#9333EA] focus:border-[#9333EA] [&>span]:truncate">
                    <SelectValue placeholder="Choose a project…" />
                  </SelectTrigger>
                  <SelectContent className="w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]">
                    {projects.map((p) => (
                      <SelectItem key={p.key} value={p.key} className="whitespace-normal">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button
                className="w-full h-11 bg-[#9333EA] hover:bg-[#A855F7] text-white font-semibold transition-all shadow-lg shadow-purple-900/30 flex items-center gap-2 group"
                disabled={!selectedKey || isLoading}
                onClick={handleLoad}
              >
                Open Dashboard
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </div>
          </div>

          {/* Recent / hint text */}
          <p className="text-center text-xs text-gray-600">
            Select a project above to view its epics, priorities, and AI summaries.
          </p>
        </div>
      </div>

    </div>
  );
}
