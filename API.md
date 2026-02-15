# API Documentation

## Base URL
- Development: `http://localhost:8000`
- Production: Configure in your environment

## Authentication
All Google and Jira credentials are configured via environment variables. No per-request authentication is required.

## Endpoints

### GET /
Returns basic API information.

**Response:**
```json
{
  "message": "Jira Update Automation API",
  "version": "1.0.0",
  "docs": "/docs"
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy"
}
```

### GET /api/workstreams
Read and parse the Google Sheet to get all workstreams and milestones.

**Response:**
```json
{
  "workstreams": [
    {
      "id": "ws-5",
      "name": "Config Visibility",
      "pm": "Syed Sarjeel Yusuf",
      "eng": "Mark Spicer",
      "design": "N/A",
      "target_quarter": "Q4",
      "status": "green",
      "okr": "Q4O1",
      "milestones": [
        {
          "row_index": 5,
          "track": "RFC",
          "status": "Done",
          "target_date": "Done",
          "owner": "Mark Spicer",
          "jira_id": "INPLAT-861",
          "comments": "[Feb 9] RFC approved...",
          "slack_channel": "#apm-config-visibility",
          "notes_link": "https://docs.google.com/document/d/xxx/edit",
          "notes_doc_id": "xxx"
        }
      ]
    }
  ]
}
```

**Error Responses:**
- `500`: Error reading sheet (check credentials and sheet ID)

### POST /api/generate-updates
Generate AI summaries for specific milestones within a workstream.

**Request:**
```json
{
  "workstream_id": "ws-5",
  "milestone_indices": [0, 1, 2]
}
```

**Response:**
```json
{
  "updates": [
    {
      "milestone": "RFC",
      "jira_id": "INPLAT-861",
      "row_index": 5,
      "jira_update": {
        "progress_summary": [
          "RFC document completed and approved by engineering leadership",
          "Technical design review completed with no major concerns"
        ],
        "recent_changes": [
          {
            "date": "Feb 7",
            "description": "Final stakeholder approvals received"
          }
        ],
        "next_steps": [
          "RFC complete - ready to proceed with implementation"
        ],
        "source_label": "Slack #apm-config-visibility"
      },
      "sheet_comment": "[Feb 9] RFC approved by leadership. Ready for implementation."
    }
  ]
}
```

**Error Responses:**
- `404`: Workstream not found
- `500`: Error generating updates (check API keys, doc permissions)

### POST /api/run-all
Generate updates for ALL milestones across ALL workstreams.

**Request:** None (empty body)

**Response:**
Same as `/api/generate-updates` but with updates for all milestones.

**Note:** This endpoint can take several minutes for large sheets.

### POST /api/post-to-jira
Post a formatted update to a Jira ticket.

**Request:**
```json
{
  "jira_id": "INPLAT-861",
  "comment_body": "📊 **Progress Summary**\n- Item 1\n- Item 2\n\n🔄 **Recent Changes**\n- Change 1\n\n🚀 **Next Steps**\n- Step 1"
}
```

**Response:**
```json
{
  "message": "Successfully posted to INPLAT-861",
  "success": true
}
```

**Error Responses:**
- `500`: Failed to post (check Jira credentials, ticket exists, permissions)

### POST /api/post-to-sheet
Write a comment to the Google Sheet.

**Request:**
```json
{
  "row_index": 5,
  "comment": "[Feb 9] RFC approved by leadership."
}
```

**Response:**
```json
{
  "message": "Successfully updated row 5",
  "success": true
}
```

**Error Responses:**
- `500`: Failed to write (check sheet permissions, row index valid)

## Rate Limits

### Google APIs
- Sheets API: 100 requests per 100 seconds per user
- Docs API: 100 requests per 100 seconds per user

The application caches document content to minimize API calls.

### Jira API
- Cloud: 10 requests per second (shared across your instance)
- The application posts sequentially to avoid rate limits

### Anthropic API
- Varies by plan tier
- Standard tier: reasonable rate limits for typical usage
- Each milestone generates 1 API call

## Best Practices

1. **Batch Operations**: Use `/api/run-all` during off-hours to avoid rate limits
2. **Caching**: The backend caches doc content per session
3. **Error Handling**: Always check response status and error messages
4. **Testing**: Use `/docs` endpoint for interactive API testing

## Data Model Notes

### Workstream Header Format
Must match: `Workstream: <number>. <name> | PM: <name> | Eng: <name> | Design: <name> | Target: <quarter> | Status: <emoji> | <OKR>`

### Milestone Row Requirements
- Column A (WORK TYPE): Must be "Milestone"
- Column F (JIRA ID): Must be valid Jira ticket key
- Column Q (NOTES LINK): Must be Google Doc URL (with proper sharing)

### Status Values
Milestones: `Done`, `On Track`, `At Risk`, `Blocked`
Workstreams: `green` (🟢), `yellow` (🟡), `red` (🔴)
