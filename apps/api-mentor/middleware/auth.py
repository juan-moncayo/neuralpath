import os
from typing import Any

from fastapi import WebSocketException
from jose import JWTError, jwt

JWT_SECRET = os.getenv("JWT_SECRET") or os.getenv("AUTH_SECRET") or ""


def verify_jwt(token: str) -> dict[str, Any]:
    """Verify JWT and return payload with userId, role, plan. Raises WebSocketException on failure."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        if not payload.get("userId"):
            raise WebSocketException(code=4001, reason="Token inválido")
        return payload
    except JWTError:
        raise WebSocketException(code=4001, reason="Token inválido o expirado")
