import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
# Passlib ki jagah pwdlib use kar rahe hain
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import TenantUser, UserRole

logger = logging.getLogger(__name__)
settings = get_settings()

# --------------------------------------------------------------------------- #
#  Password utilities (Updated to pwdlib)                                     #
# --------------------------------------------------------------------------- #

# password_hash helper jo automatically bcrypt ya argon2 use kar sakta hai
password_hash = PasswordHash.recommended()

def hash_password(password: str) -> str:
    """Plain text password ko secure hash mein convert karein."""
    return password_hash.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Check karein ke plain password hash se match karta hai ya nahi."""
    try:
        return password_hash.verify(plain, hashed)
    except Exception as e:
        logger.error(f"Password verification failed: {e}")
        return False


# --------------------------------------------------------------------------- #
#  JWT utilities                                                              #
# --------------------------------------------------------------------------- #

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

def create_access_token(data: dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.APP_SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(
            token, settings.APP_SECRET_KEY, algorithms=[ALGORITHM]
        )
    except JWTError:
        return None


# --------------------------------------------------------------------------- #
#  Auth Service                                                               #
# --------------------------------------------------------------------------- #

class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def authenticate_user(
        self, email: str, password: str
    ) -> TenantUser | None:
        result = await self._db.execute(
            select(TenantUser).where(TenantUser.email == email)
        )
        user = result.scalar_one_or_none()

        if not user:
            return None
        
        # Updated verification call
        if not verify_password(password, user.hashed_password):
            return None
            
        if not user.is_active:
            return None

        return user

    async def get_user_by_id(self, user_id: str) -> TenantUser | None:
        if not user_id:
            return None
        result = await self._db.execute(
            select(TenantUser).where(TenantUser.id == user_id)
        )
        return result.scalar_one_or_none()

    def generate_token(self, user: TenantUser) -> dict:
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "tenant_id": str(user.tenant_id) if user.tenant_id else None,
        }
        token = create_access_token(token_data)
        return {
            "access_token": token,
            "token_type": "bearer",
            "role": user.role.value,
            "tenant_id": str(user.tenant_id) if user.tenant_id else None,
        }

    async def create_super_admin(
        self, email: str, password: str, full_name: str
    ) -> TenantUser:
        result = await self._db.execute(
            select(TenantUser).where(
                TenantUser.role == UserRole.SUPER_ADMIN
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            raise ValueError("Super Admin already exists")

        user = TenantUser(
            email=email,
            hashed_password=hash_password(password),
            full_name=full_name,
            role=UserRole.SUPER_ADMIN,
            tenant_id=None,
            is_active=True,
        )
        self._db.add(user)
        await self._db.commit()
        await self._db.refresh(user)
        logger.info("Super Admin created: %s", email)
        return user


# --------------------------------------------------------------------------- #
#  FastAPI dependencies                                                       #
# --------------------------------------------------------------------------- #

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.db.session import get_db

bearer_scheme = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> TenantUser:
    token = credentials.credentials
    payload = decode_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    auth_service = AuthService(db)
    user = await auth_service.get_user_by_id(payload.get("sub"))

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    return user

async def require_super_admin(
    current_user: TenantUser = Depends(get_current_user),
) -> TenantUser:
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access required",
        )
    return current_user

async def require_tenant_access(
    current_user: TenantUser = Depends(get_current_user),
) -> TenantUser:
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    return current_user