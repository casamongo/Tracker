"""
Pydantic models for AI-generated updates.
"""
from pydantic import BaseModel
from typing import List, Optional


class RecentChange(BaseModel):
    """Represents a recent change with date and description."""
    date: str
    description: str


class JiraUpdate(BaseModel):
    """Structured Jira update content."""
    progress_summary: List[str]
    recent_changes: List[RecentChange]
    next_steps: List[str]
    source_label: str


class MilestoneUpdate(BaseModel):
    """Complete update for a single milestone."""
    milestone: str
    jira_id: str
    row_index: int
    jira_update: JiraUpdate
    sheet_comment: str


class GenerateUpdatesRequest(BaseModel):
    """Request model for POST /api/generate-updates."""
    workstream_id: str
    milestone_indices: List[int]


class GenerateUpdatesResponse(BaseModel):
    """Response model for POST /api/generate-updates."""
    updates: List[MilestoneUpdate]


class PostToJiraRequest(BaseModel):
    """Request model for POST /api/post-to-jira."""
    jira_id: str
    comment_body: str


class PostToSheetRequest(BaseModel):
    """Request model for POST /api/post-to-sheet."""
    row_index: int
    comment: str
