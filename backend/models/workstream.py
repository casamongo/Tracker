"""
Pydantic models for workstream and milestone data structures.
"""
from pydantic import BaseModel
from typing import List, Optional


class Milestone(BaseModel):
    """Represents a milestone row in the tracking sheet."""
    row_index: int
    track: str
    status: str
    target_date: str
    owner: str
    jira_id: str
    comments: str
    slack_channel: str
    notes_link: Optional[str] = None
    notes_doc_id: Optional[str] = None


class Track(BaseModel):
    """Represents a track grouping within a workstream."""
    name: str
    notes_link: Optional[str] = None
    notes_doc_id: Optional[str] = None
    milestones: List[Milestone] = []


class Workstream(BaseModel):
    """Represents a workstream with its associated milestones."""
    id: str
    name: str
    pm: str
    eng: str
    design: str
    target_quarter: str
    status: str
    okr: str
    tracks: List[Track] = []


class WorkstreamsResponse(BaseModel):
    """Response model for GET /api/workstreams."""
    workstreams: List[Workstream]
