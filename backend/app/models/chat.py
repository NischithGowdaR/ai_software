from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional, Any

class ChatMessage(BaseModel):
    sender: str  # user, ai
    text: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ChatRequest(BaseModel):
    repo_id: str
    message: str
    file_path: Optional[str] = None
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    conversation_id: str
    message: ChatMessage
    relevant_files: List[str] = []

class ConversationResponse(BaseModel):
    id: str
    repo_id: str
    user_id: str
    title: str
    messages: List[ChatMessage]
    created_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
