"""
Google Docs reader service.
Handles extracting text content from Google Docs.
"""
import re
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from typing import Optional
from backend.config import settings


# Google API scopes
SCOPES = [
    'https://www.googleapis.com/auth/documents.readonly'
]


class DocReader:
    """Service for reading Google Docs content."""
    
    def __init__(self):
        """Initialize Google Docs API client."""
        self.credentials = Credentials.from_service_account_file(
            settings.google_service_account_json,
            scopes=SCOPES
        )
        self.docs_service = build('docs', 'v1', credentials=self.credentials)
    
    def extract_text_from_doc(self, doc: dict) -> str:
        """
        Extract plain text from a Google Doc structure.
        
        Args:
            doc: The document object from the Docs API
            
        Returns:
            Extracted text as a string
        """
        text_parts = []
        content = doc.get('body', {}).get('content', [])
        
        for element in content:
            if 'paragraph' in element:
                paragraph = element['paragraph']
                for text_run in paragraph.get('elements', []):
                    if 'textRun' in text_run:
                        text_parts.append(text_run['textRun'].get('content', ''))
            elif 'table' in element:
                # Extract text from tables
                table = element['table']
                for row in table.get('tableRows', []):
                    for cell in row.get('tableCells', []):
                        for cell_element in cell.get('content', []):
                            if 'paragraph' in cell_element:
                                paragraph = cell_element['paragraph']
                                for text_run in paragraph.get('elements', []):
                                    if 'textRun' in text_run:
                                        text_parts.append(text_run['textRun'].get('content', ''))
        
        return ''.join(text_parts)
    
    def read_doc(self, doc_id: str) -> Optional[str]:
        """
        Read and extract text content from a Google Doc.
        
        Args:
            doc_id: The Google Doc ID
            
        Returns:
            The extracted text, or None if an error occurs
        """
        try:
            doc = self.docs_service.documents().get(documentId=doc_id).execute()
            text = self.extract_text_from_doc(doc)
            
            # Truncate if too large (100K chars max)
            if len(text) > 100000:
                text = text[:100000] + "\n\n[Note: Document truncated for processing]"
            
            return text
        except Exception as e:
            print(f"Error reading doc {doc_id}: {e}")
            return None


# Singleton instance
_doc_reader = None


def get_doc_reader() -> DocReader:
    """Get or create the DocReader singleton instance."""
    global _doc_reader
    if _doc_reader is None:
        _doc_reader = DocReader()
    return _doc_reader
