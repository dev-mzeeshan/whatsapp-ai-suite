import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status

from app.core.websocket_manager import ws_manager
from app.services.auth_service import decode_token

logger = logging.getLogger(__name__)
router = APIRouter()


async def get_ws_user(token: str) -> dict | None:
    """
    WebSocket mein HTTP headers nahi hote —
    isliye token query param se aata hai.
    Returns decoded payload ya None agar invalid.
    """
    if not token:
        return None
    return decode_token(token)


# --------------------------------------------------------------------------- #
#  WS /ws/conversations/{conversation_id}                                      #
# --------------------------------------------------------------------------- #

@router.websocket("/conversations/{conversation_id}")
async def conversation_ws(
    websocket: WebSocket,
    conversation_id: str,
    token: str = Query(...),
) -> None:
    """
    Ek conversation ka real-time feed.
    Frontend yahan connect karega jab koi chat open kare.

    Events received:
        - new_message    → message bubble add karo
        - bot_toggled    → pill color change karo
        - message_status → ticks update karo
    """
    # Token verify karo
    payload = await get_ws_user(token)
    if not payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    tenant_id = payload.get("tenant_id")
    user_email = payload.get("email")

    # Super Admin kisi bhi tenant ka room join kar sakta hai
    if not tenant_id and payload.get("role") == "SUPER_ADMIN":
        # Super Admin ke liye conversation_id se tenant_id extract karni hogi
        # Filhal conversation_id prefix use karenge
        tenant_id = payload.get("sub")  # super admin ke liye user id

    if not tenant_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await ws_manager.connect(
        websocket=websocket,
        tenant_id=tenant_id,
        room_id=conversation_id,
    )

    logger.info(
        "WS conversation opened | user=%s | conv=%s",
        user_email, conversation_id,
    )

    try:
        # Connection open rakho — client ka ping/pong handle karo
        while True:
            data = await websocket.receive_text()
            # Client se "ping" aaye to "pong" bhejo
            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        ws_manager.disconnect(
            websocket=websocket,
            tenant_id=tenant_id,
            room_id=conversation_id,
        )
        logger.info(
            "WS conversation closed | user=%s | conv=%s",
            user_email, conversation_id,
        )


# --------------------------------------------------------------------------- #
#  WS /ws/sidebar                                                              #
# --------------------------------------------------------------------------- #

@router.websocket("/sidebar")
async def sidebar_ws(
    websocket: WebSocket,
    token: str = Query(...),
) -> None:
    """
    Sidebar ka real-time feed — naye messages, unread counts.
    Frontend login hone ke baad yahan connect karega.

    Events received:
        - conversation_updated → sidebar preview update karo
        - new_conversation     → naya contact sidebar mein add karo
    """
    payload = await get_ws_user(token)
    if not payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    tenant_id = payload.get("tenant_id") or payload.get("sub")

    await ws_manager.connect(
        websocket=websocket,
        tenant_id=tenant_id,
        room_id="sidebar",
    )

    logger.info("WS sidebar opened | user=%s", payload.get("email"))

    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        ws_manager.disconnect(
            websocket=websocket,
            tenant_id=tenant_id,
            room_id="sidebar",
        )
        logger.info("WS sidebar closed | user=%s", payload.get("email"))