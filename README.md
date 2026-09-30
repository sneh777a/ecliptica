# Ecliptica

Personal OS — goals, schedule, health, finance, and assistant in one place.

**Live**

- Frontend: https://ecliptica-mu.vercel.app
- Backend: https://ecliptica-api.onrender.com
- Database: Neon (PostgreSQL)

---

## Repo structure

```
ecliptica/
├── backend/                 FastAPI API (Render)
│   ├── requirements.txt
│   └── app/
│       ├── main.py          App entry, CORS, startup
│       ├── config.py        Settings (JWT, mail, APP_URL)
│       ├── database.py      Async SQLAlchemy + Neon
│       ├── models/          User, Goal, Task
│       ├── routers/         auth, goals
│       ├── schemas/         Pydantic request/response
│       └── utils/           security, deps, email
└── frontend/                React + Vite (Vercel)
    ├── src/
    │   ├── api.js           Shared API_URL + error helper
    │   ├── App.jsx          Routes + auth guard
    │   ├── components/      Layout, AuthCosmos
    │   └── pages/           Login, Dashboard, Goals, …
    ├── vercel.json          SPA rewrites
    └── package.json
```

---

## Local backend

```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\Activate.ps1
source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env` (or export env vars):

```
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
SECRET_KEY=change-me
```

Run:

```bash
python -m uvicorn app.main:app --reload
```

API docs: http://127.0.0.1:8000/docs

---

## Local frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

API base URL is in `frontend/src/api.js` (`API_URL`).

---

## Feature status

| Area        | Status                                      |
| ----------- | ------------------------------------------- |
| Auth        | Register, login, JWT, forgot/reset password |
| Goals       | API + Goals page (main working module)      |
| Dashboard   | UI + goals/tasks data                       |
| Health      | UI only (local state)                       |
| Finance     | Placeholder                                 |
| Assistant   | UI only (no real AI yet)                    |

---

## Deploy notes

- **Render:** root directory `backend`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, set `DATABASE_URL`
- **Vercel:** root directory `frontend`
- Free Render instances sleep after idle; first request can take ~30–60s
