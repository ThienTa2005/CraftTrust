"use client";

import { useState } from "react";

export function ReviewEvidence({ evidenceId }:{ evidenceId:string }) {
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState("");
  async function review(decision:"approved"|"rejected") {
    const notes = window.prompt(`Review notes for ${decision} decision (required):`);
    if (!notes) return;
    setBusy(true); setMessage("");
    const response = await fetch("/api/evidence/review",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({evidenceId,decision,notes})});
    const body = await response.json(); setBusy(false); setMessage(response.ok ? "Decision recorded and passport tier recalculated." : body.error ?? "Review failed");
  }
  return <div><div style={{display:"flex",gap:8}}><button className="button small" disabled={busy} onClick={() => review("approved")}>Approve</button><button className="button secondary small" disabled={busy} onClick={() => review("rejected")}>Reject</button></div>{message?<small role="status">{message}</small>:null}</div>;
}
