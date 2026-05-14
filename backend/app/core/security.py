import hashlib
import hmac
import logging

from fastapi import HTTPException, Request, status

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def verify_meta_signature(request: Request) -> bytes:
    """
    FastAPI dependency that verifies the X-Hub-Signature-256 header
    sent by Meta on every webhook POST.

    Returns the raw request body so the route handler doesn't need
    to call request.body() a second time (it can only be read once).

    Raises HTTP 403 immediately if:
      - The signature header is missing
      - The signature format is invalid
      - The computed HMAC does not match (timing-safe comparison)

    Security note: we use hmac.compare_digest() to prevent timing attacks.
    Never use == for comparing HMAC signatures.
    """
    body = await request.body()

    signature_header = request.headers.get("X-Hub-Signature-256")

    if not signature_header:
        logger.warning("Webhook POST received with no X-Hub-Signature-256 header")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing signature header",
        )

    # Header format is: "sha256=<hex_digest>"
    if not signature_header.startswith("sha256="):
        logger.warning("Malformed X-Hub-Signature-256 header: %s", signature_header)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Malformed signature header",
        )

    expected_signature = signature_header[len("sha256="):]

    computed_signature = hmac.new(
        key=settings.META_APP_SECRET.encode("utf-8"),
        msg=body,
        digestmod=hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(computed_signature, expected_signature):
        logger.warning("X-Hub-Signature-256 mismatch — possible spoofed request")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid signature",
        )

    return body