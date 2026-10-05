from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _clip(password: str) -> str:
    """bcrypt only uses the first 72 bytes."""
    if password is None:
        return ""
    raw = password.encode("utf-8")[:72]
    return raw.decode("utf-8", errors="ignore")


def hash_password(password: str) -> str:
    return pwd_context.hash(_clip(password))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(_clip(plain_password), hashed_password)
    except Exception:
        return False


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt
