import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { formatDateTime } from "@/lib/formatDate";
import { Badge } from "@/components/ui/badge";
import { AutoAceptadaBadge } from "@/components/ui/auto-aceptada-badge";
import { DataListSkeleton } from "@/components/ui/page-skeletons";
import { DeporteIcon } from "@/components/ui/page-icon";
import { PageHeader } from "@/components/ui/page-header";
import { PageIconKind } from "@/lib/iconography";
import { Button } from "@/components/ui/button";
import { PresetChips } from "@/components/ui/preset-chips";
import { InfoHint } from "@/components/ui/info-hint";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DataListShell,
  DataListHeader,
  DataListBody,
  DataListSection,
  DataListRow,
  DataListCell,
  DataListActions,
  type DataListColumns,
} from "@/components/ui/data-list";
import {
  AsistenciaEstadoBadge,
  ConvocatoriaEstadoBadge,
  EventProximityPill,
} from "@/components/ui/entity-badges";
import {
  ASISTENCIA_FILTER_LABELS,
  buildAsistenciaSections,
  matchesAsistenciaFilter,
  type AsistenciaQuickFilter,
} from "@/lib/asistenciaList";
import {
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock4,
  Search,
  Eye,
  Users,
} from "lucide-react";
import type { Asistencia } from "@/types";

const ASIST_LIST_COLUMNS: DataListColumns = {
  convocatoria: 4,
  respuesta: 2,
  cuando: 3,
  estadoEvento: 2,
  detalle: 1,
};

export default function MisAsistenciasPage() {
  const { data: asistencias, loading } = useApi<Asistencia[]>("/api/asistencias/mis-asistencias");
  const navigate = useNavigate();
  const [quickFilter, setQuickFilter] = useState<AsistenciaQuickFilter>("PROXIMAS");
  const [pastCollapsed, setPastCollapsed] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const list = asistencias ?? [];

  const counts = useMemo(
    () => ({
      asistire: list.filter((a) => a.estado === "ASISTIRE").length,
      noAsistire: list.filter((a) => a.estado === "NO_ASISTIRE").length,
      pendientes: list.filter(
        (a) => a.estado === "PENDIENTE" || a.estado === "LISTA_ESPERA"
      ).length,
      proximas: list.filter((a) => matchesAsistenciaFilter(a, "PROXIMAS")).length,
    }),
    [list]
  );

  const searched = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (a) =>
        (a.convocatoriaTitulo ?? "").toLowerCase().includes(q) ||
        (a.convocatoriaLugar ?? "").toLowerCase().includes(q) ||
        (a.convocatoriaDeporteNombre ?? "").toLowerCase().includes(q) ||
        (a.bandoNombre ?? "").toLowerCase().includes(q)
    );
  }, [list, searchQuery]);

  const sections = useMemo(
    () => buildAsistenciaSections(searched, quickFilter),
    [searched, quickFilter]
  );

  const totalVisible = sections.reduce((n, s) => n + s.items.length, 0);

  const renderRow = (asis: Asistencia) => (
    <DataListRow
      key={asis.id}
      onClick={() => navigate(`/convocatorias/${asis.convocatoriaId}`)}
    >
      <DataListCell label="Convocatoria" span={ASIST_LIST_COLUMNS.convocatoria} priority="primary">
        <div className="flex items-start gap-3 min-w-0">
          <DeporteIcon
            nombre={asis.convocatoriaDeporteNombre}
            size={20}
            className="mt-0.5 text-foreground/80"
          />
          <div className="space-y-0.5 min-w-0">
            <div className="text-sm font-semibold text-foreground group-hover:text-primary group-hover:underline decoration-1 underline-offset-2 transition-colors truncate">
              {asis.convocatoriaTitulo ?? "Convocatoria"}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Respondiste el {formatDateTime(asis.fechaRespuesta)}
            </p>
            {asis.convocatoriaDeporteNombre && (
              <span className="text-[10px] font-medium text-foreground bg-secondary px-2 py-0.5 rounded border border-border uppercase md:hidden">
                {asis.convocatoriaDeporteNombre}
              </span>
            )}
          </div>
        </div>
      </DataListCell>

      <DataListCell label="Mi respuesta" span={ASIST_LIST_COLUMNS.respuesta} priority="primary">
        <div className="flex flex-wrap gap-1.5 items-center">
          <AsistenciaEstadoBadge estado={asis.estado} />
          {asis.autoAceptada && <AutoAceptadaBadge />}
          {asis.posicionPreferidaNombre && (
            <Badge variant="outline" className="text-[8px] px-1 py-0 uppercase">
              {asis.posicionPreferidaNombre}
            </Badge>
          )}
        </div>
      </DataListCell>

      <DataListCell label="Cuándo y dónde" span={ASIST_LIST_COLUMNS.cuando} priority="secondary">
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Calendar size={12} className="opacity-70 shrink-0" />
            <span className="font-medium text-foreground/90">
              {asis.convocatoriaFechaHora
                ? formatDateTime(asis.convocatoriaFechaHora)
                : "Fecha por confirmar"}
            </span>
            <EventProximityPill
              schedule={{
                fechaHora: asis.convocatoriaFechaHora,
                estado: asis.convocatoriaEstado,
              }}
            />
          </div>
          {asis.convocatoriaLugar && (
            <div className="flex items-center gap-1.5">
              <MapPin size={12} className="opacity-70 shrink-0" />
              <span className="truncate max-w-[220px]">{asis.convocatoriaLugar}</span>
            </div>
          )}
          {asis.bandoNombre && (
            <div className="flex items-center gap-1.5">
              <Users size={12} className="opacity-70 shrink-0" />
              <span>
                Bando: <span className="font-semibold text-foreground">{asis.bandoNombre}</span>
              </span>
            </div>
          )}
        </div>
      </DataListCell>

      <DataListCell label="Estado del evento" span={ASIST_LIST_COLUMNS.estadoEvento} align="right" priority="primary">
        {asis.convocatoriaEstado ? (
          <ConvocatoriaEstadoBadge estado={asis.convocatoriaEstado} />
        ) : (
          <span className="text-[10px] text-muted-foreground">—</span>
        )}
      </DataListCell>

      <DataListActions span={ASIST_LIST_COLUMNS.detalle}>
        <Link
          to={`/convocatorias/${asis.convocatoriaId}`}
          aria-label={`Ver detalle de ${asis.convocatoriaTitulo ?? "la convocatoria"}`}
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground group-hover:text-primary transition-colors"
        >
          <Eye size={13} />
        </Link>
      </DataListActions>
    </DataListRow>
  );

  return (
    <div className="page-shell space-y-6 animate-fadeIn">
      <PageHeader
        iconKind={PageIconKind.MIS_ASISTENCIAS}
        title="Mis Asistencias"
        description="Tus respuestas a convocatorias, ordenadas por la fecha del partido. Por defecto verás los eventos más cercanos."
      />

      {list.length > 0 && (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 border-t border-b border-border py-4 text-sm font-medium">
          <div className="flex items-center gap-3 px-2">
            <div className="stat-tile-icon stat-tile-icon--info">
              <Calendar size={16} />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold leading-none">
                Próximos
              </p>
              <p className="text-base font-extrabold mt-0.5 text-foreground">{counts.proximas}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-2 border-t sm:border-t-0 sm:border-l border-border pt-3 sm:pt-0 sm:pl-4">
            <div className="stat-tile-icon stat-tile-icon--success">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold leading-none">
                Asistiré
              </p>
              <p className="text-base font-extrabold mt-0.5 text-foreground">{counts.asistire}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-2 border-t sm:border-t-0 sm:border-l border-border pt-3 sm:pt-0 sm:pl-4">
            <div className="stat-tile-icon stat-tile-icon--warning">
              <Clock4 size={16} />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold leading-none">
                Pendiente
              </p>
              <p className="text-base font-extrabold mt-0.5 text-foreground">{counts.pendientes}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-2 border-t sm:border-t-0 sm:border-l border-border pt-3 sm:pt-0 sm:pl-4">
            <div className="h-8 w-8 rounded flex items-center justify-center shrink-0 bg-destructive/10 text-destructive">
              <XCircle size={16} />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold leading-none">
                No asistiré
              </p>
              <p className="text-base font-extrabold mt-0.5 text-foreground">{counts.noAsistire}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/70" />
          <input
            type="text"
            placeholder="Buscar por convocatoria, lugar o deporte..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 h-9 w-full rounded-md border border-border bg-background text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <Link to="/convocatorias">
          <Button variant="outline" size="sm" className="h-9 text-xs font-semibold shrink-0">
            Ver convocatorias
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        <PresetChips
          activeId={quickFilter}
          showIcon={false}
          options={(
            ["PROXIMAS", "SEMANA", "ASISTIRE", "PENDIENTES", "TODAS", "PASADAS"] as AsistenciaQuickFilter[]
          ).map((id) => ({
            id,
            label: ASISTENCIA_FILTER_LABELS[id],
            onClick: () => {
              setQuickFilter(id);
              if (id === "PASADAS") setPastCollapsed(false);
              if (id === "PROXIMAS") setPastCollapsed(true);
            },
          }))}
        />
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
          <InfoHint side="right" maxWidth={300}>
            La lista se ordena por la <strong>fecha del partido</strong>, no por cuándo respondiste.
            Usa <strong>Próximos partidos</strong> para ver lo que viene y <strong>Historial</strong>{" "}
            para partidos ya jugados o cancelados.
          </InfoHint>
          <span>
            {totalVisible} resultado{totalVisible !== 1 ? "s" : ""}
            {searchQuery ? " con tu búsqueda" : ` · «${ASISTENCIA_FILTER_LABELS[quickFilter]}»`}
          </span>
        </p>
      </div>

      {loading ? (
        <DataListSkeleton
          columns={ASIST_LIST_COLUMNS}
          labels={{
            convocatoria: "Convocatoria",
            respuesta: "Mi respuesta",
            cuando: "Cuándo y dónde",
            estadoEvento: "Estado del evento",
            detalle: "",
          }}
          rowCount={7}
        />
      ) : (
        <DataListShell className="panel-shell text-[13px]">
          <DataListHeader
            columns={ASIST_LIST_COLUMNS}
            labels={{
              convocatoria: "Convocatoria",
              respuesta: "Mi respuesta",
              cuando: "Cuándo y dónde",
              estadoEvento: "Estado del evento",
              detalle: "",
            }}
          />
          <DataListBody>
            {sections.map((section) => {
              const isPastSection = section.id === "PASADAS" && quickFilter === "TODAS";
              const collapsed = isPastSection && pastCollapsed;
              return (
                <DataListSection
                  key={section.id}
                  title={section.label}
                  count={section.items.length}
                  collapsible={isPastSection}
                  collapsed={collapsed}
                  onToggleCollapse={
                    isPastSection ? () => setPastCollapsed((v) => !v) : undefined
                  }
                >
                  {!collapsed && section.items.map((asis) => renderRow(asis))}
                </DataListSection>
              );
            })}

            {totalVisible === 0 && (
              <EmptyState
                className="border-0 rounded-none py-12"
                variant={searchQuery ? "search" : "default"}
                icon={<Calendar size={32} />}
                title={
                  searchQuery
                    ? "Sin resultados para tu búsqueda"
                    : list.length === 0
                      ? "Aún no has respondido a ninguna convocatoria"
                      : "Ninguna asistencia con este filtro"
                }
                description={
                  searchQuery
                    ? "Prueba con otras palabras clave o limpia el campo de búsqueda."
                    : list.length === 0
                      ? "Cuando confirmes o rechaces tu asistencia en una convocatoria, quedará registrada aquí."
                      : `Prueba otro filtro (p. ej. «${ASISTENCIA_FILTER_LABELS.TODAS}» o «${ASISTENCIA_FILTER_LABELS.PASADAS}»).`
                }
                action={
                  list.length === 0 ? (
                    <Link to="/convocatorias">
                      <Button className="h-8 text-xs">Ver convocatorias disponibles</Button>
                    </Link>
                  ) : searchQuery ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSearchQuery("")}
                      className="h-8 px-3 text-xs font-semibold"
                    >
                      Limpiar búsqueda
                    </Button>
                  ) : undefined
                }
              />
            )}
          </DataListBody>
        </DataListShell>
      )}
    </div>
  );
}
