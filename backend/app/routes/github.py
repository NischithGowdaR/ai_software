from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from app.routes.auth import get_current_user
from app.models.repo import RepoConnectRequest, RepoResponse
from app.services.github_service import github_service
from app.services.search_service import search_service
from app.database import get_collection
from datetime import datetime
from bson import ObjectId
from typing import List, Dict, Any, Optional

router = APIRouter(prefix="/api/github", tags=["github"])

# Helper to serialize mongo doc
def serialize_repo(doc: dict) -> RepoResponse:
    return RepoResponse(
        id=str(doc["_id"]),
        name=doc["name"],
        owner=doc["owner"],
        description=doc.get("description"),
        url=doc["url"],
        default_branch=doc["default_branch"],
        branches=doc.get("branches", []),
        languages=doc.get("languages", {}),
        file_structure=doc.get("file_structure", []),
        created_at=doc["created_at"]
    )

@router.post("/connect", response_model=RepoResponse)
async def connect_repository(
    request: RepoConnectRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    try:
        owner, repo_name = github_service.parse_url(request.repo_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Check if this repository is already connected for this user
    repo_col = get_collection("repositories")
    existing_repo = repo_col.find_one({
        "user_id": str(current_user["_id"]),
        "owner": owner,
        "name": repo_name
    })
    
    if existing_repo:
        return serialize_repo(existing_repo)
        
    try:
        # Fetch data from GitHub API
        details = await github_service.get_repo_details(owner, repo_name)
        branches = await github_service.get_branches(owner, repo_name)
        languages = await github_service.get_languages(owner, repo_name)
        
        default_branch = details.get("default_branch", "main")
        if default_branch not in branches and branches:
            default_branch = branches[0]
            
        file_structure = await github_service.get_file_structure(owner, repo_name, default_branch)
        
        repo_doc = {
            "user_id": str(current_user["_id"]),
            "name": repo_name,
            "owner": owner,
            "description": details.get("description"),
            "url": details.get("html_url"),
            "default_branch": default_branch,
            "branches": branches,
            "languages": languages,
            "file_structure": file_structure,
            "created_at": datetime.utcnow()
        }
        
        result = repo_col.insert_one(repo_doc)
        repo_id = str(result.inserted_id)
        repo_doc["_id"] = result.inserted_id
        
        # Trigger repository search indexing
        # Run it synchronously or in background, let's run it in background to keep API fast
        # but let's index the first few files quickly.
        background_tasks.add_task(
            search_service.index_repository,
            repo_id, owner, repo_name, default_branch, file_structure
        )
        
        return serialize_repo(repo_doc)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to connect repository. Make sure the repository is public and GITHUB_TOKEN is correct. Error: {str(e)}"
        )

@router.get("/repositories", response_model=List[RepoResponse])
async def list_repositories(current_user: dict = Depends(get_current_user)):
    repo_col = get_collection("repositories")
    cursor = repo_col.find({"user_id": str(current_user["_id"])}).sort("created_at", -1)
    return [serialize_repo(doc) for doc in cursor]

@router.get("/repository/{repo_id}", response_model=RepoResponse)
async def get_repository(repo_id: str, current_user: dict = Depends(get_current_user)):
    repo_col = get_collection("repositories")
    repo = repo_col.find_one({"_id": ObjectId(repo_id), "user_id": str(current_user["_id"])})
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return serialize_repo(repo)

@router.get("/files/{repo_id}")
async def get_files(repo_id: str, current_user: dict = Depends(get_current_user)):
    repo_col = get_collection("repositories")
    repo = repo_col.find_one({"_id": ObjectId(repo_id), "user_id": str(current_user["_id"])})
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return repo.get("file_structure", [])

@router.get("/file-content/{repo_id}")
async def get_file_content(
    repo_id: str,
    path: str,
    branch: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    repo_col = get_collection("repositories")
    repo = repo_col.find_one({"_id": ObjectId(repo_id), "user_id": str(current_user["_id"])})
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    owner = repo["owner"]
    repo_name = repo["name"]
    branch_name = branch or repo["default_branch"]
    
    try:
        content = await github_service.get_file_content(owner, repo_name, branch_name, path)
        return {"content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load file content: {str(e)}")

@router.get("/commits/{repo_id}")
async def get_commits(repo_id: str, current_user: dict = Depends(get_current_user)):
    repo_col = get_collection("repositories")
    repo = repo_col.find_one({"_id": ObjectId(repo_id), "user_id": str(current_user["_id"])})
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    try:
        commits = await github_service.get_commits(repo["owner"], repo["name"])
        return commits
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/commits/{repo_id}/{sha}")
async def get_commit_details(repo_id: str, sha: str, current_user: dict = Depends(get_current_user)):
    repo_col = get_collection("repositories")
    repo = repo_col.find_one({"_id": ObjectId(repo_id), "user_id": str(current_user["_id"])})
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    try:
        commit = await github_service.get_commit_details(repo["owner"], repo["name"], sha)
        return commit
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pull-requests/{repo_id}")
async def get_pull_requests(repo_id: str, current_user: dict = Depends(get_current_user)):
    repo_col = get_collection("repositories")
    repo = repo_col.find_one({"_id": ObjectId(repo_id), "user_id": str(current_user["_id"])})
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    try:
        prs = await github_service.get_pull_requests(repo["owner"], repo["name"])
        return prs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pull-requests/{repo_id}/{pr_number}")
async def get_pr_details(repo_id: str, pr_number: int, current_user: dict = Depends(get_current_user)):
    repo_col = get_collection("repositories")
    repo = repo_col.find_one({"_id": ObjectId(repo_id), "user_id": str(current_user["_id"])})
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    try:
        pr = await github_service.get_pr_details(repo["owner"], repo["name"], pr_number)
        return pr
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
