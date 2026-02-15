"""
Main FastAPI application entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import workstreams_router, updates_router, post_router

# Create FastAPI app
app = FastAPI(
    title="Jira Update Automation API",
    description="Backend API for automated Jira ticket updates from Google Sheets and Docs",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(workstreams_router)
app.include_router(updates_router)
app.include_router(post_router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Jira Update Automation API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
