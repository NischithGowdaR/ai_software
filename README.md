# AI Software Engineering Platform

An intelligent, full-stack **AI-powered assistant platform for software developers** designed to help engineering teams understand codebases, detect bugs, perform automatic reviews, generate unit tests, write documentation, and inspect pull request / commit changes using advanced LLM reasoning.

Suitable as a **final-year Computer Science & Engineering (CSE) project**.

---

## 🌟 Core Features

- 🖥️ **Interactive Code Explorer**: Interactive directory tree layout where developers can select files to view source code and execute instant AI tasks.
- 💬 **Repository Q&A Assistant**: Multi-turn chat assistant equipped with a vector-free code retrieval system to locate files and answer project-wide structural questions (e.g., *"Where is database connection configured?"*).
- 🛡️ **AI Bug Detector**: Diagnoses logical glitches, syntactic errors, memory leaks, and bad design patterns, mapping them by severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) with code correction snippets.
- 📊 **Tech Lead Code Review**: Renders a code quality score (out of 100) with detailed breakdowns for readability, security, performance, and maintainability.
- 🧪 **Unit Test Generator**: Writes ready-to-run unit tests (using language-standard frameworks like `pytest` or `Jest`) covering normal inputs, edge cases, negative tests, and boundary values.
- 📝 **Documentation Generator**: Produces structural technical writeups, API endpoint summaries, usage blocks, and proposed README sections.
- 🔀 **Commit & PR Diff Analyzer**: Fetches active commits and pull requests directly from the GitHub REST API and performs diff patches reviews.
- 📜 **Intel History Logs**: Unified logging registry storing past scans and conversations in MongoDB for retrieval without re-running AI calls.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React.js (bootstrapped with Vite)
- **Routing**: React Router DOM v6
- **API Client**: Axios (configured with request interceptor for JWT authorization)
- **Styling**: Vanilla CSS with glassmorphic elements (`backdrop-filter`) and Bootstrap 5
- **Icons**: Lucide React

### Backend
- **Core API**: FastAPI (Python)
- **Schemas & Validation**: Pydantic v2
- **Database Driver**: PyMongo (MongoDB Atlas)
- **AI Brain**: Groq API SDK (running `llama3-70b-8192` for high-reasoning tasks and `llama3-8b-8192` for quick completions)
- **Version Control Integrator**: GitHub REST API

### Database
- **Provider**: MongoDB Atlas (cloud instance)
- **Collections**: `users`, `repositories`, `repo_files`, `conversations`, `analysis_results`

---

## 🚀 Installation & Local Setup

### Prerequisites
- Python 3.10+
- Node.js v18+
- MongoDB Atlas cluster URL
- Groq API Key (Llama models workspace)

### 1. Environment Configurations
Create a `.env` file in the root directory (based on `.env.example`):
```env
GROQ_API_KEY=your_groq_api_key
GITHUB_TOKEN=your_optional_github_token
MONGODB_URI=your_mongodb_connection_string
DATABASE_NAME=ai_software_engineering
SECRET_KEY=any_jwt_signing_secret_string
```

### 2. Backend Installation
```bash
# Navigate to workspace and install requirements
pip install -r backend/requirements.txt
```

### 3. Frontend Installation
```bash
# Navigate to frontend and install npm node modules
cd frontend
npm install
```

### 4. Running the Platform
You can run both servers in parallel using the Windows launcher:
```bash
# Run launcher script from workspace root
.\start.bat
```
Alternatively, start them manually:
- **Backend (Port 8000)**: `cd backend && uvicorn app.main:app --reload`
- **Frontend (Port 5173)**: `cd frontend && npm run dev`

Open your web browser and navigate to **`http://localhost:5173`**.

---

## 📂 Project Architecture

```
ai-software-engineering-platform/
├── backend/
│   ├── app/
│   │   ├── models/        # Pydantic schema validation structures
│   │   ├── routes/        # API endpoints (Auth, GitHub, AI, History)
│   │   ├── services/      # Service layer (GitHub connection, Groq AI, search indexing)
│   │   ├── utils/         # Password hashing & JWT token generators
│   │   ├── config.py      # App configurations loading .env
│   │   ├── database.py    # PyMongo Atlas connection module
│   │   └── main.py        # FastAPI initialization and CORS mounts
│   └── requirements.txt   # Python packages
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable widgets (Sidebar, CodeViewer)
│   │   ├── pages/         # Views (Dashboard, ConnectRepo, CodeExplorer, AIChat, History)
│   │   ├── services/      # Axios request client helper (api.js)
│   │   ├── App.jsx        # Routing definitions and repo contexts
│   │   ├── index.css      # Theme styling system
│   │   └── main.jsx       # Mounting react-dom
│   ├── index.html         # HTML template
│   └── package.json       # React dependencies
├── .env.example
├── .gitignore
├── start.bat              # Dev launcher script
└── README.md
```

---

## 🧩 AI Context Indexing System

To solve repository questions (e.g. *"Where is login handled?"*) without exceeding token thresholds, the backend implements a **keyword search-indexing system**:
1. When a repository is connected, its directory structure is mapped via GitHub git trees API.
2. The indexable text code files are registered in MongoDB (`repo_files`). The contents of key core scripts (up to 40) are parsed and stored as search cache.
3. When the user asks a question, the backend isolates query keywords (ignoring boilerplate stop words) and ranks files:
   - File Name Match: `+15 points`
   - Path Folder Match: `+8 points`
   - Content Keyword Match: `+2 points per occurrence`
4. The top 4 ranked files are retrieved and injected alongside their content snippets into the Groq prompt as a contextual instruction block, enabling the model to deliver precise answers referencing the file path.
