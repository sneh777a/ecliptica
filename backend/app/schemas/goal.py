from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date


class TaskCreate(BaseModel):
    text: str
    time: Optional[str] = ""
    date: Optional[date] = None
    type: str = "daily"  # daily | weekly | monthly | year | step
    goal_id: Optional[int] = None


class TaskResponse(BaseModel):
    id: int
    text: str
    time: Optional[str] = ""
    date: Optional[date] = None
    done: bool = False
    type: str = "daily"
    goal_id: Optional[int] = None

    class Config:
        from_attributes = True


class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    type: str = "weekly"  # weekly | monthly | year
    target_count: int = 0
    deadline: Optional[str] = ""


class GoalResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = ""
    type: str = "weekly"
    progress: float = 0.0
    target_count: int = 0
    completed_count: int = 0
    deadline: Optional[str] = ""
    tasks: List[TaskResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True
