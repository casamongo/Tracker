"""
API router for workstream-related endpoints.
"""
from fastapi import APIRouter, HTTPException
from backend.models.workstream import WorkstreamsResponse
from backend.services.sheet_reader import get_sheet_reader

router = APIRouter(prefix="/api", tags=["workstreams"])


@router.get("/workstreams", response_model=WorkstreamsResponse)
async def get_workstreams():
    """
    Read the Google Sheet and return the full workstream hierarchy.
    
    Returns:
        WorkstreamsResponse with all workstreams and their milestones
    """
    try:
        sheet_reader = get_sheet_reader()
        workstreams = sheet_reader.parse_sheet()
        return WorkstreamsResponse(workstreams=workstreams)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading sheet: {str(e)}")
