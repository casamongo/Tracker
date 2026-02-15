# Jira Update Automation

An agentic AI workflow that reads a Google Sheets tracking sheet, extracts linked Notes documents for each milestone, uses Claude AI to generate contextual summaries, and posts updates to both Jira (as ticket comments) and back to the spreadsheet (as one-line leadership summaries).

## Architecture

The system consists of:
- **Backend**: Python FastAPI with Google Sheets/Docs APIs, Claude AI, and Jira integration
- **Frontend**: React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **Deployment**: Docker Compose with nginx reverse proxy

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Google Cloud Service Account with Sheets and Docs API access
- Jira API credentials
- Anthropic (Claude) API key

### Setup

1. Clone the repository:
```bash
git clone https://github.com/casamongo/Tracker.git
cd Tracker
```

2. Copy the example environment file and configure:
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. Place your Google Service Account JSON in `config/service-account.json`

4. Build and run with Docker Compose:
```bash
docker-compose up --build
```

5. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Python 3.12 + FastAPI + Uvicorn |
| AI | Anthropic Claude API (claude-sonnet-4-5-20250929) |
| Google | Google Sheets API (gspread) + Google Docs API |
| Jira | Atlassian REST API v3 |
| Auth | Google Service Account (for Sheets/Docs), Jira API token |
| Deploy | Docker Compose (nginx + backend + frontend) |

## Features

- 📊 **Dashboard**: Visual representation of workstreams and milestones from Google Sheets
- 🤖 **AI-Powered Updates**: Claude AI analyzes Notes documents and generates contextual summaries
- 🎯 **Jira Integration**: Automatically posts formatted updates as comments to Jira tickets
- ✏️ **Human Review**: Preview and edit AI-generated updates before posting
- 📝 **Sheet Updates**: Writes one-line summaries back to the tracking sheet
- ⚙️ **Configuration**: Easy setup through web interface

## API Endpoints

- `GET /api/workstreams` - Read and parse the Google Sheet hierarchy
- `POST /api/generate-updates` - Generate AI summaries for selected milestones
- `POST /api/post-to-jira` - Post an update to a Jira ticket
- `POST /api/post-to-sheet` - Write a summary to the Google Sheet
- `POST /api/run-all` - Orchestrate full update workflow

## Development

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

## License

MIT