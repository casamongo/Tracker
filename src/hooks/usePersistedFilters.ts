"use client";

import { useState, useEffect } from "react";
import type { ActiveFilters } from "@/components/dashboard/FilterBar";

export interface FilterPreset {
  name: string;
  filters: ActiveFilters;
}

const EMPTY: ActiveFilters = { statuses: [], priorities: [], assignees: [], excludedLabels: [] };

function filtersKey(projectKey: string) {
  return `dd-tracker-filters-${projectKey}`;
}

function presetsKey(projectKey: string) {
  return `dd-tracker-presets-${projectKey}`;
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function usePersistedFilters(projectKey: string) {
  const [filters, setFiltersState] = useState<ActiveFilters>(EMPTY);
  const [presets, setPresetsState] = useState<FilterPreset[]>([]);
  const [ready, setReady] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setFiltersState(load(filtersKey(projectKey), EMPTY));
    setPresetsState(load(presetsKey(projectKey), []));
    setReady(true);
  }, [projectKey]);

  function setFilters(f: ActiveFilters) {
    setFiltersState(f);
    localStorage.setItem(filtersKey(projectKey), JSON.stringify(f));
  }

  function savePreset(name: string) {
    const updated = [...presets.filter((p) => p.name !== name), { name, filters }];
    setPresetsState(updated);
    localStorage.setItem(presetsKey(projectKey), JSON.stringify(updated));
  }

  function deletePreset(name: string) {
    const updated = presets.filter((p) => p.name !== name);
    setPresetsState(updated);
    localStorage.setItem(presetsKey(projectKey), JSON.stringify(updated));
  }

  function loadPreset(preset: FilterPreset) {
    setFilters(preset.filters);
  }

  return { filters, setFilters, presets, savePreset, deletePreset, loadPreset, ready };
}
