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


def _email_configured() -> bool:
    return bool(settings.MAIL_HOST and settings.MAIL_USER and settings.MAIL_PASS)


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalars().first()

    # Same message whether or not the email exists (security)
    message = "If that email is registered, you can reset your password."

    if not user:
        return {"message": message, "reset_token": None, "reset_path": None}

    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    await db.commit()

    app_url = (settings.APP_URL or "https://ecliptica-mu.vercel.app").rstrip("/")
    reset_path = f"/reset-password?token={token}"
    reset_url = f"{app_url}{reset_path}"

    # Production path: send email when SMTP is configured
    if _email_configured():
        try:
            await send_password_reset_email(user.email, reset_url)
            return {"message": "If that email is registered, a password reset link has been sent."}
        except Exception:
            # Keep token so user can still use the in-app link if we expose it
            pass

    # Dev / no-email path: return link for the frontend to show
    return {
        "message": message,
        "reset_token": token,
        "reset_path": reset_path,
    }
