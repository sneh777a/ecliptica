from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.finance import FinanceEntry
from app.models.user import User
from app.utils.deps import get_current_user

router = APIRouter(prefix="/finance", tags=["Finance"])


class FinanceEntryCreate(BaseModel):
    entry_type: str = Field(..., description="income or expense")
    category: str = Field(default="General")
    description: str = Field(default="")
    amount: float = Field(..., gt=0)
    date: date


class FinanceEntryResponse(BaseModel):
    id: int
    user_id: int
    entry_type: str
    category: str
    description: str
    amount: float
    date: date

    class Config:
        from_attributes = True


class FinanceSummaryResponse(BaseModel):
    income_total: float
    expense_total: float
    balance: float
    entries: List[FinanceEntryResponse] = []


def _validate_type(entry_type: str) -> str:
    value = (entry_type or "").strip().lower()
    if value not in {"income", "expense"}:
        raise HTTPException(status_code=400, detail="entry_type must be 'income' or 'expense'.")
    return value


@router.get("/entries", response_model=List[FinanceEntryResponse])
async def list_entries(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(FinanceEntry)
        .where(FinanceEntry.user_id == current_user.id)
        .order_by(FinanceEntry.date.desc(), FinanceEntry.id.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.post("/entries", response_model=FinanceEntryResponse)
async def create_entry(
    payload: FinanceEntryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry_type = _validate_type(payload.entry_type)
    amount = round(float(payload.amount), 2)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="amount must be greater than zero.")

    entry = FinanceEntry(
        user_id=current_user.id,
        entry_type=entry_type,
        category=(payload.category or "General").strip() or "General",
        description=(payload.description or "")[:255],
        amount=amount,
        date=payload.date,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.get("/summary", response_model=FinanceSummaryResponse)
async def get_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(FinanceEntry).where(FinanceEntry.user_id == current_user.id).order_by(FinanceEntry.date.desc())
    )
    entries = result.scalars().all()
    income_total = round(sum(e.amount for e in entries if e.entry_type == "income"), 2)
    expense_total = round(sum(e.amount for e in entries if e.entry_type == "expense"), 2)
    rows = [FinanceEntryResponse(
        id=e.id,
        user_id=e.user_id,
        entry_type=e.entry_type,
        category=e.category,
        description=e.description,
        amount=e.amount,
        date=e.date,
    ) for e in entries]
    return FinanceSummaryResponse(
        income_total=income_total,
        expense_total=expense_total,
        balance=round(income_total - expense_total, 2),
        entries=rows,
    )
