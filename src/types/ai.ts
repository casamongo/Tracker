import type { JiraEpic, JiraStory, JiraComment } from "./jira";

export type WorkType = "epic" | "story" | "subtask" | "milestone";

export interface SummarizeRequest {
  workType: WorkType;
  issue: JiraEpic | JiraStory;
  comments: JiraComment[];
  stories?: JiraStory[];
}

export interface SummarizeResponse {
  summary: string;
}

export interface MilestoneItem {
  issueKey: string;
  browseUrl?: string;
  name: string;
  status: string;
  owner: string;
  ownerEmail: string;
  targetDate: string;
  statusNote: string;
}

export interface ConversationMessage {
  id: string;
  message: string;
  sentToSlack: boolean;
  slackRecipientName?: string;
  timestamp: string;
}
