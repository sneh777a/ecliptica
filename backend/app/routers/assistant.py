import json
import re
from datetime import date as date_cls, datetime
from typing import Any, Dict, List, Optional

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

SYSTEM_PROMPT = """You are Ecliptica AI — a warm, practical personal coach inside the user's life app.

LANGUAGE
- Understand natural, messy, informal English (and mixed styles). Typos, short messages, and casual talk are fine.
- Examples you should understand without special commands:
  · "exam next week toc help"
  · "i keep forgetting water can u track that somehow"
  · "put this in my goals"
  · "yeah save it"
  · "make me a plan and add it"
  · "i need to finish react this month"
- Infer intent from context + chat history. Do not require rigid phrases like "create_goal" or "add step".
- Reply in clear, friendly language. Avoid sounding like a form or a robot.

APP DATA
- You always get a live snapshot of their goals, steps, and tasks. Use real names and progress.
- Don't invent goals they already have; build on them.
- Health & Finance may be empty on the server — say so honestly if asked.

WHEN TO SAVE THINGS INTO THE APP
Save (emit ACTIONS) when their intent is to keep something in Ecliptica, even if worded casually, e.g.:
- "add / save / track / put this in goals / set this up / remember this / plan it for me in the app"
- "I want a goal for…" / "help me organize TOC in the app"
- After you propose a plan, if they say "yes", "ok do it", "save", "go ahead", "add those steps"

Do NOT save when they only want ideas or explanation ("how should I study?", "what is NFA?").
If unsure whether to save, ask one short question — unless they already said yes to a plan you offered.

HOW TO SAVE (hidden from the user — app executes this)
After your normal human reply, append exactly:

<<<ACTIONS
[ ...json array... ]
ACTIONS>>>

Allowed actions:
1) create_goal — {"action":"create_goal","title":"...","type":"year|monthly|weekly","deadline":"YYYY-MM-DD or empty","description":"optional"}
2) add_step — {"action":"add_step","goal_title":"exact or close goal title","text":"step text"}
3) create_task — {"action":"create_task","text":"...","date":"YYYY-MM-DD","time":"optional HH:MM or 9am"}

Guidelines:
- Pick type from time horizon: year ≈ long course/career; monthly ≈ this month exam/sprint; weekly ≈ this week focus.
- Prefer a few solid steps (3–7) over a huge list unless they ask for detail.
- goal_title for add_step should match a goal you just created or one in their live data.
- Never put the ACTIONS block in the middle of the reply; always at the end.
- The user should not need to know this format exists.

REPLY STYLE
- Concrete plans, short headings, bullets when useful.
- One clear next question when it helps.
- No forced A/B/C choices unless they ask for options.
"""


class ChatMessage(BaseModel):
    role: str = Field(..., description="user or assistant")
    text: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []


class ChatResponse(BaseModel):
    reply: str
    actions_applied: List[str] = []


def _build_model():
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY is not configured on the server",
        )
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel(
        model_name="gemini-3.8-flash",
        system_instruction=SYSTEM_PROMPT,
    )


async def _user_context(db: AsyncSession, user: User) -> str:
    goals_result = await db.execute(
        select(Goal)
        .where(Goal.user_id == user.id)
        .options(selectinload(Goal.tasks))
        .order_by(Goal.id.desc())
    )
    goals = goals_result.scalars().all()

    tasks_result = await db.execute(
        select(Task).where(Task.user_id == user.id).order_by(Task.id.desc()).limit(40)
    )
    tasks = tasks_result.scalars().all()

    today = date_cls.today().isoformat()
    lines: List[str] = [
        f"Today's date: {today}",
        f"User name: {user.name}",
        "",
        "=== GOALS (live) ===",
    ]

    if not goals:
        lines.append("(no goals yet — you can create some when they want that)")
    else:
        for g in goals:
            lines.append(
                f"- [{g.type}] «{g.title}» | progress {g.progress}% "
                f"({g.completed_count}/{g.target_count} steps) deadline={g.deadline or 'none'}"
            )
            steps = [t for t in (g.tasks or []) if t.type == "step" or t.goal_id == g.id]
            if steps:
                for s in steps:
                    mark = "done" if s.done else "todo"
                    lines.append(f"    step [{mark}]: {s.text}")
            else:
                lines.append("    (no steps yet)")

    lines.append("")
    lines.append("=== TASKS (live, non-step) ===")
    plain = [t for t in tasks if t.type != "step"]
    if not plain:
        lines.append("(none)")
    else:
        for t in plain[:25]:
            mark = "done" if t.done else "todo"
            lines.append(
                f"- [{mark}] {t.text} | date={t.date or '-'} time={t.time or '-'}"
            )

    lines.append("")
    lines.append("Health & Finance: no server data yet (UI only).")
    return "\n".join(lines)


def _split_actions(raw: str) -> tuple[str, List[Dict[str, Any]]]:
    if not raw:
        return "", []

    pattern = re.compile(
        r"<<<ACTIONS\s*([\s\S]*?)\s*ACTIONS>>>",
        re.IGNORECASE,
    )
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


def _resolve_goal_id(title_to_id: Dict[str, int], goal_title: str) -> Optional[int]:
    """Exact match, then substring / contains match for natural titles."""
    if not goal_title:
        return None
    key = goal_title.strip().lower()
    if key in title_to_id:
        return title_to_id[key]
    # partial: user/model said shorter or longer name
    for stored, gid in title_to_id.items():
        if key in stored or stored in key:
            return gid
    return None


def _parse_date(value: Optional[str]) -> Optional[date_cls]:
    if not value:
        return None
    value = str(value).strip()
    try:
        return date_cls.fromisoformat(value[:10])
    except ValueError:
        return None


async def _apply_actions(
    db: AsyncSession,
    user: User,
    actions: List[Dict[str, Any]],
) -> List[str]:
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
            gtype = str(act.get("type") or "monthly").strip().lower()
            if gtype not in ("year", "monthly", "weekly"):
                # natural synonyms
                if gtype in ("yearly", "annual", "long", "long-term"):
                    gtype = "year"
                elif gtype in ("month", "this month"):
                    gtype = "monthly"
                elif gtype in ("week", "this week"):
                    gtype = "weekly"
                else:
                    gtype = "monthly"
            deadline = str(act.get("deadline") or "").strip()

            key = title.lower()
            if key in title_to_id:
                applied.append(f"Already had goal: {title}")
                continue

            goal = Goal(
                user_id=user.id,
                title=title,
                description=str(act.get("description") or ""),
                type=gtype,
                target_count=0,
                completed_count=0,
                progress=0.0,
                deadline=deadline,
            )
            db.add(goal)
            await db.commit()
            await db.refresh(goal)
            title_to_id[key] = goal.id
            applied.append(f"Created {gtype} goal: {title}")

        elif kind == "add_step":
            text = str(act.get("text") or "").strip()
            goal_title = str(act.get("goal_title") or "").strip()
            goal_id = act.get("goal_id")
            if not text:
                continue

            resolved_id: Optional[int] = None
            if goal_id is not None:
                try:
                    resolved_id = int(goal_id)
                except (TypeError, ValueError):
                    resolved_id = None
            if resolved_id is None:
                resolved_id = _resolve_goal_id(title_to_id, goal_title)

            if resolved_id is None:
                applied.append(f"Could not find goal for step: {text}")
                continue

            gres = await db.execute(
                select(Goal).where(Goal.id == resolved_id, Goal.user_id == user.id)
            )
            goal = gres.scalars().first()
            if not goal:
                applied.append(f"Could not find goal for step: {text}")
                continue

            step = Task(
                user_id=user.id,
                goal_id=goal.id,
                text=text,
                time="",
                date=None,
                type="step",
                done=False,
            )
            db.add(step)
            await db.commit()

            g2 = await db.execute(
                select(Goal)
                .where(Goal.id == goal.id)
                .options(selectinload(Goal.tasks))
            )
            goal = g2.scalars().first()
            if goal:
                steps = goal.tasks or []
                total = len(steps)
                completed = len([t for t in steps if t.done])
                goal.completed_count = completed
                goal.target_count = total
                goal.progress = round((completed / total) * 100, 1) if total else 0.0
                await db.commit()

            applied.append(f"Added step on «{goal.title}»: {text}")

        elif kind == "create_task":
            text = str(act.get("text") or "").strip()
            if not text:
                continue
            parsed_date = _parse_date(act.get("date"))
            time_str = str(act.get("time") or "").strip()

            task = Task(
                user_id=user.id,
                goal_id=None,
                text=text,
                time=time_str,
                date=parsed_date,
                type="daily",
                done=False,
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
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    context = await _user_context(db, current_user)
    model = _build_model()

    history = []
    for item in body.history or []:
        role = (item.role or "").lower()
        text = (item.text or "").strip()
        if not text:
            continue
        if role == "user":
            history.append({"role": "user", "parts": [text]})
        elif role == "assistant":
            # Don't feed previous action receipts back as model text noise
            cleaned = re.sub(r"\n—\n[\s\S]*$", "", text).strip()
            if cleaned:
                history.append({"role": "model", "parts": [cleaned]})
    history = history[-12:]

    augmented = (
        "[LIVE APP DATA — prefer this over guesses]\n"
        f"{context}\n\n"
        f"[USER SAID — interpret naturally]\n{message}"
    )

    try:
        chat_session = model.start_chat(history=history)
        result = chat_session.send_message(augmented)
        raw = (getattr(result, "text", None) or "").strip()
        if not raw:
            return ChatResponse(
                reply="I could not generate a reply. Please try again.",
                actions_applied=[],
            )

        reply, actions = _split_actions(raw)
        applied: List[str] = []
        if actions:
            applied = await _apply_actions(db, current_user, actions)

        if not reply:
            reply = (
                "Got it — I updated your app."
                if applied
                else "I could not generate a reply. Please try again."
            )

        if applied:
            reply = reply + "\n\n—\n" + "\n".join(f"✓ {a}" for a in applied)

        return ChatResponse(reply=reply, actions_applied=applied)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini request failed: {str(e)[:200]}",
        ) from e
