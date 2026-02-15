"""
Jira client service for posting updates to Jira tickets.
"""
from jira import JIRA
from typing import Dict, List
from config import settings
from models.update import JiraUpdate, RecentChange


class JiraClient:
    """Service for interacting with Jira API."""
    
    def __init__(self):
        """Initialize Jira client."""
        self.client = JIRA(
            server=settings.jira_base_url,
            basic_auth=(settings.jira_email, settings.jira_api_token)
        )
    
    def build_adf_comment(self, jira_update: JiraUpdate) -> Dict:
        """
        Build ADF (Atlassian Document Format) comment body for Jira Cloud.
        
        Args:
            jira_update: The structured update data
            
        Returns:
            ADF document structure
        """
        content = []
        
        # Progress Summary section
        content.append({
            "type": "heading",
            "attrs": {"level": 3},
            "content": [{"type": "text", "text": "📊 Progress Summary"}]
        })
        
        if jira_update.progress_summary:
            bullet_items = []
            for item in jira_update.progress_summary:
                bullet_items.append({
                    "type": "listItem",
                    "content": [{
                        "type": "paragraph",
                        "content": [{"type": "text", "text": item}]
                    }]
                })
            content.append({
                "type": "bulletList",
                "content": bullet_items
            })
        else:
            content.append({
                "type": "paragraph",
                "content": [{"type": "text", "text": "No progress updates available."}]
            })
        
        # Recent Changes section
        content.append({
            "type": "heading",
            "attrs": {"level": 3},
            "content": [{"type": "text", "text": f"🔄 Recent Changes"}]
        })
        
        # Add source label as italic text
        if jira_update.source_label:
            content.append({
                "type": "paragraph",
                "content": [{"type": "text", "text": f"(from {jira_update.source_label})", "marks": [{"type": "em"}]}]
            })
        
        if jira_update.recent_changes:
            bullet_items = []
            for change in jira_update.recent_changes:
                change_text = f"{change.description} ({change.date})" if change.date else change.description
                bullet_items.append({
                    "type": "listItem",
                    "content": [{
                        "type": "paragraph",
                        "content": [{"type": "text", "text": change_text}]
                    }]
                })
            content.append({
                "type": "bulletList",
                "content": bullet_items
            })
        else:
            content.append({
                "type": "paragraph",
                "content": [{"type": "text", "text": "No recent changes recorded."}]
            })
        
        # Next Steps section
        content.append({
            "type": "heading",
            "attrs": {"level": 3},
            "content": [{"type": "text", "text": "🚀 Next Steps"}]
        })
        
        if jira_update.next_steps:
            bullet_items = []
            for step in jira_update.next_steps:
                bullet_items.append({
                    "type": "listItem",
                    "content": [{
                        "type": "paragraph",
                        "content": [{"type": "text", "text": step}]
                    }]
                })
            content.append({
                "type": "bulletList",
                "content": bullet_items
            })
        else:
            content.append({
                "type": "paragraph",
                "content": [{"type": "text", "text": "No next steps defined."}]
            })
        
        return {
            "version": 1,
            "type": "doc",
            "content": content
        }
    
    def post_comment(self, jira_id: str, comment_body: str) -> bool:
        """
        Post a comment to a Jira issue.
        
        Args:
            jira_id: The Jira issue key (e.g., "INPLAT-861")
            comment_body: The comment text (can be markdown or ADF)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            issue = self.client.issue(jira_id)
            self.client.add_comment(issue, comment_body)
            return True
        except Exception as e:
            print(f"Error posting to Jira {jira_id}: {e}")
            return False
    
    def post_adf_comment(self, jira_id: str, jira_update: JiraUpdate) -> bool:
        """
        Post a structured ADF comment to a Jira issue.
        
        Args:
            jira_id: The Jira issue key
            jira_update: The structured update data
            
        Returns:
            True if successful, False otherwise
        """
        try:
            adf_body = self.build_adf_comment(jira_update)
            issue = self.client.issue(jira_id)
            
            # Use the REST API directly for ADF format
            self.client._session.post(
                f"{settings.jira_base_url}/rest/api/3/issue/{jira_id}/comment",
                json={"body": adf_body}
            )
            return True
        except Exception as e:
            print(f"Error posting ADF comment to Jira {jira_id}: {e}")
            return False


# Singleton instance
_jira_client = None


def get_jira_client() -> JiraClient:
    """Get or create the JiraClient singleton instance."""
    global _jira_client
    if _jira_client is None:
        _jira_client = JiraClient()
    return _jira_client
