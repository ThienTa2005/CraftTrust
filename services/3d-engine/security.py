from __future__ import annotations

import hashlib
import hmac
import json
import time
import uuid
from urllib.parse import urlparse


def canonical_json(payload: dict) -> str:
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":"), sort_keys=False)


def sign_message(secret: str, timestamp: str, nonce: str, body: str) -> str:
    message = f"{timestamp}.{nonce}.{body}".encode()
    return hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()


def verify_message(secret: str, timestamp: str, nonce: str, body: str, signature: str) -> bool:
    if not secret or len(timestamp) != 10 or not timestamp.isascii() or not timestamp.isdigit() or abs(time.time() - int(timestamp)) > 300:
        return False
    try:
        uuid.UUID(nonce)
    except (ValueError, AttributeError):
        return False
    expected = sign_message(secret, timestamp, nonce, body)
    return hmac.compare_digest(expected, signature or "")


def validate_callback_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("CRAFTTRUST_CALLBACK_URL must be a credential-free HTTPS URL.")
    if parsed.hostname in {"localhost", "127.0.0.1", "::1"} or parsed.hostname.endswith(".local"):
        raise ValueError("Private callback hosts are not allowed.")
    return value
