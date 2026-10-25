import { describe, expect, it } from "vitest";
import { summarizeModelJobs, type ModelJobSummary } from "@/lib/model-job-status";

const now = Date.parse("2026-10-25T04:00:00Z");
function job(ageMs: number, status = "queued"): ModelJobSummary {
  return { id: String(ageMs), status, created_at: new Date(now - ageMs).toISOString(), current_step: status };
}

describe("3D queue diagnostics", () => {
  it("warns once an unclaimed job has waited two minutes", () => {
    expect(summarizeModelJobs([job(119999)], now).model_queue_delayed).toBe(false);
    expect(summarizeModelJobs([job(120000)], now).model_queue_delayed).toBe(true);
  });
  it("uses the latest attempt, not the age of the product or an older job", () => {
    const latest = job(1000);
    expect(summarizeModelJobs([job(600000), latest, job(300000, "failed")], now)).toEqual({ model_job: latest, model_queue_delayed: false });
  });
  it.each(["processing", "completed", "failed"])("does not show a queue warning for %s", (status) => {
    expect(summarizeModelJobs([job(600000, status)], now).model_queue_delayed).toBe(false);
  });
  it("handles products without generation jobs", () => {
    expect(summarizeModelJobs([], now)).toEqual({ model_job: null, model_queue_delayed: false });
  });
});
