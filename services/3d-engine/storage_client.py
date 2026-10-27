from __future__ import annotations

import os
import re
from pathlib import Path
from urllib.parse import quote, urlparse

import httpx


_SUPABASE_HOST = re.compile(r"^[a-z0-9]{20}\.supabase\.co$")
_DNS_ERROR_MARKERS = (
    "name or service not known",
    "nodename nor servname provided",
    "temporary failure in name resolution",
    "getaddrinfo failed",
    "errno -2",
    "errno 11001",
)


def _safe_host(value: str | None) -> str:
    """Return a log-safe hostname, never a URL, path, query, or credential."""
    if not value:
        return "<missing>"
    cleaned = re.sub(r"[^a-zA-Z0-9.-]", "?", value)[:253]
    return cleaned or "<invalid>"


class StorageConfigurationError(RuntimeError):
    """A sanitized, operator-actionable configuration failure."""


class StorageRequestError(RuntimeError):
    """A sanitized Supabase transport or HTTP failure."""

    def __init__(
        self,
        code: str,
        *,
        host: str,
        operation: str,
        status_code: int | None = None,
    ) -> None:
        self.code = code
        self.host = _safe_host(host)
        self.operation = re.sub(r"[^a-zA-Z0-9_.:-]", "?", operation)[:100]
        self.status_code = status_code
        detail = f"{code}: host={self.host} operation={self.operation}"
        if status_code is not None:
            detail += f" status={status_code}"
        super().__init__(detail)


class CraftTrustStorage:
    def __init__(
        self,
        base_url: str,
        service_key: str,
        *,
        client: httpx.Client | None = None,
    ) -> None:
        value = (base_url or "").strip()
        try:
            parsed = urlparse(value)
            port = parsed.port
        except ValueError:
            raise StorageConfigurationError(
                "SUPABASE_URL_INVALID: expected https://<20-char-project-ref>.supabase.co"
            ) from None

        host = (parsed.hostname or "").lower()
        if (
            parsed.scheme != "https"
            or not _SUPABASE_HOST.fullmatch(host)
            or parsed.username
            or parsed.password
            or port is not None
            or parsed.query
            or parsed.fragment
            or parsed.path not in ("", "/")
        ):
            raise StorageConfigurationError(
                "SUPABASE_URL_INVALID: expected "
                "https://<20-char-project-ref>.supabase.co "
                f"(host={_safe_host(host)})"
            )
        if not (service_key or "").strip():
            raise StorageConfigurationError("SUPABASE_SERVICE_ROLE_KEY_MISSING")

        self.host = host
        self.base_url = f"https://{host}"
        key = service_key.strip()
        self.headers = {"apikey": key, "authorization": f"Bearer {key}"}
        self.client = client or httpx.Client(
            timeout=httpx.Timeout(60, connect=15),
            follow_redirects=False,
            trust_env=False,
        )

    @classmethod
    def from_environment(cls) -> "CraftTrustStorage":
        return cls(
            os.environ.get("SUPABASE_URL", ""),
            os.environ.get("SUPABASE_SERVICE_ROLE_KEY", ""),
        )

    @staticmethod
    def _is_dns_error(exc: BaseException) -> bool:
        current: BaseException | None = exc
        for _ in range(8):
            if current is None:
                break
            if any(marker in str(current).lower() for marker in _DNS_ERROR_MARKERS):
                return True
            current = current.__cause__ or current.__context__
        return False

    def _request(
        self,
        method: str,
        path: str,
        *,
        operation: str,
        allowed_statuses: tuple[int, ...] = (),
        **kwargs,
    ) -> httpx.Response:
        try:
            response = self.client.request(
                method,
                f"{self.base_url}{path}",
                headers=kwargs.pop("headers", self.headers),
                **kwargs,
            )
        except httpx.ConnectTimeout:
            raise StorageRequestError(
                "SUPABASE_CONNECT_TIMEOUT", host=self.host, operation=operation
            ) from None
        except httpx.ConnectError as exc:
            code = "SUPABASE_DNS_RESOLUTION_FAILED" if self._is_dns_error(exc) else "SUPABASE_CONNECT_FAILED"
            raise StorageRequestError(code, host=self.host, operation=operation) from None
        except httpx.TimeoutException:
            raise StorageRequestError(
                "SUPABASE_REQUEST_TIMEOUT", host=self.host, operation=operation
            ) from None
        except httpx.RequestError:
            raise StorageRequestError(
                "SUPABASE_REQUEST_FAILED", host=self.host, operation=operation
            ) from None

        if response.status_code in allowed_statuses:
            return response
        if response.status_code in (401, 403):
            raise StorageRequestError(
                "SUPABASE_AUTH_FAILED",
                host=self.host,
                operation=operation,
                status_code=response.status_code,
            )
        if response.status_code == 404 and operation.startswith("rpc:"):
            raise StorageRequestError(
                "SUPABASE_RPC_NOT_FOUND",
                host=self.host,
                operation=operation,
                status_code=response.status_code,
            )
        if response.is_error:
            raise StorageRequestError(
                "SUPABASE_HTTP_ERROR",
                host=self.host,
                operation=operation,
                status_code=response.status_code,
            )
        return response

    def _json_response(self, response: httpx.Response, *, operation: str):
        try:
            return response.json()
        except ValueError:
            raise StorageRequestError(
                "SUPABASE_RESPONSE_INVALID",
                host=self.host,
                operation=operation,
                status_code=response.status_code,
            ) from None

    def rpc(self, name: str, payload: dict):
        response = self._request(
            "POST",
            f"/rest/v1/rpc/{name}",
            operation=f"rpc:{name}",
            headers={**self.headers, "content-type": "application/json"},
            json=payload,
        )
        return self._json_response(response, operation=f"rpc:{name}") if response.content else None

    def rows(self, table: str, query: str) -> list[dict]:
        response = self._request(
            "GET",
            f"/rest/v1/{table}?{query}",
            operation=f"table:{table}",
        )
        return self._json_response(response, operation=f"table:{table}")

    def preflight(
        self,
        required_rpcs: tuple[str, ...],
        required_tables: tuple[str, ...] = (),
    ) -> dict:
        """Read PostgREST's OpenAPI document; never calls a mutating RPC."""
        response = self._request(
            "GET",
            "/rest/v1/",
            operation="schema-preflight",
            headers={**self.headers, "accept": "application/openapi+json"},
        )
        if len(response.content) > 10_000_000:
            raise StorageRequestError(
                "SUPABASE_SCHEMA_RESPONSE_TOO_LARGE",
                host=self.host,
                operation="schema-preflight",
            )
        try:
            paths = self._json_response(response, operation="schema-preflight")["paths"]
        except (ValueError, KeyError, TypeError):
            raise StorageRequestError(
                "SUPABASE_SCHEMA_INVALID",
                host=self.host,
                operation="schema-preflight",
            ) from None
        present = {name: f"/rpc/{name}" in paths for name in required_rpcs}
        tables = {name: f"/{name}" in paths for name in required_tables}
        return {
            "ok": all(present.values()) and all(tables.values()),
            "host": self.host,
            "authenticated": True,
            "requiredRpcs": present,
            "missingRpcs": [name for name, exists in present.items() if not exists],
            "requiredTables": tables,
            "missingTables": [name for name, exists in tables.items() if not exists],
        }

    def download_source(self, storage_path: str, target: Path) -> None:
        safe_path = quote(storage_path, safe="/")
        operation = "storage:download-source"
        try:
            with self.client.stream(
                "GET",
                f"{self.base_url}/storage/v1/object/product-source/{safe_path}",
                headers=self.headers,
            ) as response:
                if response.status_code in (401, 403):
                    raise StorageRequestError(
                        "SUPABASE_AUTH_FAILED",
                        host=self.host,
                        operation=operation,
                        status_code=response.status_code,
                    )
                if response.is_error:
                    raise StorageRequestError(
                        "SUPABASE_HTTP_ERROR",
                        host=self.host,
                        operation=operation,
                        status_code=response.status_code,
                    )
                size = 0
                with target.open("wb") as stream:
                    for chunk in response.iter_bytes():
                        size += len(chunk)
                        if size > 7_000_000:
                            raise ValueError("Source image exceeds download limit.")
                        stream.write(chunk)
        except StorageRequestError:
            raise
        except httpx.ConnectTimeout:
            raise StorageRequestError(
                "SUPABASE_CONNECT_TIMEOUT", host=self.host, operation=operation
            ) from None
        except httpx.ConnectError as exc:
            code = "SUPABASE_DNS_RESOLUTION_FAILED" if self._is_dns_error(exc) else "SUPABASE_CONNECT_FAILED"
            raise StorageRequestError(code, host=self.host, operation=operation) from None
        except httpx.TimeoutException:
            raise StorageRequestError(
                "SUPABASE_REQUEST_TIMEOUT", host=self.host, operation=operation
            ) from None
        except httpx.RequestError:
            raise StorageRequestError(
                "SUPABASE_REQUEST_FAILED", host=self.host, operation=operation
            ) from None

    def read_result(self, storage_path: str):
        safe_path = quote(storage_path, safe="/")
        response = self._request(
            "GET",
            f"/storage/v1/object/product-models/{safe_path}",
            operation="storage:read-result",
            allowed_statuses=(404,),
        )
        if response.status_code == 404:
            return None
        if len(response.content) > 1_000_000:
            raise ValueError("Result journal exceeds limit.")
        return self._json_response(response, operation="storage:read-result")

    def upload_model(self, storage_path: str, source: Path, content_type: str) -> None:
        safe_path = quote(storage_path, safe="/")
        with source.open("rb") as stream:
            self._request(
                "POST",
                f"/storage/v1/object/product-models/{safe_path}",
                operation="storage:upload-model",
                headers={**self.headers, "content-type": content_type, "x-upsert": "false"},
                content=stream,
            )

    def delete_model(self, storage_path: str) -> None:
        self._request(
            "DELETE",
            "/storage/v1/object/product-models",
            operation="storage:delete-model",
            headers={**self.headers, "content-type": "application/json"},
            json={"prefixes": [storage_path]},
        )
