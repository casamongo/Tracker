"""
AI Engine service for generating milestone updates using Claude AI.
"""
import json
from datetime import datetime
from anthropic import Anthropic
from typing import Dict
from config import settings
from models.workstream import Milestone, Workstream
from models.update import JiraUpdate, MilestoneUpdate, RecentChange


# System prompt for Claude
SYSTEM_PROMPT = """You are a technical project management assistant that reads project documentation 
and generates concise status updates for engineering milestones.

You will receive:
1. The full text of a Notes document for a track
2. Metadata about a specific milestone (name, status, owner, Jira ID, target date)
3. The Slack channel name associated with this workstream

Your job: Extract information RELEVANT TO THIS SPECIFIC MILESTONE from the document 
and produce two outputs.

OUTPUT 1 — JIRA UPDATE (structured JSON):
{
  "progress_summary": [
    // 2-4 bullet points on current state of THIS milestone
    // Be specific and factual, not generic
  ],
  "recent_changes": [
    // 2-4 items with dates, most recent first
    // Format: {"date": "Mon DD", "description": "what changed"}
    // Only include changes from the last 2 weeks
  ],
  "next_steps": [
    // 1-3 actionable next steps for THIS milestone
    // If status is "Done", say what's complete and what follows
  ],
  "source_label": "Slack #channel-name"
}

OUTPUT 2 — SHEET COMMENT (single string):
A one-line leadership summary (max 120 chars) in this format:
"[Mon DD] <Key achievement>. <Current state>. <What's next>."

Example: "[Feb 9] RFC approved by leadership. Technical design review complete. Ready for implementation kickoff."

RULES:
- Only include information actually present in the document
- If the document has no info about a specific milestone, say so clearly
- Use past tense for completed items, present tense for in-progress
- Date references should use "Mon DD" format (e.g., "Feb 7")
- The sheet comment date should be today's date
- Do NOT invent or hallucinate information not in the document
- Keep the Jira update professional but readable
- For "Done" milestones, focus on completion confirmation and handoff
- For "At Risk" milestones, highlight blockers and mitigation"""


class AIEngine:
    """Service for generating AI-powered milestone updates."""
    
    def __init__(self):
        """Initialize Anthropic client."""
        self.client = Anthropic(api_key=settings.anthropic_api_key)
    
    def build_user_prompt(self, milestone: Milestone, workstream: Workstream, doc_text: str) -> str:
        """
        Build the user prompt for a specific milestone.
        
        Args:
            milestone: The milestone object
            workstream: The parent workstream
            doc_text: The full text of the notes document
            
        Returns:
            Formatted user prompt string
        """
        today = datetime.now().strftime("%b %d")
        
        prompt = f"""MILESTONE CONTEXT:
- Name: {milestone.track}
- Status: {milestone.status}
- Target Date: {milestone.target_date}
- Owner: {milestone.owner}
- Jira ID: {milestone.jira_id}
- Slack Channel: {milestone.slack_channel}
- Workstream: {workstream.name}
- Today's Date: {today}

NOTES DOCUMENT CONTENT:
---
{doc_text}
---

Generate the Jira update and sheet comment for this milestone based on the 
document above. Return valid JSON with keys: "jira_update" and "sheet_comment"."""
        
        return prompt
    
    async def generate_update(self, milestone: Milestone, doc_text: str, workstream: Workstream) -> MilestoneUpdate:
        """
        Generate an AI update for a single milestone.
        
        Args:
            milestone: The milestone to generate an update for
            doc_text: The text content of the notes document
            workstream: The parent workstream
            
        Returns:
            MilestoneUpdate object with generated content
        """
        user_prompt = self.build_user_prompt(milestone, workstream, doc_text)
        
        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2048,
                system=SYSTEM_PROMPT,
                messages=[{
                    "role": "user",
                    "content": user_prompt
                }]
            )
            
            # Extract text from response
            response_text = response.content[0].text
            
            # Try to parse as JSON
            # Claude might wrap the JSON in code blocks, so let's handle that
            if "```json" in response_text:
                json_match = response_text.split("```json")[1].split("```")[0]
                response_data = json.loads(json_match.strip())
            elif "```" in response_text:
                json_match = response_text.split("```")[1].split("```")[0]
                response_data = json.loads(json_match.strip())
            else:
                response_data = json.loads(response_text)
            
            # Parse the jira_update
            jira_data = response_data.get("jira_update", {})
            recent_changes = [
                RecentChange(**change) if isinstance(change, dict) else RecentChange(date="", description=str(change))
                for change in jira_data.get("recent_changes", [])
            ]
            
            jira_update = JiraUpdate(
                progress_summary=jira_data.get("progress_summary", []),
                recent_changes=recent_changes,
                next_steps=jira_data.get("next_steps", []),
                source_label=jira_data.get("source_label", f"Slack {milestone.slack_channel}")
            )
            
            sheet_comment = response_data.get("sheet_comment", "")
            
            return MilestoneUpdate(
                milestone=milestone.track,
                jira_id=milestone.jira_id,
                row_index=milestone.row_index,
                jira_update=jira_update,
                sheet_comment=sheet_comment
            )
            
        except Exception as e:
            print(f"Error generating update for {milestone.jira_id}: {e}")
            # Return a fallback update
            return MilestoneUpdate(
                milestone=milestone.track,
                jira_id=milestone.jira_id,
                row_index=milestone.row_index,
                jira_update=JiraUpdate(
                    progress_summary=[f"Error generating update: {str(e)}"],
                    recent_changes=[],
                    next_steps=["Manual review required"],
                    source_label=f"Slack {milestone.slack_channel}"
                ),
                sheet_comment=f"[{datetime.now().strftime('%b %d')}] Update generation failed. Manual review required."
            )


# Singleton instance
_ai_engine = None


def get_ai_engine() -> AIEngine:
    """Get or create the AIEngine singleton instance."""
    global _ai_engine
    if _ai_engine is None:
        _ai_engine = AIEngine()
    return _ai_engine
