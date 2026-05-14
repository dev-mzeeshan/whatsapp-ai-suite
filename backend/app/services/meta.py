import logging
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class MetaAPIService:
    """
    Async client for the Meta WhatsApp Cloud API.
    All outbound messages go through this class.

    Usage:
        meta = MetaAPIService(http_client)
        await meta.send_text_message(to="923001234567", text="Hello!")
    """

    def __init__(self, http_client: httpx.AsyncClient) -> None:
        self._client = http_client
        self._url = settings.meta_messages_url

    # ------------------------------------------------------------------ #
    #  Public methods                                                       #
    # ------------------------------------------------------------------ #

    async def send_text_message(self, to: str, text: str) -> dict[str, Any]:
        """
        Send a plain text message to a WhatsApp user.

        Args:
            to:   Recipient's wa_id (phone number without +, e.g. "923001234567")
            text: Message body — max 4096 characters

        Returns:
            Meta API response dict containing the wamid (message ID)
        """
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "text",
            "text": {"preview_url": False, "body": text},
        }
        print("payload ",payload)
        return await self._post(payload)

    async def mark_as_read(self, message_id: str) -> dict[str, Any]:
        """
        Send a read receipt for an inbound message.
        This shows the double blue ticks on the user's phone.

        Args:
            message_id: The wamid of the inbound message (e.g. wamid.HBgL...)
        """
        payload = {
            "messaging_product": "whatsapp",
            "status": "read",
            "message_id": message_id,
        }
        return await self._post(payload)

    async def send_typing_indicator(self, to: str) -> None:
        """
        Show the typing indicator to the user while AI is processing.
        Best-effort — we don't raise if this fails.
        """
        try:
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": to,
                "type": "reaction",
                "reaction": {"message_id": "", "emoji": ""},
            }
            # Note: Real typing indicator requires Business API tier
            # This is a placeholder — Phase 2 will implement properly
            logger.debug("Typing indicator sent to %s", to)
        except Exception as e:
            logger.debug("Typing indicator failed (non-critical): %s", e)

    # ------------------------------------------------------------------ #
    #  Private helpers                                                      #
    # ------------------------------------------------------------------ #

    async def _post(self, payload: dict[str, Any]) -> dict[str, Any]:
        """
        Core POST method. Handles errors and logging centrally.
        All Meta API calls go through here.
        """
        try:
            response = await self._client.post(self._url, json=payload)
            response.raise_for_status()
            data = response.json()

            # Log the wamid Meta assigned to this outbound message
            if "messages" in data:
                wamid = data["messages"][0].get("id", "unknown")
                logger.info("Message sent via Meta API | wamid=%s | to=%s",
                            wamid, payload.get("to"))

            return data

        except httpx.HTTPStatusError as e:
            logger.error(
                "Meta API HTTP error | status=%s | body=%s | payload=%s",
                e.response.status_code,
                e.response.text,
                payload,
            )
            raise

        except httpx.RequestError as e:
            logger.error("Meta API request error | error=%s | payload=%s", e, payload)
            raise


from fastapi import Request as FastAPIRequest

def get_meta_service(request: FastAPIRequest) -> MetaAPIService:
    return MetaAPIService(request.app.state.http_client)