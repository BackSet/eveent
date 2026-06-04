import type { ReactNode } from "react";
import api from "@/services/api";
import type { Asistencia, Convocatoria } from "@/types";

export async function countInscritosConvocatoria(convocatoriaId: number): Promise<number> {
  const { data } = await api.get<Asistencia[]>(`/api/convocatorias/${convocatoriaId}/asistencias`);
  return data.filter(
    (a) => a.estado === "ASISTIRE" || a.estado === "LISTA_ESPERA"
  ).length;
}

export function buildConvocatoriaDeleteConfirm(
  conv: Pick<Convocatoria, "titulo" | "estado">,
  inscritosCount = 0
): { title: string; description: ReactNode } {
  const { titulo, estado } = conv;

  if (estado === "BORRADOR") {
    return {
      title: "Eliminar borrador",
      description: (
        <>
          Vas a eliminar el borrador <strong>{titulo}</strong>. Esta acción no se puede deshacer.
        </>
      ),
    };
  }

  if (estado === "ABIERTA") {
    return {
      title: "Eliminar convocatoria abierta",
      description: (
        <>
          Vas a eliminar permanentemente <strong>{titulo}</strong> y todos sus datos (asistencias,
          bandos, etc.). Esta acción no se puede deshacer.
          {inscritosCount > 0 && (
            <>
              {" "}
              Hay <strong>{inscritosCount}</strong> jugador
              {inscritosCount === 1 ? "" : "es"} inscrito
              {inscritosCount === 1 ? "" : "s"}; se perderán sus respuestas.
            </>
          )}
        </>
      ),
    };
  }

  return {
    title: "Eliminar convocatoria cancelada",
    description: (
      <>
        Vas a eliminar <strong>{titulo}</strong> y sus datos asociados. Esta acción no se puede
        deshacer.
      </>
    ),
  };
}
