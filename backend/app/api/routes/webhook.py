import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.security import verify_meta_signature
from app.db.models import MessageStatus
from app.db.session import get_db
from app.schemas.webhook import MetaWebhookPayload
from app.services.message_service import MessageService, get_message_service
from app.services.tenant_service import TenantService
from app.core.websocket_manager import ws_manager

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter()


@router.get("", response_class=PlainTextResponse)
async def verify_webhook(
    hub_mode: str | None = Query(None, alias="hub.mode"),
    hub_verify_token: str | None = Query(None, alias="hub.verify_token"),
    hub_challenge: str | None = Query(None, alias="hub.challenge"),
) -> str:
    if hub_mode != "subscribe":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid hub.mode")
    if hub_verify_token != settings.META_VERIFY_TOKEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verify token mismatch")
    if not hub_challenge:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing hub.challenge")
    logger.info("Webhook verified by Meta")
    return hub_challenge


@router.post("", status_code=status.HTTP_200_OK)
async def receive_webhook(
    request: Request,
    body: bytes = Depends(verify_meta_signature),
    message_service: MessageService = Depends(get_message_service),
    db: AsyncSession = Depends(get_db),
) -> dict:
    try:
        payload = MetaWebhookPayload.model_validate(json.loads(body))
    except Exception as exc:
        logger.error("Payload parse error: %s", exc)
        return {"status": "parse_error"}

    raw_payload = json.loads(body)

    for entry in payload.entry:
        for change in entry.changes:
            value = change.value
            phone_number_id = value.metadata.get("phone_number_id", "")

            tenant_service = TenantService(
                db=db,
                http_client=request.app.state.http_client,
            )
            tenant = await tenant_service.get_tenant_by_phone_number_id(phone_number_id)

            if not tenant:
                logger.warning("Unknown phone_number_id=%s", phone_number_id)
                continue

            # --- Incoming Messages Processing ---
            for meta_message in value.messages:
                meta_contact = next(
                    (c for c in value.contacts if c.wa_id == meta_message.from_), None
                )
                try:
                    if not await tenant_service.check_limit(tenant):
                        logger.warning("Limit exceeded | tenant=%s", tenant.business_name)
                        continue

                    # 1. DB mein log karo
                    contact, conversation, message = await message_service.handle_inbound(
                        meta_message=meta_message,
                        meta_contact=meta_contact,
                        tenant_id=tenant.id,
                    )
                    await tenant_service.increment_usage(tenant)
                    await db.commit() # Save to DB first

                    # 2. BROADCAST TO DASHBOARD (Phase 4 Hook)
                    # Is se dashboard par message real-time mein popup hoga
                    await ws_manager.broadcast_new_message(
                        tenant_id=str(tenant.id),
                        conversation_id=str(conversation.id),
                        message={
                            "id": str(message.id),
                            "content": message.content,
                            "sender_type": "USER",
                            "created_at": message.created_at.isoformat(), # Standard ISO format
                        },
                        contact_name=contact.name or contact.wa_id,
                    )

                    logger.info(
                        "Message logged & broadcasted | tenant=%s | wa_id=%s",
                        tenant.business_name, contact.wa_id
                    )

                    # 3. Forward to AI (n8n) if bot is active
                    if conversation.is_bot_active and tenant.n8n_webhook_url:
                        print(f"[DEBUG] Sending to n8n webhook: {raw_payload}")
                        await tenant_service.forward_to_n8n(
                            tenant=tenant, payload=raw_payload
                        )

                except Exception as exc:
                    logger.error("Processing error | %s | %s", meta_message.from_, exc)

            # --- Status Updates (Delivered, Read, etc.) ---
            for status_update in value.statuses:
                try:
                    status_map = {
                        "delivered": MessageStatus.DELIVERED,
                        "read": MessageStatus.READ,
                        "failed": MessageStatus.FAILED,
                        "sent": MessageStatus.SENT,
                    }
                    new_status = status_map.get(status_update.status)
                    if new_status:
                        await message_service.update_message_status(
                            meta_message_id=status_update.id, status=new_status,
                        )
                        # Optional: Yahan bhi broadcast kiya ja sakta hai taake 
                        # dashboard par "Blue Ticks" nazar aa saken.
                except Exception as exc:
                    logger.error("Status update error: %s", exc)

    return {"status": "ok"}

@router.post("/n8n/{phone_number_id}", status_code=200)
async def receive_from_n8n(
    phone_number_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    message_service: MessageService = Depends(get_message_service),
) -> dict:
    """
    n8n se directly aane wala webhook — signature verification nahi.
    Sirf internal key check karo.
    """
    # Internal key verify karo
    internal_key = request.headers.get("x-internal-key", "")
    if internal_key != getattr(get_settings(), "INTERNAL_API_KEY", ""):
        raise HTTPException(status_code=403, detail="Invalid internal key")
    
    body = await request.json()
    # Baaki processing same hai
    return {"status": "ok"}