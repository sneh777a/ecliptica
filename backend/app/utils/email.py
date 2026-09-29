import asyncio
import smtplib
from email.message import EmailMessage

from app.config import settings


def _send_sync(to_email: str, reset_url: str) -> None:
    if not settings.MAIL_HOST or not settings.MAIL_USER or not settings.MAIL_PASS:
        raise RuntimeError("Email settings are not configured")

    message = EmailMessage()
    message["Subject"] = "Reset your Ecliptica password"
    message["From"] = settings.MAIL_FROM or settings.MAIL_USER
    message["To"] = to_email

    message.set_content(
        f"""Ecliptica password reset

We received a request to reset your Ecliptica password.

Open this link to choose a new password:
{reset_url}

This link expires in 1 hour. If you did not request this, you can safely ignore this email.
"""
    )

    message.add_alternative(
        f"""<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;color:#222">
<h2>Reset your Ecliptica password ✦</h2>
<p>We received a request to reset your Ecliptica password.</p>
<p><a href="{reset_url}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#7c3aed;color:#fff;text-decoration:none">Set a new password</a></p>
<p style="color:#666;font-size:14px">This link expires in 1 hour.</p>
<p style="color:#666;font-size:14px">If you did not request this, you can safely ignore this email.</p>
</div>""",
        subtype="html",
    )

    if settings.MAIL_PORT == 465:
        with smtplib.SMTP_SSL(settings.MAIL_HOST, settings.MAIL_PORT, timeout=20) as smtp:
            smtp.login(settings.MAIL_USER, settings.MAIL_PASS)
            smtp.send_message(message)
    else:
        with smtplib.SMTP(settings.MAIL_HOST, settings.MAIL_PORT, timeout=20) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.ehlo()
            smtp.login(settings.MAIL_USER, settings.MAIL_PASS)
            smtp.send_message(message)


async def send_password_reset_email(to_email: str, reset_url: str) -> None:
    await asyncio.to_thread(_send_sync, to_email, reset_url)
