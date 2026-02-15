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
from models.workstream import Workstream, Milestone


# Google API scopes
SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly'
]


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
        
        Format: "Workstream: 5. Config Visibility | PM: Syed Sarjeel Yusuf | 
                 Eng: Mark Spicer | Design: N/A | Target: Q4 | Status: 🟢 | Q4O1"
        
        Args:
            row_text: Text from the workstream header cell
            
        Returns:
            Dictionary with parsed workstream metadata, or None if parsing fails
        """
        # Extract workstream number and name
        ws_match = re.search(r'Workstream:\s*(\d+)\.\s*([^|]+)', row_text)
        if not ws_match:
            return None
        
        ws_num = ws_match.group(1)
        ws_name = ws_match.group(2).strip()
        
        # Extract other fields
        pm_match = re.search(r'PM:\s*([^|]+)', row_text)
        eng_match = re.search(r'Eng:\s*([^|]+)', row_text)
        design_match = re.search(r'Design:\s*([^|]+)', row_text)
        target_match = re.search(r'Target:\s*([^|]+)', row_text)
        status_match = re.search(r'Status:\s*([^|]+)', row_text)
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
            # Convert column index to A1 notation
            col_letter = chr(65 + col_idx) if col_idx < 26 else chr(65 + col_idx // 26 - 1) + chr(65 + col_idx % 26)
            range_name = f"{col_letter}{row_idx + 1}"
            
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
        
        Returns:
            List of Workstream objects with nested milestones
        """
        # Open the spreadsheet
        spreadsheet = self.gc.open_by_key(settings.google_sheet_id)
        worksheet = spreadsheet.sheet1
        
        # Get all values
        all_values = worksheet.get_all_values()
        
        workstreams = []
        current_ws = None
        
        for row_idx, row in enumerate(all_values):
            # Skip empty rows
            if not any(row):
                continue
            
            # Detect workstream header: column A is empty and column B contains "Workstream:"
            if len(row) > 1 and row[0] == "" and "Workstream:" in str(row[1]):
                ws_data = self.parse_workstream_header(row[1])
                if ws_data:
                    current_ws = Workstream(**ws_data, milestones=[])
                    workstreams.append(current_ws)
            
            # Detect milestone row: column A = "Milestone"
            elif len(row) > 7 and row[0] == "Milestone" and current_ws is not None:
                # Extract notes link from column Q (index 16)
                notes_link = None
                notes_doc_id = None
                if len(row) > 16 and row[16]:
                    notes_link = row[16]
                    # Try to get hyperlink if cell has one
                    hyperlink = self.extract_hyperlink(settings.google_sheet_id, row_idx, 16)
                    if hyperlink:
                        notes_link = hyperlink
                    notes_doc_id = self.extract_doc_id_from_url(notes_link)
                
                milestone = Milestone(
                    row_index=row_idx + 1,  # 1-indexed for gspread
                    track=row[1] if len(row) > 1 else "",
                    status=row[2] if len(row) > 2 else "",
                    target_date=row[3] if len(row) > 3 else "",
                    owner=row[4] if len(row) > 4 else "",
                    jira_id=row[5] if len(row) > 5 else "",
                    comments=row[6] if len(row) > 6 else "",
                    slack_channel=row[7] if len(row) > 7 else "",
                    notes_link=notes_link,
                    notes_doc_id=notes_doc_id
                )
                current_ws.milestones.append(milestone)
        
        return workstreams


# Singleton instance
_sheet_reader = None


def get_sheet_reader() -> SheetReader:
    """Get or create the SheetReader singleton instance."""
    global _sheet_reader
    if _sheet_reader is None:
        _sheet_reader = SheetReader()
    return _sheet_reader
