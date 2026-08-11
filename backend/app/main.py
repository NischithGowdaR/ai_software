from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, github, ai, history
from app.config import settings
from app.database import get_db

app = FastAPI(
    title="AI Software Engineering Platform API",
    description="Backend API for code intelligence, repository index scanning, and Groq-powered developers assistant.",
    version="1.0.0"
)

# CORS Configuration
# React frontend runs on port 5173 by default
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development, allow all origins. Can restrict to specific domains in prod.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(github.router)
app.include_router(ai.router)
app.include_router(history.router)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the AI Software Engineering Platform API",
        "status": "healthy",
        "database_connected": get_db() is not None
    }
