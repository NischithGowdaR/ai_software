from pydantic import BaseModel, HttpUrl, Field
from datetime import datetime
from typing import List, Dict, Optional, Any

class RepoConnectRequest(BaseModel):
    repo_url: str = Field(..., description="Full GitHub repository URL, e.g. https://github.com/owner/repo")

class RepoResponse(BaseModel):
    id: str
    name: str
    owner: str
    description: Optional[str] = None
    url: str
    default_branch: str
    branches: List[str] = []
    languages: Dict[str, float] = {}
    file_structure: List[Dict[str, Any]] = []
    created_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
