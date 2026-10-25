export type ModelJobSummary = {
  id: string;
  status: string;
  created_at: string;
  current_step: string;
};

export function summarizeModelJobs(jobs: ModelJobSummary[], now = Date.now()) {
  const latest = jobs.reduce<ModelJobSummary | null>(
    (result, job) => !result || Date.parse(job.created_at) > Date.parse(result.created_at) ? job : result,
    null,
  );
  return {
    model_job: latest,
    model_queue_delayed: latest?.status === "queued" && now - Date.parse(latest.created_at) >= 120_000,
  };
}

export const modelStages = [
  { step: "preprocessing", label: "Chuẩn bị ảnh" },
  { step: "reconstructing", label: "Dựng mô hình" },
  { step: "validating", label: "Kiểm tra GLB" },
  { step: "uploading", label: "Lưu mô hình" },
];
