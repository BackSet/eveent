import { Scale, Users2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { InfoHint } from "@/components/ui/info-hint";
import { Grupo } from "@/types";
import { GrupoSearchSelect } from "@/components/convocatoria/GrupoSearchSelect";
import type { LucideIcon } from "lucide-react";

export type ModoFormacion = "BALANCEADO" | "EQUIPOS_POR_GRUPO";

const MODOS_FORMACION: { value: ModoFormacion; label: string; description: string; icon: LucideIcon }[] = [
  {
    value: "BALANCEADO",
    label: "Balanceado",
    description: "Reparte automáticamente a los confirmados entre bandos parejos.",
    icon: Scale,
  },
  {
    value: "EQUIPOS_POR_GRUPO",
    label: "Equipos por grupo",
    description: "Un equipo por grupo; no mezcla jugadores de grupos distintos.",
    icon: Users2,
  },
];

interface TeamFormationFieldsProps {
  modoFormacion: string;
  onModoFormacionChange: (modo: ModoFormacion) => void;
  grupos: Grupo[];
  selectedGrupoIds: number[];
  onToggleGrupo: (grupoId: number) => void;
  onClearGrupos: () => void;
}

/**
 * Selector de modo de formación de equipos, compartido por convocatorias únicas y
 * ciclos recurrentes. En "Equipos por grupo" los grupos participantes definen tanto
 * los equipos como el acceso (los externos son rechazados al confirmar).
 */
export function TeamFormationFields({
  modoFormacion,
  onModoFormacionChange,
  grupos,
  selectedGrupoIds,
  onToggleGrupo,
  onClearGrupos,
}: TeamFormationFieldsProps) {
  return (
    <div className="space-y-2 pt-1">
      <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <span>Modo de formación</span>
        <InfoHint side="right" maxWidth={320}>
          <strong>Balanceado</strong> reparte automáticamente a los confirmados entre bandos.{" "}
          <strong>Equipos por grupo</strong> crea un equipo por grupo y mantiene juntos a sus
          jugadores; solo los miembros de los grupos participantes pueden confirmar.
        </InfoHint>
      </Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {MODOS_FORMACION.map((modo) => {
          const active = modoFormacion === modo.value;
          const Icon = modo.icon;
          return (
            <button
              key={modo.value}
              type="button"
              onClick={() => onModoFormacionChange(modo.value)}
              aria-pressed={active}
              className={`text-left rounded-lg border p-3 transition-colors flex gap-2.5 ${
                active
                  ? "border-primary bg-primary/[0.06] text-foreground ring-1 ring-primary/30"
                  : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
              }`}
            >
              <span
                className={`mt-0.5 h-7 w-7 shrink-0 rounded-md flex items-center justify-center ${
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon size={15} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-bold">{modo.label}</span>
                <span className="block text-[10px] leading-relaxed mt-0.5">{modo.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      {modoFormacion === "EQUIPOS_POR_GRUPO" && (
        <div className="space-y-2 animate-fadeIn rounded-lg border border-border bg-muted/20 p-3">
          <Label className="text-xs font-medium text-muted-foreground">
            Grupos participantes ({selectedGrupoIds.length})
          </Label>
          <GrupoSearchSelect
            grupos={grupos}
            selectedIds={selectedGrupoIds}
            onToggle={onToggleGrupo}
            onClear={onClearGrupos}
            multiple
            placeholder="Buscar grupo para añadir como equipo…"
          />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Cada grupo seleccionado crea un equipo con el mismo nombre del grupo. Solo sus miembros
            pueden confirmar (los externos son rechazados) y cada jugador queda en el equipo de su grupo.
            El <strong>Cupo máximo</strong> es el número de titulares por equipo; al llenarse, los siguientes
            del mismo grupo quedan en <strong>espera</strong> (ilimitada) y se promueven automáticamente si
            un titular cancela.
          </p>
        </div>
      )}
    </div>
  );
}
