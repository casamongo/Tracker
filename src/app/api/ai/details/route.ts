import { getMilestonesForEpic } from "@/lib/jira/issues";
import { generateDetails } from "@/lib/ai/details";
import { detailsContentHash, getCachedDetails, setCachedDetails } from "@/lib/ai/detailsCache";
import { NextResponse } from "next/server";
import type { JiraEpic } from "@/types/jira";

export async function POST(request: Request) {
  try {
    const body: { epicKey: string; epic: JiraEpic } = await request.json();

    if (!body.epicKey || !body.epic) {
      return NextResponse.json({ error: "epicKey and epic are required" }, { status: 400 });
    }

    const stories = await getMilestonesForEpic(body.epicKey);
    const hash = detailsContentHash(stories);

    const baseUrl = process.env.JIRA_BASE_URL ?? "";

    const cached = getCachedDetails(body.epicKey, hash);
    if (cached) {
      const withUrls = cached.map((m) => ({
        ...m,
        browseUrl: m.browseUrl || (m.issueKey ? `${baseUrl}/browse/${m.issueKey}` : ""),
      }));
      return NextResponse.json({ milestones: withUrls });
    }

    const milestones = await generateDetails(body.epic, stories);

    // Score-based one-to-one matching: each story assigned to at most one milestone
    function wordOverlap(a: string, b: string): number {
      const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
      const wordsB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
      let overlap = 0;
      for (const w of wordsA) if (wordsB.has(w)) overlap++;
      const union = wordsA.size + wordsB.size - overlap;
      return union === 0 ? 0 : overlap / union;
    }

    // Build score matrix
    const MIN_SCORE = 0.2;
    type Candidate = { mIdx: number; sIdx: number; score: number };
    const candidates: Candidate[] = [];
    for (let mIdx = 0; mIdx < milestones.length; mIdx++) {
      for (let sIdx = 0; sIdx < stories.length; sIdx++) {
        const score = wordOverlap(milestones[mIdx].name, stories[sIdx].fields.summary);
        if (score >= MIN_SCORE) candidates.push({ mIdx, sIdx, score });
      }
    }
    candidates.sort((a, b) => b.score - a.score);

    const assignedMilestone = new Set<number>();
    const assignedStory = new Set<number>();
    const storyKeyForMilestone = new Map<number, string>();

    for (const { mIdx, sIdx, score: _ } of candidates) {
      if (assignedMilestone.has(mIdx) || assignedStory.has(sIdx)) continue;
      assignedMilestone.add(mIdx);
      assignedStory.add(sIdx);
      storyKeyForMilestone.set(mIdx, stories[sIdx].key);
    }

    const enriched = milestones.map((m, mIdx) => {
      const key = storyKeyForMilestone.get(mIdx) ?? "";
      return { ...m, issueKey: key, browseUrl: key ? `${baseUrl}/browse/${key}` : "" };
    });

    setCachedDetails(body.epicKey, hash, enriched);
    return NextResponse.json({ milestones: enriched });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ai/details] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
