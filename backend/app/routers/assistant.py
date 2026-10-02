import json
import re
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

SYSTEM_PROMPT = """You are Ecliptica AI — the user's personal operating system coach inside the Ecliptica app.

You ALWAYS receive a live snapshot of their data (goals, steps, today's tasks). Use it.
- Refer to their real goals by name when relevant.
- Do not invent goals they already have; improve or extend them.
- Be concrete: time estimates, day-by-day plans, next actions.
- End with ONE clear next-step question when helpful.
- Do not force multiple-choice options unless they ask.
- Tone: calm, focused, premium personal OS — not hype.

When the user wants you to CREATE or UPDATE data in the app, you MUST also output an actions block
AFTER your normal reply. The app will execute it.

Format (exact):

<<<ACTIONS
[
  {"action": "create_goal", "title": "Complete TOC course", "type": "year", "deadline": "2026-12-31"},
  {"action": "add_step", "goal_title": "Complete TOC course", "text": "Finish automata unit"},
  {"action": "add_step", "goal_title": "Complete TOC course", "text": "Practice past 3 years papers"},
  {"action": "create_task", "text": "Study TOC 2 hours", "date": "2026-10-02", "time": "09:00"}
]
ACTIONS>>>

Rules for actions:
- type for create_goal: year | monthly | weekly
- Only include the ACTIONS block when the user clearly wants something saved (e.g. "add this goal", "create the plan in my app", "save these steps").
- If they only ask for advice, do NOT output ACTIONS.
- goal_title in add_step must match an existing goal title OR a create_goal title in the same list.
- Keep titles short and clear.
- date format YYYY-MM-DD when used.
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

    lines: List[str] = [
        f"User name: {user.name}",
        f"User email: {user.email}",
        "",
        "=== GOALS ===",
    ]

    if not goals:
        lines.append("(no goals yet)")
    else:
        for g in goals:
            lines.append(
                f"- [{g.type}] {g.title} | progress {g.progress}% "
                f"({g.completed_count}/{g.target_count}) deadline={g.deadline or 'none'}"
            )
            steps = [t for t in (g.tasks or []) if t.type == "step" or t.goal_id == g.id]
            if steps:
                for s in steps:
                    mark = "done" if s.done else "todo"
                    lines.append(f"    step [{mark}]: {s.text}")
            else:
                lines.append("    (no steps yet)")

    lines.append("")
    lines.append("=== RECENT TASKS (not only steps) ===")
    plain = [t for t in tasks if t.type != "step"]
    if not plain:
        lines.append("(no standalone tasks)")
    else:
        for t in plain[:25]:
            mark = "done" if t.done else "todo"
            lines.append(
                f"- [{mark}] {t.text} | type={t.type} date={t.date or '-'} time={t.time or '-'}"
            )

    lines.append("")
    lines.append("=== OTHER MODULES ===")
    lines.append("Health & Finance: UI only for now (no server data yet).")

    return "\n".join(lines)


def _split_actions(raw: str) -> tuple[str, List[Dict[str, Any]]]:
    """Extract <<<ACTIONS ... ACTIONS>>> JSON; return (visible_reply, actions)."""
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
    # Allow accidental markdown fences
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


async def _apply_actions(
    db: AsyncSession,
    user: User,
    actions: List[Dict[str, Any]],
) -> List[str]:
    applied: List[str] = []
    # Map title -> goal id for steps created in same batch
    title_to_id: Dict[str, int] = {}

    # Preload existing goals by title (case-insensitive)
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
                gtype = "monthly"
            deadline = str(act.get("deadline") or "").strip()

            # Avoid exact duplicate titles
            key = title.lower()
            if key in title_to_id:
                applied.append(f"Goal already exists: {title}")
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
            if resolved_id is None and goal_title:
                resolved_id = title_to_id.get(goal_title.lower())

            if resolved_id is None:
                applied.append(f"Could not attach step (goal not found): {text}")
                continue

            # Verify ownership
            gres = await db.execute(
                select(Goal).where(Goal.id == resolved_id, Goal.user_id == user.id)
            )
            goal = gres.scalars().first()
            if not goal:
                applied.append(f"Could not attach step (goal missing): {text}")
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

            # Recalc progress
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

            applied.append(f"Added step to «{goal.title}»: {text}")

        elif kind == "create_task":
            text = str(act.get("text") or "").strip()
            if not text:
                continue
            date_str = str(act.get("date") or "").strip() or None
            time_str = str(act.get("time") or "").strip()
            parsed_date = None
            if date_str:
                try:
                    from datetime import date as date_cls

                    parsed_date = date_cls.fromisoformat(date_str)
                except ValueError:
                    parsed_date = None

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
            applied.append(f"Created task: {text}")

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
            history.append({"role": "model", "parts": [text]})
    history = history[-12:]

    # Inject live app data with the user message
    augmented = (
        "[ECLIPTICA LIVE DATA — trust this over assumptions]\n"
        f"{context}\n\n"
        f"[USER MESSAGE]\n{message}"
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
            reply = "Done." if applied else "I could not generate a reply. Please try again."

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
