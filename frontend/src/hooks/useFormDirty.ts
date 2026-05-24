import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Compara el estado actual con un snapshot inicial (JSON).
 * Llama resetSnapshot() tras guardar exitosamente.
 */
export function useFormDirty<T>(initialValue: T) {
  const snapshotRef = useRef(JSON.stringify(initialValue));
  const [isDirty, setIsDirty] = useState(false);

  const checkDirty = useCallback((current: T) => {
    const dirty = JSON.stringify(current) !== snapshotRef.current;
    setIsDirty(dirty);
    return dirty;
  }, []);

  const resetSnapshot = useCallback((value: T) => {
    snapshotRef.current = JSON.stringify(value);
    setIsDirty(false);
  }, []);

  useEffect(() => {
    snapshotRef.current = JSON.stringify(initialValue);
    setIsDirty(false);
  }, [initialValue]);

  return { isDirty, checkDirty, resetSnapshot };
}
