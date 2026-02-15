# Google Sheet Structure Guide

This document describes the expected structure of the Google Sheet that the application reads from.

## Sheet Layout

The sheet uses a hierarchical structure with two types of rows:
1. **Workstream Header Rows** - Purple/lavender colored rows that group milestones
2. **Milestone Rows** - Individual tracking items under each workstream

## Column Structure

| Column | Letter | Name | Description | Example |
|--------|--------|------|-------------|---------|
| 1 | A | WORK TYPE | "Milestone" for milestone rows; empty or merged for headers | `Milestone` |
| 2 | B | TRACK | Milestone name or workstream info | `RFC`, `End to End Testing` |
| 3 | C | STATUS | Current status | `Done`, `On Track`, `At Risk`, `Blocked` |
| 4 | D | TARGET DATE | Completion target or "Done" | `11/18`, `12/31`, `Done` |
| 5 | E | MILESTONE OWNER | Person responsible | `Mark Spicer`, `Jane Doe` |
| 6 | F | JIRA ID | Jira ticket identifier | `INPLAT-861`, `PROJ-123` |
| 7 | G | COMMENTS | One-line summary (output column) | `[Feb 9] RFC approved...` |
| 8 | H | SLACK | Slack channel | `#apm-config-visibility` |
| ... | ... | ... | (Other columns as needed) | ... |
| 17 | Q | NOTES LINK | Google Doc URL with detailed notes | `https://docs.google.com/...` |
| 18 | R | ACTIONS | (UI-only, not used by backend) | N/A |

## Workstream Header Row Format

Workstream rows must be formatted exactly as follows:

```
Workstream: <number>. <name> | PM: <pm_name> | Eng: <eng_name> | Design: <designer_name> | Target: <quarter> | Status: <emoji> | <okr_reference>
```

### Example Workstream Header

```
Workstream: 5. Config Visibility | PM: Syed Sarjeel Yusuf | Eng: Mark Spicer | Design: N/A | Target: Q4 | Status: 🟢 | Q4O1
```

### Workstream Header Fields

- **Number**: Sequential workstream number (1, 2, 3...)
- **Name**: Descriptive name of the workstream
- **PM**: Product Manager name (use "N/A" if none)
- **Eng**: Engineering lead name
- **Design**: Designer name (use "N/A" if none)
- **Target**: Target quarter (Q1, Q2, Q3, Q4, or specific date)
- **Status**: Emoji indicator
  - 🟢 Green = On track
  - 🟡 Yellow = At risk
  - 🔴 Red = Blocked
- **OKR**: OKR reference (e.g., Q4O1, Q3O2)

### Important Notes for Workstream Headers

1. Place in **column B** (column A should be empty or merged)
2. Must start with "Workstream:"
3. Use " | " (space-pipe-space) as separator
4. All fields are required (use "N/A" for missing values)

## Milestone Row Format

Each milestone is a standard row with data in specific columns.

### Example Milestone Row

| A | B | C | D | E | F | G | H | ... | Q |
|---|---|---|---|---|---|---|---|-----|---|
| Milestone | RFC | Done | Done | Mark Spicer | INPLAT-861 | [Feb 9] RFC approved... | #apm-visibility | ... | https://docs.google.com/document/d/abc123/edit |

### Milestone Field Requirements

1. **Column A (WORK TYPE)**: Must be exactly "Milestone"
2. **Column C (STATUS)**: Use one of:
   - `Done` - Completed
   - `On Track` - Progressing as planned
   - `At Risk` - Issues identified
   - `Blocked` - Cannot proceed
3. **Column F (JIRA ID)**: 
   - Must be valid Jira ticket key
   - Format: PROJECT-NUMBER (e.g., INPLAT-861)
4. **Column Q (NOTES LINK)**:
   - Must be a Google Doc URL
   - Doc must be shared with the service account
   - Can be shared across multiple milestones

## Google Docs Structure

The linked Notes documents should contain:

1. **Detailed project information**
2. **Progress updates with dates**
3. **Recent changes and decisions**
4. **Next steps and action items**
5. **Risks and blockers**

The AI will extract information relevant to each specific milestone.

## Setting Up Your Sheet

### Step 1: Create the Sheet

1. Create a new Google Sheet
2. Set up column headers in row 1
3. Format workstream headers with purple/lavender background

### Step 2: Add Workstreams

For each workstream:
1. Add a header row with the correct format
2. Merge cells across the full width (optional for visual effect)
3. Apply purple/lavender background color

### Step 3: Add Milestones

For each milestone under a workstream:
1. Add a row with "Milestone" in column A
2. Fill in all required columns
3. Link to a Google Doc in column Q (using Insert → Link)

### Step 4: Share with Service Account

1. Open your service account JSON file
2. Find the `client_email` field
3. Share the sheet with that email address
4. Grant "Editor" permissions
5. Share all linked Google Docs with the same email

## Example Sheet Structure

```
Row 1: [Headers]
WORK TYPE | TRACK | STATUS | TARGET DATE | OWNER | JIRA ID | COMMENTS | SLACK | ... | NOTES LINK

Row 2: [Workstream Header - Purple Background]
[empty] | Workstream: 1. Platform Infrastructure | PM: John Doe | Eng: Jane Smith | Design: N/A | Target: Q4 | Status: 🟢 | Q4O1

Row 3: [Milestone]
Milestone | Architecture Review | Done | Done | Jane Smith | PLAT-100 | [Jan 15] Architecture approved... | #platform | ... | [Doc Link]

Row 4: [Milestone]
Milestone | Infrastructure Setup | On Track | 03/15 | Bob Johnson | PLAT-101 | [Feb 10] AWS resources provisioned... | #platform | ... | [Doc Link]

Row 5: [Milestone]
Milestone | Security Audit | At Risk | 03/20 | Alice Brown | PLAT-102 | [Feb 12] Waiting on security team... | #platform | ... | [Doc Link]

Row 6: [Workstream Header - Purple Background]
[empty] | Workstream: 2. Config Visibility | PM: Sarah Lee | Eng: Mark Chen | Design: Tom Wilson | Target: Q4 | Status: 🟢 | Q4O2

Row 7: [Milestone]
Milestone | RFC | Done | Done | Mark Chen | VIS-200 | [Feb 9] RFC approved by leadership... | #config-vis | ... | [Doc Link]

... and so on
```

## Tips for Maintaining the Sheet

1. **Keep workstream headers updated** with current status and ownership
2. **Use consistent status values** (exactly as specified)
3. **Update JIRA IDs** when tickets are created
4. **Link Notes docs early** - the AI needs content to generate updates
5. **Keep docs updated** - stale docs lead to stale updates
6. **Use descriptive milestone names** that clearly identify the work
7. **Update target dates** as plans change

## Common Mistakes to Avoid

❌ **Don't:**
- Change the workstream header format
- Use custom status values
- Leave Jira ID empty if ticket exists
- Link to docs without sharing them
- Put milestone data in merged cells

✅ **Do:**
- Follow the exact format specifications
- Use consistent naming conventions
- Keep docs up to date
- Share all docs with the service account
- Test with a few milestones first

## Validation Checklist

Before running the automation, verify:

- [ ] Sheet is shared with service account email
- [ ] Workstream headers use correct format
- [ ] All milestone rows have "Milestone" in column A
- [ ] Status values match exactly (Done/On Track/At Risk/Blocked)
- [ ] Jira IDs are valid ticket keys
- [ ] All Notes docs are shared with service account
- [ ] Notes docs contain relevant, recent information
- [ ] Column G (Comments) is writable (not protected)

## Sheet ID

Your sheet ID is found in the URL:
```
https://docs.google.com/spreadsheets/d/[SHEET_ID_HERE]/edit
```

Copy the ID to your `.env` file as `GOOGLE_SHEET_ID`.
