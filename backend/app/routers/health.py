from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.health import HealthRecord
from app.models.user import User
from app.utils.deps import get_current_user

router = APIRouter(prefix="/health", tags=["Health"])


class HealthRecordCreate(BaseModel):
    date: date
    water_ml: int = Field(..., ge=0)
    water_goal_ml: int = Field(default=2000, gt=0)
    notes: Optional[str] = ""


class HealthRecordResponse(BaseModel):
    id: int
    user_id: int
    date: date
    water_ml: int
    water_goal_ml: int
    notes: str = ""

    class Config:
        from_attributes = True


def _as_record(model: HealthRecord) -> HealthRecordResponse:
    return HealthRecordResponse(
        id=model.id,
        user_id=model.user_id,
        date=model.date,
        water_ml=model.water_ml,
        water_goal_ml=model.water_goal_ml,
        notes=model.notes or "",
    )


@router.get("/today", response_model=HealthRecordResponse)
async def get_today_health(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(HealthRecord).where(HealthRecord.user_id == current_user.id, HealthRecord.date == date.today())
    )
    record = result.scalars().first()
    if not record:
        record = HealthRecord(
            user_id=current_user.id,
            date=date.today(),
            water_ml=0,
            water_goal_ml=2000,
            notes="",
        )
    return _as_record(record)


@router.get("/history", response_model=List[HealthRecordResponse])
async def list_health_history(
    limit: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(HealthRecord)
        .where(HealthRecord.user_id == current_user.id)
        .order_by(HealthRecord.date.desc())
        .limit(limit)
    )
    return [_as_record(item) for item in result.scalars().all()]


@router.post("/today", response_model=HealthRecordResponse)
async def upsert_today_health(
    payload: HealthRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.notes and len(payload.notes) > 500:
        raise HTTPException(status_code=400, detail="Health notes are limited to 500 characters.")

    result = await db.execute(
        select(HealthRecord).where(HealthRecord.user_id == current_user.id, HealthRecord.date == payload.date)
    )
    record = result.scalars().first()
    if record is None:
        record = HealthRecord(user_id=current_user.id, date=payload.date, water_ml=0, water_goal_ml=payload.water_goal_ml)
        db.add(record)

    record.water_ml = max(0, payload.water_ml)
    record.water_goal_ml = max(1, payload.water_goal_ml)
    record.notes = (payload.notes or "")[:500]
    await db.commit()
    await db.refresh(record)
    return _as_record(record)
