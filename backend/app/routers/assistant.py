from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
import google.generativeai as genai

from app.config import settings
from app.models.user import User
from app.utils.deps import get_current_user

router = APIRouter(prefix="/assistant", tags=["Assistant"])

SYSTEM_PROMPT = """You are Ecliptica AI — a personal productivity and study coach inside the Ecliptica app.

Your job:
- Help the user plan goals, exams, study, health, and daily work.
- Estimate realistic time based on what they already have (syllabus, notes, past papers, free hours).
- Break big goals into day-by-day plans with morning/afternoon blocks when useful.
- Be concrete and practical, not vague motivational talk.
- End with ONE clear next-step question (e.g. start Unit I concepts or practice problems?).
- Do not force numbered multiple-choice options unless the user asks for options.
- Keep answers structured with short headings and bullets so they are easy to scan.
- If the user pastes a message (class time, deadline, WhatsApp), extract the task and suggest when to schedule it.
- Stay supportive and calm; match a dark, focused "personal OS" product tone.

When they ask for a daily plan, output days clearly (Day 1, Day 2, …) with topics and focus actions."""


class ChatMessage(BaseModel):
    role: str = Field(..., description="user or assistant")
    text: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []


class ChatResponse(BaseModel):
    reply: str


def _build_model():
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY is not configured on the server",
        )
    genai.configure(api_key=settings.GEMINI_API_KEY)
    # Fast, cheap model suitable for chat planning
    return genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        system_instruction=SYSTEM_PROMPT,
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    message = (body.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    model = _build_model()

    # Convert short history for Gemini chat format
    history = []
    for item in body.history or []:
        role = (item.role or "").lower()
        text = (item.text or "").strip()
        if not text:
            continue
        if role == "user":
            history.append({"role": "user", "parts": [text]})
        elif role == "assistant":
            history.append({"role": "model", "parts": [text]})

    # Keep history short to control cost/latency
    history = history[-12:]

    try:
        chat_session = model.start_chat(history=history)
        result = chat_session.send_message(message)
        reply = (getattr(result, "text", None) or "").strip()
        if not reply:
            reply = "I could not generate a reply. Please try again."
        return ChatResponse(reply=reply)
    except HTTPException:
        raise
    except Exception as e:
        # Surface a safe message; full error stays in server logs
        raise HTTPException(
            status_code=502,
            detail=f"Gemini request failed: {str(e)[:200]}",
        ) from e
