import { useCallback, useEffect, useState } from "react";

export function useResource<T>(loader: (() => Promise<T>) | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(loader));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!loader) return;
    setLoading(true);
    setError(null);
    try { setData(await loader()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The request failed."); }
    finally { setLoading(false); }
  }, [loader]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { data, loading, error, refresh };
}
