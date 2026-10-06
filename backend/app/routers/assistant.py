import json
import re
import base64
from datetime import date as date_cls, timedelta
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
import google.generativeai as genai

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.goal import Goal, Task
from app.utils.deps import get_current_user

router = APIRouter(prefix="/assistant", tags=["Assistant"])

GEMINI_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
]

# Prefer these when an image is attached (vision)
GEMINI_VISION_MODELS = [
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash",
]

MAX_IMAGE_BYTES = 4 * 1024 * 1024  # 4 MB

SYSTEM_PROMPT = """You are Ecliptica AI — the same kind of capable assistant as Gemini, living inside the user's personal OS app.

You are NOT restricted to short formal answers. You can:
- Explain subjects in depth (exams, theory, code, life planning)
- Brainstorm freely
- Be casual, detailed, or structured depending on what they need
- Follow the conversation naturally with typos, short messages, and mixed language

You ALWAYS receive LIVE data from their Ecliptica account:
- Goals (yearly / monthly / weekly) with steps and progress
- Tasks (today, upcoming, done/todo)
- A dashboard-style summary (deadlines, open work)

Use that data. Refer to real goal titles and progress. Prefer facts from LIVE DATA over guesses.

MODULES STATUS (be honest):
- Goals + Tasks + Dashboard schedule: LIVE on the server — you can read and write.
- Health page: UI exists (habits, water) but is mostly local/browser for now — no server health rows yet. You can still coach habits and suggest routines.
- Finance page: UI placeholder only — no transactions on the server yet. You can still help budget plans and later save related goals/tasks.

WHEN YOU CAN CHANGE THE APP
If they want something stored (create a goal, add steps, schedule tasks), end your normal reply with an actions block the app will run:

<<<ACTIONS
[
  {"action":"create_goal","title":"...","type":"year|monthly|weekly","deadline":"YYYY-MM-DD","description":"optional"},
  {"action":"add_step","goal_title":"...","text":"..."},
  {"action":"create_task","text":"...","date":"YYYY-MM-DD","time":"optional"}
]
ACTIONS>>>

Rules for actions:
- Put ACTIONS only at the end, never in the middle of the answer.
- Prefer add_step / create_goal for study plans and multi-step work (so it shows under Goals).
- create_task is for dated daily items on the schedule.
- If a goal already exists with a similar name, extend it with add_step instead of duplicating.
- You may proactively offer to save a plan; if they agree (yes / ok / save / add / put in goals), emit ACTIONS.

IMAGES
When the user attaches an image (screenshot, syllabus, WhatsApp, notes, timetable):
- Read all visible text carefully
- Extract dates, times, tasks, class names, deadlines
- Summarize what matters for their schedule/goals
- Offer to save extracted items as goals/steps/tasks when useful

Talk like a full assistant: no artificial limits on length, topic depth, or tone — only stay helpful and grounded in their Ecliptica data when relevant.
"""

TOC_STEPS = [
    "DFA / NFA conversions & minimization",
    "Regular expressions & Pumping Lemma",
    "CFG derivations & ambiguity",
    "PDA design practice",
    "Turing machines & Halting Problem",
    "Closure properties table (memorize)",
    "Timed past-paper sprint",
]


class ChatMessage(BaseModel):
    role: str = Field(..., description="user or assistant")
    text: str


class ChatRequest(BaseModel):
    message: str = ""
    history: Optional[List[ChatMessage]] = []
    # Optional image (base64, no data: prefix) for vision / OCR
    image_base64: Optional[str] = None
    image_mime: Optional[str] = "image/jpeg"


class ChatResponse(BaseModel):
    reply: str
    actions_applied: List[str] = []


def _is_quota_error(err: Exception) -> bool:
    text = str(err).lower()
    return "429" in text or "quota" in text or "resource_exhausted" in text or "rate" in text


def _build_model(model_name: str):
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY is not configured on the server",
        )
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel(
        model_name=model_name,
        system_instruction=SYSTEM_PROMPT,
    )
