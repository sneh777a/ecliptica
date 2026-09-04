from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

class TaskCreate(BaseModel):
    text: str
    time: Optional[str] = ""
    date: Optional[date] = None
    type: str = "daily"  # daily | weekly | monthly | year
    goal_id: Optional[int] = None

class TaskResponse(BaseModel):
    id: int
    text: str
    time: str
    date: Optional[date]
    done: bool
    type: str
    goal_id: Optional[int]

    class Config:
        from_attributes = True

class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    type: str = "weekly"  # weekly | monthly | year
    target_count: int = 7
    deadline: Optional[str] = ""

class GoalResponse(BaseModel):
    id: int
    title: str
    description: str
    type: str
    progress: float
    target_count: int
    completed_count: int
    deadline: str
    tasks: List[TaskResponse] = []

    class Config:
        from_attributes = True
