import type { CSSProperties } from "react";
import type { Asistencia, BandoConvocatoria } from "@/types";
import { getTeamColorHex } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Users } from "lucide-react";
import { LineupPlayerRow } from "./LineupPlayerRow";

interface TeamColumnProps {
  team: BandoConvocatoria;
  players: Asistencia[];
  bandos: BandoConvocatoria[];
  isOrganizador?: boolean;
  canAssign?: boolean;
  onEditTeam?: (team: BandoConvocatoria) => void;
  onDeleteTeam?: (teamId: number, nombre: string) => void;
  onMovePlayer?: (asistenciaId: number, bandoId: number) => void;
}

export function TeamColumn({
  team,
  players,
  bandos,
  isOrganizador = false,
  canAssign = false,
  onEditTeam,
  onDeleteTeam,
  onMovePlayer,
}: TeamColumnProps) {
  const teamColorHex = getTeamColorHex(team.color || "");

  return (
    <article
      className="lineup-team"
      style={
        {
          "--lineup-team-color": teamColorHex,
        } as CSSProperties
      }
    >
      <header className="lineup-team-header group">
        <div className="lineup-team-header-main">
          <span
            className="lineup-team-swatch"
            style={{ backgroundColor: teamColorHex }}
            aria-hidden
          />
          <div className="min-w-0">
            <h3 className="lineup-team-name truncate">{team.nombre}</h3>
            <p className="lineup-team-meta">
              <Users size={11} className="inline shrink-0 opacity-70" />
              <span>
                {players.length} jugador{players.length === 1 ? "" : "es"}
              </span>
            </p>
          </div>
          <span className="lineup-team-count">{players.length}</span>
        </div>
        {isOrganizador && onEditTeam && onDeleteTeam && (
          <div className="lineup-team-actions opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="h-7 w-7 text-muted-foreground hover:bg-background/80"
              onClick={() => onEditTeam(team)}
              aria-label={`Editar ${team.nombre}`}
            >
              <Edit size={12} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="h-7 w-7 text-destructive hover:bg-destructive/10"
              onClick={() => onDeleteTeam(team.id, team.nombre)}
              aria-label={`Eliminar ${team.nombre}`}
            >
              <Trash2 size={12} />
            </Button>
          </div>
        )}
      </header>

      <div className="lineup-team-roster custom-column-scrollbar">
        {players.length === 0 ? (
          <div className="lineup-team-empty">
            <p className="text-xs font-medium text-muted-foreground">Sin jugadores asignados</p>
            <p className="text-[10px] text-muted-foreground/80 mt-1">
              Asigna jugadores desde la reserva o mueve jugadores de otro equipo.
            </p>
          </div>
        ) : (
          players.map((asis) => (
            <LineupPlayerRow
              key={asis.id}
              asistencia={asis}
              variant="team"
              bandos={bandos}
              currentBandoId={asis.bandoId}
              canAssign={canAssign}
              onMove={onMovePlayer}
            />
          ))
        )}
      </div>
    </article>
  );
}
