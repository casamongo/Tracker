"use client";

import { useState, useEffect, useRef } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Swimlane } from "./Swimlane";
import { classifySwimlane } from "@/lib/utils";
import type { JiraEpic } from "@/types/jira";
import type { SwimlaneKey } from "@/lib/utils";
import type { StoryCounts } from "@/hooks/useStoryCounts";

const SWIMLANE_ORDER: SwimlaneKey[] = ["OKR", "ENG Work", "Intake", "Others"];

/** Labels that mark a lane. "Others" has no label. */
const LANE_LABEL: Record<SwimlaneKey, string | null> = {
  OKR: "okr",
  "ENG Work": "eng",
  Intake: "intake",
  Others: null,
};

const LANE_MARKER_LABELS = new Set(["okr", "eng", "intake"]);

function storageKey(prefix: string, lane: SwimlaneKey): string {
  return `epic-order-${prefix}-${lane}`;
}

function loadStoredOrder(prefix: string, lane: SwimlaneKey): string[] | null {
  try {
    const saved = localStorage.getItem(storageKey(prefix, lane));
    if (!saved) return null;
    return JSON.parse(saved) as string[];
  } catch {
    return null;
  }
}

function saveOrder(prefix: string, lane: SwimlaneKey, epics: JiraEpic[]): void {
  try {
    localStorage.setItem(storageKey(prefix, lane), JSON.stringify(epics.map((e) => e.id)));
  } catch {
    // ignore storage errors
  }
}

function applyOrder(epics: JiraEpic[], ids: string[] | null): JiraEpic[] {
  if (!ids) return epics;
  const map = new Map(epics.map((e) => [e.id, e]));
  const ordered = ids.map((id) => map.get(id)).filter(Boolean) as JiraEpic[];
  const seenIds = new Set(ids);
  const unseen = epics.filter((e) => !seenIds.has(e.id));
  return [...ordered, ...unseen];
}

function initLanes(
  grouped: Record<SwimlaneKey, JiraEpic[]>,
  prefix: string
): Record<SwimlaneKey, JiraEpic[]> {
  const lanes = {} as Record<SwimlaneKey, JiraEpic[]>;
  for (const lane of SWIMLANE_ORDER) {
    lanes[lane] = applyOrder(grouped[lane], loadStoredOrder(prefix, lane));
  }
  return lanes;
}

async function patchJiraLabels(epicKey: string, labels: string[]): Promise<void> {
  const res = await fetch(`/api/jira/issues/${epicKey}/update`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ labels }),
  });
  if (!res.ok) {
    console.error(`Failed to update labels for ${epicKey}: ${res.status} ${res.statusText}`);
  }
}

interface Props {
  grouped: Record<SwimlaneKey, JiraEpic[]>;
  storyCounts?: StoryCounts;
  storageKeyPrefix: string;
  onStatusChange?: (epicKey: string, newStatus: string) => void;
}

export function TrackerSwimlanes({
  grouped,
  storyCounts = {},
  storageKeyPrefix,
  onStatusChange,
}: Props) {
  const [lanes, setLanes] = useState<Record<SwimlaneKey, JiraEpic[]>>(() =>
    initLanes(grouped, storageKeyPrefix)
  );

  // Track local lane assignments to resist server re-fetches overriding cross-lane moves.
  // epicId -> lane the user moved it to
  const localLaneRef = useRef<Map<string, SwimlaneKey>>(new Map());

  // Reconcile when server data (grouped) changes
  useEffect(() => {
    setLanes((prev) => {
      const next = {} as Record<SwimlaneKey, JiraEpic[]>;

      // Build a map of all current server epics by id
      const serverEpicMap = new Map<string, JiraEpic>();
      for (const lane of SWIMLANE_ORDER) {
        for (const epic of grouped[lane]) {
          serverEpicMap.set(epic.id, epic);
        }
      }

      // Build a set of all epic ids currently in prev state
      const prevEpicLane = new Map<string, SwimlaneKey>();
      for (const lane of SWIMLANE_ORDER) {
        for (const epic of prev[lane]) {
          prevEpicLane.set(epic.id, lane);
        }
      }

      // Start each lane with the epics already there (updated field data from server)
      for (const lane of SWIMLANE_ORDER) {
        const kept: JiraEpic[] = [];
        for (const epic of prev[lane]) {
          if (!serverEpicMap.has(epic.id)) continue; // epic removed from server
          // Use fresh server data for fields but keep in current lane
          const fresh = serverEpicMap.get(epic.id)!;
          kept.push(fresh);
        }
        next[lane] = kept;
      }

      // Add brand-new epics (not previously seen) to their server-classified lane,
      // unless a local override exists
      for (const [id, serverEpic] of serverEpicMap.entries()) {
        if (prevEpicLane.has(id)) continue; // already placed above

        const localLane = localLaneRef.current.get(id);
        const targetLane = localLane ?? classifySwimlane(serverEpic.fields.labels);
        next[targetLane].push(serverEpic);
      }

      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grouped]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function findEpicLane(epicId: string): SwimlaneKey | null {
    for (const lane of SWIMLANE_ORDER) {
      if (lanes[lane].some((e) => e.id === epicId)) return lane;
    }
    return null;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Determine target lane: droppable zones have id "lane-{title}"
    let targetLane: SwimlaneKey | null = null;
    if (overId.startsWith("lane-")) {
      const laneTitle = overId.slice(5) as SwimlaneKey;
      if (SWIMLANE_ORDER.includes(laneTitle)) {
        targetLane = laneTitle;
      }
    } else {
      // over an epic card — find which lane it belongs to
      targetLane = findEpicLane(overId);
    }

    const sourceLane = findEpicLane(activeId);

    if (!sourceLane || !targetLane) return;

    if (sourceLane === targetLane) {
      // Within-lane reorder
      setLanes((prev) => {
        const items = prev[sourceLane];
        const oldIndex = items.findIndex((e) => e.id === activeId);
        const newIndex = items.findIndex((e) => e.id === overId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;
        const reordered = arrayMove(items, oldIndex, newIndex);
        saveOrder(storageKeyPrefix, sourceLane, reordered);
        return { ...prev, [sourceLane]: reordered };
      });
    } else {
      // Cross-lane move
      setLanes((prev) => {
        const sourceItems = [...prev[sourceLane]];
        const targetItems = [...prev[targetLane!]];

        const epicIndex = sourceItems.findIndex((e) => e.id === activeId);
        if (epicIndex === -1) return prev;

        const [movedEpic] = sourceItems.splice(epicIndex, 1);

        // Insert at the correct position in target lane
        const overIndexInTarget = targetItems.findIndex((e) => e.id === overId);
        if (overIndexInTarget === -1) {
          targetItems.push(movedEpic);
        } else {
          targetItems.splice(overIndexInTarget, 0, movedEpic);
        }

        const next = {
          ...prev,
          [sourceLane]: sourceItems,
          [targetLane!]: targetItems,
        };

        saveOrder(storageKeyPrefix, sourceLane, sourceItems);
        saveOrder(storageKeyPrefix, targetLane!, targetItems);

        // Record local lane override so server re-fetches don't undo this
        localLaneRef.current.set(activeId, targetLane!);

        // Fire-and-forget Jira label update
        const newLaneLabel = LANE_LABEL[targetLane!];
        const currentLabels = movedEpic.fields.labels ?? [];
        const strippedLabels = currentLabels.filter(
          (l) => !LANE_MARKER_LABELS.has(l.toLowerCase())
        );
        const updatedLabels = newLaneLabel
          ? [...strippedLabels, newLaneLabel]
          : strippedLabels;

        patchJiraLabels(movedEpic.key, updatedLabels).catch((err) => {
          console.error("Jira label update failed:", err);
        });

        return next;
      });
    }
  }

  const hasAnyEpic = SWIMLANE_ORDER.some((lane) => lanes[lane].length > 0);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        {SWIMLANE_ORDER.filter((lane) => lanes[lane].length > 0).map((lane) => (
          <Swimlane
            key={lane}
            title={lane}
            epics={lanes[lane]}
            storyCounts={storyCounts}
            onStatusChange={onStatusChange}
          />
        ))}
        {!hasAnyEpic && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No open epics found for this team.</p>
          </div>
        )}
      </div>
    </DndContext>
  );
}
