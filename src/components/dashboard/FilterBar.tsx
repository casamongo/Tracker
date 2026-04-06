"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X, SlidersHorizontal, EyeOff, Bookmark, BookmarkCheck, Eye } from "lucide-react";
import type { JiraEpic } from "@/types/jira";
import type { FilterPreset } from "@/hooks/usePersistedFilters";

export interface ActiveFilters {
  statuses: string[];
  priorities: string[];
  assignees: string[];
  excludedLabels: string[];
}

interface Props {
  epics: JiraEpic[];
  filters: ActiveFilters;
  onChange: (filters: ActiveFilters) => void;
  presets: FilterPreset[];
  onSavePreset: (name: string) => void;
  onDeletePreset: (name: string) => void;
  onLoadPreset: (preset: FilterPreset) => void;
  includeDone: boolean;
  onToggleIncludeDone: () => void;
}

function MultiSelectDropdown({
  label,
  options,
  selected,
  onToggle,
  exclude,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  exclude?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const activeCount = selected.length;
  const activeStyle = exclude ? "bg-red-500 text-white border-red-500" : "bg-[#9333EA] text-white border-[#9333EA]";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
          activeCount > 0 ? activeStyle : "bg-white text-gray-600 border-gray-200 hover:border-[#9333EA] hover:text-[#9333EA]"
        }`}
      >
        {exclude && <EyeOff className="h-3 w-3" />}
        {label}
        {activeCount > 0 && (
          <span className="bg-white/25 text-white rounded-full px-1.5 py-0 text-[10px] font-bold leading-4">{activeCount}</span>
        )}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && options.length > 0 && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[180px]">
          {exclude && (
            <p className="text-[10px] text-gray-400 px-3 pt-1 pb-1.5 border-b border-gray-100 font-medium">
              Epics with selected labels will be hidden
            </p>
          )}
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#F0EBF8] cursor-pointer transition-colors">
              <input
                type="checkbox"
                className={`h-3.5 w-3.5 ${exclude ? "accent-red-500" : "accent-[#9333EA]"}`}
                checked={selected.includes(opt)}
                onChange={() => onToggle(opt)}
              />
              <span className="text-xs font-medium text-gray-700 whitespace-nowrap">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function PresetsMenu({
  presets,
  onSave,
  onLoad,
  onDelete,
}: {
  presets: FilterPreset[];
  onSave: (name: string) => void;
  onLoad: (preset: FilterPreset) => void;
  onDelete: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSaving(false);
        setName("");
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  useEffect(() => {
    if (saving) inputRef.current?.focus();
  }, [saving]);

  function confirmSave() {
    const trimmed = name.trim();
    if (trimmed) onSave(trimmed);
    setSaving(false);
    setName("");
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
          presets.length > 0
            ? "bg-white text-[#9333EA] border-[#9333EA] hover:bg-[#F0EBF8]"
            : "bg-white text-gray-600 border-gray-200 hover:border-[#9333EA] hover:text-[#9333EA]"
        }`}
        title="Saved filters"
      >
        {presets.length > 0 ? <BookmarkCheck className="h-3 w-3" /> : <Bookmark className="h-3 w-3" />}
        Saved
        {presets.length > 0 && (
          <span className="bg-[#F0EBF8] text-[#9333EA] rounded-full px-1.5 text-[10px] font-bold leading-4">{presets.length}</span>
        )}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[200px]">
          {presets.length === 0 && !saving && (
            <p className="text-xs text-gray-400 px-3 py-2">No saved filters yet.</p>
          )}
          {presets.map((p) => (
            <div key={p.name} className="flex items-center justify-between px-3 py-2 hover:bg-[#F0EBF8] group">
              <button
                className="text-xs font-medium text-gray-700 hover:text-[#9333EA] text-left flex-1 truncate"
                onClick={() => { onLoad(p); setOpen(false); }}
              >
                {p.name}
              </button>
              <button
                onClick={() => onDelete(p.name)}
                className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 ml-2 shrink-0"
                title="Delete preset"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {presets.length > 0 && <div className="border-t border-gray-100 my-1" />}

          {saving ? (
            <div className="px-3 py-2 flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") confirmSave(); if (e.key === "Escape") { setSaving(false); setName(""); } }}
                placeholder="Filter name…"
                className="text-xs border border-gray-200 rounded px-2 py-1 flex-1 focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
              />
              <button
                onClick={confirmSave}
                className="text-xs font-semibold text-[#9333EA] hover:text-[#7E22CE] whitespace-nowrap"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSaving(true)}
              className="w-full text-left text-xs font-medium text-[#9333EA] px-3 py-2 hover:bg-[#F0EBF8] transition-colors flex items-center gap-1.5"
            >
              <Bookmark className="h-3 w-3" />
              Save current filter…
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function FilterBar({ epics, filters, onChange, presets, onSavePreset, onDeletePreset, onLoadPreset, includeDone, onToggleIncludeDone }: Props) {
  const statuses = [...new Set(epics.map((e) => e.fields.status.name))].sort();
  const priorities = [...new Set(epics.map((e) => e.fields.priority?.name).filter(Boolean) as string[])];
  const assignees = [...new Set(epics.map((e) => e.fields.assignee?.displayName).filter(Boolean) as string[])].sort();
  const labels = [...new Set(epics.flatMap((e) => e.fields.labels))].sort();

  const totalActive = filters.statuses.length + filters.priorities.length + filters.assignees.length + filters.excludedLabels.length;

  function toggle(key: keyof ActiveFilters, value: string) {
    const current = filters[key];
    onChange({ ...filters, [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] });
  }

  function clearAll() {
    onChange({ statuses: [], priorities: [], assignees: [], excludedLabels: [] });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 font-medium mr-1">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Filter
      </span>

      <MultiSelectDropdown label="Status" options={statuses} selected={filters.statuses} onToggle={(v) => toggle("statuses", v)} />
      <MultiSelectDropdown label="Priority" options={priorities} selected={filters.priorities} onToggle={(v) => toggle("priorities", v)} />
      <MultiSelectDropdown label="Assignee" options={assignees} selected={filters.assignees} onToggle={(v) => toggle("assignees", v)} />
      {labels.length > 0 && (
        <MultiSelectDropdown label="Hide Labels" options={labels} selected={filters.excludedLabels} onToggle={(v) => toggle("excludedLabels", v)} exclude />
      )}

      <div className="w-px h-4 bg-gray-200 mx-0.5" />

      <button
        onClick={onToggleIncludeDone}
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
          includeDone
            ? "bg-[#9333EA] text-white border-[#9333EA]"
            : "bg-white text-gray-600 border-gray-200 hover:border-[#9333EA] hover:text-[#9333EA]"
        }`}
        title="Show completed / rejected items"
      >
        <Eye className="h-3 w-3" />
        Show Completed
      </button>

      <div className="w-px h-4 bg-gray-200 mx-0.5" />

      <PresetsMenu
        presets={presets}
        onSave={onSavePreset}
        onLoad={onLoadPreset}
        onDelete={onDeletePreset}
      />

      {/* Active filter chips */}
      {totalActive > 0 && (
        <>
          <div className="w-px h-4 bg-gray-200 mx-0.5" />
          {filters.statuses.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 font-medium">
              {s}<button onClick={() => toggle("statuses", s)} className="hover:text-blue-900 transition-colors"><X className="h-2.5 w-2.5" /></button>
            </span>
          ))}
          {filters.priorities.map((p) => (
            <span key={p} className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-medium">
              {p}<button onClick={() => toggle("priorities", p)} className="hover:text-amber-900 transition-colors"><X className="h-2.5 w-2.5" /></button>
            </span>
          ))}
          {filters.assignees.map((a) => (
            <span key={a} className="inline-flex items-center gap-1 text-xs bg-[#F0EBF8] text-[#9333EA] border border-[#D4B8F0] rounded-full px-2 py-0.5 font-medium">
              {a}<button onClick={() => toggle("assignees", a)} className="hover:text-[#7E22CE] transition-colors"><X className="h-2.5 w-2.5" /></button>
            </span>
          ))}
          {filters.excludedLabels.map((l) => (
            <span key={l} className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-600 border border-red-200 rounded-full px-2 py-0.5 font-medium">
              <EyeOff className="h-2.5 w-2.5" />{l}<button onClick={() => toggle("excludedLabels", l)} className="hover:text-red-800 transition-colors"><X className="h-2.5 w-2.5" /></button>
            </span>
          ))}
          <button onClick={clearAll} className="text-xs text-gray-400 hover:text-red-500 font-medium transition-colors ml-1">
            Clear all
          </button>
        </>
      )}
    </div>
  );
}
