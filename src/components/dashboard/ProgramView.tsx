"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, Plus, Pencil, Check, X, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableEpicCard } from "@/components/epic/SortableEpicCard";
import type { JiraEpic } from "@/types/jira";
import type { StoryCounts } from "@/hooks/useStoryCounts";

interface Group {
  id: string;
  name: string;
  epicIds: string[];
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function findGroupByEpicId(groups: Group[], epicId: string): Group | undefined {
  return groups.find((g) => g.epicIds.includes(epicId));
}

function initGroups(epics: JiraEpic[], sk: string): Group[] {
  try {
    const saved = localStorage.getItem(`program-groups-${sk}`);
    if (saved) {
      const groups: Group[] = JSON.parse(saved);
      const validIds = new Set(epics.map((e) => e.id));
      const cleaned = groups.map((g) => ({
        ...g,
        epicIds: g.epicIds.filter((id) => validIds.has(id)),
      }));
      const assigned = new Set(cleaned.flatMap((g) => g.epicIds));
      const newIds = epics.filter((e) => !assigned.has(e.id)).map((e) => e.id);
      if (newIds.length > 0 && cleaned.length > 0) {
        cleaned[0] = { ...cleaned[0], epicIds: [...cleaned[0].epicIds, ...newIds] };
      }
      return cleaned;
    }
  } catch { /* ignore */ }
  return [{ id: uid(), name: "Workstreams", epicIds: epics.map((e) => e.id) }];
}

// ── Droppable zone for empty/open groups ─────────────────────────────────────
function DroppableGroup({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] rounded-lg transition-colors ${isOver ? "bg-[#A855F7]/10 ring-2 ring-[#A855F7]/30 ring-dashed" : ""}`}
    >
      {children}
    </div>
  );
}

// ── Single sortable group box ─────────────────────────────────────────────────
function GroupBox({
  group,
  epics,
  storyCounts,
  open,
  onToggle,
  onRename,
  onDelete,
}: {
  group: Group;
  epics: (JiraEpic & { browseUrl?: string })[];
  storyCounts: StoryCounts;
  open: boolean;
  onToggle: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id, data: { type: "group" } });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(group.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commitRename() {
    const name = draft.trim() || group.name;
    setDraft(name);
    onRename(group.id, name);
    setEditing(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-xl border-2 border-[#C4B5FD] shadow-md overflow-hidden ${isDragging ? "opacity-50 shadow-lg ring-2 ring-[#A855F7]/40" : ""}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 bg-gradient-to-r from-[#DDD6FE] to-[#EDE9FE]">
        {/* Group drag handle */}
        <div
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          title="Drag to reorder group"
          className="shrink-0 cursor-grab active:cursor-grabbing text-[#6D28D9]/40 hover:text-[#6D28D9]/70 transition-colors touch-none"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        <button onClick={() => onToggle()} className="shrink-0 text-[#6D28D9]">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <span className="h-2 w-2 rounded-full bg-[#A78BFA] shrink-0" />

        {editing ? (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") { setDraft(group.name); setEditing(false); }
              }}
              className="flex-1 min-w-0 bg-white/70 border border-[#A855F7]/40 rounded px-2 py-0.5 text-sm font-semibold text-[#6D28D9] focus:outline-none focus:ring-1 focus:ring-[#A855F7]"
            />
            <button onClick={commitRename} className="text-[#6D28D9] hover:text-[#4C1D95]">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => { setDraft(group.name); setEditing(false); }} className="text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onToggle()}
            className="flex items-center gap-2 flex-1 min-w-0 text-left"
          >
            <span className="font-semibold text-sm tracking-wide text-[#6D28D9] truncate">{group.name}</span>
            <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-[#C4B5FD]/50 text-[#6D28D9] shrink-0">
              {group.epicIds.length}
            </span>
          </button>
        )}

        {!editing && (
          <div className="flex items-center gap-1 shrink-0 ml-auto">
            <button
              onClick={() => setEditing(true)}
              title="Rename group"
              className="p-1 rounded text-[#6D28D9]/50 hover:text-[#6D28D9] hover:bg-[#A855F7]/10 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(group.id)}
              title="Delete group"
              className="p-1 rounded text-[#6D28D9]/40 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      {open && (
        <div className="p-4 bg-gradient-to-b from-[#F3EEFF] to-[#FAF7FF]">
          <DroppableGroup id={group.id}>
            <SortableContext items={group.epicIds} strategy={rectSortingStrategy}>
              {epics.length > 0 ? (
                <div
                  className="grid gap-3 items-start"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
                >
                  {epics.map((epic) => (
                    <SortableEpicCard
                      key={epic.id}
                      epic={epic}
                      storyProgress={storyCounts[epic.key]}
                      lane="OKR"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#A855F7]/50 text-center py-6">
                  Drag epics here
                </p>
              )}
            </SortableContext>
          </DroppableGroup>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  epics: (JiraEpic & { browseUrl?: string })[];
  storyCounts: StoryCounts;
  storageKey?: string;
}

export function ProgramView({ epics, storyCounts, storageKey }: Props) {
  const sk = storageKey ?? "default";
  const epicMap = new Map(epics.map((e) => [e.id, e]));

  const [groups, setGroups] = useState<Group[]>(() => initGroups(epics, sk));
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({});

  function isOpen(id: string) { return openStates[id] !== false; }
  function toggleGroup(id: string) { setOpenStates((prev) => ({ ...prev, [id]: !isOpen(id) })); }
  function collapseAll() { setOpenStates(Object.fromEntries(groups.map((g) => [g.id, false]))); }
  function expandAll() { setOpenStates(Object.fromEntries(groups.map((g) => [g.id, true]))); }

  useEffect(() => {
    setGroups((prev) => {
      const validIds = new Set(epics.map((e) => e.id));
      const cleaned = prev.map((g) => ({
        ...g,
        epicIds: g.epicIds.filter((id) => validIds.has(id)),
      }));
      const assigned = new Set(cleaned.flatMap((g) => g.epicIds));
      const newIds = epics.filter((e) => !assigned.has(e.id)).map((e) => e.id);
      if (newIds.length > 0 && cleaned.length > 0) {
        cleaned[0] = { ...cleaned[0], epicIds: [...cleaned[0].epicIds, ...newIds] };
      }
      return cleaned;
    });
  }, [epics]);

  function persist(next: Group[]) {
    localStorage.setItem(`program-groups-${sk}`, JSON.stringify(next));
    return next;
  }

  function saveGroups(next: Group[]) {
    setGroups(persist(next));
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    // Skip group drags — groups are reordered only on dragEnd
    if (active.data.current?.type === "group") return;

    const activeId = String(active.id);
    const overId = String(over.id);

    setGroups((prev) => {
      const srcGroup = findGroupByEpicId(prev, activeId);
      if (!srcGroup) return prev;
      const dstGroup = findGroupByEpicId(prev, overId) ?? prev.find((g) => g.id === overId);
      if (!dstGroup || dstGroup.id === srcGroup.id) return prev;

      return prev.map((g) => {
        if (g.id === srcGroup.id) return { ...g, epicIds: g.epicIds.filter((id) => id !== activeId) };
        if (g.id === dstGroup.id) return { ...g, epicIds: [...g.epicIds, activeId] };
        return g;
      });
    });
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    setGroups((prev) => {
      // ── Group reorder ──
      if (active.data.current?.type === "group") {
        const oldIdx = prev.findIndex((g) => g.id === activeId);
        const newIdx = prev.findIndex((g) => g.id === overId);
        if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
          return persist(arrayMove(prev, oldIdx, newIdx));
        }
        return prev;
      }

      // ── Epic reorder within same group ──
      const srcGroup = findGroupByEpicId(prev, activeId);
      if (!srcGroup) return persist(prev);
      const dstGroup = findGroupByEpicId(prev, overId);
      if (dstGroup && dstGroup.id === srcGroup.id && activeId !== overId) {
        const oldIdx = srcGroup.epicIds.indexOf(activeId);
        const newIdx = srcGroup.epicIds.indexOf(overId);
        const next = prev.map((g) =>
          g.id === srcGroup.id ? { ...g, epicIds: arrayMove(g.epicIds, oldIdx, newIdx) } : g
        );
        return persist(next);
      }

      // Cross-group move already handled in dragOver — just persist
      return persist(prev);
    });
  }

  function addGroup() {
    saveGroups([...groups, { id: uid(), name: "New Group", epicIds: [] }]);
  }

  function renameGroup(id: string, name: string) {
    saveGroups(groups.map((g) => (g.id === id ? { ...g, name } : g)));
  }

  function deleteGroup(id: string) {
    const target = groups.find((g) => g.id === id);
    if (!target || groups.length === 1) return;
    const remaining = groups.filter((g) => g.id !== id);
    remaining[0] = { ...remaining[0], epicIds: [...remaining[0].epicIds, ...target.epicIds] };
    saveGroups(remaining);
  }

  if (!epics.length) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">No open epics found for this program.</p>
      </div>
    );
  }

  const allCollapsed = groups.every((g) => !isOpen(g.id));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex justify-end mb-2">
        <button
          onClick={allCollapsed ? expandAll : collapseAll}
          className="text-xs text-[#9333EA] hover:text-[#7E22CE] font-medium transition-colors"
        >
          {allCollapsed ? "Expand All" : "Collapse All"}
        </button>
      </div>
      <SortableContext items={groups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {groups.map((group) => (
            <GroupBox
              key={group.id}
              group={group}
              epics={group.epicIds.flatMap((id) => (epicMap.has(id) ? [epicMap.get(id)!] : []))}
              storyCounts={storyCounts}
              open={isOpen(group.id)}
              onToggle={() => toggleGroup(group.id)}
              onRename={renameGroup}
              onDelete={deleteGroup}
            />
          ))}
        </div>
      </SortableContext>

      <button
        onClick={addGroup}
        className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-[#C4B5FD] text-[#9333EA] hover:bg-[#F3EEFF] transition-colors text-sm font-medium w-full justify-center"
      >
        <Plus className="h-4 w-4" />
        Add Group
      </button>
    </DndContext>
  );
}
