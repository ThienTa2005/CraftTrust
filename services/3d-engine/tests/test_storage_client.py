from __future__ import annotations

import sys
from pathlib import Path

import httpx
import pytest


sys.path.insert(0, str(Path(__file__).parents[1]))

from storage_client import (  # noqa: E402
    CraftTrustStorage,
    StorageConfigurationError,
    StorageRequestError,
)


VALID_URL = "https://abcdefghijklmnopqrst.supabase.co"
SECRET = "service-role-value-that-must-never-appear"


def client_for(handler) -> httpx.Client:
    return httpx.Client(transport=httpx.MockTransport(handler), trust_env=False)


def test_project_url_is_strict_and_normalized():
    storage = CraftTrustStorage(f"  {VALID_URL}/  ", SECRET)
    assert storage.host == "abcdefghijklmnopqrst.supabase.co"
    assert storage.base_url == VALID_URL


@pytest.mark.parametrize(
    "value",
    (
        "",
        "http://abcdefghijklmnopqrst.supabase.co",
        "https://YOUR_PROJECT_REF.supabase.co",
        "https://abcdefghijklmnopqrst.supabase.co/rest/v1",
        "https://abcdefghijklmnopqrst.supabase.co?apikey=leak",
        "https://user:pass@abcdefghijklmnopqrst.supabase.co",
        "https://abcdefghijklmnopqrst.supabase.co:443",
        "https://example.com",
    ),
)
def test_invalid_project_url_fails_before_network(value: str):
    with pytest.raises(StorageConfigurationError) as caught:
        CraftTrustStorage(value, SECRET)
    assert "SUPABASE_URL_INVALID" in str(caught.value)
    assert SECRET not in str(caught.value)


def test_missing_service_role_key_fails_before_network():
    with pytest.raises(StorageConfigurationError, match="SUPABASE_SERVICE_ROLE_KEY_MISSING"):
        CraftTrustStorage(VALID_URL, "  ")


def test_dns_failure_is_classified_and_redacted():
    def fail(request: httpx.Request):
        raise httpx.ConnectError("[Errno -2] Name or service not known", request=request)

    storage = CraftTrustStorage(VALID_URL, SECRET, client=client_for(fail))
    with pytest.raises(StorageRequestError) as caught:
        storage.rpc("begin_pixal3d_dispatch", {"p_job_id": None})
    message = str(caught.value)
    assert caught.value.code == "SUPABASE_DNS_RESOLUTION_FAILED"
    assert "host=abcdefghijklmnopqrst.supabase.co" in message
    assert "operation=rpc:begin_pixal3d_dispatch" in message
    assert SECRET not in message


@pytest.mark.parametrize(
    ("status", "expected"),
    ((401, "SUPABASE_AUTH_FAILED"), (403, "SUPABASE_AUTH_FAILED"), (404, "SUPABASE_RPC_NOT_FOUND")),
)
def test_http_failure_classification_does_not_echo_response(status: int, expected: str):
    def respond(request: httpx.Request):
        return httpx.Response(status, json={"message": SECRET}, request=request)

    storage = CraftTrustStorage(VALID_URL, SECRET, client=client_for(respond))
    with pytest.raises(StorageRequestError) as caught:
        storage.rpc("begin_pixal3d_dispatch", {})
    assert caught.value.code == expected
    assert SECRET not in str(caught.value)


def test_invalid_success_response_does_not_echo_body():
    def respond(request: httpx.Request):
        return httpx.Response(200, text=SECRET, request=request)

    storage = CraftTrustStorage(VALID_URL, SECRET, client=client_for(respond))
    with pytest.raises(StorageRequestError) as caught:
        storage.rows("model_jobs", "select=id&limit=0")
    assert caught.value.code == "SUPABASE_RESPONSE_INVALID"
    assert SECRET not in str(caught.value)


def test_preflight_only_reads_openapi_and_reports_missing_rpc():
    observed: list[tuple[str, str]] = []

    def respond(request: httpx.Request):
        observed.append((request.method, request.url.path))
        return httpx.Response(
            200,
            json={"paths": {"/rpc/begin_pixal3d_dispatch": {"post": {}}}},
            request=request,
        )

    storage = CraftTrustStorage(VALID_URL, SECRET, client=client_for(respond))
    result = storage.preflight(
        ("begin_pixal3d_dispatch", "reap_stale_pixal3d_jobs"),
        ("model_dispatch_outbox",),
    )
    assert observed == [("GET", "/rest/v1/")]
    assert result == {
        "ok": False,
        "host": "abcdefghijklmnopqrst.supabase.co",
        "authenticated": True,
        "requiredRpcs": {
            "begin_pixal3d_dispatch": True,
            "reap_stale_pixal3d_jobs": False,
        },
        "missingRpcs": ["reap_stale_pixal3d_jobs"],
        "requiredTables": {"model_dispatch_outbox": False},
        "missingTables": ["model_dispatch_outbox"],
    }
