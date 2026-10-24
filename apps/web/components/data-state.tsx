export function DataNotice({ demo, error }: { demo?: boolean | undefined; error?: string | undefined }) {
  if (error) return <div className="error-banner" role="alert">We could not load this data: {error}</div>;
  if (demo) return <div className="demo-banner"><strong>DEMO DATA</strong> — Supabase is not configured. These records are illustrative only and do not represent verified claims.</div>;
  return null;
}
