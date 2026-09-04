from datetime import datetime, date, time
from typing import Optional

from sqlalchemy import Column, Integer, String, Text, Date, Time, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)

    # Basic information
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Task state
    status = Column(String(30), default="TODO", nullable=False)
    priority = Column(String(20), default="MEDIUM", nullable=False)

    # Scheduling
    start_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)
    due_time = Column(Time, nullable=True)

    # Completion
    completed_at = Column(DateTime, nullable=True)

    # Optional relationship with a goal
    goal_id = Column(
        Integer,
        ForeignKey("goals.id"),
        nullable=True
    )

    # Recurring task support
    recurrence = Column(String(100), nullable=True)

    # Timestamps
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # Relationship
    goal = relationship("Goal", back_populates="tasks")
