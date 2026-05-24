import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { PlayerIdentity } from "@/components/ui/player-identity";
import { AsistenciaEstadoBadge } from "@/components/ui/entity-badges";
import {
  DataListRow,
  DataListCell,
  type DataListColumns,
} from "@/components/ui/data-list";
import type { Asistencia } from "@/types";

export const ASISTENCIA_TABLE_COLUMNS: DataListColumns = {
  jugador: 4,
  posicion: 2,
  bando: 2,
  invitado: 2,
  estado: 2,
};

interface AsistenciaTableRowProps {
  asis: Asistencia;
  showWaitlistIndex?: number;
  trailing?: ReactNode;
  className?: string;
}

export function AsistenciaTableRow({
  asis,
  showWaitlistIndex,
  trailing,
  className,
}: AsistenciaTableRowProps) {
  return (
    <DataListRow className={className}>
      <DataListCell label="Jugador" span={ASISTENCIA_TABLE_COLUMNS.jugador} priority="primary">
        <div className="flex items-start gap-2 min-w-0">
          {showWaitlistIndex != null && (
            <span className="text-[10px] text-muted-foreground font-black shrink-0 w-5 pt-0.5 text-center">
              {showWaitlistIndex + 1}
            </span>
          )}
          <PlayerIdentity
            nombre={asis.usuarioNombre}
            nombreExterno={asis.nombreExterno}
            username={asis.usuarioUsername}
            invitadoPorNombre={asis.invitadoPorNombre}
            variant="list"
            className="flex-1 min-w-0"
          />
        </div>
      </DataListCell>

      <DataListCell label="Posición" span={ASISTENCIA_TABLE_COLUMNS.posicion} priority="secondary">
        {asis.posicionesPreferidasNombres && asis.posicionesPreferidasNombres.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {asis.posicionesPreferidasNombres.map((name) => (
              <Badge key={name} variant="outline" className="text-[9px]">
                {name}
              </Badge>
            ))}
          </div>
        ) : asis.posicionPreferidaNombre ? (
          <Badge variant="outline" className="text-[9px]">
            {asis.posicionPreferidaNombre}
          </Badge>
        ) : (
          <span className="text-[10px] text-muted-foreground italic">Comodín</span>
        )}
      </DataListCell>

      <DataListCell label="Bando" span={ASISTENCIA_TABLE_COLUMNS.bando} priority="secondary">
        <span className="text-xs text-foreground font-medium">
          {asis.bandoNombre ?? "—"}
        </span>
      </DataListCell>

      <DataListCell label="Invitado por" span={ASISTENCIA_TABLE_COLUMNS.invitado} priority="detail">
        <span className="text-[11px] text-muted-foreground truncate block">
          {asis.invitadoPorNombre ?? (asis.nombreExterno ? "Externo" : "—")}
        </span>
      </DataListCell>

      <DataListCell label="Estado" span={ASISTENCIA_TABLE_COLUMNS.estado} align="right" priority="primary">
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <AsistenciaEstadoBadge estado={asis.estado} />
          {trailing}
        </div>
      </DataListCell>
    </DataListRow>
  );
}
