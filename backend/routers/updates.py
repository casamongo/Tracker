"""
API router for update generation endpoints.
"""
from fastapi import APIRouter, HTTPException
from models.update import GenerateUpdatesRequest, GenerateUpdatesResponse
from services.sheet_reader import get_sheet_reader
from services.orchestrator import get_orchestrator

router = APIRouter(prefix="/api", tags=["updates"])


@router.post("/generate-updates", response_model=GenerateUpdatesResponse)
async def generate_updates(request: GenerateUpdatesRequest):
    """
    Generate AI summaries for selected milestones under a workstream.
    
    Args:
        request: Contains workstream_id and milestone_indices
        
    Returns:
        GenerateUpdatesResponse with generated updates
    """
    try:
        # Get workstreams
        sheet_reader = get_sheet_reader()
        workstreams = sheet_reader.parse_sheet()
        
        # Find the requested workstream
        workstream = None
        for ws in workstreams:
            if ws.id == request.workstream_id:
                workstream = ws
                break
        
        if not workstream:
            raise HTTPException(status_code=404, detail=f"Workstream {request.workstream_id} not found")
        
        # Generate updates
        orchestrator = get_orchestrator()
        updates = await orchestrator.generate_updates_for_workstream(workstream, request.milestone_indices)
        
        return GenerateUpdatesResponse(updates=updates)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating updates: {str(e)}")


@router.post("/run-all", response_model=GenerateUpdatesResponse)
async def run_all():
    """
    Orchestration endpoint: generate updates for ALL milestones across ALL workstreams.
    Returns full preview batch for human review before any posting.
    
    Returns:
        GenerateUpdatesResponse with all generated updates
    """
    try:
        orchestrator = get_orchestrator()
        updates = await orchestrator.run_all()
        return GenerateUpdatesResponse(updates=updates)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in run-all workflow: {str(e)}")
