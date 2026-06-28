from datetime import datetime, timedelta, timezone
from typing import Any
import uuid

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain password against a bcrypt hash."""
    return pwd_context.verify(plain, hashed)


def _create_token(data: dict[str, Any], expires_delta: timedelta) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    payload.update({"exp": expire, "jti": str(uuid.uuid4())})
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_access_token(user_id: str) -> str:
    return _create_token(
        {"sub": user_id, "type": "access"},
        timedelta(minutes=settings.access_token_expire_minutes),
    )


def create_refresh_token(user_id: str) -> str:
    return _create_token(
        {"sub": user_id, "type": "refresh"},
        timedelta(days=settings.refresh_token_expire_days),
    )


def decode_token(token: str, expected_type: str = "access") -> str:
    """Decode and validate a JWT token. Returns user_id (sub)."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")

        if user_id is None or token_type != expected_type:
            raise CREDENTIALS_EXCEPTION

        return user_id
    except JWTError:
        raise CREDENTIALS_EXCEPTION
