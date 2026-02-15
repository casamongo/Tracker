"""
API router for posting updates to Jira and Sheet.
"""
from fastapi import APIRouter, HTTPException
from backend.models.update import PostToJiraRequest, PostToSheetRequest
from backend.services.jira_client import get_jira_client
from backend.services.sheet_writer import get_sheet_writer

router = APIRouter(prefix="/api", tags=["post"])


@router.post("/post-to-jira")
async def post_to_jira(request: PostToJiraRequest):
    """
    Post a reviewed (possibly edited) update to Jira.
    
    Args:
        request: Contains jira_id and comment_body
        
    Returns:
        Success message
    """
    try:
        jira_client = get_jira_client()
        success = jira_client.post_comment(request.jira_id, request.comment_body)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to post to Jira")
        
        return {"message": f"Successfully posted to {request.jira_id}", "success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error posting to Jira: {str(e)}")


@router.post("/post-to-sheet")
async def post_to_sheet(request: PostToSheetRequest):
    """
    Write the one-line summary to the Comments column (G) for a specific row.
    
    Args:
        request: Contains row_index and comment
        
    Returns:
        Success message
    """
    try:
        sheet_writer = get_sheet_writer()
        success = sheet_writer.write_comment(request.row_index, request.comment)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to write to sheet")
        
        return {"message": f"Successfully updated row {request.row_index}", "success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error writing to sheet: {str(e)}")
