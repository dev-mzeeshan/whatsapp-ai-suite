import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Message, Conversation, Contact, SenderType, TenantUser
from app.db.session import get_db
from app.services.auth_service import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("")
async def get_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: TenantUser = Depends(get_current_user),
) -> dict:
    """
    Analytics data for dashboard.
    Super Admin: all tenants combined
    Tenant Admin: only their data
    """
    from app.db.models import UserRole

    now = datetime.now(timezone.utc)
    days_7_ago = now - timedelta(days=7)
    days_30_ago = now - timedelta(days=30)

    # Tenant filter
    is_super = current_user.role == UserRole.SUPER_ADMIN
    tenant_id = current_user.tenant_id

    # ------------------------------------------------------------------ #
    #  Base query filter                                                   #
    # ------------------------------------------------------------------ #
    def contact_filter(q):
        if not is_super and tenant_id:
            return q.where(Contact.tenant_id == tenant_id)
        return q

    # ------------------------------------------------------------------ #
    #  Total messages (30 days)                                            #
    # ------------------------------------------------------------------ #
    msg_query = (
        select(func.count(Message.id))
        .join(Conversation, Conversation.id == Message.conversation_id)
        .join(Contact, Contact.id == Conversation.contact_id)
        .where(Message.created_at >= days_30_ago)
    )
    if not is_super and tenant_id:
        msg_query = msg_query.where(Contact.tenant_id == tenant_id)

    total_messages = (await db.execute(msg_query)).scalar() or 0

    # ------------------------------------------------------------------ #
    #  Bot vs Manual messages                                              #
    # ------------------------------------------------------------------ #
    bot_query = msg_query.where(Message.sender_type == SenderType.BOT)
    agent_query = msg_query.where(Message.sender_type == SenderType.AGENT)
    user_query = msg_query.where(Message.sender_type == SenderType.USER)

    bot_count = (await db.execute(bot_query)).scalar() or 0
    agent_count = (await db.execute(agent_query)).scalar() or 0
    user_count = (await db.execute(user_query)).scalar() or 0

    # ------------------------------------------------------------------ #
    #  Messages per day (last 7 days)                                      #
    # ------------------------------------------------------------------ #
    per_day = []
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        day_query = (
            select(func.count(Message.id))
            .join(Conversation, Conversation.id == Message.conversation_id)
            .join(Contact, Contact.id == Conversation.contact_id)
            .where(Message.created_at >= day_start)
            .where(Message.created_at < day_end)
        )
        if not is_super and tenant_id:
            day_query = day_query.where(Contact.tenant_id == tenant_id)

        count = (await db.execute(day_query)).scalar() or 0
        per_day.append({
            "date": day_start.strftime("%b %d"),
            "day": day_start.strftime("%a"),
            "count": count,
        })

    # ------------------------------------------------------------------ #
    #  Total conversations                                                 #
    # ------------------------------------------------------------------ #
    conv_query = (
        select(func.count(Conversation.id))
        .join(Contact, Contact.id == Conversation.contact_id)
    )
    if not is_super and tenant_id:
        conv_query = conv_query.where(Contact.tenant_id == tenant_id)

    total_conversations = (await db.execute(conv_query)).scalar() or 0

    # ------------------------------------------------------------------ #
    #  Active conversations (last 7 days)                                  #
    # ------------------------------------------------------------------ #
    active_query = conv_query.where(Conversation.last_message_at >= days_7_ago)
    active_conversations = (await db.execute(active_query)).scalar() or 0

    # ------------------------------------------------------------------ #
    #  Bot success rate                                                    #
    # ------------------------------------------------------------------ #
    outbound_total = bot_count + agent_count
    bot_rate = round((bot_count / outbound_total * 100) if outbound_total > 0 else 0, 1)

    return {
        "summary": {
            "total_messages_30d": total_messages,
            "total_conversations": total_conversations,
            "active_conversations_7d": active_conversations,
            "bot_rate_percent": bot_rate,
        },
        "message_breakdown": {
            "user": user_count,
            "bot": bot_count,
            "agent": agent_count,
        },
        "messages_per_day": per_day,
    }