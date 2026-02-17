"""
Google Sheets reader service.
Handles reading and parsing the tracking sheet hierarchy.
"""
import re
import gspread
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from typing import List, Dict, Optional
from config import settings
from models.workstream import Workstream, Milestone, Track


# Google API scopes
SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly'
]

# Constants
NOTES_LABEL = "notes"  # Cell text that indicates a notes column header


class SheetReader:
    """Service for reading and parsing Google Sheets data."""
    
    def __init__(self):
        """Initialize Google Sheets and Drive API clients."""
        self.credentials = Credentials.from_service_account_file(
            settings.google_service_account_json,
            scopes=SCOPES
        )
        self.gc = gspread.authorize(self.credentials)
        self.sheets_service = build('sheets', 'v4', credentials=self.credentials)
    
    def parse_workstream_header(self, row_text: str) -> Optional[Dict]:
        """
        Parse a workstream header row.
        
        Supports two formats:
        1. Old: "Workstream: 5. Config Visibility | PM: Syed Sarjeel Yusuf | 
                 Eng: Mark Spicer | Design: N/A | Target: Q4 | Status: 🟢 | Q4O1"
        2. New: "1. Workload Selection | PM: Syed Sarjeel Yusuf Eng: Nati Tsechanski  
                 Design: Rani Zhu  | Target: Q1 | Status: 🟢"
        
        Args:
            row_text: Text from the workstream header cell
            
        Returns:
            Dictionary with parsed workstream metadata, or None if parsing fails
        """
        # Try old format first (with "Workstream:" prefix)
        ws_match = re.search(r'Workstream:\s*(\d+)\.\s*([^|]+)', row_text)
        if ws_match:
            ws_num = ws_match.group(1)
            ws_name = ws_match.group(2).strip()
        else:
            # Try new format (without "Workstream:" prefix)
            ws_match = re.search(r'^(\d+)\.\s*([^|]+)', row_text)
            if not ws_match:
                return None
            ws_num = ws_match.group(1)
            ws_name = ws_match.group(2).strip()
        
        # Extract other fields - handle both pipe-separated and space-separated
        # The regex patterns use non-greedy matching (*?) followed by lookaheads (?=...)
        # to match until the next field keyword (e.g., "Eng:", "Design:") or pipe separator
        # This allows parsing both "PM: X | Eng: Y" and "PM: X Eng: Y" formats
        pm_match = re.search(r'PM:\s*([^|]*?)(?:\s+Eng:|\s+Design:|\s+Target:|\||$)', row_text)
        eng_match = re.search(r'Eng:\s*([^|]*?)(?:\s+Design:|\s+Target:|\s+Status:|\||$)', row_text)
        design_match = re.search(r'Design:\s*([^|]*?)(?:\s+Target:|\s+Status:|\||$)', row_text)
        target_match = re.search(r'Target:\s*([^|]*?)(?:\s+Status:|\||$)', row_text)
        status_match = re.search(r'Status:\s*([^|]+?)(?:\||$)', row_text)
        okr_match = re.search(r'\|\s*([A-Z0-9]+)\s*$', row_text)
        
        # Determine status color from emoji
        status_emoji = status_match.group(1).strip() if status_match else ""
        if "🟢" in status_emoji or "green" in status_emoji.lower():
            status = "green"
        elif "🟡" in status_emoji or "yellow" in status_emoji.lower():
            status = "yellow"
        elif "🔴" in status_emoji or "red" in status_emoji.lower():
            status = "red"
        else:
            status = "unknown"
        
        return {
            "id": f"ws-{ws_num}",
            "name": ws_name,
            "pm": pm_match.group(1).strip() if pm_match else "N/A",
            "eng": eng_match.group(1).strip() if eng_match else "N/A",
            "design": design_match.group(1).strip() if design_match else "N/A",
            "target_quarter": target_match.group(1).strip() if target_match else "N/A",
            "status": status,
            "okr": okr_match.group(1).strip() if okr_match else "N/A"
        }
    
    def extract_hyperlink(self, sheet_id: str, row_idx: int, col_idx: int) -> Optional[str]:
        """
        Extract hyperlink from a specific cell using Sheets API v4.
        
        Args:
            sheet_id: The spreadsheet ID
            row_idx: Row index (0-based)
            col_idx: Column index (0-based)
            
        Returns:
            URL string if hyperlink exists, None otherwise
        """
        try:
            # Convert column index to A1 notation using gspread's utility
            from gspread.utils import rowcol_to_a1
            range_name = rowcol_to_a1(row_idx + 1, col_idx + 1)
            
            result = self.sheets_service.spreadsheets().get(
                spreadsheetId=sheet_id,
                ranges=[range_name],
                fields="sheets.data.rowData.values.hyperlink"
            ).execute()
            
            sheets = result.get('sheets', [])
            if sheets and 'data' in sheets[0]:
                data = sheets[0]['data']
                if data and 'rowData' in data[0]:
                    row_data = data[0]['rowData']
                    if row_data and 'values' in row_data[0]:
                        values = row_data[0]['values']
                        if values and 'hyperlink' in values[0]:
                            return values[0]['hyperlink']
            return None
        except Exception as e:
            print(f"Error extracting hyperlink: {e}")
            return None
    
    def extract_doc_id_from_url(self, url: str) -> Optional[str]:
        """Extract Google Doc ID from URL."""
        if not url:
            return None
        match = re.search(r'/document/d/([a-zA-Z0-9_-]+)', url)
        return match.group(1) if match else None
    
    def parse_sheet(self) -> List[Workstream]:
        """
        Parse the Google Sheet and return workstream hierarchy.
        
        Supports dynamic hierarchy detection based on Column A values:
        - Column A = "Workstream" → Start new workstream
        - Column A = "Track" → Create track grouping within workstream
        - Column A = "Milestone" → Add milestone to current track
        
        Also supports legacy format where Column A is empty and Column B has "Workstream:"
        
        Returns:
            List of Workstream objects with nested tracks containing milestones
        """
        # Open the spreadsheet
        spreadsheet = self.gc.open_by_key(settings.google_sheet_id)
        worksheet = spreadsheet.sheet1
        
        # Get all values
        all_values = worksheet.get_all_values()
        
        workstreams = []
        current_ws = None
        current_track = None
        
        for row_idx, row in enumerate(all_values):
            # Skip empty rows
            if not any(row):
                continue
            
            # Get column A value
            col_a = row[0].strip() if len(row) > 0 else ""
            
            # Detect workstream by Column A = "Workstream"
            if col_a == "Workstream" and len(row) > 1:
                ws_data = self.parse_workstream_header(row[1])
                if ws_data:
                    current_ws = Workstream(**ws_data, tracks=[])
                    workstreams.append(current_ws)
                    # Reset track state for new workstream
                    current_track = None
            
            # Legacy format: column A is empty and column B contains "Workstream:"
            elif col_a == "" and len(row) > 1 and "Workstream:" in str(row[1]):
                ws_data = self.parse_workstream_header(row[1])
                if ws_data:
                    current_ws = Workstream(**ws_data, tracks=[])
                    workstreams.append(current_ws)
                    # Reset track state for new workstream
                    current_track = None
            
            # Detect track row: Column A = "Track"
            elif col_a == "Track" and current_ws is not None:
                # Extract track name from column B (index 1)
                track_name = row[1] if len(row) > 1 else "Untitled Track"
                
                # Extract notes link from column G (index 6) for new structure
                track_notes_link = None
                track_notes_doc_id = None
                
                if len(row) > 6 and row[6]:
                    # Check if cell has hyperlink
                    hyperlink = self.extract_hyperlink(settings.google_sheet_id, row_idx, 6)
                    if hyperlink:
                        track_notes_link = hyperlink
                        track_notes_doc_id = self.extract_doc_id_from_url(hyperlink)
                    elif str(row[6]).strip().lower() != NOTES_LABEL:
                        # Plain text link
                        track_notes_link = row[6]
                        track_notes_doc_id = self.extract_doc_id_from_url(row[6])
                
                # Fall back to column Q (index 16) for legacy structure
                if not track_notes_link and len(row) > 16 and row[16]:
                    hyperlink = self.extract_hyperlink(settings.google_sheet_id, row_idx, 16)
                    if hyperlink:
                        track_notes_link = hyperlink
                        track_notes_doc_id = self.extract_doc_id_from_url(hyperlink)
                    else:
                        track_notes_link = row[16]
                        track_notes_doc_id = self.extract_doc_id_from_url(row[16])
                
                # Create new Track and add to current workstream
                current_track = Track(
                    name=track_name,
                    notes_link=track_notes_link,
                    notes_doc_id=track_notes_doc_id,
                    milestones=[]
                )
                current_ws.tracks.append(current_track)
            
            # Detect milestone row: column A = "Milestone"
            elif col_a == "Milestone" and current_ws is not None:
                # If no track exists yet, create a default track
                if current_track is None:
                    current_track = Track(
                        name="Default Track",
                        notes_link=None,
                        notes_doc_id=None,
                        milestones=[]
                    )
                    current_ws.tracks.append(current_track)
                
                # Extract notes link - try column G (index 6) first for new structure
                notes_link = None
                notes_doc_id = None
                
                # Try column G first (new structure)
                if len(row) > 6 and row[6]:
                    # Check if cell has hyperlink
                    hyperlink = self.extract_hyperlink(settings.google_sheet_id, row_idx, 6)
                    if hyperlink:
                        notes_link = hyperlink
                        notes_doc_id = self.extract_doc_id_from_url(notes_link)
                    # If no hyperlink but text says "Notes", it might be a column header label
                    elif row[6].strip().lower() != NOTES_LABEL:
                        notes_link = row[6]
                        notes_doc_id = self.extract_doc_id_from_url(notes_link)
                
                # Fall back to column Q (index 16) for legacy structure
                if not notes_link and len(row) > 16 and row[16]:
                    notes_link = row[16]
                    hyperlink = self.extract_hyperlink(settings.google_sheet_id, row_idx, 16)
                    if hyperlink:
                        notes_link = hyperlink
                    notes_doc_id = self.extract_doc_id_from_url(notes_link)
                
                # Fall back to track notes if milestone doesn't have its own
                if not notes_link and current_track.notes_link:
                    notes_link = current_track.notes_link
                    notes_doc_id = current_track.notes_doc_id
                
                # Determine comments value with fallback logic
                # New structure: Column I (index 8) for AI-generated summaries
                # Legacy structure: Column G (index 6)
                comments_value = ""
                if len(row) > 8:
                    comments_value = row[8]
                elif len(row) > 6:
                    comments_value = row[6]
                
                milestone = Milestone(
                    row_index=row_idx + 1,  # 1-indexed for gspread
                    track=row[1] if len(row) > 1 else "",
                    status=row[2] if len(row) > 2 else "",
                    target_date=row[3] if len(row) > 3 else "",
                    owner=row[4] if len(row) > 4 else "",
                    jira_id=row[5] if len(row) > 5 else "",
                    comments=comments_value,
                    slack_channel=row[7] if len(row) > 7 else "",  # Column H
                    notes_link=notes_link,
                    notes_doc_id=notes_doc_id
                )
                current_track.milestones.append(milestone)
        
        return workstreams


# Singleton instance
_sheet_reader = None


def get_sheet_reader() -> SheetReader:
    """Get or create the SheetReader singleton instance."""
    global _sheet_reader
    if _sheet_reader is None:
        _sheet_reader = SheetReader()
    return _sheet_reader
