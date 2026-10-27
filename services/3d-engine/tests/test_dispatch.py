import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

sys.path.insert(0, str(Path(__file__).parents[1]))
from dispatch import dispatch_one, reconcile
from storage_client import StorageRequestError


class Storage:
    def __init__(self):
        self.state = "pending"
        self.calls = []
        self.result = None

    def rpc(self, name, payload):
        self.calls.append((name, payload))
        if name == "begin_pixal3d_dispatch":
            if self.state != "pending":
                return None
            self.state = "spawning"
            return {"jobId": "job", "token": "token"}
        return True

    def rows(self, table, query):
        if table == "model_jobs":
            return []
        return [{"job_id": "job", "call_id": "fc-1", "result": self.result, "result_applied": False}]


def test_ambiguous_spawn_is_never_retried():
    storage = Storage()
    invoked = []
    def spawn(*args):
        invoked.append(args)
        raise TimeoutError("Accepted remotely but response lost")
    with pytest.raises(TimeoutError):
        dispatch_one(storage, spawn)
    assert dispatch_one(storage, spawn)["queued"]
    assert len(invoked) == 1
    assert storage.state == "spawning"


def test_lost_mark_response_does_not_duplicate_spawn():
    storage = Storage()
    assert dispatch_one(storage, lambda *args: SimpleNamespace(object_id="fc-1"))["callId"] == "fc-1"
    assert dispatch_one(storage, lambda *args: pytest.fail("duplicate GPU invocation"))["queued"]


def test_reconciler_replays_result_without_gpu_and_keeps_running_call():
    storage = Storage()
    storage.result = {"outcome": "completed"}
    reconcile(storage, lambda call_id: False)
    assert any(name == "apply_pixal3d_result" for name, _ in storage.calls)
    assert not any(name in ("settle_pixal3d_call", "begin_pixal3d_dispatch") for name, _ in storage.calls)


def test_transport_error_is_not_termination_evidence():
    storage = Storage()
    def unavailable(call_id):
        raise ConnectionError("network unavailable")
    reconcile(storage, unavailable)
    assert not any(name == "settle_pixal3d_call" for name, _ in storage.calls)


def test_sanitized_storage_failure_is_not_swallowed(capsys):
    class AuthFailure(Storage):
        def rpc(self, name, payload):
            if name == "apply_pixal3d_result":
                raise StorageRequestError(
                    "SUPABASE_AUTH_FAILED",
                    host="abcdefghijklmnopqrst.supabase.co",
                    operation="rpc:apply_pixal3d_result",
                    status_code=401,
                )
            return super().rpc(name, payload)

    storage = AuthFailure()
    storage.result = {"outcome": "completed"}
    with pytest.raises(StorageRequestError, match="SUPABASE_AUTH_FAILED"):
        reconcile(storage, lambda call_id: False)
    output = capsys.readouterr().out
    assert '"errorCode": "SUPABASE_AUTH_FAILED"' in output
    assert '"status": 401' in output


def test_only_confirmed_terminal_call_settles():
    storage = Storage()
    reconcile(storage, lambda call_id: True)
    assert any(name == "settle_pixal3d_call" for name, _ in storage.calls)


def test_sql_reaper_never_releases_ambiguous_spawn():
    migration = Path(__file__).parents[3] / "supabase" / "migrations" / "202610260001_pixal3d_modal_engine.sql"
    sql = migration.read_text(encoding="utf-8")
    reaper = sql.split("create or replace function public.reap_stale_pixal3d_jobs", 1)[1]
    reaper = reaper.split("create or replace function public.quarantine_pixal3d_spawn", 1)[0]
    assert "set state='settled'" not in reaper.lower()
    assert "state='spawning' automatically" in reaper


def test_sql_has_race_safe_manual_quarantine_for_stuck_spawn():
    migration = Path(__file__).parents[3] / "supabase" / "migrations" / "202610260001_pixal3d_modal_engine.sql"
    sql = migration.read_text(encoding="utf-8").lower()
    quarantine = sql.split("create or replace function public.quarantine_pixal3d_spawn", 1)[1]
    quarantine = quarantine.split("create or replace function public.settle_pixal3d_call", 1)[0]
    assert "o.state='spawning' and o.call_id is null" in quarantine
    assert "j.status in ('queued','dispatched')" in quarantine
    assert "for update of o" in quarantine
    assert "set state='settled'" in quarantine
    assert "ambiguous_spawn_quarantined" in quarantine
    assert "state='pending'" not in quarantine
    assert "grant execute on function public.quarantine_pixal3d_spawn(uuid,text) to service_role" in sql
