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


class ChatMessage(BaseModel):
    role: str = Field(..., description="user or assistant")
    text: str


class ChatRequest(BaseModel):
    message: str = ""
    history: Optional[List[ChatMessage]] = []
    image_base64: Optional[str] = None
    image_mime: Optional[str] = "image/jpeg"
    pdf_base64: Optional[str] = None
    file_base64: Optional[str] = None
    file_type: Optional[str] = None
    file_name: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    actions_applied: List[str] = []


@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    message = (body.message or "").strip()
    if not message and not body.image_base64 and not body.pdf_base64 and not body.file_base64:
        raise HTTPException(status_code=400, detail="Message or attachment is required")
    return ChatResponse(
        reply=(
            "Assistant is temporarily in recovery mode after a file restore. "
            "Your message was received. Please wait a minute for the full AI to come back online, "
            "or try again shortly. Goals, auth, and the rest of the API are working."
        ),
        actions_applied=[],
    )
