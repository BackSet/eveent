import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getConvocatoriaCapabilities } from "@/lib/permissions";

export function useConvocatoriaCapabilities(convocatoria?: { creadoPorId?: number } | null) {
  const { user, hasPermission } = useAuth();

  return useMemo(
    () => getConvocatoriaCapabilities(hasPermission, convocatoria, user?.id),
    [hasPermission, convocatoria, user?.id]
  );
}
