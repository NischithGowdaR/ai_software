import re
from typing import List, Dict, Any
from app.database import get_collection
from app.services.github_service import github_service
from bson import ObjectId

class SearchService:
    # Extensions that are indexable text files
    CODE_EXTENSIONS = {
        'py', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'yaml', 'yml',
        'md', 'txt', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'sh',
        'rb', 'php', 'sql', 'kt', 'gradle', 'xml', 'toml', 'dockerfile', 'ini'
    }

    # Paths to ignore during indexing
    IGNORE_PATTERNS = [
        r'(^|/)node_modules/',
        r'(^|/)\.git/',
        r'(^|/)\.venv/',
        r'(^|/)venv/',
        r'(^|/)env/',
        r'(^|/)__pycache__/',
        r'(^|/)dist/',
        r'(^|/)build/',
        r'(^|/)package-lock\.json$',
        r'(^|/)yarn\.lock$',
        r'(^|/)pnpm-lock\.yaml$',
        r'(^|/)\.idea/',
        r'(^|/)\.vscode/',
        r'\.(png|jpg|jpeg|gif|ico|webp|zip|tar|gz|pdf|exe|dll|so|woff|woff2|ttf|eot|map)$'
    ]

    def is_indexable(self, path: str, size: int) -> bool:
        # Ignore binary files, lock files, and system directories
        for pattern in self.IGNORE_PATTERNS:
            if re.search(pattern, path, re.IGNORECASE):
                return False
        
        # Check extension
        parts = path.split('.')
        if len(parts) > 1:
            ext = parts[-1].lower()
            if ext not in self.CODE_EXTENSIONS:
                return False
        
        # Limit size to 150KB for content indexing
        if size > 150 * 1024:
            return False
            
        return True

    async def index_repository(self, repo_id: str, owner: str, repo_name: str, branch: str, file_structure: List[Dict[str, Any]]):
        db_files = get_collection("repo_files")
        
        # Remove any existing files for this repository to avoid duplicates
        db_files.delete_many({"repo_id": repo_id})
        
        # Filter files to index
        indexable_files = [f for f in file_structure if f["type"] == "file" and self.is_indexable(f["path"], f.get("size", 0))]
        
        # Index files. To make it fast, we index filenames and paths immediately.
        # We also index contents of up to 40 most important files (e.g. main scripts, source code, readmes)
        # We prioritize files in src/, app/, components/ and common code extensions
        def score_importance(path: str) -> int:
            score = 0
            # Prioritize files in common code folders
            if any(folder in path.lower() for folder in ["src/", "app/", "components/", "routes/", "models/", "services/", "controllers/"]):
                score += 10
            # Prioritize config/README files
            if "readme" in path.lower() or "package.json" in path or "requirements" in path.lower() or "config" in path.lower():
                score += 8
            # Prioritize source extensions over markdown/txt
            ext = path.split('.')[-1].lower() if '.' in path else ''
            if ext in {'py', 'js', 'ts', 'jsx', 'tsx', 'go', 'rs', 'java', 'cs', 'rb', 'php'}:
                score += 5
            return score

        indexable_files.sort(key=lambda x: score_importance(x["path"]), reverse=True)
        
        # We index the first 40 files' contents synchronously during connect, others we index with path only
        # (This keeps the connection step fast while ensuring the key files are fully searchable)
        bulk_docs = []
        for i, file_info in enumerate(indexable_files):
            path = file_info["path"]
            size = file_info.get("size", 0)
            sha = file_info["sha"]
            content = ""
            
            # Fetch content for the top 40 files
            if i < 40:
                try:
                    content = await github_service.get_file_content(owner, repo_name, branch, path)
                except Exception as e:
                    print(f"Skipping indexing content for {path}: {e}")
                    content = ""
            
            bulk_docs.append({
                "repo_id": repo_id,
                "path": path,
                "name": path.split('/')[-1],
                "size": size,
                "sha": sha,
                "content": content,
                "content_indexed": len(content) > 0
            })
            
        if bulk_docs:
            db_files.insert_many(bulk_docs)

    async def search_repository(self, repo_id: str, query: str) -> List[Dict[str, Any]]:
        db_files = get_collection("repo_files")
        
        # Clean query and extract keywords
        query_clean = re.sub(r'[^\w\s]', ' ', query.lower())
        keywords = [word for word in query_clean.split() if len(word) > 2 and word not in {
            'where', 'what', 'how', 'when', 'who', 'which', 'there', 'their', 'about', 'handle', 'manager', 'helper', 'implement', 'code', 'file', 'project'
        }]
        
        if not keywords:
            # Fallback to simple split if all words were filtered
            keywords = [word for word in query_clean.split() if len(word) > 1]
            
        if not keywords:
            return []

        # Find candidate files
        # We search matching path names, and matching keywords in cached contents
        # Fetch files from the repo
        cursor = db_files.find({"repo_id": repo_id})
        
        scored_files = []
        for doc in cursor:
            score = 0
            path = doc["path"].lower()
            name = doc["name"].lower()
            content = doc.get("content", "").lower()
            
            for keyword in keywords:
                # File name match (highest relevance)
                if keyword in name:
                    score += 15
                # Path folder match
                elif keyword in path:
                    score += 8
                # Content match
                if content and keyword in content:
                    # Count occurrences
                    occurrences = content.count(keyword)
                    score += min(occurrences * 2, 10)
            
            if score > 0:
                scored_files.append((score, doc))
        
        # Sort by score descending
        scored_files.sort(key=lambda x: x[0], reverse=True)
        
        # Return top 4 files
        results = []
        for score, doc in scored_files[:4]:
            results.append({
                "path": doc["path"],
                "name": doc["name"],
                "content": doc.get("content", ""),
                "score": score
            })
            
        return results

search_service = SearchService()
