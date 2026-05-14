import logging
from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Tenant, TenantStatus

logger = logging.getLogger(__name__)


class TenantService:
    """
    Multi-tenant core logic:
    1. phone_number_id se tenant identify karo
    2. Message n8n ko forward karo
    3. Usage limits check + track karo
    """

    def __init__(self, db: AsyncSession, http_client: httpx.AsyncClient) -> None:
        self._db = db
        self._client = http_client

    # ------------------------------------------------------------------ #
    #  Tenant lookup                                                        #
    # ------------------------------------------------------------------ #

    async def get_tenant_by_phone_number_id(
        self, phone_number_id: str
    ) -> Tenant | None:
        """
        Meta webhook mein aane wale phone_number_id se
        correct tenant dhundho.
        """
        result = await self._db.execute(
            select(Tenant).where(
                Tenant.phone_number_id == phone_number_id,
                Tenant.status == TenantStatus.ACTIVE,
            )
        )
        return result.scalar_one_or_none()

    # ------------------------------------------------------------------ #
    #  Usage limits                                                         #
    # ------------------------------------------------------------------ #

    async def check_limit(self, tenant: Tenant) -> bool:
        """
        Monthly message limit check karo.
        Returns True = limit theek hai, process karo
        Returns False = limit hit ho gayi, block karo
        """
        if tenant.current_month_messages >= tenant.monthly_message_limit:
            logger.warning(
                "Message limit reached | tenant=%s | used=%d | limit=%d",
                tenant.business_name,
                tenant.current_month_messages,
                tenant.monthly_message_limit,
            )
            return False
        return True

    async def increment_usage(self, tenant: Tenant) -> None:
        """
        Har message ke baad counter badao.
        """
        tenant.current_month_messages += 1
        await self._db.flush()

        logger.debug(
            "Usage updated | tenant=%s | count=%d/%d",
            tenant.business_name,
            tenant.current_month_messages,
            tenant.monthly_message_limit,
        )

    # ------------------------------------------------------------------ #
    #  n8n forward                                                          #
    # ------------------------------------------------------------------ #

    async def forward_to_n8n(
        self, tenant: Tenant, payload: dict
    ) -> bool:
        """
        Inbound message tenant ke n8n webhook URL par forward karo.
        n8n wahan se AI processing karega aur /internal/bot-reply par
        reply bhejega.

        Returns True agar forward successful raha.
        """
        if not tenant.n8n_webhook_url:
            logger.warning(
                "No n8n webhook URL set for tenant=%s",
                tenant.business_name,
            )
            return False

        try:
            print("n8n forfwarded:",payload)
            # n8n ko same Meta payload format mein bhejo
            response = await self._client.post(
                tenant.n8n_webhook_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10.0,
            )
            print("n8n forfwarded:",payload)
            response.raise_for_status()
            logger.info(
                "Forwarded to n8n | tenant=%s | status=%d",
                tenant.business_name,
                response.status_code,
            )
            return True

        except httpx.TimeoutException:
            logger.error(
                "n8n forward timeout | tenant=%s | url=%s",
                tenant.business_name,
                tenant.n8n_webhook_url,
            )
            return False

        except Exception as e:
            logger.error(
                "n8n forward failed | tenant=%s | error=%s",
                tenant.business_name, e,
            )
            return False

    # ------------------------------------------------------------------ #
    #  Meta API — tenant ke apne token se message bhejo                   #
    # ------------------------------------------------------------------ #

    async def send_whatsapp_message(
        self, tenant: Tenant, to: str, text: str
    ) -> dict:
        """
        Har tenant ka apna meta_access_token hai.
        Is liye MetaAPIService use nahi kar sakte directly —
        yahan per-tenant token use hoga.
        """
        from app.config import get_settings
        settings = get_settings()

        url = (
            f"https://graph.facebook.com/{settings.META_API_VERSION}"
            f"/{tenant.phone_number_id}/messages"
        )

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "text",
            "text": {"preview_url": False, "body": text},
        }

        response = await self._client.post(
            url,
            json=payload,
            headers={
                "Authorization": f"Bearer {tenant.meta_access_token}",
                "Content-Type": "application/json",
            },
        )
        response.raise_for_status()
        return response.json()


# --------------------------------------------------------------------------- #
#  FastAPI dependency                                                           #
# --------------------------------------------------------------------------- #

from fastapi import Request as FastAPIRequest


def get_tenant_service(request: FastAPIRequest) -> TenantService:
    return TenantService(
        db=request.app.state.db_session,
        http_client=request.app.state.http_client,
    )