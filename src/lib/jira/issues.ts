import { paginatedJiraSearch } from "./client";
import type { JiraStory } from "@/types/jira";

import { CUSTOM_FIELDS } from "./client";

const STORY_FIELDS = [
  "summary",
  "status",
  "priority",
  "labels",
  "assignee",
  "description",
  "comment",
  "subtasks",
  "issuetype",
  "duedate",
  "parent",
  CUSTOM_FIELDS.STATUS_NOTES,
];

export async function getChildIssues(parentKey: string): Promise<JiraStory[]> {
  const jql = `parent = ${parentKey} ORDER BY created ASC`;
  return paginatedJiraSearch<JiraStory>(jql, STORY_FIELDS, 100);
}

/** Returns Stories if the epic has any; otherwise returns Tasks. Sub-tasks excluded. */
export async function getMilestonesForEpic(epicKey: string): Promise<JiraStory[]> {
  const all = await getChildIssues(epicKey);
  const stories = all.filter((i) => i.fields.issuetype.name.toLowerCase() === "story");
  if (stories.length > 0) return stories;
  return all.filter((i) => {
    const t = i.fields.issuetype.name.toLowerCase();
    return t !== "epic" && !t.includes("sub");
  });
}

/** Apply stories-first, tasks-fallback logic to a pre-fetched list grouped by epic. */
export function filterMilestones(items: JiraStory[]): JiraStory[] {
  const stories = items.filter((i) => i.fields.issuetype.name.toLowerCase() === "story");
  if (stories.length > 0) return stories;
  return items.filter((i) => {
    const t = i.fields.issuetype.name.toLowerCase();
    return t !== "epic" && !t.includes("sub");
  });
}

export async function getStoriesForProject(projectKey: string, includeDone = false): Promise<JiraStory[]> {
  const doneFilter = includeDone ? "" : "AND statusCategory != Done";
  const jql = `project = ${projectKey} AND issuetype != Epic ${doneFilter} ORDER BY parent ASC, created ASC`;
  return paginatedJiraSearch<JiraStory>(jql, STORY_FIELDS, 500);
}
