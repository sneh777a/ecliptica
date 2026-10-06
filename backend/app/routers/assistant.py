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

GEMINI_VISION_MODELS = [
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash",
]

MAX_IMAGE_BYTES = 4 * 1024 * 1024

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


async def _user_context(db: AsyncSession, user: User) -> str:
    goals_result = await db.execute(
        select(Goal)
        .where(Goal.user_id == user.id)
        .options(selectinload(Goal.tasks))
        .order_by(Goal.id.desc())
    )
    goals = goals_result.scalars().all()

    tasks_result = await db.execute(
        select(Task).where(Task.user_id == user.id).order_by(Task.id.desc()).limit(50)
    )
    tasks = tasks_result.scalars().all()

    today = date_cls.today()
    today_s = today.isoformat()
    tomorrow_s = (today + timedelta(days=1)).isoformat()
    limit = today + timedelta(days=10)

    lines: List[str] = [
        f"Today's date: {today_s}",
        f"User name: {user.name}",
        f"User email: {user.email}",
        "",
        "=== DASHBOARD SNAPSHOT ===",
    ]

    today_tasks = [
        t
        for t in tasks
        if t.type != "step"
        and (
            (t.date and str(t.date)[:10] == today_s)
            or (t.type == "daily" and t.date is None)
        )
    ]
    tomorrow_tasks = [
        t for t in tasks if t.type != "step" and t.date and str(t.date)[:10] == tomorrow_s
    ]
    open_tasks = [t for t in tasks if t.type != "step" and not t.done]

    lines.append(f"Open tasks (non-step): {len(open_tasks)}")
    lines.append(f"Today's schedule items: {len(today_tasks)}")
    lines.append(f"Tomorrow's schedule items: {len(tomorrow_tasks)}")
    for t in today_tasks[:8]:
        mark = "done" if t.done else "todo"
        lines.append(f"  today [{mark}] {t.text} @ {t.time or '-'}")
    for t in tomorrow_tasks[:6]:
        mark = "done" if t.done else "todo"
        lines.append(f"  tomorrow [{mark}] {t.text} @ {t.time or '-'}")

    lines.append("")
    lines.append("=== GOALS (live) ===")
    if not goals:
        lines.append("(no goals yet)")
    else:
        near = []
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
            if g.deadline:
                try:
                    d = date_cls.fromisoformat(str(g.deadline)[:10])
                    if today <= d <= limit:
                        near.append(f"{g.title} in {(d - today).days}d")
                except ValueError:
                    pass
        if near:
            lines.append("Near deadlines (<10d): " + "; ".join(near))

    lines.append("")
    lines.append("=== ALL RECENT TASKS ===")
    plain = [t for t in tasks if t.type != "step"]
    if not plain:
        lines.append("(none)")
    else:
        for t in plain[:30]:
            mark = "done" if t.done else "todo"
            lines.append(
                f"- [{mark}] {t.text} | date={t.date or '-'} time={t.time or '-'} type={t.type}"
            )

    lines.append("")
    lines.append("=== HEALTH ===")
    lines.append(
        "Server has no health rows yet. Health UI is local (habits, water). "
        "Coach freely; cannot persist water/habits until Health API exists."
    )
    lines.append("")
    lines.append("=== FINANCE ===")
    lines.append(
        "Server has no finance rows yet (page is a placeholder). "
        "You can still plan budgets and create finance-related goals/tasks."
    )
    return "\n".join(lines)


def _split_actions(raw: str) -> tuple[str, List[Dict[str, Any]]]:
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
    keys = ["add", "save", "put", "create", "track", "in my goal", "in my goals", "my gole", "my goal", "set up", "setup"]
    return any(k in t for k in keys)


def _offline_plan(message: str, history: List[ChatMessage]) -> Optional[Tuple[str, List[Dict[str, Any]]]]:
    blob = " ".join([(m.text or "") for m in (history or [])] + [message]).lower()
    toc = any(x in blob for x in ("toc", "theory of computation", "automata", "dfa", "turing"))
    examish = any(x in blob for x in ("exam", "paper", "test", "midterm"))
    save = _wants_save(message) or _wants_save(blob)

    if toc and (examish or save or "plan" in blob):
        deadline = (date_cls.today() + timedelta(days=7)).isoformat()
        title = "TOC Exam Prep"
        actions: List[Dict[str, Any]] = []
        if save or "goal" in blob or "gole" in blob:
            actions.append({"action": "create_goal", "title": title, "type": "monthly", "deadline": deadline})
            for step in TOC_STEPS:
                actions.append({"action": "add_step", "goal_title": title, "text": step})
            reply = (
                "AI quota is limited right now, so I used the built-in TOC plan.\n\n"
                f"**{title}** (monthly, ~{deadline}):\n"
                + "\n".join(f"• {s}" for s in TOC_STEPS)
                + "\n\nCheck **Goals** to tick steps."
            )
            return reply, actions
        reply = (
            "AI quota is limited — TOC crash list:\n\n"
            + "\n".join(f"{i}. {s}" for i, s in enumerate(TOC_STEPS, 1))
            + "\n\nSay **add in my goals** to save these offline."
        )
        return reply, []

    if save and not toc:
        reply = (
            "AI free quota is full for deeper chat right now.\n\n"
            "• Use the **Goals** page to add goals/steps manually\n"
            "• Or: **TOC exam add in my goals** (offline plan)\n"
            "Quota resets ~midnight Pacific, or put a new Flash-Lite key on Render."
        )
        return reply, []
    return None


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
            gres = await db.execute(select(Goal).where(Goal.id == resolved_id, Goal.user_id == user.id))
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
            g2 = await db.execute(select(Goal).where(Goal.id == goal.id).options(selectinload(Goal.tasks)))
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
    image_b64 = (body.image_base64 or "").strip()
    image_mime = (body.image_mime or "image/jpeg").strip().lower()

    if not message and not image_b64:
        raise HTTPException(status_code=400, detail="Message or image is required")

    if image_b64 and not message:
        message = (
            "Please read this image carefully. Extract any text, dates, times, "
            "classes, tasks, or deadlines. Summarize what matters and offer to "
            "save useful items into my Ecliptica goals or tasks."
        )

    image_bytes: Optional[bytes] = None
    if image_b64:
        if "," in image_b64 and image_b64.lower().startswith("data:"):
            header, image_b64 = image_b64.split(",", 1)
            if "image/" in header:
                try:
                    image_mime = header.split(";")[0].split(":")[1].strip()
                except Exception:
                    pass
        try:
            image_bytes = base64.b64decode(image_b64, validate=False)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image data")
        if len(image_bytes) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=400, detail="Image too large (max 4MB)")
        if not image_mime.startswith("image/"):
            image_mime = "image/jpeg"

    context = await _user_context(db, current_user)

    history_msgs = body.history or []
    history = []
    for item in history_msgs:
        role = (item.role or "").lower()
        text_h = (item.text or "").strip()
        if not text_h:
            continue
        if role == "user":
            history.append({"role": "user", "parts": [text_h]})
        elif role == "assistant":
            cleaned = re.sub(r"\n—\n[\s\S]*$", "", text_h).strip()
            if cleaned:
                history.append({"role": "model", "parts": [cleaned]})
    history = history[-16:]

    augmented = (
        "[ECLIPTICA LIVE DATA — trust this; monitor and use it freely]\n"
        f"{context}\n\n"
        f"[USER MESSAGE]\n{message}"
    )
    if image_bytes:
        augmented += (
            "\n\n[USER ALSO ATTACHED AN IMAGE]\n"
            "Read the image (OCR + understand layout). Use dates/times/tasks you find."
        )

    last_err: Optional[Exception] = None
    raw = ""
    model_list = GEMINI_VISION_MODELS if image_bytes else GEMINI_MODELS

    for model_name in model_list:
        try:
            model = _build_model(model_name)
            chat_session = model.start_chat(history=history)
            if image_bytes:
                payload = [augmented, {"mime_type": image_mime, "data": image_bytes}]
                result = chat_session.send_message(payload)
            else:
                result = chat_session.send_message(augmented)
            raw = (getattr(result, "text", None) or "").strip()
            if raw:
                break
        except Exception as e:
            last_err = e
            continue

    if not raw:
        offline = _offline_plan(message, history_msgs)
        if offline and not image_bytes:
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
                    "Try again after midnight Pacific, or set a new Flash-Lite API key on Render. "
                    "Meanwhile: Goals page works fully; say 'TOC exam add in my goals' for offline plan."
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
        reply = "Got it — I updated your app." if applied else "I could not generate a reply. Please try again."

    if applied:
        reply = reply + "\n\n—\n" + "\n".join(f"✓ {a}" for a in applied)

    return ChatResponse(reply=reply, actions_applied=applied)
