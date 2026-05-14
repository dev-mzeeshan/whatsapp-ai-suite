import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.auth_service import AuthService, get_current_user
from app.db.models import TenantUser

logger = logging.getLogger(__name__)
router = APIRouter()


# --------------------------------------------------------------------------- #
#  Schemas                                                                      #
# --------------------------------------------------------------------------- #

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SetupSuperAdminRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    setup_key: str  # extra security — sirf tum jaante ho


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    tenant_id: str | None

    model_config = {"from_attributes": True}


# --------------------------------------------------------------------------- #
#  Routes                                                                       #
# --------------------------------------------------------------------------- #

@router.post("/login")
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Email + password se login karo.
    Returns JWT token jo frontend store karega.
    """
    auth_service = AuthService(db)
    user = await auth_service.authenticate_user(body.email, body.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token_data = auth_service.generate_token(user)
    logger.info("User logged in: %s | role=%s", user.email, user.role)
    return token_data


@router.get("/me")
async def get_me(
    current_user: TenantUser = Depends(get_current_user),
) -> UserResponse:
    """
    Current logged in user ki info return karo.
    Frontend dashboard load hone par yeh call karta hai.
    """
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role.value,
        tenant_id=str(current_user.tenant_id) if current_user.tenant_id else None,
    )


@router.post("/setup", status_code=status.HTTP_201_CREATED)
async def setup_super_admin(
    body: SetupSuperAdminRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Pehli baar Super Admin account banao.
    setup_key environment variable se match karni chahiye.

    Yeh endpoint sirf ek baar kaam karta hai —
    ek baar Super Admin ban gaya to yeh 400 dega.
    """
    from app.config import get_settings
    settings = get_settings()

    # Setup key verify karo — .env mein SETUP_KEY honi chahiye
    if body.setup_key != getattr(settings, "SETUP_KEY", ""):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid setup key",
        )

    auth_service = AuthService(db)
    try:
        user = await auth_service.create_super_admin(
            email=body.email,
            password=body.password,
            full_name=body.full_name,
        )
        return {
            "message": "Super Admin created successfully",
            "email": user.email,
            "role": user.role.value,
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )