import httpx
import re
from typing import List, Dict, Any, Tuple, Optional
from app.config import settings

class GitHubService:
    def __init__(self):
        self.headers = {
            "Accept": "application/vnd.github.v3+json"
        }
        if settings.GITHUB_TOKEN:
            # GitHub supports Bearer tokens for modern authentication, or token format.
            self.headers["Authorization"] = f"token {settings.GITHUB_TOKEN}"

    def parse_url(self, url: str) -> Tuple[str, str]:
        url = url.strip().rstrip("/")
        if url.endswith(".git"):
            url = url[:-4]
        
        # Regex to capture owner and repo from github.com/owner/repo
        match = re.search(r"github\.com/([^/]+)/([^/]+)", url)
        if not match:
            raise ValueError("Invalid GitHub repository URL. Format should be https://github.com/owner/repo")
        
        owner, repo = match.group(1), match.group(2)
        return owner, repo

    async def get_repo_details(self, owner: str, repo: str) -> Dict[str, Any]:
        url = f"https://api.github.com/repos/{owner}/{repo}"
        async with httpx.AsyncClient(headers=self.headers) as client:
            response = await client.get(url)
            if response.status_code != 200:
                raise Exception(f"Failed to fetch repository details: {response.text}")
            return response.json()

    async def get_branches(self, owner: str, repo: str) -> List[str]:
        url = f"https://api.github.com/repos/{owner}/{repo}/branches"
        async with httpx.AsyncClient(headers=self.headers) as client:
            response = await client.get(url)
            if response.status_code != 200:
                return []
            return [b["name"] for b in response.json()]

    async def get_languages(self, owner: str, repo: str) -> Dict[str, float]:
        url = f"https://api.github.com/repos/{owner}/{repo}/languages"
        async with httpx.AsyncClient(headers=self.headers) as client:
            response = await client.get(url)
            if response.status_code != 200:
                return {}
            data = response.json()
            total = sum(data.values())
            if total == 0:
                return {}
            # Return percentages
            return {lang: round((val / total) * 100, 2) for lang, val in data.items()}

    async def get_file_structure(self, owner: str, repo: str, branch: str) -> List[Dict[str, Any]]:
        # Fetch the complete git tree recursively
        url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"
        async with httpx.AsyncClient(headers=self.headers) as client:
            response = await client.get(url)
            if response.status_code != 200:
                raise Exception(f"Failed to fetch file structure: {response.text}")
            
            tree_data = response.json()
            if "tree" not in tree_data:
                return []
            
            # Map into list of file objects
            files = []
            for item in tree_data["tree"]:
                files.append({
                    "path": item["path"],
                    "type": "dir" if item["type"] == "tree" else "file",
                    "size": item.get("size", 0),
                    "sha": item["sha"]
                })
            return files

    async def get_file_content(self, owner: str, repo: str, branch: str, path: str) -> str:
        # Fetch raw content from raw.githubusercontent.com
        # Using raw URL handles larger files and bypasses API limits
        raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}"
        async with httpx.AsyncClient(headers=self.headers) as client:
            response = await client.get(raw_url)
            if response.status_code == 200:
                return response.text
            
            # Fallback to contents API in case raw.githubusercontent is not updated or access token is required for private repo
            api_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}?ref={branch}"
            response = await client.get(api_url)
            if response.status_code == 200:
                import base64
                data = response.json()
                if "content" in data:
                    content_bytes = base64.b64decode(data["content"])
                    return content_bytes.decode("utf-8", errors="ignore")
                
            raise Exception(f"Failed to fetch file content: {response.text}")

    async def get_commits(self, owner: str, repo: str) -> List[Dict[str, Any]]:
        url = f"https://api.github.com/repos/{owner}/{repo}/commits"
        async with httpx.AsyncClient(headers=self.headers) as client:
            response = await client.get(url, params={"per_page": 20})
            if response.status_code != 200:
                return []
            commits = []
            for item in response.json():
                commits.append({
                    "sha": item["sha"],
                    "message": item["commit"]["message"],
                    "author": item["commit"]["author"]["name"] if item["commit"]["author"] else "Unknown",
                    "date": item["commit"]["author"]["date"] if item["commit"]["author"] else "",
                    "url": item["html_url"]
                })
            return commits

    async def get_commit_details(self, owner: str, repo: str, sha: str) -> Dict[str, Any]:
        url = f"https://api.github.com/repos/{owner}/{repo}/commits/{sha}"
        async with httpx.AsyncClient(headers=self.headers) as client:
            response = await client.get(url)
            if response.status_code != 200:
                raise Exception(f"Failed to fetch commit: {response.text}")
            data = response.json()
            
            # Extract changed files and patches
            files = []
            for f in data.get("files", []):
                files.append({
                    "filename": f["filename"],
                    "status": f["status"],
                    "additions": f["additions"],
                    "deletions": f["deletions"],
                    "patch": f.get("patch", "")
                })
            
            return {
                "sha": data["sha"],
                "message": data["commit"]["message"],
                "author": data["commit"]["author"]["name"] if data["commit"]["author"] else "Unknown",
                "date": data["commit"]["author"]["date"] if data["commit"]["author"] else "",
                "files": files
            }

    async def get_pull_requests(self, owner: str, repo: str) -> List[Dict[str, Any]]:
        url = f"https://api.github.com/repos/{owner}/{repo}/pulls"
        async with httpx.AsyncClient(headers=self.headers) as client:
            response = await client.get(url, params={"state": "all", "per_page": 20})
            if response.status_code != 200:
                return []
            prs = []
            for item in response.json():
                prs.append({
                    "number": item["number"],
                    "title": item["title"],
                    "state": item["state"],
                    "author": item["user"]["login"] if item["user"] else "Unknown",
                    "created_at": item["created_at"],
                    "url": item["html_url"]
                })
            return prs

    async def get_pr_details(self, owner: str, repo: str, pr_number: int) -> Dict[str, Any]:
        url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}"
        async with httpx.AsyncClient(headers=self.headers) as client:
            response = await client.get(url)
            if response.status_code != 200:
                raise Exception(f"Failed to fetch PR: {response.text}")
            pr_data = response.json()
            
            # Fetch files changed in the PR
            files_url = f"{url}/files"
            files_resp = await client.get(files_url)
            files = []
            if files_resp.status_code == 200:
                for f in files_resp.json():
                    files.append({
                        "filename": f["filename"],
                        "status": f["status"],
                        "additions": f["additions"],
                        "deletions": f["deletions"],
                        "patch": f.get("patch", "")
                    })
            
            return {
                "number": pr_data["number"],
                "title": pr_data["title"],
                "state": pr_data["state"],
                "body": pr_data.get("body", ""),
                "author": pr_data["user"]["login"] if pr_data["user"] else "Unknown",
                "created_at": pr_data["created_at"],
                "files": files
            }

github_service = GitHubService()
