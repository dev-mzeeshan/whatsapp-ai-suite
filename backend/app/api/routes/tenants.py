import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Tenant, TenantUser, UserRole
from app.db.session import get_db
from app.services.auth_service import (
    hash_password,
    require_super_admin,
    get_current_user,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# --------------------------------------------------------------------------- #
#  Schemas                                                                      #
# --------------------------------------------------------------------------- #

class CreateTenantRequest(BaseModel):
    business_name: str
    owner_email: EmailStr
    owner_password: str
    owner_full_name: str
    phone_number_id: str       # Meta ka phone_number_id
    whatsapp_number: str       # e.g. "923001234567"
    meta_access_token: str     # Client ka Meta token
    n8n_webhook_url: str | None = None
    monthly_message_limit: int = 1000


class TenantResponse(BaseModel):
    id: str
    business_name: str
    owner_email: str
    whatsapp_number: str
    phone_number_id: str
    n8n_webhook_url: str | None
    monthly_message_limit: int
    current_month_messages: int
    status: str

    model_config = {"from_attributes": True}


class UpdateTenantRequest(BaseModel):
    business_name: str | None = None
    n8n_webhook_url: str | None = None
    monthly_message_limit: int | None = None
    meta_access_token: str | None = None
    status: str | None = None


# --------------------------------------------------------------------------- #
#  Routes — Super Admin only                                                   #
# --------------------------------------------------------------------------- #

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_tenant(
    body: CreateTenantRequest,
    db: AsyncSession = Depends(get_db),
    _: TenantUser = Depends(require_super_admin),
) -> dict:
    """
    Naya client (tenant) onboard karo.
    Automatically client ka login account bhi ban jata hai.
    """
    # Check duplicate phone_number_id
    result = await db.execute(
        select(Tenant).where(Tenant.phone_number_id == body.phone_number_id)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number ID already registered",
        )

    # Tenant banao
    tenant = Tenant(
        business_name=body.business_name,
        owner_email=body.owner_email,
        phone_number_id=body.phone_number_id,
        whatsapp_number=body.whatsapp_number,
        meta_access_token=body.meta_access_token,
        n8n_webhook_url=body.n8n_webhook_url,
        monthly_message_limit=body.monthly_message_limit,
    )
    db.add(tenant)
    await db.flush()  # tenant.id chahiye user ke liye

    # Client ka login account banao
    user = TenantUser(
        tenant_id=tenant.id,
        email=body.owner_email,
        hashed_password=hash_password(body.owner_password),
        full_name=body.owner_full_name,
        role=UserRole.TENANT_ADMIN,
        is_active=True,
    )
    db.add(user)
    await db.commit()

    logger.info(
        "New tenant created | business=%s | wa=%s",
        tenant.business_name, tenant.whatsapp_number,
    )

    return {
        "message": "Tenant created successfully",
        "tenant_id": str(tenant.id),
        "business_name": tenant.business_name,
        "login_email": body.owner_email,
    }


@router.get("")
async def list_tenants(
    db: AsyncSession = Depends(get_db),
    _: TenantUser = Depends(require_super_admin),
) -> list[TenantResponse]:
    """
    Sab clients ki list — Super Admin ka overview panel.
    """
    result = await db.execute(select(Tenant).order_by(Tenant.created_at.desc()))
    tenants = result.scalars().all()
    return [
        TenantResponse(
            id=str(t.id),
            business_name=t.business_name,
            owner_email=t.owner_email,
            whatsapp_number=t.whatsapp_number,
            phone_number_id=t.phone_number_id,
            n8n_webhook_url=t.n8n_webhook_url,
            monthly_message_limit=t.monthly_message_limit,
            current_month_messages=t.current_month_messages,
            status=t.status.value,
        )
        for t in tenants
    ]


@router.patch("/{tenant_id}")
async def update_tenant(
    tenant_id: str,
    body: UpdateTenantRequest,
    db: AsyncSession = Depends(get_db),
    _: TenantUser = Depends(require_super_admin),
) -> dict:
    """
    Client ki settings update karo — limits, n8n URL, status.
    """
    result = await db.execute(
        select(Tenant).where(Tenant.id == tenant_id)
    )
    tenant = result.scalar_one_or_none()

    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if body.business_name:
        tenant.business_name = body.business_name
    if body.n8n_webhook_url is not None:
        tenant.n8n_webhook_url = body.n8n_webhook_url
    if body.monthly_message_limit:
        tenant.monthly_message_limit = body.monthly_message_limit
    if body.meta_access_token:
        tenant.meta_access_token = body.meta_access_token
    if body.status:
        from app.db.models import TenantStatus
        tenant.status = TenantStatus(body.status)

    await db.commit()
    return {"message": "Tenant updated", "tenant_id": tenant_id}


@router.get("/me")
async def get_my_tenant(
    db: AsyncSession = Depends(get_db),
    current_user: TenantUser = Depends(get_current_user),
) -> TenantResponse:
    """
    Client apna tenant info dekhe — dashboard load hone par.
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=404, detail="No tenant associated")

    result = await db.execute(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    return TenantResponse(
        id=str(tenant.id),
        business_name=tenant.business_name,
        owner_email=tenant.owner_email,
        whatsapp_number=tenant.whatsapp_number,
        phone_number_id=tenant.phone_number_id,
        n8n_webhook_url=tenant.n8n_webhook_url,
        monthly_message_limit=tenant.monthly_message_limit,
        current_month_messages=tenant.current_month_messages,
        status=tenant.status.value,
    )

@router.delete("/{tenant_id}")
async def delete_tenant(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    _: TenantUser = Depends(require_super_admin),
) -> dict:
    """
    Client aur uska sab data delete karo.
    Cascading delete — contacts, conversations, messages sab hata dega.
    """
    result = await db.execute(
        select(Tenant).where(Tenant.id == tenant_id)
    )
    tenant = result.scalar_one_or_none()
 
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
 
    await db.delete(tenant)
    await db.commit()
 
    logger.info("Tenant deleted | id=%s | name=%s", tenant_id, tenant.business_name)
    return {"message": "Tenant deleted successfully"}