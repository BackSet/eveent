import { useMemo, useState } from "react";
import { Check, Search, X, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Grupo } from "@/types";

interface GrupoSearchSelectProps {
  grupos: Grupo[];
  selectedIds: number[];
  onToggle: (grupoId: number) => void;
  multiple?: boolean;
  onClear?: () => void;
  placeholder?: string;
  emptyLabel?: string;
}

/**
 * Selector-buscador de grupos. En modo `multiple` permite elegir varios (equipos por grupo);
 * en modo simple elige uno (grupo de invitación en balanceado). Muestra los seleccionados
 * como chips y filtra la lista por nombre.
 */
export function GrupoSearchSelect({
  grupos,
  selectedIds,
  onToggle,
  multiple = false,
  onClear,
  placeholder = "Buscar grupo…",
  emptyLabel = "No hay grupos disponibles.",
}: GrupoSearchSelectProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return grupos;
    return grupos.filter((g) => g.nombre.toLowerCase().includes(q));
  }, [grupos, query]);

  const selectedGrupos = useMemo(
    () => grupos.filter((g) => selectedIds.includes(g.id)),
    [grupos, selectedIds]
  );

  return (
    <div className="space-y-2">
      {/* Chips de seleccionados */}
      {selectedGrupos.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {selectedGrupos.map((g) => (
            <span
              key={g.id}
              className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/[0.06] pl-2 pr-1 py-0.5 text-[11px] font-semibold text-foreground"
            >
              {g.nombre}
              <button
                type="button"
                onClick={() => onToggle(g.id)}
                aria-label={`Quitar ${g.nombre}`}
                className="h-4 w-4 rounded-full hover:bg-destructive/10 hover:text-destructive flex items-center justify-center"
              >
                <X size={11} />
              </button>
            </span>
          ))}
          {multiple && selectedGrupos.length > 1 && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-[10px] font-medium text-muted-foreground hover:text-foreground ml-0.5"
            >
              Limpiar
            </button>
          )}
        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/50">
          <Search size={13} />
        </span>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-9 h-9 text-xs"
          aria-label="Buscar grupo"
        />
      </div>

      {/* Lista filtrable */}
      {grupos.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">{emptyLabel}</p>
      ) : (
        <div className="border border-border rounded-lg max-h-[200px] overflow-y-auto divide-y divide-border/60">
          {filtered.map((grupo) => {
            const selected = selectedIds.includes(grupo.id);
            return (
              <button
                key={grupo.id}
                type="button"
                onClick={() => onToggle(grupo.id)}
                aria-pressed={selected}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left transition-colors ${
                  selected ? "bg-primary/[0.05]" : "hover:bg-muted/50"
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Users size={13} className="shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold text-foreground">{grupo.nombre}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      {grupo.miembroIds?.length || 0} jugadores
                    </span>
                  </span>
                </span>
                <span
                  className={`h-4 w-4 flex items-center justify-center shrink-0 border ${
                    multiple ? "rounded" : "rounded-full"
                  } ${selected ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}
                >
                  {selected && <Check size={10} />}
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">Sin resultados</p>
          )}
        </div>
      )}
    </div>
  );
}
