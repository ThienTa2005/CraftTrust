"""CPU-only admission and reconciliation. Never retry an ambiguous spawn."""
from __future__ import annotations

import json

from storage_client import StorageRequestError


def dispatch_one(storage, spawn, job_id=None):
    lease = storage.rpc("begin_pixal3d_dispatch", {"p_job_id": job_id})
    if not lease:
        return {"accepted": False, "queued": True}
    # The lease is irreversible automatically. A network exception here may
    # mean Modal accepted the call; retain the global lock and reservation.
    call = spawn(lease["jobId"], lease["token"])
    storage.rpc("mark_pixal3d_dispatched", {
        "p_job_id": lease["jobId"], "p_dispatch_id": call.object_id,
    })
    return {"accepted": True, "callId": call.object_id}


def reconcile(storage, call_finished):
    rows = storage.rows("model_dispatch_outbox", "state=in.(spawning,running)&select=job_id,call_id,result,result_applied&limit=10")
    for row in rows:
        try:
            if not row["result"]:
                jobs = storage.rows("model_jobs", f"id=eq.{row['job_id']}&select=seller_id,product_id,worker_id")
                if jobs and jobs[0]["worker_id"]:
                    job = jobs[0]
                    payload = storage.read_result(f"{job['seller_id']}/{job['product_id']}/{row['job_id']}/result.json")
                    if payload:
                        storage.rpc("record_pixal3d_result", {"p_job_id": row["job_id"], "p_worker_id": job["worker_id"], "p_payload": payload})
                        row["result"] = payload
            if row["result"] and not row["result_applied"]:
                storage.rpc("apply_pixal3d_result", {"p_job_id": row["job_id"]})
            if row["call_id"] and call_finished(row["call_id"]):
                storage.rpc("settle_pixal3d_call", {"p_job_id": row["job_id"], "p_call_id": row["call_id"]})
        except StorageRequestError as exc:
            # StorageRequestError exposes only sanitized fields. Do not turn a
            # systemic DNS/auth/schema failure into an apparently healthy run.
            event = {
                "event": "reconciliation_storage_error",
                "jobId": row["job_id"],
                "errorCode": exc.code,
                "host": exc.host,
                "operation": exc.operation,
            }
            if exc.status_code is not None:
                event["status"] = exc.status_code
            print(json.dumps(event))
            raise
        except Exception:
            # Never log raw network exceptions (they can contain credentials).
            print(json.dumps({"event": "reconciliation_pending", "jobId": row["job_id"]}))
    storage.rpc("reap_stale_pixal3d_jobs", {"p_timeout_minutes": 20})
