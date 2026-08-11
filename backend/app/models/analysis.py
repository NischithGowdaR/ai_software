from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Dict, Optional, Any

class AnalysisRequest(BaseModel):
    repo_id: str
    file_path: str
    code_content: Optional[str] = None

class CommitAnalysisRequest(BaseModel):
    repo_id: str
    commit_sha: str

class PRAnalysisRequest(BaseModel):
    repo_id: str
    pr_number: int

class AnalysisResponse(BaseModel):
    id: str
    repo_id: str
    file_path: Optional[str] = None
    analysis_type: str  # explain, bug_detect, code_review, generate_tests, documentation, commit_analysis, pr_analysis
    result: Any
    score: Optional[float] = None
    created_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
