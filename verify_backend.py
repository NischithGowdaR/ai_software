import os
import sys
from dotenv import load_dotenv
from pymongo import MongoClient
import httpx
from groq import Groq
import dns.resolver

# Fix local system DNS timeout for MongoDB Atlas SRV record resolution
dns.resolver.default_resolver = dns.resolver.Resolver(configure=False)
dns.resolver.default_resolver.nameservers = ['8.8.8.8', '1.1.1.1']

# Load environment variables
load_dotenv()

def verify_mongodb():
    print("--- Testing MongoDB Atlas Connection ---")
    uri = os.getenv("MONGODB_URI")
    db_name = os.getenv("DATABASE_NAME", "ai_software_engineering")
    
    if not uri:
        print("FAIL: MONGODB_URI is not set in environment variables.", file=sys.stderr)
        return False
        
    try:
        # Hide password in prints
        masked_uri = uri
        if "@" in uri:
            prefix, rest = uri.split(":", 1)
            if "@" in rest:
                creds, server = rest.split("@", 1)
                masked_uri = f"{prefix}:*****@{server}"
                
        print(f"Connecting to MongoDB with URI: {masked_uri}")
        client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        # Ping the server
        client.admin.command('ping')
        print(f"SUCCESS: Connected to database: '{db_name}' successfully!")
        return True
    except Exception as e:
        print(f"FAIL: MongoDB connection failed. Error: {e}", file=sys.stderr)
        return False

def verify_groq():
    print("\n--- Testing Groq API connection ---")
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("FAIL: GROQ_API_KEY is not set in environment variables.", file=sys.stderr)
        return False
        
    try:
        print(f"Initializing Groq Client with key: {api_key[:6]}...{api_key[-6:] if len(api_key) > 12 else ''}")
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are a validation tester. Respond with 'OK' and nothing else."},
                {"role": "user", "content": "Ping"}
            ],
            max_tokens=10,
            temperature=0.0
        )
        reply = response.choices[0].message.content.strip()
        print(f"SUCCESS: Groq responded correctly. Reply: '{reply}'")
        return True
    except Exception as e:
        print(f"FAIL: Groq API call failed. Error: {e}", file=sys.stderr)
        return False

def verify_github():
    print("\n--- Testing GitHub API connection ---")
    token = os.getenv("GITHUB_TOKEN")
    
    headers = {"Accept": "application/vnd.github.v3+json"}
    if token:
        headers["Authorization"] = f"token {token}"
        print(f"Using GITHUB_TOKEN: {token[:6]}...")
    else:
        print("No GITHUB_TOKEN set. Testing public rate limit endpoints.")
        
    try:
        # Check rate limits or a public repository info
        url = "https://api.github.com/repos/octocat/Hello-World"
        response = httpx.get(url, headers=headers)
        if response.status_code == 200:
            repo_data = response.json()
            print(f"SUCCESS: GitHub API access verified. Public repo name: '{repo_data['name']}'")
            # Print rate limit headers
            limit = response.headers.get("x-ratelimit-limit")
            remaining = response.headers.get("x-ratelimit-remaining")
            print(f"GitHub Rate Limits: Limit: {limit}, Remaining: {remaining}")
            return True
        else:
            print(f"FAIL: GitHub API request returned status: {response.status_code}. Response: {response.text}", file=sys.stderr)
            return False
    except Exception as e:
        print(f"FAIL: GitHub API request failed. Error: {e}", file=sys.stderr)
        return False

if __name__ == "__main__":
    print("==================================================")
    print("AI Software Engineering Platform - Backend Verifier")
    print("==================================================")
    
    mongo_ok = verify_mongodb()
    groq_ok = verify_groq()
    github_ok = verify_github()
    
    print("\n==================================================")
    print("VERIFICATION SUMMARY:")
    print(f"MongoDB Atlas: {'OK' if mongo_ok else 'FAILED'}")
    print(f"Groq API:     {'OK' if groq_ok else 'FAILED'}")
    print(f"GitHub API:   {'OK' if github_ok else 'FAILED'}")
    print("==================================================")
    
    if mongo_ok and groq_ok and github_ok:
        print("All checks PASSED! Backend is ready to launch.")
        sys.exit(0)
    else:
        print("Some checks FAILED. Please review the errors above.", file=sys.stderr)
        sys.exit(1)
