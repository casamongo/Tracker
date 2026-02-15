"""
Configuration settings for the Jira Update Automation backend.
Loads environment variables and provides application settings.
"""
import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Google
    google_service_account_json: str = "./config/service-account.json"
    google_sheet_id: str
    
    # Jira
    jira_base_url: str
    jira_email: str
    jira_api_token: str
    
    # Anthropic
    anthropic_api_key: str
    
    # App
    app_port: int = 8000
    frontend_port: int = 3000
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
