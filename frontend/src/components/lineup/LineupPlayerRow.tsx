import type { Asistencia, BandoConvocatoria } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlayerIdentity } from "@/components/ui/player-identity";
import { cn } from "@/lib/utils";

export type LineupRowVariant = "team" | "bench-comodin" | "bench-waitlist";

interface LineupPlayerRowProps {
  asistencia: Asistencia;
  variant?: LineupRowVariant;
  bandos?: BandoConvocatoria[];
  currentBandoId?: number | null;
  waitlistIndex?: number;
  canAssign?: boolean;
  onMove?: (asistenciaId: number, bandoId: number) => void;
}

function PositionChips({ asistencia }: { asistencia: Asistencia }) {
  const names =
    asistencia.posicionesPreferidasNombres && asistencia.posicionesPreferidasNombres.length > 0
      ? asistencia.posicionesPreferidasNombres
      : asistencia.posicionPreferidaNombre
        ? [asistencia.posicionPreferidaNombre]
        : [];

  if (names.length === 0) {
    return (
      <span className="lineup-position-chip lineup-position-chip--muted">Sin posición</span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1 justify-end">
      {names.slice(0, 2).map((name) => (
        <span key={name} className="lineup-position-chip">
          {name}
        </span>
      ))}
      {names.length > 2 && (
        <span className="lineup-position-chip lineup-position-chip--muted">+{names.length - 2}</span>
      )}
    </div>
  );
}

function AssignSelect({
  asistencia,
  bandos,
  currentBandoId,
  assignOnly,
  onMove,
}: {
  asistencia: Asistencia;
  bandos: BandoConvocatoria[];
  currentBandoId?: number | null;
  assignOnly?: boolean;
  onMove: (asistenciaId: number, bandoId: number) => void;
}) {
  if (assignOnly) {
    return (
      <Select
        key={`assign-${asistencia.id}`}
        onValueChange={(v) => {
          if (v) onMove(asistencia.id, Number(v));
        }}
      >
        <SelectTrigger className="lineup-assign-select h-7 text-[10px] font-semibold border-border bg-background shadow-none focus:ring-1 focus:ring-ring/30">
          <SelectValue placeholder="Asignar a…" />
        </SelectTrigger>
        <SelectContent>
          {bandos.map((b) => (
            <SelectItem key={b.id} value={String(b.id)} className="text-xs">
              {b.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const value =
    currentBandoId != null && currentBandoId > 0 ? String(currentBandoId) : "unassigned";

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        onMove(asistencia.id, v === "unassigned" ? -1 : Number(v));
      }}
    >
      <SelectTrigger className="lineup-assign-select h-7 text-[10px] font-semibold border-border bg-background shadow-none focus:ring-1 focus:ring-ring/30">
        <SelectValue placeholder="Asignar a…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned" className="text-xs">
          Reserva / Sin equipo
        </SelectItem>
        {bandos.map((b) => (
          <SelectItem key={b.id} value={String(b.id)} className="text-xs">
            {b.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function LineupPlayerRow({
  asistencia,
  variant = "team",
  bandos = [],
  currentBandoId,
  waitlistIndex,
  canAssign = false,
  onMove,
}: LineupPlayerRowProps) {
  const hasToolsColumn =
    variant !== "bench-waitlist" || (canAssign && onMove != null && bandos.length > 0);

  return (
    <div
      className={cn(
        "lineup-player-row",
        variant === "bench-comodin" && "lineup-player-row--comodin",
        variant === "bench-waitlist" && "lineup-player-row--waitlist"
      )}
    >
      <div className="lineup-player-row-body">
        <div className="lineup-player-row-main">
          {variant === "bench-waitlist" && waitlistIndex != null && (
            <span className="lineup-waitlist-index" aria-hidden>
              {waitlistIndex}
            </span>
          )}
          <PlayerIdentity
            nombre={asistencia.usuarioNombre}
            username={asistencia.usuarioUsername}
            nombreExterno={asistencia.nombreExterno}
            invitadoPorNombre={asistencia.invitadoPorNombre}
            variant="lineup"
            className="flex-1 min-w-0"
          />
        </div>

        {hasToolsColumn && (
          <div className="lineup-player-row-tools">
            {variant !== "bench-waitlist" && <PositionChips asistencia={asistencia} />}
            {variant === "bench-waitlist" && (
              <span className="lineup-position-chip lineup-position-chip--waitlist">En espera</span>
            )}
            {canAssign && onMove && bandos.length > 0 && (
              <AssignSelect
                asistencia={asistencia}
                bandos={bandos}
                currentBandoId={currentBandoId ?? asistencia.bandoId}
                assignOnly={variant === "bench-comodin"}
                onMove={onMove}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
