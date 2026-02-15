"""
Google Sheets writer service.
Handles writing comments back to the tracking sheet.
"""
import gspread
from google.oauth2.service_account import Credentials
from backend.config import settings


# Google API scopes
SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets'
]


class SheetWriter:
    """Service for writing data to Google Sheets."""
    
    def __init__(self):
        """Initialize Google Sheets API client with write permissions."""
        self.credentials = Credentials.from_service_account_file(
            settings.google_service_account_json,
            scopes=SCOPES
        )
        self.gc = gspread.authorize(self.credentials)
    
    def write_comment(self, row_index: int, comment: str) -> bool:
        """
        Write a comment to the Comments column (G, index 6) at the specified row.
        
        Args:
            row_index: 1-indexed row number
            comment: The comment text to write
            
        Returns:
            True if successful, False otherwise
        """
        try:
            spreadsheet = self.gc.open_by_key(settings.google_sheet_id)
            worksheet = spreadsheet.sheet1
            
            # Column G is the 7th column (index 6, but gspread uses 1-indexed columns)
            worksheet.update_cell(row_index, 7, comment)
            return True
        except Exception as e:
            print(f"Error writing to sheet: {e}")
            return False


# Singleton instance
_sheet_writer = None


def get_sheet_writer() -> SheetWriter:
    """Get or create the SheetWriter singleton instance."""
    global _sheet_writer
    if _sheet_writer is None:
        _sheet_writer = SheetWriter()
    return _sheet_writer
