import fs from "fs";
import path from "path";
import yaml from "js-yaml";

export interface ProjectEntry {
  key: string;
  name: string;
  label?: string;
}

export interface ProgramEntry {
  name: string;
  label: string;
}

interface ProjectsConfig {
  projects: ProjectEntry[];
  programs?: ProgramEntry[];
}

export function getProjects(): ProjectEntry[] {
  const filePath = path.join(process.cwd(), "projects.config.yaml");
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = yaml.load(raw) as ProjectsConfig;
  return parsed.projects;
}

export function getPrograms(): ProgramEntry[] {
  const filePath = path.join(process.cwd(), "projects.config.yaml");
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = yaml.load(raw) as ProjectsConfig;
  return parsed.programs ?? [];
}
