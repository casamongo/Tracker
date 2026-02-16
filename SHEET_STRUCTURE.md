# Google Sheet Structure Guide

This document describes the expected structure of the Google Sheet that the application reads from.

**Note**: The parser now supports **two formats** for backward compatibility:
1. **New Format** (Recommended) - Uses Column A markers for hierarchy
2. **Legacy Format** - Uses "Workstream:" prefix and different column positions

## Sheet Layout

The sheet uses a hierarchical structure with multiple row types:
1. **Workstream Header Rows** - Define workstreams that group milestones
2. **Track Rows** (Optional) - Visual grouping within workstreams (not parsed, display only)
3. **Milestone Rows** - Individual tracking items under each workstream

---

## New Format (Recommended)

### Column Structure

| Column | Letter | Name | Description | Example |
|--------|--------|------|-------------|---------|
| 1 | A | ROW TYPE | Hierarchy marker: "Workstream", "Track", or "Milestone" | `Milestone` |
| 2 | B | NAME/TRACK | Milestone name or workstream header info | `Code Completion`, `RFC` |
| 3 | C | STATUS | Current status | `Done`, `On Track`, `At Risk`, `Blocked` |
| 4 | D | TARGET DATE | Completion target or "Done" | `3/6`, `2/28`, `Done` |
| 5 | E | OWNER | Person responsible | `Alex Vivenzio`, `Tom Triboulot` |
| 6 | F | JIRA ID | Jira ticket identifier | `PROJ-123`, `INPLAT-861` |
| 7 | G | NOTES | Google Doc link (can be hyperlinked text) | `https://docs.google.com/...` or `Notes` (with hyperlink) |
| 8 | H | JIRA STATUS | Current Jira status | `In Progress`, `Done` |
| 9 | I | COMMENTS | One-line summary (AI output column) | `[Feb 9] RFC approved...` |

### Workstream Header Row Format (New)

**Column A must contain**: `Workstream`
**Column B format**: 

```
<number>. <name> | PM: <pm_name> Eng: <eng_name> Design: <designer_name> | Target: <quarter> | Status: <emoji>
```

**Key Differences from Legacy**:
- No "Workstream:" prefix needed
- PM/Eng/Design can be separated by spaces instead of pipes
- OKR field is optional

### Example Workstream Header (New Format)

```
Column A: Workstream
Column B: 1. Workload Selection | PM: Syed Sarjeel Yusuf Eng: Nati Tsechanski Design: Rani Zhu | Target: Q1 | Status: 🟢
```

### Track Row Format (New Format)

**Column A must contain**: `Track`
**Column B**: Track description

Track rows are used for visual organization and are **not parsed** by the application. They help group related milestones visually but don't affect the data structure.

```
Column A: Track
Column B: a) Workload Selection for SSI - Linux
```

### Milestone Row Format (New Format)

**Column A must contain**: `Milestone`

```
Column A: Milestone
Column B: Code Completion: Show hosts impacted + eligibility
Column C: On Track
Column D: 3/6
Column E: Alex Vivenzio
Column F: PROJ-123
Column G: Notes (with hyperlink to Google Doc)
Column H: In Progress
Column I: (AI-generated summary will appear here)
```

### Example Sheet Structure (New Format)

```
Row 1: [Headers]
ROW TYPE | NAME | STATUS | TARGET DATE | OWNER | JIRA ID | NOTES | JIRA STATUS | COMMENTS

Row 2: [Workstream]
Workstream | 1. Workload Selection | PM: Syed Sarjeel Yusuf Eng: Nati Tsechanski Design: Rani Zhu | Target: Q1 | Status: 🟢 | | | | |

Row 3: [Track - Optional]
Track | a) Workload Selection for SSI - Linux | To Do | Q1 | Nati Tsechanski | | | | |

Row 4: [Milestone]
Milestone | Code Completion: Show hosts impacted | On Track | 3/6 | Alex Vivenzio | PROJ-123 | [Doc Link] | In Progress | |

Row 5: [Milestone]
Milestone | Pen Test | On Track | 2/28 | Tom Triboulot | PROJ-124 | [Doc Link] | Pending | |
```

---

## Legacy Format (Still Supported)

### Column Structure (Legacy)

### Column Structure (Legacy)

| Column | Letter | Name | Description | Example |
|--------|--------|------|-------------|---------|
| 1 | A | WORK TYPE | "Milestone" for milestone rows; **empty** for workstream headers | `Milestone` |
| 2 | B | TRACK | Milestone name or workstream info (with "Workstream:" prefix) | `RFC`, `Workstream: 5. Config Visibility...` |
| 3 | C | STATUS | Current status | `Done`, `On Track`, `At Risk`, `Blocked` |
| 4 | D | TARGET DATE | Completion target or "Done" | `11/18`, `12/31`, `Done` |
| 5 | E | MILESTONE OWNER | Person responsible | `Mark Spicer`, `Jane Doe` |
| 6 | F | JIRA ID | Jira ticket identifier | `INPLAT-861`, `PROJ-123` |
| 7 | G | COMMENTS | One-line summary (output column) | `[Feb 9] RFC approved...` |
| 8 | H | SLACK | Slack channel | `#apm-config-visibility` |
| ... | ... | ... | (Other columns as needed) | ... |
| 17 | Q | NOTES LINK | Google Doc URL with detailed notes | `https://docs.google.com/...` |
| 18 | R | ACTIONS | (UI-only, not used by backend) | N/A |

### Workstream Header Row Format (Legacy)

### Workstream Header Row Format (Legacy)

**Column A must be**: Empty (or merged cell)
**Column B format**:

```
Workstream: <number>. <name> | PM: <pm_name> | Eng: <eng_name> | Design: <designer_name> | Target: <quarter> | Status: <emoji> | <okr_reference>
```

### Example Workstream Header (Legacy)

```
Column A: [empty]
Column B: Workstream: 5. Config Visibility | PM: Syed Sarjeel Yusuf | Eng: Mark Spicer | Design: N/A | Target: Q4 | Status: 🟢 | Q4O1
```

### Example Sheet Structure (Legacy)

```
Row 1: [Headers]
WORK TYPE | TRACK | STATUS | TARGET DATE | OWNER | JIRA ID | COMMENTS | SLACK | ... | NOTES LINK

Row 2: [Workstream Header - Purple Background]
[empty] | Workstream: 5. Config Visibility | PM: Syed Sarjeel Yusuf | Eng: Mark Spicer | Design: N/A | Target: Q4 | Status: 🟢 | Q4O1

Row 3: [Milestone]
Milestone | RFC | Done | Done | Mark Spicer | INPLAT-861 | [Feb 9] RFC approved... | #apm-config | ... | [Doc Link]
```

---

## Common Elements (Both Formats)

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
- **OKR**: OKR reference (e.g., Q4O1, Q3O2) - Optional in new format

### Milestone Status Values

Both formats use the same status values:
- `Done` - Completed
- `On Track` - Progressing as planned
- `At Risk` - Issues identified
- `Blocked` - Cannot proceed

### Notes Document Requirements

The linked Notes documents should contain:

1. **Detailed project information**
2. **Progress updates with dates**
3. **Recent changes and decisions**
4. **Next steps and action items**
5. **Risks and blockers**

The AI will extract information relevant to each specific milestone.

---

## Migration Guide: Legacy to New Format

To migrate from the legacy format to the new format:

1. **Add "Workstream" to Column A** for all workstream header rows
2. **Remove "Workstream:" prefix** from Column B (or keep it - both work!)
3. **Add "Milestone" to Column A** for all milestone rows
4. **Move Notes links** from Column Q to Column G (optional - fallback still works)
5. **Move Comments/Summaries** from Column G to Column I
6. **Add Track rows** (optional) with "Track" in Column A for visual grouping

**Note**: You can migrate gradually - the parser supports both formats simultaneously!

---

## Setting Up Your Sheet

## Setting Up Your Sheet

### Step 1: Create the Sheet

1. Create a new Google Sheet
2. Set up column headers in row 1
3. Format workstream headers with purple/lavender background (optional, for visual clarity)

### Step 2: Add Workstreams

**New Format**:
1. Put "Workstream" in Column A
2. Put workstream info in Column B (e.g., "1. Name | PM: X Eng: Y...")
3. Apply purple/lavender background color (optional)

**Legacy Format**:
1. Leave Column A empty (or merge cells)
2. Put "Workstream: N. Name | PM: X | Eng: Y..." in Column B
3. Apply purple/lavender background color (optional)

### Step 3: Add Milestones

**New Format**:
1. Put "Milestone" in Column A
2. Fill in milestone details in Columns B-I
3. Link to Google Doc in Column G

**Legacy Format**:
1. Put "Milestone" in Column A
2. Fill in milestone details in Columns B-H
3. Link to Google Doc in Column Q

### Step 4: Share with Service Account

1. Open your service account JSON file
2. Find the `client_email` field
3. Share the sheet with that email address
4. Grant "Editor" permissions
5. Share all linked Google Docs with the same email

---

## Tips for Maintaining the Sheet

1. **Keep workstream headers updated** with current status and ownership
2. **Use consistent status values** (exactly as specified)
3. **Update JIRA IDs** when tickets are created
4. **Link Notes docs early** - the AI needs content to generate updates
5. **Keep docs updated** - stale docs lead to stale updates
6. **Use descriptive milestone names** that clearly identify the work
7. **Update target dates** as plans change
8. **Choose one format** - while both are supported, consistency makes maintenance easier

## Common Mistakes to Avoid

❌ **Don't:**
- Mix formats randomly (pick one and be consistent)
- Change column positions without updating both formats
- Use custom status values
- Leave Jira ID empty if ticket exists
- Link to docs without sharing them
- Put milestone data in merged cells

✅ **Do:**
- Follow the format specifications exactly
- Use consistent naming conventions
- Keep docs up to date
- Share all docs with the service account
- Test with a few milestones first
- Use Track rows for visual grouping (new format only)

## Validation Checklist

Before running the automation, verify:

- [ ] Sheet is shared with service account email
- [ ] Workstream headers use one of the supported formats
- [ ] All milestone rows have "Milestone" in column A
- [ ] Status values match exactly (Done/On Track/At Risk/Blocked)
- [ ] Jira IDs are valid ticket keys
- [ ] All Notes docs are shared with service account
- [ ] Notes docs contain relevant, recent information
- [ ] Comments column is writable (not protected)
- [ ] Column A contains row type markers (new format) or is empty for workstreams (legacy)

## Troubleshooting

**Workstreams not appearing?**
- Check that Column A has "Workstream" (new format) or is empty with "Workstream:" in Column B (legacy)
- Verify the workstream header format matches one of the examples

**Milestones not appearing?**
- Ensure Column A contains exactly "Milestone"
- Check that milestone rows come after a workstream header

**Notes links not working?**
- New format: Check Column G for links
- Legacy format: Check Column Q for links
- Verify docs are shared with the service account email
- Check that hyperlinks are properly formatted

**AI summaries not updating?**
- New format: Check that Column I is not protected
- Legacy format: Check that Column G is not protected
- Verify the Notes documents contain recent content

---

## Example Sheet Structure (Complete)

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

---

## Sheet ID

Your sheet ID is found in the URL:
```
https://docs.google.com/spreadsheets/d/[SHEET_ID_HERE]/edit
```

Copy the ID to your `.env` file as `GOOGLE_SHEET_ID`.
