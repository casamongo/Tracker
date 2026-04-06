"use client";

import useSWR from "swr";
import type { ProjectEntry, ProgramEntry } from "@/lib/projects";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ProjectsResponse {
  projects: ProjectEntry[];
  programs: ProgramEntry[];
}

export function useProjects() {
  const { data, error, isLoading } = useSWR<ProjectsResponse>("/api/projects", fetcher);
  const projects = Array.isArray(data?.projects) ? data.projects : [];
  const programs = Array.isArray(data?.programs) ? data.programs : [];
  return { projects, programs, error, isLoading };
}
