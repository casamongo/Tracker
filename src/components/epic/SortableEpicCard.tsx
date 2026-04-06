"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { EpicCard } from "./EpicCard";
import type { JiraEpic } from "@/types/jira";
import type { SwimlaneKey } from "@/lib/utils";

interface Props {
  epic: JiraEpic;
  storyProgress?: { total: number; done: number };
  onStatusChange?: (epicKey: string, newStatus: string) => void;
  lane?: SwimlaneKey;
}

export function SortableEpicCard({ epic, storyProgress, onStatusChange, lane }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: epic.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative group/sortable ${isDragging ? "opacity-40" : ""}`}
    >
      {/* Drag handle — appears on hover at top-left */}
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        title="Drag to reorder"
        className="absolute top-1.5 left-1 z-10 opacity-0 group-hover/sortable:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing text-gray-400 transition-opacity touch-none"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>
      <EpicCard
        epic={epic}
        storyProgress={storyProgress}
        onStatusChange={onStatusChange}
        lane={lane}
      />
    </div>
  );
}
