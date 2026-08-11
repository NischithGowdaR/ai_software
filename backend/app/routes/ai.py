from fastapi import APIRouter, Depends, HTTPException, status
from app.routes.auth import get_current_user
from app.models.analysis import AnalysisRequest, CommitAnalysisRequest, PRAnalysisRequest, AnalysisResponse
from app.models.chat import ChatRequest, ChatResponse, ChatMessage, ConversationResponse
from app.services.github_service import github_service
from app.services.ai_service import ai_service
from app.services.search_service import search_service
from app.database import get_collection
from datetime import datetime
from bson import ObjectId
from typing import List, Dict, Any, Tuple

router = APIRouter(prefix="/api/ai", tags=["ai"])

# Helper to fetch code content if missing in request
async def get_code_content(repo_id: str, file_path: str, provided_content: str = None, user_id: str = "") -> Tuple[str, str]:
    if provided_content:
        # Fetch repo name for reference
        repo_col = get_collection("repositories")
        repo = repo_col.find_one({"_id": ObjectId(repo_id), "user_id": user_id})
        return provided_content, repo["name"] if repo else "unknown"

    repo_col = get_collection("repositories")
    repo = repo_col.find_one({"_id": ObjectId(repo_id), "user_id": user_id})
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    try:
        content = await github_service.get_file_content(
            repo["owner"],
            repo["name"],
            repo["default_branch"],
            file_path
        )
        return content, repo["name"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load file content from GitHub: {str(e)}")

def serialize_analysis(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "repo_id": doc["repo_id"],
        "file_path": doc.get("file_path"),
        "analysis_type": doc["analysis_type"],
        "result": doc["result"],
        "score": doc.get("score"),
        "created_at": doc["created_at"]
    }

@router.post("/explain", response_model=AnalysisResponse)
async def explain_code(request: AnalysisRequest, current_user: dict = Depends(get_current_user)):
    code, repo_name = await get_code_content(request.repo_id, request.file_path, request.code_content, str(current_user["_id"]))
    
    try:
        explanation = await ai_service.explain_code(request.file_path, code)
        
        # Save to database
        analysis_col = get_collection("analysis_results")
        doc = {
            "user_id": str(current_user["_id"]),
            "repo_id": request.repo_id,
            "repo_name": repo_name,
            "file_path": request.file_path,
            "analysis_type": "explain",
            "result": explanation,
            "created_at": datetime.utcnow()
        }
        result = analysis_col.insert_one(doc)
        doc["_id"] = result.inserted_id
        
        return serialize_analysis(doc)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

@router.post("/bug-detect", response_model=AnalysisResponse)
async def bug_detect(request: AnalysisRequest, current_user: dict = Depends(get_current_user)):
    code, repo_name = await get_code_content(request.repo_id, request.file_path, request.code_content, str(current_user["_id"]))
    
    try:
        bugs = await ai_service.detect_bugs(request.file_path, code)
        
        analysis_col = get_collection("analysis_results")
        doc = {
            "user_id": str(current_user["_id"]),
            "repo_id": request.repo_id,
            "repo_name": repo_name,
            "file_path": request.file_path,
            "analysis_type": "bug_detect",
            "result": bugs,
            "created_at": datetime.utcnow()
        }
        result = analysis_col.insert_one(doc)
        doc["_id"] = result.inserted_id
        
        return serialize_analysis(doc)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

@router.post("/code-review", response_model=AnalysisResponse)
async def code_review(request: AnalysisRequest, current_user: dict = Depends(get_current_user)):
    code, repo_name = await get_code_content(request.repo_id, request.file_path, request.code_content, str(current_user["_id"]))
    
    try:
        review = await ai_service.review_code(request.file_path, code)
        score = float(review.get("score", 70))
        
        analysis_col = get_collection("analysis_results")
        doc = {
            "user_id": str(current_user["_id"]),
            "repo_id": request.repo_id,
            "repo_name": repo_name,
            "file_path": request.file_path,
            "analysis_type": "code_review",
            "result": review,
            "score": score,
            "created_at": datetime.utcnow()
        }
        result = analysis_col.insert_one(doc)
        doc["_id"] = result.inserted_id
        
        return serialize_analysis(doc)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

@router.post("/generate-tests", response_model=AnalysisResponse)
async def generate_tests(request: AnalysisRequest, current_user: dict = Depends(get_current_user)):
    code, repo_name = await get_code_content(request.repo_id, request.file_path, request.code_content, str(current_user["_id"]))
    
    try:
        tests = await ai_service.generate_tests(request.file_path, code)
        
        analysis_col = get_collection("analysis_results")
        doc = {
            "user_id": str(current_user["_id"]),
            "repo_id": request.repo_id,
            "repo_name": repo_name,
            "file_path": request.file_path,
            "analysis_type": "generate_tests",
            "result": tests,
            "created_at": datetime.utcnow()
        }
        result = analysis_col.insert_one(doc)
        doc["_id"] = result.inserted_id
        
        return serialize_analysis(doc)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

@router.post("/documentation", response_model=AnalysisResponse)
async def generate_documentation(request: AnalysisRequest, current_user: dict = Depends(get_current_user)):
    code, repo_name = await get_code_content(request.repo_id, request.file_path, request.code_content, str(current_user["_id"]))
    
    try:
        docs = await ai_service.generate_documentation(request.file_path, code)
        
        analysis_col = get_collection("analysis_results")
        doc = {
            "user_id": str(current_user["_id"]),
            "repo_id": request.repo_id,
            "repo_name": repo_name,
            "file_path": request.file_path,
            "analysis_type": "documentation",
            "result": docs,
            "created_at": datetime.utcnow()
        }
        result = analysis_col.insert_one(doc)
        doc["_id"] = result.inserted_id
        
        return serialize_analysis(doc)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

@router.post("/analyze-commit", response_model=AnalysisResponse)
async def analyze_commit(request: CommitAnalysisRequest, current_user: dict = Depends(get_current_user)):
    repo_col = get_collection("repositories")
    repo = repo_col.find_one({"_id": ObjectId(request.repo_id), "user_id": str(current_user["_id"])})
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    try:
        commit_info = await github_service.get_commit_details(repo["owner"], repo["name"], request.commit_sha)
        analysis_text = await ai_service.analyze_commit(commit_info)
        
        analysis_col = get_collection("analysis_results")
        doc = {
            "user_id": str(current_user["_id"]),
            "repo_id": request.repo_id,
            "repo_name": repo["name"],
            "file_path": f"commit:{request.commit_sha[:8]}",
            "analysis_type": "commit_analysis",
            "result": analysis_text,
            "created_at": datetime.utcnow()
        }
        result = analysis_col.insert_one(doc)
        doc["_id"] = result.inserted_id
        
        return serialize_analysis(doc)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI commit analysis failed: {str(e)}")

@router.post("/analyze-pr", response_model=AnalysisResponse)
async def analyze_pr(request: PRAnalysisRequest, current_user: dict = Depends(get_current_user)):
    repo_col = get_collection("repositories")
    repo = repo_col.find_one({"_id": ObjectId(request.repo_id), "user_id": str(current_user["_id"])})
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    try:
        pr_info = await github_service.get_pr_details(repo["owner"], repo["name"], request.pr_number)
        analysis_text = await ai_service.analyze_pr(pr_info)
        
        analysis_col = get_collection("analysis_results")
        doc = {
            "user_id": str(current_user["_id"]),
            "repo_id": request.repo_id,
            "repo_name": repo["name"],
            "file_path": f"pr:{request.pr_number}",
            "analysis_type": "pr_analysis",
            "result": analysis_text,
            "created_at": datetime.utcnow()
        }
        result = analysis_col.insert_one(doc)
        doc["_id"] = result.inserted_id
        
        return serialize_analysis(doc)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI pull request analysis failed: {str(e)}")

@router.post("/chat", response_model=ChatResponse)
async def chat_about_repo(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    repo_col = get_collection("repositories")
    repo = repo_col.find_one({"_id": ObjectId(request.repo_id), "user_id": str(current_user["_id"])})
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Search for files relevant to the query to inject as context
    relevant_files = await search_service.search_repository(request.repo_id, request.message)
    
    # Retrieve chat history
    conversations_col = get_collection("conversations")
    conversation = None
    
    if request.conversation_id:
        conversation = conversations_col.find_one({
            "_id": ObjectId(request.conversation_id),
            "user_id": str(current_user["_id"])
        })
    
    if not conversation:
        # Create a new conversation record
        conv_doc = {
            "repo_id": request.repo_id,
            "user_id": str(current_user["_id"]),
            "title": request.message[:40] + ("..." if len(request.message) > 40 else ""),
            "messages": [],
            "created_at": datetime.utcnow()
        }
        res = conversations_col.insert_one(conv_doc)
        conversation = conv_doc
        conversation["_id"] = res.inserted_id

    # Format history for the AI service
    history_list = []
    for msg in conversation.get("messages", []):
        history_list.append({
            "sender": "assistant" if msg["sender"] == "ai" else "user",
            "text": msg["text"]
        })

    # Call AI service
    try:
        reply_text = await ai_service.chat_about_repo(
            question=request.message,
            repo_name=repo["name"],
            relevant_files=relevant_files,
            history=history_list
        )
        
        # Save messages to database
        user_msg = {"sender": "user", "text": request.message, "timestamp": datetime.utcnow()}
        ai_msg = {"sender": "ai", "text": reply_text, "timestamp": datetime.utcnow()}
        
        conversations_col.update_one(
            {"_id": conversation["_id"]},
            {"$push": {"messages": {"$each": [user_msg, ai_msg]}}}
        )
        
        return ChatResponse(
            conversation_id=str(conversation["_id"]),
            message=ChatMessage(sender="ai", text=reply_text, timestamp=ai_msg["timestamp"]),
            relevant_files=[rf["path"] for rf in relevant_files]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat assistant failed: {str(e)}")
