# AI Email Assistant

An AI-driven email management system that uses sentiment analysis and NLP to classify, prioritize, summarize, and assist in responding to emails automatically.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, Tailwind CSS, Recharts |
| Backend | Python 3.11, FastAPI, SQLAlchemy, Alembic |
| Database | PostgreSQL 15 |
| Cache | Redis |
| AI/ML | OpenAI GPT-4o-mini, VADER Sentiment, Transformers |

## Features

- **Email Integration** – Gmail & Outlook via IMAP/OAuth2
- **Sentiment Analysis** – Positive / Neutral / Negative detection (VADER)
- **Emotion Detection** – Anger, Frustration, Satisfaction, Concern, Urgency
- **Email Classification** – Complaint, Support, Sales, Refund, Invoice, Feedback
- **Priority Assignment** – Critical, High, Medium, Low
- **AI Summary** – GPT-generated concise summaries
- **Reply Suggestions** – AI-drafted professional responses
- **Auto-Routing** – Route to Support, Finance, HR, Sales teams
- **Dashboard** – Charts for sentiment trends, priority, categories
- **Notifications** – Real-time WebSocket alerts for urgent emails

## Project Structure

```
ai-email-assistant/
├── backend/                  # FastAPI Python backend
│   ├── app/
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── routers/          # API route handlers
│   │   ├── services/         # Business logic & AI services
│   │   └── utils/            # Shared utilities
│   ├── alembic/              # Database migrations
│   └── requirements.txt
├── frontend/                 # Next.js React frontend
│   └── src/
│       ├── app/              # Next.js App Router pages
│       ├── components/       # Reusable UI components
│       ├── hooks/            # Custom React hooks
│       ├── lib/              # API client & utilities
│       ├── store/            # Zustand global state
│       └── types/            # TypeScript type definitions
├── database/
│   └── init.sql              # Initial DB schema
└── docker-compose.yml
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.11+
- OpenAI API Key

### 1. Clone & Configure

```bash
git clone <repo-url>
cd ai-email-assistant
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials
```

### 2. Start with Docker Compose

```bash
docker-compose up -d
```

Services will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### 3. Manual Setup (Development)

**Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

See `backend/.env.example` for all required variables.

Key variables:
- `DATABASE_URL` – PostgreSQL connection string
- `OPENAI_API_KEY` – OpenAI API key for AI features
- `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` – Google OAuth
- `OUTLOOK_CLIENT_ID` / `OUTLOOK_CLIENT_SECRET` – Microsoft OAuth
- `SECRET_KEY` – JWT signing key

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/emails` | List emails with filters |
| GET | `/api/emails/{id}` | Get email details |
| POST | `/api/emails/{id}/analyze` | Trigger AI analysis |
| GET | `/api/dashboard/stats` | Dashboard statistics |
| GET | `/api/dashboard/trends` | Sentiment trends |
| POST | `/api/integrations/gmail/connect` | Connect Gmail |
| POST | `/api/integrations/outlook/connect` | Connect Outlook |
| WS | `/ws/notifications` | Real-time notifications |
