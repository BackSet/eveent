import type { Asistencia, BandoConvocatoria } from "@/types";
import { TeamColumn } from "./TeamColumn";
import { LineupBench } from "./LineupBench";

export interface TeamPlayersEntry {
  team: BandoConvocatoria;
  players: Asistencia[];
}

interface LineupBoardProps {
  teamPlayersMap: TeamPlayersEntry[];
  comodines: Asistencia[];
  waitlist: Asistencia[];
  bandos: BandoConvocatoria[];
  isOrganizador?: boolean;
  canAssign?: boolean;
  onEditTeam?: (team: BandoConvocatoria) => void;
  onDeleteTeam?: (teamId: number, nombre: string) => void;
  onMovePlayer?: (asistenciaId: number, bandoId: number) => void;
}

function LineupVsDivider() {
  return (
    <div className="lineup-vs" aria-hidden>
      <span className="lineup-vs-label">VS</span>
    </div>
  );
}

export function LineupBoard({
  teamPlayersMap,
  comodines,
  waitlist,
  bandos,
  isOrganizador = false,
  canAssign = false,
  onEditTeam,
  onDeleteTeam,
  onMovePlayer,
}: LineupBoardProps) {
  const isMatchup = teamPlayersMap.length === 2;

  const teamColumnProps = {
    bandos,
    isOrganizador,
    canAssign,
    onEditTeam,
    onDeleteTeam,
    onMovePlayer,
  };

  return (
    <div className="lineup-board-wrapper space-y-6">
      <div
        className={
          isMatchup ? "lineup-board lineup-board--matchup" : "lineup-board lineup-board--grid"
        }
      >
        {isMatchup ? (
          <>
            <TeamColumn
              team={teamPlayersMap[0].team}
              players={teamPlayersMap[0].players}
              {...teamColumnProps}
            />
            <LineupVsDivider />
            <TeamColumn
              team={teamPlayersMap[1].team}
              players={teamPlayersMap[1].players}
              {...teamColumnProps}
            />
          </>
        ) : (
          teamPlayersMap.map(({ team, players }) => (
            <TeamColumn
              key={team.id}
              team={team}
              players={players}
              {...teamColumnProps}
            />
          ))
        )}
      </div>

      <LineupBench
        comodines={comodines}
        waitlist={waitlist}
        bandos={bandos}
        canAssign={canAssign}
        onMovePlayer={onMovePlayer}
      />
    </div>
  );
}
