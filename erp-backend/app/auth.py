from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
import os

from app import schemas

# Read secrets from environment with sensible dev defaults
SECRET_KEY = os.environ.get("SECRET_KEY", "change-me-in-env")
ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
try:
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
except Exception:
    ACCESS_TOKEN_EXPIRE_MINUTES = 60


_pwd_context = None

def _get_pwd_context():
    """Lazily import and return a passlib CryptContext. If passlib is missing,
    raise a helpful RuntimeError explaining how to install dev deps.
    """
    global _pwd_context
    if _pwd_context is not None:
        return _pwd_context
    try:
        from passlib.context import CryptContext
    except Exception as exc:
        raise RuntimeError(
            "passlib is required for password hashing. Install dev requirements: `python -m pip install -r erp-backend/requirements.txt`"
        ) from exc
    # Use pbkdf2_sha256 for development by default (keeps compatibility across environments).
    _pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
    return _pwd_context


def verify_password(plain_password: str, hashed_password: str) -> bool:
    ctx = _get_pwd_context()
    return ctx.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    ctx = _get_pwd_context()
    return ctx.hash(password)


def needs_rehash(hashed_password: str) -> bool:
    ctx = _get_pwd_context()
    try:
        return ctx.needs_update(hashed_password)
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise


def create_token_for_user(user) -> str:
    """Create a JWT for a given user ORM object. Includes tenant_id and sub (user id)."""
    data = {"sub": str(user.id), "tenant_id": getattr(user, "tenant_id", None)}
    return create_access_token(data)
