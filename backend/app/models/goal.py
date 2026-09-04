from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean, DateTime, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, default="")
    type = Column(String, default="weekly")  # weekly | monthly | year
    progress = Column(Float, default=0.0)
    target_count = Column(Integer, default=1)  # e.g. 7 for weekly
    completed_count = Column(Integer, default=0)
    deadline = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    tasks = relationship("Task", back_populates="goal", cascade="all, delete-orphan")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=True)
    text = Column(String, nullable=False)
    time = Column(String, default="")          # e.g. "09:00"
    date = Column(Date, nullable=True)         # specific day
    done = Column(Boolean, default=False)
    type = Column(String, default="daily")     # daily | weekly | monthly | year
    created_at = Column(DateTime, default=datetime.utcnow)

    goal = relationship("Goal", back_populates="tasks")
