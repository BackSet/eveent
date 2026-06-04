import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "@/services/api";
import { formatDateTime } from "@/lib/formatDate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ConvocatoriaEstadoCell,
  EventProximityPill,
  RecurrenteEstadoBadge,
  TipoInvitacionPill,
  CupoLabel,
} from "@/components/ui/entity-badges";
import { isBorradorConFechaPasada } from "@/lib/convocatoriaDraft";
import {
  puedePublicarBorrador,
  TOOLTIP_PUBLICAR_BLOQUEADO,
  TOOLTIP_PUBLICAR_BORRADOR,
} from "@/lib/convocatoriaDraft";
import { getApiErrorMessage } from "@/lib/constants";
import { cn, logError } from "@/lib/utils";
import { DataListSkeleton } from "@/components/ui/page-skeletons";
import { DeporteIcon } from "@/components/ui/page-icon";
import { PageHeader } from "@/components/ui/page-header";
import { PageIconKind } from "@/lib/iconography";
import { PresetChips } from "@/components/ui/preset-chips";
import {
  Plus,
  Calendar,
  MapPin,
  Repeat,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  KanbanSquare,
  Search,
  Eye,
} from "lucide-react";
import {
  buildConvocatoriaSections,
  matchesQuickFilter,
  QUICK_FILTER_LABELS,
  type ConvocatoriaQuickFilter,
} from "@/lib/convocatoriaList";
import { useAuth } from "@/hooks/useAuth";
import { Convocatoria, ConfiguracionRecurrente } from "@/types";
import { humanizeRRule } from "@/lib/rruleHumanizer";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { InfoHint } from "@/components/ui/info-hint";
import { Tooltip } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import {
  buildConvocatoriaDeleteConfirm,
  countInscritosConvocatoria,
} from "@/lib/convocatoriaDelete";
import {
  canCreateConvocatorias,
  canCancelConvocatoria,
  canDeleteConvocatoria,
  canDeleteRecurrente,
  canManageRecurrente,
  canManageConvocatoriasGlobally,
  canPublishConvocatoria,
  filterConvocatoriasForUser,
} from "@/lib/permissions";

const CONV_LIST_COLUMNS: DataListColumns = {
  evento: 4,
  acceso: 2,
  cuando: 2,
  cupo: 1,
  estado: 1,
  acciones: 2,
};

const REC_LIST_COLUMNS: DataListColumns = {
  regla: 4,
  deporte: 2,
  programacion: 2,
  cupo: 1,
  estado: 1,
  acciones: 2,
};

export default function ConvocatoriasPage() {
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [recurrentes, setRecurrentes] = useState<ConfiguracionRecurrente[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecurrentes, setLoadingRecurrentes] = useState(false);
  const [quickFilter, setQuickFilter] = useState<ConvocatoriaQuickFilter>("PROXIMAS");
  const [pastCollapsed, setPastCollapsed] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"CONVOCATORIAS" | "PLANTILLAS">("CONVOCATORIAS");
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  const canCreate = canCreateConvocatorias(hasPermission);
  const canManageAny = canManageConvocatoriasGlobally(hasPermission);
  const showOrganizerFeatures = canCreate || canManageAny;

  const handleDeleteConvocatoria = async (e: React.MouseEvent, conv: Convocatoria) => {
    e.stopPropagation();
    let inscritosCount = 0;
    if (conv.estado === "ABIERTA") {
      try {
        inscritosCount = await countInscritosConvocatoria(conv.id);
      } catch {
        /* confirmación sin conteo si falla la carga */
      }
    }
    const { title, description } = buildConvocatoriaDeleteConfirm(conv, inscritosCount);
    const ok = await confirm({
      title,
      description,
      confirmLabel: "Sí, eliminar",
      cancelLabel: "Cancelar",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`/api/convocatorias/${conv.id}`);
      toast.success(
        conv.estado === "BORRADOR" ? "Borrador eliminado" : "Convocatoria eliminada"
      );
      fetchConvocatorias();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err) || "No se pudo eliminar la convocatoria.");
      logError("Error al eliminar convocatoria", err);
    }
  };

  const handleAbrir = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await api.put(`/api/convocatorias/${id}/abrir`);
      toast.success("Convocatoria abierta", "Ahora los jugadores pueden confirmar asistencia.");
      fetchConvocatorias();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err) || "No se pudo abrir la convocatoria.");
      logError("Error al abrir convocatoria", err);
    }
  };

  const handleToggleActivoRecurrente = async (e: React.MouseEvent, id: number, currentActivo: boolean) => {
    e.stopPropagation();
    try {
      await api.put(`/api/configuraciones-recurrentes/${id}`, { activo: !currentActivo });
      toast.success(
        currentActivo ? "Regla pausada" : "Regla activada",
        currentActivo
          ? "Dejará de generar nuevas convocatorias hasta que la reactives."
          : "Comenzará a generar convocatorias automáticamente."
      );
      fetchRecurrentes();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err) || "No se pudo cambiar el estado de la regla.");
      logError("Error al cambiar estado de la regla", err);
    }
  };

  const handleCancelar = async (e: React.MouseEvent, id: number, titulo: string) => {
    e.stopPropagation();
    const ok = await confirm({
      title: "Cancelar convocatoria",
      description: (
        <>
          La convocatoria <strong>{titulo}</strong> quedará marcada como cancelada y los jugadores
          confirmados perderán su lugar. ¿Deseas continuar?
        </>
      ),
      confirmLabel: "Sí, cancelar",
      cancelLabel: "Volver",
      variant: "warning",
    });
    if (!ok) return;
    try {
      await api.put(`/api/convocatorias/${id}/cancelar`);
      toast.success("Convocatoria cancelada");
      fetchConvocatorias();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err) || "No se pudo cancelar la convocatoria.");
      logError("Error al cancelar convocatoria", err);
    }
  };

  const fetchConvocatorias = useCallback(async () => {
    try {
      const { data } = await api.get<Convocatoria[]>("/api/convocatorias");
      setConvocatorias(filterConvocatoriasForUser(data, hasPermission, user?.id));
    } catch (err) {
      logError("Error al cargar convocatorias", err);
    } finally {
      setLoading(false);
    }
  }, [hasPermission, user?.id]);

  const fetchRecurrentes = useCallback(async () => {
    setLoadingRecurrentes(true);
    try {
      const { data } = await api.get("/api/configuraciones-recurrentes");
      setRecurrentes(data);
    } catch (err) {
      logError("Error al cargar recurrentes", err);
    } finally {
      setLoadingRecurrentes(false);
    }
  }, []);

  useEffect(() => {
    fetchConvocatorias();
    if (canCreate) {
      fetchRecurrentes();
    }
  }, [fetchConvocatorias, fetchRecurrentes, canCreate]);



  const handleDeleteRecurrencia = async (id: number, titulo: string) => {
    const ok = await confirm({
      title: "Eliminar regla recurrente",
      description: (
        <>
          Vas a eliminar la regla <strong>{titulo}</strong>. Las convocatorias ya generadas se
          mantendrán, pero no se generarán nuevas. Esta acción no se puede deshacer.
        </>
      ),
      confirmLabel: "Sí, eliminar regla",
      cancelLabel: "Cancelar",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`/api/configuraciones-recurrentes/${id}`);
      toast.success("Regla eliminada");
      fetchRecurrentes();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err) || "No se pudo eliminar la regla recurrente.");
      logError("Error", err);
    }
  };

  const searchMatch = useCallback(
    (conv: Convocatoria) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        conv.titulo.toLowerCase().includes(q) ||
        (conv.lugar || "").toLowerCase().includes(q) ||
        (conv.deporteNombre || "").toLowerCase().includes(q)
      );
    },
    [searchQuery]
  );

  const searchedConvocatorias = useMemo(
    () => convocatorias.filter(searchMatch),
    [convocatorias, searchMatch]
  );

  const listSections = useMemo(
    () =>
      buildConvocatoriaSections(searchedConvocatorias, quickFilter, {
        includeBorradores: showOrganizerFeatures,
        groupPast: quickFilter !== "PASADAS",
      }),
    [searchedConvocatorias, quickFilter, showOrganizerFeatures]
  );

  const proximasCount = useMemo(
    () =>
      convocatorias.filter((c) =>
        matchesQuickFilter(c, "PROXIMAS", { includeBorradores: showOrganizerFeatures })
      ).length,
    [convocatorias, showOrganizerFeatures]
  );

  const borradoresCount = useMemo(
    () => convocatorias.filter((c) => matchesQuickFilter(c, "BORRADORES")).length,
    [convocatorias]
  );

  const vencidosCount = useMemo(
    () => convocatorias.filter((c) => matchesQuickFilter(c, "VENCIDOS")).length,
    [convocatorias]
  );

  const quickFilterOptions = useMemo(() => {
    const base: ConvocatoriaQuickFilter[] = [
      "PROXIMAS",
      "SEMANA",
      "ABIERTAS",
      "TODAS",
      "PASADAS",
    ];
    if (showOrganizerFeatures) {
      base.splice(3, 0, "BORRADORES", "VENCIDOS");
    }
    return base.map((id) => {
      const count =
        id === "BORRADORES" && borradoresCount > 0
          ? borradoresCount
          : id === "VENCIDOS" && vencidosCount > 0
            ? vencidosCount
            : null;
      return {
        id,
        label: count != null ? `${QUICK_FILTER_LABELS[id]} (${count})` : QUICK_FILTER_LABELS[id],
        onClick: () => {
          setQuickFilter(id);
          if (id === "PASADAS" || id === "VENCIDOS" || id === "BORRADORES") {
            setPastCollapsed(false);
          }
          if (id === "PROXIMAS") setPastCollapsed(true);
        },
      };
    });
  }, [showOrganizerFeatures, borradoresCount, vencidosCount]);

  const filteredRecurrentes = recurrentes.filter(rec =>
    rec.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (rec.lugar || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (rec.deporteNombre || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalVisible = listSections.reduce((n, s) => n + s.items.length, 0);

  const renderConvocatoriaRow = (conv: Convocatoria) => (
    <DataListRow
      key={conv.id}
      onClick={() => navigate(`/convocatorias/${conv.id}`)}
    >
      <DataListCell label="Evento" span={CONV_LIST_COLUMNS.evento} priority="primary">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-2xl shrink-0 select-none mt-0.5" role="img" aria-hidden>
            <DeporteIcon nombre={conv.deporteNombre} size={18} className="text-foreground/80" />
          </span>
          <div className="space-y-0.5 min-w-0">
            <div className="text-sm font-semibold text-foreground group-hover:text-primary group-hover:underline decoration-1 underline-offset-2 transition-colors truncate">
              {conv.titulo}
            </div>
            {conv.descripcion && (
              <p className="text-xs text-muted-foreground line-clamp-1">{conv.descripcion}</p>
            )}
          </div>
        </div>
      </DataListCell>

      <DataListCell label="Deporte y acceso" span={CONV_LIST_COLUMNS.acceso} priority="secondary">
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] font-medium text-foreground bg-secondary px-2 py-0.5 rounded border border-border uppercase">
            {conv.deporteNombre}
          </span>
          {conv.categoria && (
            <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border">
              {conv.categoria}
            </span>
          )}
          <TipoInvitacionPill tipo={conv.tipoInvitacion} grupoNombre={conv.grupoNombre} />
        </div>
      </DataListCell>

      <DataListCell label="Cuándo y dónde" span={CONV_LIST_COLUMNS.cuando} priority="secondary">
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Calendar size={12} className="opacity-70 shrink-0" />
            <span
              className={cn(
                "font-medium",
                isBorradorConFechaPasada(conv)
                  ? "text-warning line-through decoration-warning/40"
                  : "text-foreground/90"
              )}
            >
              {conv.fechaHora ? formatDateTime(conv.fechaHora) : "Sin fecha"}
            </span>
            <EventProximityPill schedule={conv} />
          </div>
          {conv.lugar && (
            <div className="flex items-center gap-1.5">
              <MapPin size={12} className="opacity-70 shrink-0" />
              <span className="truncate max-w-[200px]">{conv.lugar}</span>
            </div>
          )}
        </div>
      </DataListCell>

      <DataListCell label="Cupo" span={CONV_LIST_COLUMNS.cupo} priority="detail">
        <CupoLabel cupoMaximo={conv.cupoMaximo} />
      </DataListCell>

      <DataListCell label="Estado" span={CONV_LIST_COLUMNS.estado} priority="primary">
        <ConvocatoriaEstadoCell
          conv={conv}
          recurrente={!!conv.configuracionRecurrenteId}
          align="end"
          className="lg:justify-end"
        />
      </DataListCell>

      <DataListActions span={CONV_LIST_COLUMNS.acciones}>
        {canPublishConvocatoria(conv, hasPermission, user?.id) && (
          <Tooltip
            content={
              puedePublicarBorrador(conv) ? TOOLTIP_PUBLICAR_BORRADOR : TOOLTIP_PUBLICAR_BLOQUEADO
            }
          >
            <button
              type="button"
              onClick={(e) => handleAbrir(e, conv.id)}
              disabled={!puedePublicarBorrador(conv)}
              className="h-7 w-7 flex items-center justify-center rounded hover:bg-success/10 text-success hover:text-success transition-colors disabled:opacity-40 disabled:pointer-events-none disabled:hover:bg-transparent"
              aria-label="Publicar convocatoria"
            >
              <CheckCircle size={13} />
            </button>
          </Tooltip>
        )}
        {canCancelConvocatoria(conv, hasPermission, user?.id) && (
            <Tooltip content="Cancelar convocatoria">
              <button
                type="button"
                onClick={(e) => handleCancelar(e, conv.id, conv.titulo)}
                className="h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/10 text-destructive transition-colors"
                aria-label="Cancelar convocatoria"
              >
                <XCircle size={13} />
              </button>
            </Tooltip>
          )}
        {canDeleteConvocatoria(conv, hasPermission, user?.id) && (
          <Tooltip
            content={
              conv.estado === "BORRADOR"
                ? "Eliminar borrador"
                : conv.estado === "ABIERTA"
                  ? "Eliminar convocatoria"
                  : "Eliminar convocatoria cancelada"
            }
          >
            <button
              type="button"
              onClick={(e) => handleDeleteConvocatoria(e, conv)}
              className="h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/10 text-destructive transition-colors"
              aria-label="Eliminar convocatoria"
            >
              <Trash2 size={13} />
            </button>
          </Tooltip>
        )}
        <Tooltip content="Ver detalle">
          <span className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground group-hover:text-primary transition-colors">
            <Eye size={13} />
          </span>
        </Tooltip>
      </DataListActions>
    </DataListRow>
  );

  return (
    <div className="page-shell space-y-6 animate-fadeIn">
      <PageHeader
        iconKind={PageIconKind.CONVOCATORIAS}
        title="Convocatorias"
        description={
          `Por defecto verás las convocatorias más cercanas en el tiempo. Usa los filtros para abiertas, esta semana o el historial de partidos pasados.${
            canCreate
              ? " Como organizador, también puedes crear convocatorias únicas o reglas recurrentes."
              : ""
          }`
        }
      />


      {/* Notion Database Toolbar & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Database tabs */}
        <div className="flex notion-db-header border-none m-0 p-0">
          <button
            onClick={() => { setActiveTab("CONVOCATORIAS"); setSearchQuery(""); }}
            className={`notion-db-header-item px-3 py-1.5 text-xs font-semibold ${activeTab === "CONVOCATORIAS" ? "active" : ""}`}
          >
            <Calendar size={13} className="opacity-70" />
            <span>Todas las Convocatorias</span>
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded-full font-medium ml-1">
              {proximasCount}
            </span>
          </button>
          
          {canCreate && (
            <button
              onClick={() => { setActiveTab("PLANTILLAS"); setSearchQuery(""); }}
              className={`notion-db-header-item px-3 py-1.5 text-xs font-semibold ${activeTab === "PLANTILLAS" ? "active" : ""}`}
              title="Reglas que generan convocatorias automáticamente cada cierto tiempo"
            >
              <Repeat size={13} className="opacity-70" />
              <span>Reglas Recurrentes</span>
              <InfoHint side="bottom" maxWidth={260}>
                Una <strong>regla recurrente</strong> genera convocatorias automáticamente según
                un calendario (ej. todos los lunes a las 8pm). Útil para encuentros fijos.
              </InfoHint>
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded-full font-medium ml-1">
                {recurrentes.length}
              </span>
            </button>
          )}
        </div>

        {/* Database filters / search & actions */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/70" />
            <input
              type="text"
              placeholder="Buscar por nombre, lugar o deporte..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 h-9 w-full sm:w-[260px] rounded-md border border-border bg-background text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {user && canCreate && (
            <Link to={activeTab === "PLANTILLAS" ? "/convocatorias/recurrentes/new" : "/convocatorias/new"} className="w-full sm:w-auto">
              <Button className="h-9 w-full sm:w-auto px-3 gap-1.5 font-medium text-xs rounded-md shadow-none bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus size={14} />
                <span>{activeTab === "PLANTILLAS" ? "Plantilla" : "Convocatoria"}</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {activeTab === "CONVOCATORIAS" && (
        <div className="flex flex-col gap-2 -mt-2">
          <PresetChips activeId={quickFilter} showIcon={false} options={quickFilterOptions} />
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
            <InfoHint side="right" maxWidth={300}>
              <strong>Próximas</strong> ordena por fecha del partido (hoy, mañana, esta semana).
              Incluye convocatorias abiertas, en juego y borradores con fecha futura. El{" "}
              <strong>historial</strong> agrupa finalizadas y canceladas. Los{" "}
              filtros <strong>Borradores</strong> y <strong>Vencidos</strong> para gestionar
              borradores activos y los que ya no se pueden publicar.
            </InfoHint>
            <span>
              {listSections.reduce((n, s) => n + s.items.length, 0)} resultado
              {listSections.reduce((n, s) => n + s.items.length, 0) !== 1 ? "s" : ""}
              {searchQuery ? " con tu búsqueda" : ` · filtro «${QUICK_FILTER_LABELS[quickFilter]}»`}
            </span>
          </p>
        </div>
      )}

      {/* Main Database Content Grid/List */}
      {activeTab === "CONVOCATORIAS" ? (
        loading ? (
          <DataListSkeleton
            columns={CONV_LIST_COLUMNS}
            labels={{
              evento: "Evento",
              acceso: "Deporte y acceso",
              cuando: "Cuándo y dónde",
              cupo: "Cupo",
              estado: "Estado",
              acciones: "Acciones",
            }}
            rowCount={8}
          />
        ) : (
          <DataListShell>
            <DataListHeader
              columns={CONV_LIST_COLUMNS}
              labels={{
                evento: "Evento",
                acceso: "Deporte y acceso",
                cuando: "Cuándo y dónde",
                cupo: "Cupo",
                estado: "Estado",
                acciones: "Acciones",
              }}
            />
            <DataListBody>
              {listSections.map((section) => {
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
                    {!collapsed && section.items.map((conv) => renderConvocatoriaRow(conv))}
                  </DataListSection>
                );
              })}

              {totalVisible === 0 && (
                <EmptyState
                  className="border-0 rounded-none py-12"
                  variant={searchQuery ? "search" : "default"}
                  icon={<KanbanSquare size={32} />}
                  title={
                    searchQuery
                      ? "Sin resultados para tu búsqueda"
                      : convocatorias.length === 0
                        ? "Aún no hay convocatorias"
                        : "Ninguna convocatoria con ese filtro"
                  }
                  description={
                    searchQuery
                      ? "Prueba con otras palabras clave o limpia el campo de búsqueda."
                      : convocatorias.length === 0
                        ? canCreate
                          ? "Crea tu primera convocatoria o programa una regla recurrente para empezar."
                          : "Cuando un organizador publique convocatorias, aparecerán aquí."
                        : `Prueba otro filtro rápido (p. ej. «${QUICK_FILTER_LABELS.TODAS}» o «${QUICK_FILTER_LABELS.PASADAS}»).`
                  }
                  action={
                    convocatorias.length === 0 && canCreate ? (
                      <Link to="/convocatorias/new">
                        <Button size="sm" className="h-8 px-3 text-xs font-semibold">
                          <Plus size={13} className="mr-1.5" />
                          Crear convocatoria
                        </Button>
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
        )
      ) : (
        loadingRecurrentes ? (
          <DataListSkeleton
            columns={REC_LIST_COLUMNS}
            labels={{
              regla: "Regla",
              deporte: "Deporte",
              programacion: "Programación",
              cupo: "Cupo",
              estado: "Estado",
              acciones: "Acciones",
            }}
            rowCount={5}
          />
        ) : (
          <DataListShell>
            <DataListHeader
              columns={REC_LIST_COLUMNS}
              labels={{
                regla: "Regla recurrente",
                deporte: "Deporte",
                programacion: "Programación",
                cupo: "Cupo",
                estado: "Estado",
                acciones: "Acciones",
              }}
            />
            <DataListBody>
              {filteredRecurrentes.map((rec) => {
                const firstHorario = Object.values(rec.horariosPorDia || {})[0];
                return (
                  <DataListRow key={rec.id}>
                    <DataListCell label="Regla" span={REC_LIST_COLUMNS.regla} priority="primary">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl shrink-0 select-none mt-0.5" role="img" aria-hidden>
                          <DeporteIcon nombre={rec.deporteNombre} size={16} />
                        </span>
                        <div className="space-y-0.5 min-w-0">
                          <div className="text-sm font-semibold text-foreground truncate">
                            {rec.titulo}
                          </div>
                          {rec.modoFormacion === "EQUIPOS_POR_GRUPO" ? (
                            <Badge variant="info" className="text-[9px] px-1.5 py-0 uppercase">
                              Equipos por grupo ({rec.grupoEquipoIds?.length ?? 0})
                            </Badge>
                          ) : rec.grupoDestinoNombre && (
                            <span className="text-[10px] text-muted-foreground bg-muted/50 border border-border px-1.5 py-0.2 rounded font-semibold">
                              Grupo: {rec.grupoDestinoNombre}
                            </span>
                          )}
                        </div>
                      </div>
                    </DataListCell>
                    <DataListCell label="Deporte" span={REC_LIST_COLUMNS.deporte} priority="secondary">
                      <span className="text-[10px] font-medium text-foreground bg-secondary px-2 py-0.5 rounded border border-border uppercase">
                        {rec.deporteNombre}
                      </span>
                    </DataListCell>
                    <DataListCell label="Programación" span={REC_LIST_COLUMNS.programacion} priority="secondary">
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Repeat size={12} className="opacity-70 shrink-0" />
                          <span className="font-semibold">{humanizeRRule(rec.rruleExpression)}</span>
                        </div>
                        {firstHorario && (
                          <span className="text-[10px] block">
                            Apertura {firstHorario.horaApertura} · Evento {firstHorario.horaEvento}
                          </span>
                        )}
                        {rec.lugar && (
                          <div className="flex items-center gap-1.5">
                            <MapPin size={12} className="opacity-70 shrink-0" />
                            <span className="truncate max-w-[200px]">{rec.lugar}</span>
                          </div>
                        )}
                      </div>
                    </DataListCell>
                    <DataListCell label="Cupo" span={REC_LIST_COLUMNS.cupo} priority="detail">
                      <CupoLabel cupoMaximo={rec.cupoMaximo} />
                      {firstHorario?.duracionMinutos != null && (
                        <span className="text-[10px] text-muted-foreground block mt-0.5">
                          {firstHorario.duracionMinutos} min
                        </span>
                      )}
                    </DataListCell>
                    <DataListCell label="Estado" span={REC_LIST_COLUMNS.estado} align="right" priority="primary">
                      <RecurrenteEstadoBadge activo={rec.activo} />
                    </DataListCell>
                    <DataListActions span={REC_LIST_COLUMNS.acciones}>
                      {canManageRecurrente(rec, hasPermission, user?.id) && (
                        <Tooltip
                          content={
                            rec.activo
                              ? "Pausar generación automática"
                              : "Activar generación automática"
                          }
                        >
                          <button
                            type="button"
                            onClick={(e) => handleToggleActivoRecurrente(e, rec.id, rec.activo)}
                            className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${
                              rec.activo
                                ? "hover:bg-[hsl(var(--warning)/0.12)] text-tone-warning"
                                : "hover:bg-[hsl(var(--success)/0.12)] text-tone-success"
                            }`}
                            aria-label={rec.activo ? "Pausar regla" : "Activar regla"}
                          >
                            {rec.activo ? <XCircle size={13} /> : <CheckCircle size={13} />}
                          </button>
                        </Tooltip>
                      )}
                      {canManageRecurrente(rec, hasPermission, user?.id) && (
                        <Tooltip content="Editar regla">
                          <Link to={`/convocatorias/recurrentes/${rec.id}/edit`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded hover:bg-muted" aria-label="Editar regla recurrente">
                              <Edit size={13} className="text-muted-foreground hover:text-foreground" />
                            </Button>
                          </Link>
                        </Tooltip>
                      )}
                      {canDeleteRecurrente(rec, hasPermission, user?.id) && (
                        <Tooltip content="Eliminar regla">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRecurrencia(rec.id, rec.titulo)}
                            className="h-7 w-7 rounded hover:bg-destructive/10 text-destructive"
                            aria-label="Eliminar regla"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </Tooltip>
                      )}
                    </DataListActions>
                  </DataListRow>
                );
              })}

              {filteredRecurrentes.length === 0 && (
                <EmptyState
                  className="border-0 rounded-none py-12"
                  variant={searchQuery ? "search" : "default"}
                  icon={<Repeat size={32} />}
                  title={
                    searchQuery
                      ? "Sin resultados para tu búsqueda"
                      : "Aún no tienes reglas recurrentes"
                  }
                  description={
                    searchQuery
                      ? "Prueba con otras palabras clave."
                      : "Las reglas recurrentes crean convocatorias por ti según un calendario (ej. cada lunes 8pm)."
                  }
                  action={
                    !searchQuery && canCreate ? (
                      <Link to="/convocatorias/recurrentes/new">
                        <Button size="sm" className="h-8 px-3 text-xs font-semibold">
                          <Plus size={13} className="mr-1.5" />
                          Crear primera regla
                        </Button>
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
        )
      )}
    </div>
  );
}
