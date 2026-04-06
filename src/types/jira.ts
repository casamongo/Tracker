export interface JiraFilter {
  id: string;
  name: string;
  jql: string;
}

export interface JiraStatus {
  name: string;
  statusCategory: {
    key: string;
    name: string;
  };
}

export interface JiraPriority {
  name: string;
  iconUrl?: string;
}

export interface JiraUser {
  displayName: string;
  emailAddress?: string;
  avatarUrls?: Record<string, string>;
}

export interface JiraComment {
  id: string;
  author: JiraUser;
  body: AdfDoc | string;
  created: string;
  updated: string;
}

export interface AdfDoc {
  version: number;
  type: string;
  content?: AdfNode[];
}

export interface AdfNode {
  type: string;
  text?: string;
  content?: AdfNode[];
  attrs?: Record<string, unknown>;
}

export interface JiraEpicFields {
  summary: string;
  status: JiraStatus;
  priority: JiraPriority;
  labels: string[];
  assignee: JiraUser | null;
  description: AdfDoc | null;
  comment: {
    comments: JiraComment[];
    total: number;
  };
  subtasks: JiraIssueRef[];
  issuetype: { name: string };
  // Custom fields - IDs discovered at runtime
  [key: string]: unknown;
}

export interface JiraEpic {
  id: string;
  key: string;
  browseUrl?: string;
  fields: JiraEpicFields & { updated?: string };
}

export interface JiraStoryFields {
  summary: string;
  status: JiraStatus;
  priority: JiraPriority;
  labels: string[];
  assignee: JiraUser | null;
  description: AdfDoc | null;
  comment: {
    comments: JiraComment[];
    total: number;
  };
  subtasks: JiraIssueRef[];
  issuetype: { name: string };
  duedate?: string | null;
  parent?: { id: string; key: string; fields: { summary: string } };
  [key: string]: unknown;
}

export interface JiraStory {
  id: string;
  key: string;
  browseUrl?: string;
  fields: JiraStoryFields;
}

export interface JiraIssueRef {
  id: string;
  key: string;
  fields: {
    summary: string;
    status: JiraStatus;
    issuetype: { name: string };
  };
}

export interface JiraSearchResponse<T> {
  issues: T[];
  total: number;
  maxResults: number;
  startAt: number;
}
