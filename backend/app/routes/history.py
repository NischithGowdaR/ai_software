from fastapi import APIRouter, Depends, HTTPException, status
from app.routes.auth import get_current_user
from app.database import get_collection
from app.models.analysis import AnalysisResponse
from app.models.chat import ConversationResponse, ChatMessage
from bson import ObjectId
from datetime import datetime
from typing import List, Dict, Any

router = APIRouter(prefix="/api/history", tags=["history"])

@router.get("/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    
    repo_col = get_collection("repositories")
    analysis_col = get_collection("analysis_results")
    conv_col = get_collection("conversations")
    
    total_repos = repo_col.count_documents({"user_id": user_id})
    total_analyses = analysis_col.count_documents({"user_id": user_id})
    
    # Count bugs detected from bug_detect analyses
    bugs_detected = 0
    bug_docs = analysis_col.find({"user_id": user_id, "analysis_type": "bug_detect"})
    for doc in bug_docs:
        res = doc.get("result", [])
        if isinstance(res, list):
            # Each item represents a detected bug
            bugs_detected += len(res)
            
    code_reviews = analysis_col.count_documents({"user_id": user_id, "analysis_type": "code_review"})
    tests_generated = analysis_col.count_documents({"user_id": user_id, "analysis_type": "generate_tests"})
    
    # Recent activity
    recent_activity = []
    
    # Fetch recent analyses
    recent_analyses = analysis_col.find({"user_id": user_id}).sort("created_at", -1).limit(5)
    for doc in recent_analyses:
        recent_activity.append({
            "id": str(doc["_id"]),
            "type": "analysis",
            "analysis_type": doc["analysis_type"],
            "repo_name": doc.get("repo_name", "Unknown Repo"),
            "file_path": doc.get("file_path", ""),
            "timestamp": doc["created_at"],
            "title": f"Analyzed {doc.get('file_path', '').split('/')[-1] or doc.get('file_path')}"
        })
        
    # Fetch recent conversations
    recent_convs = conv_col.find({"user_id": user_id}).sort("created_at", -1).limit(5)
    for doc in recent_convs:
        # Get repository name
        repo = repo_col.find_one({"_id": ObjectId(doc["repo_id"])})
        repo_name = repo["name"] if repo else "Unknown Repo"
        
        recent_activity.append({
            "id": str(doc["_id"]),
            "type": "chat",
            "repo_name": repo_name,
            "timestamp": doc["created_at"],
            "title": f"Chat: {doc.get('title', 'Repo Q&A')}"
        })
        
    # Sort activity by timestamp
    recent_activity.sort(key=lambda x: x["timestamp"], reverse=True)
    recent_activity = recent_activity[:8]
    
    return {
        "total_repositories": total_repos,
        "total_analyses": total_analyses,
        "bugs_detected": bugs_detected,
        "code_reviews": code_reviews,
        "tests_generated": tests_generated,
        "recent_activity": recent_activity
    }

@router.get("/analyses", response_model=List[AnalysisResponse])
async def list_analyses(
    repo_id: str = None,
    analysis_type: str = None,
    current_user: dict = Depends(get_current_user)
):
    analysis_col = get_collection("analysis_results")
    query = {"user_id": str(current_user["_id"])}
    if repo_id:
        query["repo_id"] = repo_id
    if analysis_type:
        query["analysis_type"] = analysis_type
        
    cursor = analysis_col.find(query).sort("created_at", -1)
    results = []
    for doc in cursor:
        results.append(AnalysisResponse(
            id=str(doc["_id"]),
            repo_id=doc["repo_id"],
            file_path=doc.get("file_path"),
            analysis_type=doc["analysis_type"],
            result=doc["result"],
            score=doc.get("score"),
            created_at=doc["created_at"]
        ))
    return results

@router.get("/analyses/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis_details(analysis_id: str, current_user: dict = Depends(get_current_user)):
    analysis_col = get_collection("analysis_results")
    doc = analysis_col.find_one({"_id": ObjectId(analysis_id), "user_id": str(current_user["_id"])})
    if not doc:
        raise HTTPException(status_code=404, detail="Analysis not found")
        
    return AnalysisResponse(
        id=str(doc["_id"]),
        repo_id=doc["repo_id"],
        file_path=doc.get("file_path"),
        analysis_type=doc["analysis_type"],
        result=doc["result"],
        score=doc.get("score"),
        created_at=doc["created_at"]
    )

@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(repo_id: str = None, current_user: dict = Depends(get_current_user)):
    conv_col = get_collection("conversations")
    query = {"user_id": str(current_user["_id"])}
    if repo_id:
        query["repo_id"] = repo_id
        
    cursor = conv_col.find(query).sort("created_at", -1)
    results = []
    for doc in cursor:
        results.append(ConversationResponse(
            id=str(doc["_id"]),
            repo_id=doc["repo_id"],
            user_id=doc["user_id"],
            title=doc.get("title", "Conversation"),
            messages=[
                ChatMessage(sender=m["sender"], text=m["text"], timestamp=m["timestamp"])
                for m in doc.get("messages", [])
            ],
            created_at=doc["created_at"]
        ))
    return results

@router.get("/conversations/{conv_id}", response_model=ConversationResponse)
async def get_conversation(conv_id: str, current_user: dict = Depends(get_current_user)):
    conv_col = get_collection("conversations")
    doc = conv_col.find_one({"_id": ObjectId(conv_id), "user_id": str(current_user["_id"])})
    if not doc:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    return ConversationResponse(
        id=str(doc["_id"]),
        repo_id=doc["repo_id"],
        user_id=doc["user_id"],
        title=doc.get("title", "Conversation"),
        messages=[
            ChatMessage(sender=m["sender"], text=m["text"], timestamp=m["timestamp"])
            for m in doc.get("messages", [])
        ],
        created_at=doc["created_at"]
    )
