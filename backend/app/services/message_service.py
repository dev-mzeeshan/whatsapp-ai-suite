import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    Contact, Conversation, ConversationStatus,
    Message, MessageStatus, SenderType
)
from app.schemas.webhook import MetaContact, MetaMessage

logger = logging.getLogger(__name__)


class MessageService:

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def handle_inbound(
        self,
        meta_message: MetaMessage,
        meta_contact: MetaContact | None,
        tenant_id: UUID,
    ) -> tuple[Contact, Conversation, Message]:
        """
        DB-first rule:
        1. Contact get/create (tenant ke saath)
        2. Conversation get/create
        3. Message log
        4. Conversation metadata update
        """
        wa_id = meta_message.from_
        sender_name = meta_contact.profile.get("name") if meta_contact else None

        contact = await self._get_or_create_contact(wa_id, sender_name, tenant_id)
        conversation = await self._get_or_create_conversation(contact)

        content = meta_message.text_body or f"[{meta_message.type}]"
        message = await self._log_message(
            conversation_id=conversation.id,
            meta_message_id=meta_message.id,
            sender_type=SenderType.USER,
            content=content,
            message_type=meta_message.type,
        )
        await self._update_conversation_metadata(conversation, content)

        logger.info(
            "Inbound logged | wa_id=%s | conv_id=%s | bot_active=%s",
            wa_id, conversation.id, conversation.is_bot_active,
        )
        return contact, conversation, message

    async def log_bot_reply(
        self,
        conversation_id: UUID,
        content: str,
        meta_message_id: str | None = None,
    ) -> Message:
        message = await self._log_message(
            conversation_id=conversation_id,
            meta_message_id=meta_message_id,
            sender_type=SenderType.BOT,
            content=content,
            message_type="text",
        )
        await self._db.flush()
        return message

    async def log_agent_reply(
        self,
        conversation_id: UUID,
        content: str,
        meta_message_id: str | None = None,
    ) -> Message:
        message = await self._log_message(
            conversation_id=conversation_id,
            meta_message_id=meta_message_id,
            sender_type=SenderType.AGENT,
            content=content,
            message_type="text",
        )
        await self._db.flush()
        return message

    async def update_message_status(
        self, meta_message_id: str, status: MessageStatus
    ) -> Message | None:
        result = await self._db.execute(
            select(Message).where(Message.meta_message_id == meta_message_id)
        )
        message = result.scalar_one_or_none()
        if not message:
            return None

        message.status = status
        now = datetime.now(timezone.utc)
        if status == MessageStatus.DELIVERED:
            message.delivered_at = now
        elif status == MessageStatus.READ:
            message.read_at = now

        await self._db.flush()
        return message

    # ------------------------------------------------------------------ #
    #  Private helpers                                                      #
    # ------------------------------------------------------------------ #

    async def _get_or_create_contact(
        self, wa_id: str, name: str | None, tenant_id: UUID
    ) -> Contact:
        result = await self._db.execute(
            select(Contact).where(
                Contact.wa_id == wa_id,
                Contact.tenant_id == tenant_id,
            )
        )
        contact = result.scalar_one_or_none()

        if not contact:
            contact = Contact(
                wa_id=wa_id,
                name=name,
                phone_number=f"+{wa_id}",
                tenant_id=tenant_id,
            )
            self._db.add(contact)
            await self._db.flush()
            logger.info("New contact | wa_id=%s | tenant=%s", wa_id, tenant_id)
        elif name and contact.name != name:
            contact.name = name
            await self._db.flush()

        return contact

    async def _get_or_create_conversation(self, contact: Contact) -> Conversation:
        result = await self._db.execute(
            select(Conversation)
            .where(
                Conversation.contact_id == contact.id,
                Conversation.status == ConversationStatus.OPEN,
            )
            .order_by(Conversation.created_at.desc())
            .limit(1)
        )
        conversation = result.scalar_one_or_none()

        if not conversation:
            conversation = Conversation(
                contact_id=contact.id,
                is_bot_active=True,
            )
            self._db.add(conversation)
            await self._db.flush()
            logger.info("New conversation | contact_id=%s", contact.id)

        return conversation

    async def _log_message(
        self,
        conversation_id: UUID,
        meta_message_id: str | None,
        sender_type: SenderType,
        content: str,
        message_type: str,
    ) -> Message:
        # Idempotency — Meta retry handle karo
        if meta_message_id:
            result = await self._db.execute(
                select(Message).where(
                    Message.meta_message_id == meta_message_id
                )
            )
            existing = result.scalar_one_or_none()
            if existing:
                logger.debug("Duplicate message skipped: %s", meta_message_id)
                return existing

        message = Message(
            conversation_id=conversation_id,
            meta_message_id=meta_message_id,
            sender_type=sender_type,
            content=content,
            message_type=message_type,
            status=MessageStatus.SENT,
        )
        self._db.add(message)
        await self._db.flush()
        return message

    async def _update_conversation_metadata(
        self, conversation: Conversation, content: str
    ) -> None:
        conversation.last_message_at = datetime.now(timezone.utc)
        conversation.last_message_preview = content[:255]
        conversation.unread_count = (conversation.unread_count or 0) + 1
        await self._db.flush()


# --------------------------------------------------------------------------- #
#  FastAPI dependency                                                           #
# --------------------------------------------------------------------------- #

from fastapi import Depends
from app.db.session import get_db


async def get_message_service(
    db: AsyncSession = Depends(get_db),
) -> MessageService:
    return MessageService(db)