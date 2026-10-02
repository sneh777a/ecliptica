from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date, timedelta
from pydantic import BaseModel, Field

from app.database import get_db
from app.models.user import User
from app.models.goal import Goal, Task
from app.schemas.goal import GoalCreate, GoalResponse, TaskCreate, TaskResponse
from app.utils.deps import get_current_user

router = APIRouter(prefix="/goals", tags=["Goals"])


class StepCreate(BaseModel):
    text: str = Field(..., min_length=1)


async def _recalc_goal_progress(db: AsyncSession, goal_id: int) -> None:
    """Progress = completed steps / total steps linked to this goal."""
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id).options(selectinload(Goal.tasks))
    )
    goal = result.scalars().first()
    if not goal:
        return
    steps = goal.tasks or []
    total = len(steps)
    completed = len([t for t in steps if t.done])
    goal.completed_count = completed
    if total > 0:
        goal.target_count = total
        goal.progress = round((completed / total) * 100, 1)
    else:
        goal.progress = 0.0
    await db.commit()


@router.get("/", response_model=List[GoalResponse])
async def get_goals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Goal)
        .where(Goal.user_id == current_user.id)
        .options(selectinload(Goal.tasks))
        .order_by(Goal.id.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=GoalResponse)
async def create_goal(
    goal: GoalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Start with 0 steps; progress grows as user adds steps
    new_goal = Goal(
        user_id=current_user.id,
        title=goal.title,
        description=goal.description or "",
        type=goal.type,
        target_count=0,
        completed_count=0,
        progress=0.0,
        deadline=goal.deadline or "",
    )
    db.add(new_goal)
    await db.commit()
    await db.refresh(new_goal)

    result = await db.execute(
        select(Goal).where(Goal.id == new_goal.id).options(selectinload(Goal.tasks))
    )
    return result.scalars().first()


@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Goal)
        .where(Goal.id == goal_id, Goal.user_id == current_user.id)
        .options(selectinload(Goal.tasks))
    )
    goal = result.scalars().first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


@router.post("/{goal_id}/steps", response_model=TaskResponse)
async def add_step(
    goal_id: int,
    body: StepCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a step on the path to a yearly / monthly / weekly goal."""
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    )
    goal = result.scalars().first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Step text is required")

    step = Task(
        user_id=current_user.id,
        goal_id=goal.id,
        text=text,
        time="",
        date=None,
        type="step",
        done=False,
    )
    db.add(step)
    await db.commit()
    await db.refresh(step)
    await _recalc_goal_progress(db, goal.id)
    return step


@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    )
    goal = result.scalars().first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    await db.delete(goal)
    await db.commit()
    return {"message": "Goal deleted"}


@router.post("/tasks", response_model=TaskResponse)
async def create_task(
    task: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if task.goal_id is not None:
        g = await db.execute(
            select(Goal).where(
                Goal.id == task.goal_id, Goal.user_id == current_user.id
            )
        )
        if not g.scalars().first():
            raise HTTPException(status_code=404, detail="Goal not found")

    new_task = Task(
        user_id=current_user.id,
        goal_id=task.goal_id,
        text=task.text,
        time=task.time or "",
        date=task.date,
        type=task.type,
    )
    db.add(new_task)
    await db.commit()
    await db.refresh(new_task)

    if new_task.goal_id:
        await _recalc_goal_progress(db, new_task.goal_id)

    return new_task


@router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(
    task_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Task).where(Task.user_id == current_user.id)
    if task_date is not None:
        query = query.where(Task.date == task_date)
    result = await db.execute(query)
    return result.scalars().all()


@router.patch("/tasks/{task_id}/toggle", response_model=TaskResponse)
async def toggle_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.user_id == current_user.id)
    )
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.done = not task.done
    await db.commit()
    await db.refresh(task)

    if task.goal_id:
        await _recalc_goal_progress(db, task.goal_id)

    return task


@router.post("/rollover")
async def rollover_missed_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    yesterday = today - timedelta(days=1)

    result = await db.execute(
        select(Task).where(
            Task.user_id == current_user.id,
            Task.done == False,
            Task.date == yesterday,
            Task.type == "weekly",
        )
    )
    missed = result.scalars().all()

    for task in missed:
        task.date = today

    await db.commit()
    return {"message": f"Moved {len(missed)} missed tasks to today"}
