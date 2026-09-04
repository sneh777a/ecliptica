from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.routers import auth, goals
from app.database import engine, Base
from app.models.user import User
from app.models.goal import Goal, Task

app = FastAPI(title="Ecliptica API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://ecliptica-eight.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Safe schema update for existing Render/Neon databases.
        # create_all() does not add newly introduced columns to an existing table.
        await conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description VARCHAR DEFAULT ''"))
        await conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'TODO' NOT NULL"))
        await conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR DEFAULT 'MEDIUM' NOT NULL"))
        await conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))


app.include_router(auth.router)
app.include_router(goals.router)


@app.get("/")
async def root():
    return {"message": "Ecliptica Backend is running!"}
