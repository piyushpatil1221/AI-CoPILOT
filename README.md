# 🔍 AI Due Diligence Copilot

> **Production-quality AI assistant for investment due diligence on financial documents.**
> Upload annual reports, investor presentations, and financial statements — get instant AI-powered analysis with citations.

![AI Due Diligence Copilot](https://img.shields.io/badge/AI-Due%20Diligence%20Copilot-6366f1?style=for-the-badge)
![Gemini](https://img.shields.io/badge/Gemini%202.5%20Flash-Primary%20LLM-4285F4?style=flat-square)
![GPT-4o](https://img.shields.io/badge/GPT--4o-Fallback%20LLM-10a37f?style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=flat-square)
![React](https://img.shields.io/badge/React%2018-Frontend-61dafb?style=flat-square)
![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector%20Store-ff6b35?style=flat-square)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📤 **PDF Upload** | Drag & drop multiple PDFs with progress tracking |
| 🧠 **AI Analysis** | 8-section due diligence report in one click |
| 💬 **Streaming Chat** | Ask anything with token-by-token streaming responses |
| 📎 **Citations** | Every answer includes source filename + page number |
| 📊 **SWOT Matrix** | Visual 4-quadrant strengths, weaknesses, opportunities, threats |
| 🔴 **Risk Assessment** | Colour-coded risk factors with severity levels |
| 💰 **Financial Highlights** | Key metrics extracted with trend indicators |
| 🆚 **Company Compare** | Side-by-side metrics comparison of two companies |
| 🎯 **Investment Score** | BUY / HOLD / SELL recommendation with 0-10 score |
| 🔄 **Dual LLM** | Gemini 2.5 Flash (primary) + GPT-4o (fallback), switchable per request |
| 🔒 **Local-first** | All data stays on your machine |

---

## 🗂️ Project Structure

```
AI-Due-Diligence-Copilot/
├── backend/
│   ├── main.py          # FastAPI app, all endpoints
│   ├── rag.py           # LangChain RAG pipeline + streaming SSE
│   ├── analyzer.py      # Structured analysis (SWOT, risks, etc.)
│   ├── vectorstore.py   # ChromaDB wrapper
│   ├── parser.py        # PyMuPDF + pdfplumber PDF chunking
│   ├── config.py        # Settings management
│   ├── models.py        # Pydantic schemas
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/       # Dashboard, Chat, Analysis, Compare
│   │   ├── components/  # Sidebar, UploadZone, ChatMessage, etc.
│   │   ├── hooks/       # useChat (SSE streaming)
│   │   └── lib/api.js   # Axios API client
│   └── Dockerfile
├── documents/           # Uploaded PDFs (gitignored)
├── embeddings/          # ChromaDB persistent storage (gitignored)
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start — Local Development

### Prerequisites
- Python 3.11+
- Node.js 20+
- A **Gemini API key** (get it at [aistudio.google.com](https://aistudio.google.com))
- Optionally an **OpenAI API key** for GPT-4o fallback

### 1. Clone & configure

```bash
git clone <your-repo>
cd "AI Due Diligence Copilot"

# Copy and fill in your API keys
cp backend/.env.example backend/.env
# Edit backend/.env and add your GEMINI_API_KEY and OPENAI_API_KEY
```

### 2. Start the Backend

```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`
API docs: `http://localhost:8000/api/docs`

### 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🐳 Docker Compose (Recommended)

```bash
# 1. Set up your .env file (root level)
cp .env.example .env
# Edit .env with your API keys

# 2. Build and run
docker compose up --build

# App will be at http://localhost:3000
# API at http://localhost:8000
```

---

## 📖 How to Use

### Step 1 — Create a Session
Click **"Upload Documents"** on the dashboard. A new session is created automatically.

### Step 2 — Upload Documents
Drag & drop your PDF files:
- Annual Reports
- Investor Presentations
- Financial Statements
- Market Research Reports

### Step 3 — Generate Analysis
Go to **Analysis** → click **"Generate Full Analysis"**. The AI produces:
1. Executive Summary
2. Business Model
3. SWOT Analysis
4. Financial Highlights
5. Risk Factors
6. Growth Opportunities
7. Market Position
8. Investment Recommendation (BUY/HOLD/SELL + score)

### Step 4 — Chat with Documents
Go to **AI Chat** and ask questions like:
- *"What are the major risk factors?"*
- *"Summarise Q4 earnings."*
- *"How much long-term debt does the company have?"*
- *"What changed compared to last year?"*

Every answer includes **source citations** (filename + page number).

### Step 5 — Compare Companies
Create two sessions, upload documents for each company, then go to **Compare** to get a side-by-side analysis.

---

## ⚙️ Configuration

Edit `backend/.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | — | **Required** for Gemini LLM |
| `OPENAI_API_KEY` | — | Required for GPT-4o fallback |
| `LLM_PROVIDER` | `gemini` | Primary provider: `gemini` or `openai` |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model name |
| `OPENAI_MODEL` | `gpt-4o` | OpenAI model name |
| `CHUNK_SIZE` | `1000` | PDF chunk size in characters |
| `CHUNK_OVERLAP` | `200` | Overlap between chunks |
| `RETRIEVAL_TOP_K` | `6` | Top chunks retrieved per query |

---

## 📄 Sample Public Documents

You can test with these publicly available financial documents:

| Company | Document | Link |
|---------|----------|------|
| Tesla | 2023 Annual Report | [SEC EDGAR](https://ir.tesla.com/sec-filings/annual-reports) |
| Apple | 2023 10-K | [SEC EDGAR](https://investor.apple.com/sec-filings/annual-reports) |
| Microsoft | 2023 Annual Report | [Microsoft IR](https://www.microsoft.com/en-us/investor) |
| Alphabet | 2023 10-K | [SEC EDGAR](https://abc.xyz/investor/) |

---

## 🛠️ API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/sessions` | List all sessions |
| `POST` | `/api/sessions` | Create session |
| `DELETE` | `/api/sessions/{id}` | Delete session |
| `POST` | `/api/sessions/{id}/upload` | Upload PDF |
| `POST` | `/api/chat` | Chat (streaming SSE or JSON) |
| `DELETE` | `/api/chat/{id}/history` | Clear chat history |
| `POST` | `/api/analyze` | Generate full analysis |
| `POST` | `/api/compare` | Compare two sessions |
| `POST` | `/api/settings/provider` | Switch LLM provider |

Full Swagger docs: `http://localhost:8000/api/docs`

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS, shadcn/ui, Framer Motion |
| Backend | FastAPI, Python 3.11, Uvicorn |
| LLM (Primary) | Google Gemini 2.5 Flash |
| LLM (Fallback) | OpenAI GPT-4o |
| Embeddings | Google `text-embedding-004` / OpenAI `text-embedding-3-small` |
| RAG | LangChain |
| Vector DB | ChromaDB (persistent) |
| PDF Parsing | PyMuPDF + pdfplumber |
| Containerisation | Docker + Docker Compose |

---

## 📜 License

MIT — use freely for personal and commercial projects.
