import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/services/api";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string;
}

export function useApi<T>(url: string | null) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: "",
  });

  const fetch = useCallback(async (overrideUrl?: string) => {
    const targetUrl = overrideUrl || url;
    if (!targetUrl) return;

    setState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const { data } = await api.get<T>(targetUrl);
      setState({ data, loading: false, error: "" });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Error al cargar datos";
      setState((prev) => ({ ...prev, loading: false, error: msg }));
    }
  }, [url]);

  useEffect(() => {
    if (url) fetch();
  }, [url, fetch]);

  return { ...state, refetch: fetch };
}
