from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
from datetime import date, timedelta

from app.database import get_db
from app.models.user import User
from app.models.goal import Goal, Task
from app.schemas.goal import GoalCreate, GoalResponse, TaskCreate, TaskResponse
from app.utils.deps import get_current_user

router = APIRouter(prefix="/goals", tags=["Goals"])

# ---------- GOALS ----------

@router.get("/", response_model=List[GoalResponse])
async def get_goals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Goal)
        .where(Goal.user_id == current_user.id)
        .options(selectinload(Goal.tasks))
    )
    return result.scalars().all()

@router.post("/", response_model=GoalResponse)
async def create_goal(
    goal: GoalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_goal = Goal(
        user_id=current_user.id,
        title=goal.title,
        description=goal.description or "",
        type=goal.type,
        target_count=goal.target_count,
        deadline=goal.deadline or ""
    )
    db.add(new_goal)
    await db.commit()
    await db.refresh(new_goal)
    return new_goal

@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
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

# ---------- TASKS ----------

@router.post("/tasks", response_model=TaskResponse)
async def create_task(
    task: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_task = Task(
        user_id=current_user.id,
        goal_id=task.goal_id,
        text=task.text,
        time=task.time or "",
        date=task.date,
        type=task.type
    )
    db.add(new_task)
    await db.commit()
    await db.refresh(new_task)
    return new_task

@router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(
    task_date: date = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Task).where(Task.user_id == current_user.id)
    if task_date:
        query = query.where(Task.date == task_date)
    result = await db.execute(query)
    return result.scalars().all()

@router.patch("/tasks/{task_id}/toggle", response_model=TaskResponse)
async def toggle_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
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

    # Update goal progress if linked
    if task.goal_id:
        goal_result = await db.execute(
            select(Goal).where(Goal.id == task.goal_id).options(selectinload(Goal.tasks))
        )
        goal = goal_result.scalars().first()
        if goal:
            completed = len([t for t in goal.tasks if t.done])
            goal.completed_count = completed
            goal.progress = round((completed / goal.target_count) * 100, 1) if goal.target_count else 0
            await db.commit()

    return task

# ---------- ROLLOVER (missed weekly tasks → next day) ----------

@router.post("/rollover")
async def rollover_missed_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    yesterday = today - timedelta(days=1)

    result = await db.execute(
        select(Task).where(
            Task.user_id == current_user.id,
            Task.done == False,
            Task.date == yesterday,
            Task.type == "weekly"
        )
    )
    missed = result.scalars().all()

    for task in missed:
        task.date = today  # move to today

    await db.commit()
    return {"message": f"Moved {len(missed)} missed tasks to today"}
