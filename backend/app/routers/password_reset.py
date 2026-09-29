from datetime import datetime, timedelta
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.user import ForgotPasswordRequest
from app.utils.email import send_password_reset_email

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalars().first()

    message = "If that email is registered, a password reset link has been sent."

    if not user:
        return {"message": message}

    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    await db.commit()

    reset_url = f"{settings.APP_URL.rstrip('/')}/reset-password?token={token}"

    try:
        await send_password_reset_email(user.email, reset_url)
    except Exception:
        user.reset_token = None
        user.reset_token_expires = None
        await db.commit()
        raise HTTPException(
            status_code=503,
            detail="Password reset email could not be sent. Please try again later.",
        )

    return {"message": message}
