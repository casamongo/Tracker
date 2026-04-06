import { paginatedJiraSearch, CUSTOM_FIELDS } from "./client";
import type { JiraEpic } from "@/types/jira";

const EPIC_FIELDS = [
  "summary",
  "status",
  "priority",
  "labels",
  "assignee",
  "description",
  "comment",
  "subtasks",
  "issuetype",
  "parent",
  "updated",
  CUSTOM_FIELDS.QUARTER_START,
  CUSTOM_FIELDS.QUARTER_COMPLETION,
];

const DONE_FILTER = `AND statusCategory != Done AND status not in ("Won't Do", "Canceled", "Closed", "Complete")`;

export async function getEpicsForProject(projectKey: string, includeDone = false): Promise<JiraEpic[]> {
  const jql = `project = ${projectKey} AND issuetype = Epic ${includeDone ? "" : DONE_FILTER} ORDER BY updated DESC`;
  return paginatedJiraSearch<JiraEpic>(jql, EPIC_FIELDS);
}

export async function getEpicsByLabel(label: string, includeDone = false): Promise<JiraEpic[]> {
  const jql = `issuetype = Epic AND labels = "${label}" ${includeDone ? "" : DONE_FILTER} ORDER BY updated DESC`;
  return paginatedJiraSearch<JiraEpic>(jql, EPIC_FIELDS);
}
