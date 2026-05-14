import logging
from collections import defaultdict
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    Per-tenant WebSocket room manager.

    Structure:
        rooms = {
            "tenant_id_1": {
                "conv_id_A": [ws1, ws2],
                "conv_id_B": [ws3],
                "sidebar":   [ws4, ws5],  # sidebar updates
            },
            "tenant_id_2": { ... }
        }

    Har tenant ka data isolated hai —
    ek tenant doosre ka data nahi dekh sakta.
    """

    def __init__(self) -> None:
        # rooms[tenant_id][room_id] = list of WebSocket connections
        self.rooms: dict[str, dict[str, list[WebSocket]]] = defaultdict(
            lambda: defaultdict(list)
        )

    # ------------------------------------------------------------------ #
    #  Connection management                                                #
    # ------------------------------------------------------------------ #

    async def connect(
        self,
        websocket: WebSocket,
        tenant_id: str,
        room_id: str,
    ) -> None:
        """
        New WebSocket connection accept karo aur room mein add karo.
        room_id = conversation_id ya "sidebar"
        """
        await websocket.accept()
        self.rooms[tenant_id][room_id].append(websocket)
        logger.info(
            "WS connected | tenant=%s | room=%s | total=%d",
            tenant_id, room_id,
            len(self.rooms[tenant_id][room_id]),
        )

    def disconnect(
        self,
        websocket: WebSocket,
        tenant_id: str,
        room_id: str,
    ) -> None:
        """Connection close hone par room se remove karo."""
        room = self.rooms[tenant_id].get(room_id, [])
        if websocket in room:
            room.remove(websocket)
        logger.info(
            "WS disconnected | tenant=%s | room=%s | remaining=%d",
            tenant_id, room_id, len(room),
        )

    # ------------------------------------------------------------------ #
    #  Broadcasting                                                         #
    # ------------------------------------------------------------------ #

    async def broadcast_to_room(
        self,
        tenant_id: str,
        room_id: str,
        event: dict[str, Any],
    ) -> None:
        """
        Ek specific conversation room mein sab connected clients ko bhejo.
        Dead connections automatically remove hote hain.
        """
        connections = self.rooms[tenant_id].get(room_id, [])
        dead = []

        for ws in connections:
            try:
                await ws.send_json(event)
            except Exception:
                dead.append(ws)

        # Dead connections cleanup
        for ws in dead:
            self.disconnect(ws, tenant_id, room_id)

    async def broadcast_to_sidebar(
        self,
        tenant_id: str,
        event: dict[str, Any],
    ) -> None:
        """
        Sidebar update bhejo — naya message aaya, unread count badha.
        Sab logged-in users ko milega.
        """
        await self.broadcast_to_room(tenant_id, "sidebar", event)

    async def broadcast_new_message(
        self,
        tenant_id: str,
        conversation_id: str,
        message: dict[str, Any],
        contact_name: str | None = None,
    ) -> None:
        """
        Naya message aane par do jagah broadcast karo:
        1. Conversation room — message bubble add ho
        2. Sidebar — last message preview + unread count update ho
        """
        # 1. Conversation room
        await self.broadcast_to_room(
            tenant_id=tenant_id,
            room_id=conversation_id,
            event={
                "type": "new_message",
                "conversation_id": conversation_id,
                "message": message,
            },
        )

        # 2. Sidebar
        await self.broadcast_to_sidebar(
            tenant_id=tenant_id,
            event={
                "type": "conversation_updated",
                "conversation_id": conversation_id,
                "last_message": message.get("content", ""),
                "last_message_at": message.get("created_at", ""),
                "contact_name": contact_name,
            },
        )

    async def broadcast_bot_toggle(
        self,
        tenant_id: str,
        conversation_id: str,
        is_bot_active: bool,
    ) -> None:
        """
        Bot toggle event — dashboard mein green/red pill update ho.
        """
        await self.broadcast_to_room(
            tenant_id=tenant_id,
            room_id=conversation_id,
            event={
                "type": "bot_toggled",
                "conversation_id": conversation_id,
                "is_bot_active": is_bot_active,
            },
        )

    async def broadcast_message_status(
        self,
        tenant_id: str,
        conversation_id: str,
        meta_message_id: str,
        status: str,
    ) -> None:
        """
        Delivered/read ticks update karo conversation mein.
        """
        await self.broadcast_to_room(
            tenant_id=tenant_id,
            room_id=conversation_id,
            event={
                "type": "message_status",
                "meta_message_id": meta_message_id,
                "status": status,
            },
        )

    def get_room_count(self, tenant_id: str) -> int:
        """Kitne active rooms hain is tenant ke liye."""
        return len(self.rooms.get(tenant_id, {}))


# Singleton instance — poori app mein ek hi
ws_manager = WebSocketManager()