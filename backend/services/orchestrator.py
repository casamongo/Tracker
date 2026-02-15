"""
Orchestrator service for coordinating the end-to-end workflow.
"""
from typing import List, Dict
from models.workstream import Workstream, Milestone
from models.update import MilestoneUpdate
from services.sheet_reader import get_sheet_reader
from services.doc_reader import get_doc_reader
from services.ai_engine import get_ai_engine


class Orchestrator:
    """Service for orchestrating the full update workflow."""
    
    def __init__(self):
        """Initialize orchestrator with service dependencies."""
        self.sheet_reader = get_sheet_reader()
        self.doc_reader = get_doc_reader()
        self.ai_engine = get_ai_engine()
        # Cache for document content to avoid redundant API calls
        self.doc_cache: Dict[str, str] = {}
    
    async def generate_updates_for_workstream(
        self,
        workstream: Workstream,
        milestone_indices: List[int]
    ) -> List[MilestoneUpdate]:
        """
        Generate updates for selected milestones within a workstream.
        
        Args:
            workstream: The workstream containing the milestones
            milestone_indices: List of indices within workstream.milestones to process
            
        Returns:
            List of generated MilestoneUpdate objects
        """
        updates = []
        
        for idx in milestone_indices:
            if idx < 0 or idx >= len(workstream.milestones):
                continue
            
            milestone = workstream.milestones[idx]
            
            # Skip if no notes doc
            if not milestone.notes_doc_id:
                print(f"No notes document for milestone {milestone.track}")
                continue
            
            # Get doc content (from cache or fetch)
            doc_id = milestone.notes_doc_id
            if doc_id not in self.doc_cache:
                doc_text = self.doc_reader.read_doc(doc_id)
                if doc_text:
                    self.doc_cache[doc_id] = doc_text
                else:
                    print(f"Failed to read doc {doc_id} for milestone {milestone.track}")
                    continue
            
            doc_text = self.doc_cache[doc_id]
            
            # Generate update using AI
            update = await self.ai_engine.generate_update(milestone, doc_text, workstream)
            updates.append(update)
        
        return updates
    
    async def run_all(self) -> List[MilestoneUpdate]:
        """
        Run the full workflow for all workstreams and milestones.
        
        Returns:
            List of all generated MilestoneUpdate objects
        """
        # Read all workstreams
        workstreams = self.sheet_reader.parse_sheet()
        
        all_updates = []
        
        for workstream in workstreams:
            if not workstream.milestones:
                continue
            
            # Generate updates for all milestones in this workstream
            milestone_indices = list(range(len(workstream.milestones)))
            updates = await self.generate_updates_for_workstream(workstream, milestone_indices)
            all_updates.extend(updates)
        
        return all_updates


# Singleton instance
_orchestrator = None


def get_orchestrator() -> Orchestrator:
    """Get or create the Orchestrator singleton instance."""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = Orchestrator()
    return _orchestrator
