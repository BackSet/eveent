import type { Asistencia, BandoConvocatoria } from "@/types";
import { Compass, Clock } from "lucide-react";
import { InfoHint } from "@/components/ui/info-hint";
import { LineupPlayerRow } from "./LineupPlayerRow";

interface LineupBenchProps {
  comodines: Asistencia[];
  waitlist: Asistencia[];
  bandos: BandoConvocatoria[];
  canAssign?: boolean;
  onMovePlayer?: (asistenciaId: number, bandoId: number) => void;
}

export function LineupBench({
  comodines,
  waitlist,
  bandos,
  canAssign = false,
  onMovePlayer,
}: LineupBenchProps) {
  if (comodines.length === 0 && waitlist.length === 0) return null;

  return (
    <div className="lineup-bench">
      {comodines.length > 0 && (
        <section className="lineup-bench-section lineup-bench-section--comodin">
          <header className="lineup-bench-header">
            <div className="flex items-center gap-1.5 min-w-0">
              <Compass size={14} className="shrink-0 text-tone-warning" />
              <h4 className="lineup-bench-title">Reserva táctica · Comodines</h4>
              <InfoHint side="top" maxWidth={300} className="text-tone-warning">
                Jugadores confirmados sin equipo asignado. Puedes moverlos a cualquier bando el día
                del partido.
              </InfoHint>
            </div>
            <span className="lineup-bench-badge lineup-bench-badge--amber">{comodines.length}</span>
          </header>
          <div className="lineup-bench-list">
            {comodines.map((asis) => (
              <LineupPlayerRow
                key={asis.id}
                asistencia={asis}
                variant="bench-comodin"
                bandos={bandos}
                canAssign={canAssign}
                onMove={onMovePlayer}
              />
            ))}
          </div>
        </section>
      )}

      {waitlist.length > 0 && (
        <section className="lineup-bench-section lineup-bench-section--waitlist">
          <header className="lineup-bench-header">
            <div className="flex items-center gap-1.5 min-w-0">
              <Clock size={14} className="shrink-0 text-tone-info" />
              <h4 className="lineup-bench-title">Sala de espera</h4>
              <InfoHint side="top" maxWidth={300} className="text-tone-info">
                Cola por orden de llegada. Si alguien cancela, el primero pasa a confirmado
                automáticamente.
              </InfoHint>
            </div>
            <span className="lineup-bench-badge lineup-bench-badge--blue">{waitlist.length}</span>
          </header>
          <div className="lineup-bench-list">
            {waitlist.map((asis, idx) => (
              <LineupPlayerRow
                key={asis.id}
                asistencia={asis}
                variant="bench-waitlist"
                waitlistIndex={idx + 1}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
