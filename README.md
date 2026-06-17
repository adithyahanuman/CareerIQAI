# CareerIQ AI 🚀

> An AI-powered career intelligence platform for students — analyze your resume, get a personalized career roadmap, and benchmark yourself against your peers.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Resume Analysis** | Upload your resume and get instant AI-powered feedback — scores, strengths, skills gaps, and improvement tips |
| **Career Roadmap** | AI generates a personalized step-by-step career roadmap based on your resume and target role |
| **Benchmarking** | Compare your resume scores against all other students in the database; see your rank for every role |
| **Role Fit Scoring** | Get fit scores and grades for multiple job roles (Software Engineer, Data Analyst, etc.) matched to your branch |
| **Detailed Role Analysis** | Each role card shows readiness score, growth potential, required skills, missing competencies, and recommended certifications |
| **Smart Cache** | AI is only re-run when your resume actually changes (SHA-256 hash comparison) — fast and cost-efficient |
| **Auth & Onboarding** | Firebase Authentication with a guided onboarding flow to collect student details |

---

## 🛠️ Tech Stack

**Frontend**
- Vanilla HTML, CSS, JavaScript (no framework)
- Firebase Authentication (client-side)
- Hosted via `live-server`

**Backend**
- Node.js + Express REST API
- CockroachDB Serverless (PostgreSQL-compatible) via `pg`
- Firebase Admin SDK for user verification
- Google Gemini API (primary AI) with automatic failover to Grok (xAI)

---

## 📁 Project Structure

```
careeriqai/
├── backend/
│   ├── server.js               # Express entry point
│   ├── .env.example            # Environment variable template
│   ├── scripts/                # Admin & maintenance utilities
│   │   ├── provisionAdmin.js   # Create admin account
│   │   ├── wipeResumes.js      # Delete all resumes
│   │   ├── wipeAllData.js      # Wipe all student data
│   │   ├── wipeAdminData.js    # Wipe admin records
│   │   ├── wipeFirebase.js     # Remove Firebase users
│   │   ├── wipeEverything.js   # Nuclear wipe
│   │   └── wipeEverythingExceptAdminAccount.js
│   └── src/
│       ├── ai/                 # AI prompt builders & role lists
│       ├── config/             # DB & Firebase config
│       ├── controllers/        # Route handler logic
│       ├── db/                 # Migrations & DB helpers
│       ├── middleware/         # Auth middleware
│       ├── routes/             # API route definitions
│       ├── services/           # Business logic (resume, benchmark, career, student)
│       └── utils/              # Shared helper functions
│
└── frontend/
    └── public/
        ├── index.html          # Landing page
        ├── auth/               # Login & signup pages
        ├── onboarding/         # Student onboarding flow
        ├── admin/              # Admin panel
        └── dashboard/
            ├── index.html      # Main dashboard shell
            ├── dashboard.js    # Tab routing & sidebar logic
            └── tabs/
                ├── home/               # Home tab
                ├── resume-analysis/    # Resume upload & analysis
                ├── career-roadmap/     # AI career roadmap
                ├── benchmarking/       # Peer benchmarking & role ranking
                └── settings/           # User settings
```

---

## ⚙️ Setup & Local Development

### Prerequisites
- Node.js ≥ 18
- PostgreSQL running locally
- Firebase project (for Auth)
- Google Gemini API key

### 1. Clone the repo
```bash
git clone https://github.com/adithyahanuman/Career-IQ-AI.git
cd Career-IQ-AI
```

### 2. Set up the backend
```bash
cd backend
npm install
cp .env.example .env
# Fill in your DB credentials, Firebase project ID, and Gemini API key in .env
npm run migrate        # Create DB tables
npm run dev            # Start backend on http://localhost:5000
```

### 3. Start the frontend
```bash
cd frontend
npm install
npm run dev            # Start frontend on http://localhost:5500
```

### 4. Or run both together from the root
```bash
npm install
npm run dev            # Runs backend + frontend concurrently
```

---

## 🔑 Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable | Description |
|---|---|
| `PORT` | Backend port (default: `5000`) |
| `DB_HOST / DB_NAME / DB_USER / DB_PASSWORD` | PostgreSQL connection details |
| `FIREBASE_PROJECT_ID` | Your Firebase project ID |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GROK_API_KEY` | (Optional) xAI Grok key for AI failover |
| `ALLOWED_ORIGINS` | CORS allowed origins (e.g. `http://localhost:5500`) |

---

## 📡 API Routes

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new student |
| `GET` | `/api/students/me` | Get current student profile |
| `POST` | `/api/resumes/upload` | Upload & analyze a resume |
| `GET` | `/api/resumes/my` | Get current student's resume |
| `GET` | `/api/benchmark/my-role-fit` | Get AI role fit scores for current resume |
| `GET` | `/api/benchmark/status` | Poll background benchmarking job status |
| `POST` | `/api/benchmark/refresh` | Force re-run AI benchmarking |
| `GET` | `/api/career/roadmap` | Get AI-generated career roadmap |

---

## 🔒 Security Notes

- `.env` and `serviceAccountKey.json` are **gitignored** and must **never** be committed
- All protected API routes require a valid Firebase ID token in the `Authorization` header
- The backend verifies every token using Firebase Admin SDK before processing requests
