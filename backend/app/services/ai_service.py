import json
import re
from typing import List, Dict, Any, Optional
from groq import Groq
from app.config import settings

class AIService:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        # Standard stable Groq models
        self.model_fast = "llama-3.1-8b-instant"
        self.model_smart = "llama-3.3-70b-versatile"
        self._client = None

    @property
    def client(self):
        if not self.api_key:
            raise ValueError("GROQ_API_KEY is not set. Please add it to your configuration.")
        if self._client is None:
            self._client = Groq(api_key=self.api_key)
        return self._client

    def _clean_json_response(self, text: str) -> str:
        # Sometimes AI adds markdown wrappers around JSON, we strip them
        text = text.strip()
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
        if match:
            return match.group(1).strip()
        return text

    async def explain_code(self, filename: str, code: str) -> str:
        prompt = f"""
Analyze the following file: `{filename}`.
Explain what this code does, its architecture, key functions, and logical flow.
Format your answer in clean Markdown.

Code content:
```
{code}
```
"""
        response = self.client.chat.completions.create(
            model=self.model_fast,
            messages=[
                {"role": "system", "content": "You are a professional software architect explaining code to developers."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=2048
        )
        return response.choices[0].message.content

    async def detect_bugs(self, filename: str, code: str) -> List[Dict[str, Any]]:
        prompt = f"""
Analyze the following file `{filename}` for bugs, security vulnerabilities, logical errors, performance bottlenecks, and bad coding practices.
Provide your response strictly as a JSON list of objects. Each object must have exactly these keys:
- "severity": Must be exactly one of "CRITICAL", "HIGH", "MEDIUM", "LOW"
- "problem": Short title of the issue
- "explanation": Detailed explanation of what is wrong
- "suggested_fix": The corrected code snippet or step-by-step instructions to fix it.

Do not include any opening or closing text. Return ONLY the raw JSON array.

Code content:
```
{code}
```
"""
        response = self.client.chat.completions.create(
            model=self.model_smart,
            messages=[
                {"role": "system", "content": "You are a senior software security and QA engineer. You output only raw, valid JSON lists."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            response_format={"type": "json_object"} if "70b" in self.model_smart else None
        )
        content = response.choices[0].message.content
        try:
            cleaned = self._clean_json_response(content)
            # Llama might return {"bugs": [...]} or raw list
            parsed = json.loads(cleaned)
            if isinstance(parsed, dict) and "bugs" in parsed:
                return parsed["bugs"]
            if isinstance(parsed, dict) and len(parsed) == 1 and isinstance(list(parsed.values())[0], list):
                return list(parsed.values())[0]
            if isinstance(parsed, list):
                return parsed
            return [{"severity": "LOW", "problem": "Analysis Output Error", "explanation": "Failed to parse structured JSON from AI.", "suggested_fix": content}]
        except Exception as e:
            print(f"Error parsing bug detection JSON: {e}. Raw content: {content}")
            # Return text block wrapped in high-severity error message
            return [{
                "severity": "MEDIUM",
                "problem": "AI Analysis Result (Text Format)",
                "explanation": "The AI did not format the response as JSON, here is the text response: " + content[:500],
                "suggested_fix": "Examine code manually."
            }]

    async def review_code(self, filename: str, code: str) -> Dict[str, Any]:
        prompt = f"""
Perform a comprehensive code quality review on `{filename}`. Check quality, security, performance, readability, and best practices.
Output the results strictly in JSON format with the following schema:
{{
  "score": 85, // Integer from 0 to 100 representing overall quality
  "summary": "Overall summary of code quality...",
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2"
  ],
  "details": {{
    "readability": {{ "score": 90, "comment": "Feedback on code structure, formatting, naming conventions..." }},
    "performance": {{ "score": 80, "comment": "Feedback on complexity, resource leaks, memory usage..." }},
    "security": {{ "score": 95, "comment": "Feedback on inputs validation, vulnerabilities, auth..." }},
    "maintainability": {{ "score": 80, "comment": "Feedback on modularity, testing, extensibility..." }}
  }}
}}

Return ONLY the raw JSON object. Do not wrap in markdown or add text outside of JSON.

Code content:
```
{code}
```
"""
        response = self.client.chat.completions.create(
            model=self.model_smart,
            messages=[
                {"role": "system", "content": "You are a tech lead reviewer. You output only raw, valid JSON objects conforming to the requested schema."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            response_format={"type": "json_object"} if "70b" in self.model_smart else None
        )
        content = response.choices[0].message.content
        try:
            cleaned = self._clean_json_response(content)
            return json.loads(cleaned)
        except Exception as e:
            print(f"Error parsing code review JSON: {e}. Raw: {content}")
            return {
                "score": 70,
                "summary": "Failed to parse structured review. Raw response: " + content[:200],
                "recommendations": ["Review code manually."],
                "details": {
                    "readability": {"score": 70, "comment": "Review text content: " + content[:200]},
                    "performance": {"score": 70, "comment": "N/A"},
                    "security": {"score": 70, "comment": "N/A"},
                    "maintainability": {"score": 70, "comment": "N/A"}
                }
            }

    async def generate_tests(self, filename: str, code: str) -> str:
        prompt = f"""
Write comprehensive unit tests for the following code inside `{filename}`.
Include:
1. Normal test cases (common inputs and expectations)
2. Edge cases (empty, very large, or unusual inputs)
3. Negative/Failure test cases (invalid types, missing parameters, errors)
4. Boundary cases (limits of variables)

Choose the standard testing framework for the language (e.g., pytest for Python, Jest/Mocha for JS/TS, JUnit for Java).
Include comments explaining each test case.
Format your answer in clean Markdown with code blocks.

Code content:
```
{code}
```
"""
        response = self.client.chat.completions.create(
            model=self.model_fast,
            messages=[
                {"role": "system", "content": "You are a professional software testing engineer. Write clean, complete test code."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=3000
        )
        return response.choices[0].message.content

    async def generate_documentation(self, filename: str, code: str) -> str:
        prompt = f"""
Generate clear and complete documentation for `{filename}`.
Provide:
1. File overview & purpose
2. Detailed explanation of key classes, functions, and modules (parameters, return types, exceptions)
3. Usage examples / API endpoints summary (if applicable)
4. Build/Run instructions (if applicable)
5. A proposed README section for this file

Format your answer in clean, publication-ready Markdown.

Code content:
```
{code}
```
"""
        response = self.client.chat.completions.create(
            model=self.model_fast,
            messages=[
                {"role": "system", "content": "You are a professional technical writer who produces clear, concise API and code documentation."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=3000
        )
        return response.choices[0].message.content

    async def analyze_commit(self, commit_info: Dict[str, Any]) -> str:
        # Format the commit details
        files_summary = ""
        for f in commit_info.get("files", []):
            files_summary += f"\nFile: {f['filename']} ({f['status']})\n"
            if f.get("patch"):
                # limit patch length to avoid token blow-up
                patch_str = f["patch"]
                if len(patch_str) > 1000:
                    patch_str = patch_str[:1000] + "\n...[diff truncated]..."
                files_summary += f"Diff:\n```diff\n{patch_str}\n```\n"

        prompt = f"""
Analyze this GitHub Commit.
Author: {commit_info['author']}
Date: {commit_info['date']}
Commit Message: {commit_info['message']}

Changes summary:
{files_summary}

Please provide an AI code review for this commit:
1. Explain the changes and why they were made.
2. Find any bugs, typos, or security issues introduced in this commit.
3. Suggest improvements or refactoring for the changed code.
Format your answer in clear Markdown.
"""
        response = self.client.chat.completions.create(
            model=self.model_fast,
            messages=[
                {"role": "system", "content": "You are a senior developer performing a code review on a git commit."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=2500
        )
        return response.choices[0].message.content

    async def analyze_pr(self, pr_info: Dict[str, Any]) -> str:
        files_summary = ""
        for f in pr_info.get("files", []):
            files_summary += f"\nFile: {f['filename']} ({f['status']})\n"
            if f.get("patch"):
                patch_str = f["patch"]
                if len(patch_str) > 1000:
                    patch_str = patch_str[:1000] + "\n...[diff truncated]..."
                files_summary += f"Diff:\n```diff\n{patch_str}\n```\n"

        prompt = f"""
Review the following Pull Request (PR) and provide a professional, constructive code review.
PR #{pr_info['number']}: {pr_info['title']}
Author: {pr_info['author']}
Description: {pr_info['body']}

Files Changed & Diffs:
{files_summary}

Please review this PR for:
1. Bugs, security problems, or edge cases.
2. Code style, structure, and readability.
3. Overall architectural feedback.
4. Specific line-by-line recommendations where applicable.

Provide your review in clean Markdown.
"""
        response = self.client.chat.completions.create(
            model=self.model_smart,
            messages=[
                {"role": "system", "content": "You are a tech lead reviewer assessing a pull request."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=3000
        )
        return response.choices[0].message.content

    async def chat_about_repo(self, question: str, repo_name: str, relevant_files: List[Dict[str, Any]], history: List[Dict[str, Any]] = None) -> str:
        # Build file context string
        context_str = ""
        for f in relevant_files:
            content_snippet = f["content"]
            if len(content_snippet) > 4000:
                content_snippet = content_snippet[:4000] + "\n... [content truncated to fit context] ..."
            context_str += f"\n---\nFile: `{f['path']}`\nContent:\n```\n{content_snippet}\n```\n"

        # Build chat message history
        messages = [
            {"role": "system", "content": f"You are an AI software engineering assistant helping a developer understand the `{repo_name}` repository. You have access to some relevant code snippets. Use this context to answer the user's questions clearly, accurately, and referencing file paths where appropriate."}
        ]
        
        # Add history
        if history:
            for msg in history:
                messages.append({"role": msg["sender"], "content": msg["text"]})

        # User question with context
        user_content = f"Question: {question}\n"
        if relevant_files:
            user_content += f"\nRelevant repository file context for this question:\n{context_str}"
        else:
            user_content += "\n(No direct matching files found. Answer based on general project knowledge if possible.)"

        messages.append({"role": "user", "content": user_content})

        response = self.client.chat.completions.create(
            model=self.model_fast,
            messages=messages,
            temperature=0.4,
            max_tokens=2048
        )
        return response.choices[0].message.content

ai_service = AIService()
