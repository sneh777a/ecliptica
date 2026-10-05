import json
import re
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

# Free tier: Flash-Lite has much higher daily quota than full Flash models.
GEMINI_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
]

SYSTEM_PROMPT = """You are Ecliptica AI — a warm, practical personal coach inside the user's life app.

LANGUAGE
- Understand natural, messy, informal English. Typos and short notes are fine.
- Infer intent from context + chat history. No rigid command words required.

APP DATA
- You always get a live snapshot of goals, steps, and tasks. Use real names.
- Don't invent goals they already have; extend them.

WHEN TO SAVE
Emit ACTIONS when they want something kept in the app, e.g. "put this in my goals",
"save that plan", "ok do it", "add those steps", "track this".
Do NOT save for pure advice questions.

WHERE TO SAVE (important)
- If they say goals / goal / milestones / path / steps / "in my goals" → use create_goal + add_step.
  Daily create_task alone will NOT show under Goals path.
- If a matching goal already exists (e.g. TOC Exam Prep), only add_step to that goal.
- If no goal exists, create_goal (usually type monthly for exams) then add_step for each study block.
- Use create_task only for one-off calendar to-dos when they ask for a schedule on specific days
  AND also still add_step if they asked to put it in goals.

HOW TO SAVE (append at end of reply only)
<<<ACTIONS
[
  {"action":"create_goal","title":"TOC Exam Prep","type":"monthly","deadline":"2026-10-09"},
  {"action":"add_step","goal_title":"TOC Exam Prep","text":"DFA/NFA conversions & minimization"},
  {"action":"add_step","goal_title":"TOC Exam Prep","text":"Regular Pumping Lemma practice"}
]
ACTIONS>>>

Types: year | monthly | weekly
Keep 3–7 steps unless they ask for more.
goal_title must match an existing goal or one created in the same list.

REPLY STYLE
Friendly, concrete, short bullets. One next question when helpful.
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
    message: str
    history: Optional[List[ChatMessage]] = []


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
        lines.append("(no goals yet)")
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
    if not goal_title:
        return None
    key = goal_title.strip().lower()
    if key in title_to_id:
        return title_to_id[key]
    for stored, gid in title_to_id.items():
        if key in stored or stored in key:
            return gid
    key_tokens = set(key.replace("-", " ").split())
    best_id = None
    best_score = 0
    for stored, gid in title_to_id.items():
        tokens = set(stored.replace("-", " ").split())
        score = len(key_tokens & tokens)
        if score > best_score and score >= 1:
            best_score = score
            best_id = gid
    return best_id


def _parse_date(value: Optional[str]) -> Optional[date_cls]:
    if not value:
        return None
    value = str(value).strip()
    try:
        return date_cls.fromisoformat(value[:10])
    except ValueError:
        return None


def _wants_save(text: str) -> bool:
    t = text.lower()
    keys = [
        "add",
        "save",
        "put",
        "create",
        "track",
        "in my goal",
        "in my goals",
        "my gole",
        "my goal",
        "set up",
        "setup",
    ]
    return any(k in t for k in keys)


def _offline_plan(
    message: str,
    history: List[ChatMessage],
) -> Optional[Tuple[str, List[Dict[str, Any]]]]:
    """Simple rule-based helper when Gemini quota is exhausted."""
    blob = " ".join(
        [(m.text or "") for m in (history or [])] + [message]
    ).lower()

    # TOC / theory of computation exam path
    toc = any(
        x in blob
        for x in (
            "toc",
            "theory of computation",
            "automata",
            "dfa",
            "turing",
        )
    )
    examish = any(x in blob for x in ("exam", "paper", "test", "midterm"))
    save = _wants_save(message) or _wants_save(blob)

    if toc and (examish or save or "plan" in blob):
        deadline = (date_cls.today() + timedelta(days=7)).isoformat()
        title = "TOC Exam Prep"
        actions: List[Dict[str, Any]] = []
        if save or "goal" in blob or "gole" in blob:
            actions.append(
                {
                    "action": "create_goal",
                    "title": title,
                    "type": "monthly",
                    "deadline": deadline,
                }
            )
            for step in TOC_STEPS:
                actions.append(
                    {
                        "action": "add_step",
                        "goal_title": title,
                        "text": step,
                    }
                )
            reply = (
                "Gemini free quota is temporarily full, so I used the built-in TOC crash plan.\n\n"
                f"I’ll keep **{title}** as a monthly goal (deadline ~{deadline}) with these steps:\n"
                + "\n".join(f"• {s}" for s in TOC_STEPS)
                + "\n\nOpen **Goals**, expand the goal, and check steps off as you go."
            )
            return reply, actions

        reply = (
            "Gemini free quota is temporarily full — here’s a TOC crash plan without AI:\n\n"
            + "\n".join(f"{i}. {s}" for i, s in enumerate(TOC_STEPS, 1))
            + "\n\nSay **add in my goals** and I’ll save these as goal steps even while AI quota is limited."
        )
        return reply, []

    if save and not toc:
        reply = (
            "Gemini free quota is full right now, so I can’t invent a custom plan.\n\n"
            "You can still:\n"
            "• Add a goal manually on the **Goals** page\n"
            "• Or say something like **TOC exam add in my goals** (built-in plan works offline)\n\n"
            "Quota usually resets around midnight Pacific time, or switch the Gemini key to a project with Flash-Lite."
        )
        return reply, []

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

    history_msgs = body.history or []
    history = []
    for item in history_msgs:
        role = (item.role or "").lower()
        text = (item.text or "").strip()
        if not text:
            continue
        if role == "user":
            history.append({"role": "user", "parts": [text]})
        elif role == "assistant":
            cleaned = re.sub(r"\n—\n[\s\S]*$", "", text).strip()
            if cleaned:
                history.append({"role": "model", "parts": [cleaned]})
    history = history[-12:]

    augmented = (
        "[LIVE APP DATA — prefer this over guesses]\n"
        f"{context}\n\n"
        f"[USER SAID — interpret naturally]\n{message}"
    )

    last_err: Optional[Exception] = None
    raw = ""

    for model_name in GEMINI_MODELS:
        try:
            model = _build_model(model_name)
            chat_session = model.start_chat(history=history)
            result = chat_session.send_message(augmented)
            raw = (getattr(result, "text", None) or "").strip()
            if raw:
                break
        except Exception as e:
            last_err = e
            if _is_quota_error(e):
                # try next model, then offline fallback
                continue
            # non-quota error: still try next model once, else fail
            continue

    if not raw:
        offline = _offline_plan(message, history_msgs)
        if offline:
            reply, actions = offline
            applied = await _apply_actions(db, current_user, actions) if actions else []
            if applied:
                reply = reply + "\n\n—\n" + "\n".join(f"✓ {a}" for a in applied)
            return ChatResponse(reply=reply, actions_applied=applied)

        if last_err and _is_quota_error(last_err):
            raise HTTPException(
                status_code=429,
                detail=(
                    "Gemini free quota is used up for today. "
                    "Try again after midnight Pacific time, or create a new Google AI Studio "
                    "project and set GEMINI_API_KEY on Render to a Flash-Lite key. "
                    "Meanwhile: use Goals page manually, or say ‘TOC exam add in my goals’ "
                    "for the built-in offline plan."
                ),
            )
        raise HTTPException(
            status_code=502,
            detail=f"Gemini request failed: {str(last_err)[:200] if last_err else 'empty reply'}",
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
