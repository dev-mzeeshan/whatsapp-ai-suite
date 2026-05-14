import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import Conversation, Contact, ConversationStatus
from app.db.session import get_db
from app.services.message_service import MessageService, get_message_service
from app.services.tenant_service import TenantService

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter()


# --------------------------------------------------------------------------- #
#  Schemas                                                                      #
# --------------------------------------------------------------------------- #

class BotReplyRequest(BaseModel):
    wa_id: str           # User ka WhatsApp number
    message: str         # n8n ka generated reply
    phone_number_id: str # Tenant identify karne ke liye


class BotStatusResponse(BaseModel):
    wa_id: str
    is_bot_active: bool
    phone_number_id: str


# --------------------------------------------------------------------------- #
#  Internal API key verification                                               #
# --------------------------------------------------------------------------- #

def verify_internal_key(x_internal_key: str = Header(...)) -> None:
    """
    n8n se aane wale requests verify karo.
    .env mein INTERNAL_API_KEY set karo aur n8n mein bhi same key use karo.
    """
    if x_internal_key != getattr(settings, "INTERNAL_API_KEY", ""):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid internal API key",
        )


# --------------------------------------------------------------------------- #
#  Routes                                                                       #
# --------------------------------------------------------------------------- #

@router.post("/bot-reply", status_code=status.HTTP_200_OK)
async def receive_bot_reply(
    body: BotReplyRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    message_service: MessageService = Depends(get_message_service),
    _: None = Depends(verify_internal_key),
) -> dict:
    """
    n8n yeh endpoint call karega jab AI reply generate ho jaye.

    Flow:
        n8n → POST /internal/bot-reply → DB log → WebSocket broadcast
        (WebSocket Phase 4 mein aayega)
    """
    # Tenant dhundho
    tenant_service = TenantService(
        db=db,
        http_client=request.app.state.http_client,
    )
    tenant = await tenant_service.get_tenant_by_phone_number_id(
        body.phone_number_id
    )
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Contact dhundho
    from app.db.models import Contact
    result = await db.execute(
        select(Contact).where(
            Contact.wa_id == body.wa_id,
            Contact.tenant_id == tenant.id,
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    # Active conversation dhundho
    result = await db.execute(
        select(Conversation).where(
            Conversation.contact_id == contact.id,
            Conversation.status == ConversationStatus.OPEN,
        ).order_by(Conversation.created_at.desc()).limit(1)
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="No active conversation")

    # Bot active hai? Agar nahi to reply ignore karo
    if not conversation.is_bot_active:
        logger.info(
            "Bot inactive — ignoring n8n reply | wa_id=%s", body.wa_id
        )
        return {"status": "ignored", "reason": "bot_inactive"}

    # DB mein BOT message log karo
    bot_message = await message_service.log_bot_reply(
        conversation_id=conversation.id,
        content=body.message,
    )
    await db.commit()

    # Tenant ke token se WhatsApp par bhejo
    try:
        response = await tenant_service.send_whatsapp_message(
            tenant=tenant,
            to=body.wa_id,
            text=body.message,
        )
        wamid = response.get("messages", [{}])[0].get("id")
        if wamid:
            bot_message.meta_message_id = wamid
            await db.commit()

        logger.info(
            "Bot reply sent | tenant=%s | wa_id=%s | wamid=%s",
            tenant.business_name, body.wa_id, wamid,
        )
    except Exception as e:
        logger.error("Failed to send bot reply via Meta: %s", e)

    # PHASE 4 HOOK: WebSocket broadcast
    # await ws_manager.broadcast(conversation.id, bot_message)

    return {"status": "ok", "message_logged": True}


@router.get("/bot-status/{phone_number_id}/{wa_id}")
async def get_bot_status(
    phone_number_id: str,
    wa_id: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_internal_key),
) -> BotStatusResponse:
    """
    n8n message process karne se PEHLE yeh check karega.
    Agar is_bot_active = false → n8n AI skip karega.

    n8n mein HTTP Request node add karo:
        GET /internal/bot-status/{phone_number_id}/{wa_id}
        Header: x-internal-key: tumhari key
    """
    # Tenant dhundho
    result = await db.execute(
        select(Contact).join(
            Conversation, Conversation.contact_id == Contact.id
        ).where(
            Contact.wa_id == wa_id,
            Conversation.status == ConversationStatus.OPEN,
        ).limit(1)
    )
    contact = result.scalar_one_or_none()

    if not contact:
        # Naya contact — bot active by default
        return BotStatusResponse(
            wa_id=wa_id,
            is_bot_active=True,
            phone_number_id=phone_number_id,
        )

    # Conversation ka bot status check karo
    result = await db.execute(
        select(Conversation).where(
            Conversation.contact_id == contact.id,
            Conversation.status == ConversationStatus.OPEN,
        ).order_by(Conversation.created_at.desc()).limit(1)
    )
    conversation = result.scalar_one_or_none()

    return BotStatusResponse(
        wa_id=wa_id,
        is_bot_active=conversation.is_bot_active if conversation else True,
        phone_number_id=phone_number_id,
    )