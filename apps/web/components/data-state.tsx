export function DataNotice({ demo: _demo, error }: { demo?: boolean | undefined; error?: string | undefined }) {
  if (error) return <div className="error-banner" role="alert">{error}</div>;
  return null;
}
