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
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
]

MAX_IMAGE_BYTES = 4 * 1024 * 1024
MAX_PDF_BYTES = 8 * 1024 * 1024
MAX_PDF_PAGES = 30
MAX_PDF_CHARS = 50000

SYSTEM_PROMPT = """You are Ecliptica AI — a capable assistant like Gemini inside the user's personal OS.
You receive LIVE goals, tasks, and schedule data. Use it. Prefer facts over guesses.
When the user wants something saved (goal/steps/tasks), end with:
<<<ACTIONS
[{"action":"create_goal","title":"...","type":"monthly","deadline":"YYYY-MM-DD"},
 {"action":"add_step","goal_title":"...","text":"..."},
 {"action":"create_task","text":"...","date":"YYYY-MM-DD"}]
ACTIONS>>>
"""


class ChatMessage(BaseModel):
    role: str = Field(..., description="user or assistant")
    text: str


class ChatRequest(BaseModel):
    message: str = ""
    history: Optional[List[ChatMessage]] = []
    image_base64: Optional[str] = None
    image_mime: Optional[str] = "image/jpeg"
    pdf_base64: Optional[str] = None
    file_base64: Optional[str] = None
    file_type: Optional[str] = None
    file_name: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    actions_applied: List[str] = []


def _is_quota_error(err: Exception) -> bool:
    t = str(err).lower()
    return "429" in t or "quota" in t or "resource_exhausted" in t or "rate" in t


def _build_model(model_name: str):
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured")
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel(model_name=model_name, system_instruction=SYSTEM_PROMPT)


def _decode_b64(raw: str) -> bytes:
    data = (raw or "").strip()
    if "," in data and data.lower().startswith("data:"):
        data = data.split(",", 1)[1]
    return base64.b64decode(data, validate=False)


def _extract_pdf_text(pdf_bytes: bytes) -> str:
    try:
        from io import BytesIO
        from pypdf import PdfReader
        reader = PdfReader(BytesIO(pdf_bytes))
        parts: List[str] = []
        for i, page in enumerate(reader.pages[:MAX_PDF_PAGES]):
            try:
                text = (page.extract_text() or "").strip()
            except Exception:
                text = ""
            if text:
                parts.append(f"--- page {i + 1} ---\n{text}")
        joined = "\n\n".join(parts).strip()
        if len(joined) > MAX_PDF_CHARS:
            joined = joined[:MAX_PDF_CHARS] + "\n\n[…truncated…]"
        return joined
    except Exception as e:
        return f"[PDF text extraction failed: {e}]"


def _split_actions(raw: str) -> tuple:
    if not raw:
        return "", []
    pattern = re.compile(r"<<<ACTIONS\s*([\s\S]*?)\s*ACTIONS>>>", re.IGNORECASE)
    match = pattern.search(raw)
    if not match:
        return raw.strip(), []
    reply = (raw[: match.start()] + raw[match.end() :]).strip()
    blob = match.group(1).strip()
    blob = re.sub(r"^```(?:json)?\s*", "", blob)
    blob = re.sub(r"\s*```$", "", blob)
    try:
        data = json.loads(blob)
        if isinstance(data, dict):
            data = [data]
        if not isinstance(data, list):
            return reply, []
        return reply, [a for a in data if isinstance(a, dict)]
    except json.JSONDecodeError:
        return reply or raw.strip(), []


def _parse_date(value: Optional[str]):
    if not value:
        return None
    try:
        return date_cls.fromisoformat(str(value).strip()[:10])
    except ValueError:
        return None


async def _user_context(db: AsyncSession, user: User) -> str:
    goals_result = await db.execute(
        select(Goal).where(Goal.user_id == user.id).options(selectinload(Goal.tasks)).order_by(Goal.id.desc())
    )
    goals = goals_result.scalars().all()
    tasks_result = await db.execute(
        select(Task).where(Task.user_id == user.id).order_by(Task.id.desc()).limit(50)
    )
    tasks = tasks_result.scalars().all()
    today = date_cls.today().isoformat()
    lines = [f"Today: {today}", f"User: {user.name} <{user.email}>", "", "=== GOALS ==="]
    if not goals:
        lines.append("(no goals yet)")
    else:
        for g in goals:
            lines.append(f"- [{g.type}] {g.title} | {g.progress}% deadline={g.deadline or 'none'}")
            for s in (g.tasks or []):
                if s.type == "step" or s.goal_id == g.id:
                    lines.append(f"    [{'done' if s.done else 'todo'}] {s.text}")
    lines.append("")
    lines.append("=== RECENT TASKS ===")
    plain = [t for t in tasks if t.type != "step"][:20]
    if not plain:
        lines.append("(none)")
    else:
        for t in plain:
            lines.append(f"- [{'done' if t.done else 'todo'}] {t.text} date={t.date or '-'}")
    return "\n".join(lines)


async def _apply_actions(db: AsyncSession, user: User, actions: List[Dict[str, Any]]) -> List[str]:
    applied: List[str] = []
    title_to_id: Dict[str, int] = {}
    existing = await db.execute(select(Goal).where(Goal.user_id == user.id))
    for g in existing.scalars().all():
        title_to_id[g.title.strip().lower()] = g.id
    for act in actions:
        kind = str(act.get("action") or "").strip().lower()
        if kind == "create_goal":
            title = str(act.get("title") or "").strip()
            if not title:
                continue
            key = title.lower()
            if key in title_to_id:
                applied.append(f"Already had goal: {title}")
                continue
            gtype = str(act.get("type") or "monthly").strip().lower()
            if gtype not in ("year", "monthly", "weekly"):
                gtype = "monthly"
            goal = Goal(
                user_id=user.id, title=title, description=str(act.get("description") or ""),
                type=gtype, target_count=0, completed_count=0, progress=0.0,
                deadline=str(act.get("deadline") or "").strip(),
            )
            db.add(goal)
            await db.commit()
            await db.refresh(goal)
            title_to_id[key] = goal.id
            applied.append(f"Created {gtype} goal: {title}")
        elif kind == "add_step":
            text = str(act.get("text") or "").strip()
            goal_title = str(act.get("goal_title") or "").strip().lower()
            if not text:
                continue
            gid = title_to_id.get(goal_title)
            if gid is None:
                for k, v in title_to_id.items():
                    if goal_title in k or k in goal_title:
                        gid = v
                        break
            if gid is None:
                applied.append(f"Could not find goal for step: {text}")
                continue
            step = Task(user_id=user.id, goal_id=gid, text=text, time="", date=None, type="step", done=False)
            db.add(step)
            await db.commit()
            applied.append(f"Added step: {text}")
        elif kind == "create_task":
            text = str(act.get("text") or "").strip()
            if not text:
                continue
            task = Task(
                user_id=user.id, goal_id=None, text=text,
                time=str(act.get("time") or "").strip(),
                date=_parse_date(act.get("date")), type="daily", done=False,
            )
            db.add(task)
            await db.commit()
            applied.append(f"Added task: {text}")
    return applied


@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    message = (body.message or "").strip()
    image_b64 = (body.image_base64 or "").strip()
    pdf_b64 = (body.pdf_base64 or "").strip()
    file_b64 = (body.file_base64 or "").strip()

    if not message and not image_b64 and not pdf_b64 and not file_b64:
        raise HTTPException(status_code=400, detail="Message or attachment is required")

    if (image_b64 or pdf_b64 or file_b64) and not message:
        message = "Please read the attached file. Extract text, dates, tasks, deadlines. Offer to save useful items to my goals."

    context = await _user_context(db, current_user)
    pdf_text = ""
    if pdf_b64:
        try:
            pdf_bytes = _decode_b64(pdf_b64)
            if len(pdf_bytes) <= MAX_PDF_BYTES:
                pdf_text = _extract_pdf_text(pdf_bytes)
        except Exception:
            pdf_text = "[PDF could not be read]"

    augmented = f"[LIVE DATA]\n{context}\n\n[USER]\n{message}"
    if pdf_text:
        augmented += f"\n\n[PDF TEXT]\n{pdf_text}"

    history = []
    for item in (body.history or [])[-12:]:
        role = (item.role or "").lower()
        text_h = (item.text or "").strip()
        if not text_h:
            continue
        if role == "user":
            history.append({"role": "user", "parts": [text_h]})
        elif role in ("assistant", "model"):
            history.append({"role": "model", "parts": [text_h]})

    raw = ""
    last_err = None
    image_bytes = None
    image_mime = (body.image_mime or "image/jpeg").strip()
    if image_b64:
        try:
            image_bytes = _decode_b64(image_b64)
            if len(image_bytes) > MAX_IMAGE_BYTES:
                image_bytes = None
        except Exception:
            image_bytes = None

    for model_name in GEMINI_MODELS:
        try:
            model = _build_model(model_name)
            chat_session = model.start_chat(history=history)
            if image_bytes:
                result = chat_session.send_message([augmented, {"mime_type": image_mime, "data": image_bytes}])
            else:
                result = chat_session.send_message(augmented)
            raw = (getattr(result, "text", None) or "").strip()
            if raw:
                break
        except Exception as e:
            last_err = e
            if not _is_quota_error(e):
                continue
            continue

    if not raw:
        if last_err and _is_quota_error(last_err):
            raise HTTPException(status_code=429, detail="Gemini quota used up for today. Try again later.")
        raise HTTPException(status_code=502, detail=f"AI request failed: {str(last_err)[:200] if last_err else 'empty'}")

    reply, actions = _split_actions(raw)
    applied: List[str] = []
    if actions:
        applied = await _apply_actions(db, current_user, actions)
    if not reply:
        reply = "Got it — I updated your app." if applied else "I could not generate a reply. Please try again."
    if applied:
        reply = reply + "\n\n—\n" + "\n".join(f"✓ {a}" for a in applied)
    return ChatResponse(reply=reply, actions_applied=applied)
