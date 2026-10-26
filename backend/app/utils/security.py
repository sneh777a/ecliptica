from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _validate_password(password: str) -> str:
    if password is None:
        raise ValueError("Password is required")
    raw = password.encode("utf-8")
    if len(raw) > 72:
        raise ValueError("Password exceeds the bcrypt limit of 72 bytes")
    return password


def hash_password(password: str) -> str:
    validated = _validate_password(password)
    return pwd_context.hash(validated)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        validated = _validate_password(plain_password)
        return pwd_context.verify(validated, hashed_password)
    except Exception:
        return False


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt
