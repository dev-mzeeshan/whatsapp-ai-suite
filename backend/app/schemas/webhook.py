from typing import Any

from pydantic import BaseModel, Field


# --------------------------------------------------------------------------- #
#  Nested message components                                                    #
# --------------------------------------------------------------------------- #

class MetaTextMessage(BaseModel):
    body: str


class MetaImageMessage(BaseModel):
    id: str
    mime_type: str | None = None
    sha256: str | None = None
    caption: str | None = None


class MetaAudioMessage(BaseModel):
    id: str
    mime_type: str | None = None


class MetaMessage(BaseModel):
    """A single inbound message from a WhatsApp user."""
    id: str                          # Meta's unique message ID (wamid.xxx)
    from_: str = Field(alias="from") # Sender's WhatsApp number (E.164 format)
    timestamp: str                   # Unix timestamp as string
    type: str                        # "text" | "image" | "audio" | "interactive" etc.

    # Optional typed content — only one will be populated based on `type`
    text: MetaTextMessage | None = None
    image: MetaImageMessage | None = None
    audio: MetaAudioMessage | None = None

    # Raw fallback for unsupported message types
    raw: dict[str, Any] | None = None

    model_config = {"populate_by_name": True}

    @property
    def text_body(self) -> str | None:
        """Convenience accessor for the text content regardless of type."""
        if self.type == "text" and self.text:
            return self.text.body
        return None


class MetaContact(BaseModel):
    wa_id: str                        # WhatsApp ID (phone number without +)
    profile: dict[str, Any] = {}


class MetaStatus(BaseModel):
    """Delivery/read status update for a previously sent message."""
    id: str           # The wamid of the message we sent
    status: str       # "sent" | "delivered" | "read" | "failed"
    timestamp: str
    recipient_id: str


class MetaValue(BaseModel):
    """The 'value' object inside each webhook change entry."""
    messaging_product: str = "whatsapp"
    metadata: dict[str, Any]
    contacts: list[MetaContact] = []
    messages: list[MetaMessage] = []
    statuses: list[MetaStatus] = []


class MetaChange(BaseModel):
    value: MetaValue
    field: str = "messages"


class MetaEntry(BaseModel):
    id: str           # WhatsApp Business Account ID
    changes: list[MetaChange]


class MetaWebhookPayload(BaseModel):
    """
    Root model for every payload Meta sends to our webhook.
    Handles both message events and status update events.
    """
    object: str       # Always "whatsapp_business_account"
    entry: list[MetaEntry]