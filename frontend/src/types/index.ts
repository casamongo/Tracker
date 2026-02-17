/**
 * TypeScript interfaces for the application.
 */

export interface Milestone {
  row_index: number;
  track: string;
  status: string;
  target_date: string;
  owner: string;
  jira_id: string;
  comments: string;
  slack_channel: string;
  notes_link?: string;
  notes_doc_id?: string;
}

export interface Track {
  name: string;
  notes_link?: string;
  notes_doc_id?: string;
  milestones: Milestone[];
}

export interface Workstream {
  id: string;
  name: string;
  pm: string;
  eng: string;
  design: string;
  target_quarter: string;
  status: string;
  okr: string;
  tracks: Track[];
}

export interface WorkstreamsResponse {
  workstreams: Workstream[];
}

export interface RecentChange {
  date: string;
  description: string;
}

export interface JiraUpdate {
  progress_summary: string[];
  recent_changes: RecentChange[];
  next_steps: string[];
  source_label: string;
}

export interface MilestoneUpdate {
  milestone: string;
  jira_id: string;
  row_index: number;
  jira_update: JiraUpdate;
  sheet_comment: string;
}

export interface GenerateUpdatesRequest {
  workstream_id: string;
  milestone_indices: number[];
}

export interface GenerateUpdatesResponse {
  updates: MilestoneUpdate[];
}

export interface PostToJiraRequest {
  jira_id: string;
  comment_body: string;
}

export interface PostToSheetRequest {
  row_index: number;
  comment: string;
}

// Helper function to get Jira base URL
// Default to a placeholder that users should configure
export const getJiraBaseUrl = (): string => {
  return import.meta.env.VITE_JIRA_BASE_URL || 'https://yourorg.atlassian.net';
};

// Helper to construct Jira ticket URL
export const getJiraTicketUrl = (ticketId: string): string => {
  return `${getJiraBaseUrl()}/browse/${ticketId}`;
};
