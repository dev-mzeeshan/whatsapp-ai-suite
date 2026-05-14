import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.websocket_manager import ws_manager
from app.db.models import (
    Contact, Conversation, ConversationStatus,
    Message, SenderType, TenantUser,
)
from app.db.session import get_db
from app.services.auth_service import get_current_user
from app.services.message_service import MessageService

logger = logging.getLogger(__name__)
router = APIRouter()


# --------------------------------------------------------------------------- #
#  Schemas                                                                      #
# --------------------------------------------------------------------------- #

class MessageResponse(BaseModel):
    id: str
    content: str
    sender_type: str
    message_type: str
    status: str
    created_at: datetime
    meta_message_id: str | None

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    id: str
    contact_name: str | None
    contact_wa_id: str
    is_bot_active: bool
    status: str
    last_message_preview: str | None
    last_message_at: datetime | None
    unread_count: int

    model_config = {"from_attributes": True}


class ManualReplyRequest(BaseModel):
    message: str


# --------------------------------------------------------------------------- #
#  Routes                                                                       #
# --------------------------------------------------------------------------- #

@router.get("")
async def list_conversations(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    tenant_id_filter: str | None = Query(None, alias="tenant_id"),
    db: AsyncSession = Depends(get_db),
    current_user: TenantUser = Depends(get_current_user),
) -> list[ConversationResponse]:
    from app.db.models import UserRole
    offset = (page - 1) * limit

    query = (
        select(Conversation, Contact)
        .join(Contact, Contact.id == Conversation.contact_id)
        .where(Conversation.status == ConversationStatus.OPEN)
        .order_by(Conversation.last_message_at.desc().nullslast())
        .offset(offset)
        .limit(limit)
    )

    if current_user.role == UserRole.SUPER_ADMIN:
        # Super Admin ne koi specific tenant select kiya ho to filter karo
        if tenant_id_filter:
            query = query.where(Contact.tenant_id == tenant_id_filter)
    else:
        # Tenant Admin sirf apna data dekhe
        query = query.where(Contact.tenant_id == current_user.tenant_id)

    result = await db.execute(query)
    rows = result.all()

    return [
        ConversationResponse(
            id=str(conv.id),
            contact_name=contact.name,
            contact_wa_id=contact.wa_id,
            is_bot_active=conv.is_bot_active,
            status=conv.status.value,
            last_message_preview=conv.last_message_preview,
            last_message_at=conv.last_message_at,
            unread_count=conv.unread_count,
        )
        for conv, contact in rows
    ]


@router.get("/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    before_id: str | None = Query(None),  # cursor-based pagination
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: TenantUser = Depends(get_current_user),
) -> list[MessageResponse]:
    """
    Chat window ke liye messages — oldest first.
    Cursor-based pagination: before_id se pehle ke messages.
    """
    query = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
    )

    if before_id:
        # Cursor: is message se pehle ke messages do
        result_cursor = await db.execute(
            select(Message).where(Message.id == before_id)
        )
        cursor_msg = result_cursor.scalar_one_or_none()
        if cursor_msg:
            query = query.where(Message.created_at < cursor_msg.created_at)

    result = await db.execute(query)
    messages = result.scalars().all()

    # Reverse karo — oldest first display ke liye
    return [
        MessageResponse(
            id=str(m.id),
            content=m.content,
            sender_type=m.sender_type.value,
            message_type=m.message_type,
            status=m.status.value,
            created_at=m.created_at,
            meta_message_id=m.meta_message_id,
        )
        for m in reversed(messages)
    ]


@router.patch("/{conversation_id}/bot")
async def toggle_bot(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: TenantUser = Depends(get_current_user),
) -> dict:
    """
    Bot on/off toggle karo — dashboard ka most used button.
    Real-time WebSocket broadcast bhi hoga.
    """
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Toggle karo
    conversation.is_bot_active = not conversation.is_bot_active
    await db.commit()

    tenant_id = str(current_user.tenant_id) if current_user.tenant_id else str(current_user.id)

    # Real-time broadcast — dashboard mein pill color change ho
    await ws_manager.broadcast_bot_toggle(
        tenant_id=tenant_id,
        conversation_id=conversation_id,
        is_bot_active=conversation.is_bot_active,
    )

    logger.info(
        "Bot toggled | conv=%s | bot_active=%s | by=%s",
        conversation_id, conversation.is_bot_active, current_user.email,
    )

    return {
        "conversation_id": conversation_id,
        "is_bot_active": conversation.is_bot_active,
        "message": "Bot activated" if conversation.is_bot_active else "Bot paused — manual mode",
    }


@router.post("/{conversation_id}/reply")
async def manual_reply(
    conversation_id: str,
    body: ManualReplyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: TenantUser = Depends(get_current_user),
) -> dict:
    """
    Human operator ka manual reply.
    Bot inactive ho tab yeh button enable hota hai dashboard mein.
    """
    # Conversation + Contact dhundho
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    result = await db.execute(
        select(Contact).where(Contact.id == conversation.contact_id)
    )
    contact = result.scalar_one_or_none()

    # DB mein AGENT message log karo
    message_service = MessageService(db)
    agent_message = await message_service.log_agent_reply(
        conversation_id=conversation.id,
        content=body.message,
    )

    # Tenant dhundho — uske token se WhatsApp par bhejo
    from app.db.models import Tenant
    from app.services.tenant_service import TenantService
    import httpx

    result = await db.execute(
        select(Tenant).where(Tenant.id == contact.tenant_id)
    )
    tenant = result.scalar_one_or_none()

    if tenant:
        async with httpx.AsyncClient() as client:
            tenant_service = TenantService(db=db, http_client=client)
            try:
                response = await tenant_service.send_whatsapp_message(
                    tenant=tenant,
                    to=contact.wa_id,
                    text=body.message,
                )
                wamid = response.get("messages", [{}])[0].get("id")
                if wamid:
                    agent_message.meta_message_id = wamid
            except Exception as e:
                logger.error("Manual reply send failed: %s", e)

    await db.commit()

    tenant_id = str(current_user.tenant_id) if current_user.tenant_id else str(current_user.id)

    # WebSocket broadcast — conversation mein message appear ho
    await ws_manager.broadcast_new_message(
        tenant_id=tenant_id,
        conversation_id=conversation_id,
        message={
            "id": str(agent_message.id),
            "content": body.message,
            "sender_type": "AGENT",
            "created_at": str(agent_message.created_at),
        },
    )

    return {
        "status": "sent",
        "message_id": str(agent_message.id),
    }


@router.patch("/{conversation_id}/read")
async def mark_as_read(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: TenantUser = Depends(get_current_user),
) -> dict:
    """
    Conversation open karne par unread count zero karo.
    """
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conversation.unread_count = 0
    await db.commit()

    return {"status": "ok"}