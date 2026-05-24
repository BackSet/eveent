import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import api from "@/services/api";
import { formatDateTime } from "@/lib/formatDate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DataListShell,
  DataListHeader,
  DataListBody,
  DataListRow,
  DataListCell,
  DataListActions,
  type DataListColumns,
} from "@/components/ui/data-list";
import {
  ConvocatoriaEstadoBadge,
  EventProximityPill,
  CupoLabel,
} from "@/components/ui/entity-badges";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { DashboardSkeleton, InlineRowsSkeleton } from "@/components/ui/page-skeletons";
import { DeporteIcon } from "@/components/ui/page-icon";
import { PageHeader } from "@/components/ui/page-header";
import { PageIconKind } from "@/lib/iconography";
import {
  Calendar,
  Users,
  Trophy,
  ChevronRight,
  Shirt,
  CheckCircle,
  XCircle,
  Plus,
  AlertCircle,
  Briefcase,
  Layers,
  Hash,
  MapPin,
} from "lucide-react";

const DASH_CONV_COLUMNS: DataListColumns = {
  evento: 3,
  deporte: 2,
  cuando: 2,
  cupo: 2,
  estado: 1,
  rsvp: 2,
};
import type { Convocatoria, Asistencia, Deporte, UsuarioPosicionDto } from "@/types";
import { useToast } from "@/components/ui/toast";
import { InfoHint } from "@/components/ui/info-hint";
import { Tooltip } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { AutoAceptadaBadge } from "@/components/ui/auto-aceptada-badge";
import { PlayerIdentity } from "@/components/ui/player-identity";
import {
  canCreateConvocatorias,
  filterConvocatoriasForUser,
} from "@/lib/permissions";

export default function Dashboard() {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [posicionesPreferidas, setPosicionesPreferidas] = useState<UsuarioPosicionDto[]>([]);
  
  // Details stores the full assistant list for each convocatoria id
  const [convocatoriaAsistencias, setConvocatoriaAsistencias] = useState<Record<number, Asistencia[]>>({});
  
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState<Record<number, boolean>>({});
  const [rsvpSubmitting, setRsvpSubmitting] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  const canCreate = canCreateConvocatorias(hasPermission);

  // Get current greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "¡Buenos días!";
    if (hour < 18) return "¡Buenas tardes!";
    return "¡Buenas noches!";
  };

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setError("");
    try {
      const [convRes, asisRes, depRes, posRes] = await Promise.all([
        api.get<Convocatoria[]>("/api/convocatorias"),
        api.get<Asistencia[]>("/api/asistencias/mis-asistencias"),
        api.get<Deporte[]>("/api/deportes"),
        api.get<UsuarioPosicionDto[]>("/api/usuarios/me/posiciones").catch(() => ({ data: [] }))
      ]);

      // Filter visible/active convocatorias
      const filteredConvs = filterConvocatoriasForUser(convRes.data, hasPermission, user.id);

      // Sort by date, keeping open/upcoming ones first
      const sortedConvs = filteredConvs.sort((a, b) => {
        if (a.estado === "ABIERTA" && b.estado !== "ABIERTA") return -1;
        if (a.estado !== "ABIERTA" && b.estado === "ABIERTA") return 1;
        return new Date(a.fechaHora ?? "").getTime() - new Date(b.fechaHora ?? "").getTime();
      });

      setConvocatorias(sortedConvs);
      setAsistencias(asisRes.data);
      setDeportes(depRes.data);
      setPosicionesPreferidas(posRes.data);

      // Fetch assistances for the first 6 active convocatorias in parallel to show slots & fast RSVP
      const activeConvs = sortedConvs.filter(c => c.estado === "ABIERTA" || c.estado === "EN_PROGRESO").slice(0, 6);
      
      const newLoadingDetails: Record<number, boolean> = {};
      activeConvs.forEach(c => { newLoadingDetails[c.id] = true; });
      setLoadingDetails(newLoadingDetails);

      const assistancesPromises = activeConvs.map(async (conv) => {
        try {
          const { data } = await api.get<Asistencia[]>(`/api/convocatorias/${conv.id}/asistencias`);
          setConvocatoriaAsistencias(prev => ({ ...prev, [conv.id]: data }));
        } catch (err) {
          console.error(`Error loading assistances for convocatoria ${conv.id}`, err);
        } finally {
          setLoadingDetails(prev => ({ ...prev, [conv.id]: false }));
        }
      });

      await Promise.all(assistancesPromises);

    } catch (err: unknown) {
      setError("Error al cargar la información del panel.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user, hasPermission]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle Quick RSVP action
  const handleQuickRsvp = async (convocatoriaId: number, targetEstado: "ASISTIRE" | "NO_ASISTIRE") => {
    const key = `${convocatoriaId}-${targetEstado}`;
    const conv = convocatorias.find(c => c.id === convocatoriaId);
    setRsvpSubmitting(prev => ({ ...prev, [key]: true }));
    try {
      const currentAsistencias = convocatoriaAsistencias[convocatoriaId] || [];
      const miAsis = currentAsistencias.find(a => a.usuarioId === user?.id);

      if (miAsis) {
        await api.put(`/api/asistencias/${miAsis.id}`, { estado: targetEstado });
      } else {
        await api.post(`/api/convocatorias/${convocatoriaId}/asistencias`, {
          convocatoriaId,
          estado: targetEstado
        });
      }

      const { data } = await api.get<Asistencia[]>(`/api/convocatorias/${convocatoriaId}/asistencias`);
      setConvocatoriaAsistencias(prev => ({ ...prev, [convocatoriaId]: data }));
      
      const asisRes = await api.get<Asistencia[]>("/api/asistencias/mis-asistencias");
      setAsistencias(asisRes.data);

      if (targetEstado === "ASISTIRE") {
        toast.success("¡Asistencia confirmada!", conv ? `Te apuntaste a "${conv.titulo}".` : undefined);
      } else {
        toast.info("Te marcaste como ausente", conv ? `No asistirás a "${conv.titulo}".` : undefined);
      }
    } catch (err) {
      console.error("Error setting quick RSVP", err);
      toast.error("No se pudo registrar tu respuesta", "Inténtalo de nuevo en unos segundos.");
    } finally {
      setRsvpSubmitting(prev => ({ ...prev, [key]: false }));
    }
  };

  // Helper to check user status in a convocatoria
  const getUserRsvpStatus = (convocatoriaId: number): string => {
    const list = convocatoriaAsistencias[convocatoriaId] || [];
    const found = list.find(a => a.usuarioId === user?.id);
    return found ? found.estado : "PENDIENTE";
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  const openConvocatorias = convocatorias.filter(c => c.estado === "ABIERTA");
  const answeredMisAsistencias = asistencias.filter(a => a.estado === "ASISTIRE");
  const activeConvs = convocatorias.filter(c => c.estado === "ABIERTA" || c.estado === "EN_PROGRESO");
  const isSuspended = user?.fechaFinSuspension && new Date(user.fechaFinSuspension) > new Date();

  return (
    <div className="page-shell space-y-6 animate-fadeIn">
      <PageHeader
        iconKind={PageIconKind.DASHBOARD}
        title={`${getGreeting()}, ${user?.nombre}`}
        description="Mi espacio personal"
        actions={
          <>
            {canCreate && (
              <Link to="/convocatorias/new">
                <Button variant="outline" className="border-border interactive-hover h-9 rounded-md text-xs font-medium">
                  <Plus size={14} className="mr-1" />
                  Crear Convocatoria
                </Button>
              </Link>
            )}
            <Link to="/perfil">
              <Button variant="ghost" className="interactive-hover h-9 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground">
                Configurar Ficha
              </Button>
            </Link>
          </>
        }
      />

      {/* Notion Callout Banner */}
      {isSuspended ? (
        <div className="notion-callout tone-danger">
          <span className="notion-callout-icon">🚫</span>
          <div>
            <p className="font-semibold text-destructive">Cuenta suspendida temporalmente</p>
            <p className="text-destructive/80 mt-0.5 leading-relaxed text-[13.5px]">
              No podrás inscribirte ni confirmar asistencia hasta <strong>{new Date(user!.fechaFinSuspension!).toLocaleString()}</strong>.
              {user?.motivoSuspension && <> Motivo: <em>{user.motivoSuspension}</em>.</>}
            </p>
          </div>
        </div>
      ) : (
        <div className="notion-callout bg-secondary/35">
          <span className="notion-callout-icon">💡</span>
          <div>
            <p className="font-semibold text-foreground">Tu panel deportivo</p>
            <p className="text-muted-foreground mt-0.5 leading-relaxed text-[13.5px]">
              Ve las convocatorias abiertas y confirma asistencia con los íconos <CheckCircle className="inline" size={12} /> /
              <XCircle className="inline" size={12} />. Haz clic en una fila para ver el detalle, equipos y posiciones.
            </p>
          </div>
        </div>
      )}

        {/* Flat Stat Properties Panel */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 border-t border-b border-border py-4 text-sm font-medium">
          <div className="flex items-center gap-3 px-2">
            <div className="stat-tile-icon stat-tile-icon--info">
              <Calendar size={16} />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold leading-none">Abiertas</p>
              <p className="text-base font-extrabold mt-0.5 text-foreground">{openConvocatorias.length} convocatorias</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-2 border-t sm:border-t-0 sm:border-l border-border pt-3 sm:pt-0 sm:pl-4">
            <div className="stat-tile-icon stat-tile-icon--success">
              <Users size={16} />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold leading-none">Confirmado</p>
              <p className="text-base font-extrabold mt-0.5 text-foreground">{answeredMisAsistencias.length} eventos</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-2 border-t sm:border-t-0 sm:border-l border-border pt-3 sm:pt-0 sm:pl-4">
            <div className="stat-tile-icon stat-tile-icon--warning">
              <Trophy size={16} />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold leading-none">Disciplinas</p>
              <p className="text-base font-extrabold mt-0.5 text-foreground">{deportes.length} deportes activos</p>
            </div>
          </div>
        </div>

        {/* Split Grid Layout */}
        <div className="grid gap-8 grid-cols-1 lg:grid-cols-3 items-start">
          
          {/* LEFT: Convocatorias Notion Database (2/3 width) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                Convocatorias Activas
                <InfoHint side="right" maxWidth={280}>
                  Convocatorias <strong>abiertas</strong> (puedes confirmar asistencia) o
                  <strong> en juego</strong>. Las cerradas no aparecen aquí.
                </InfoHint>
              </h2>
            </div>

            {error && (
              <div className="p-3.5 rounded bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <DataListShell className="panel-shell text-[13px]">
              <DataListHeader
                columns={DASH_CONV_COLUMNS}
                labels={{
                  evento: "Evento",
                  deporte: "Deporte",
                  cuando: "Cuándo",
                  cupo: "Confirmados",
                  estado: "Estado",
                  rsvp: "RSVP",
                }}
              />
              <DataListBody>
                {activeConvs.slice(0, 8).map((conv) => {
                  const rsvp = getUserRsvpStatus(conv.id);
                  const list = convocatoriaAsistencias[conv.id] || [];
                  const miAsis = list.find((a) => a.usuarioId === user?.id);
                  const confirmedCount = list.filter((a) => a.estado === "ASISTIRE").length;
                  const maxCupo = conv.cupoMaximo || 0;
                  const isFull = maxCupo > 0 && confirmedCount >= maxCupo;

                  return (
                    <DataListRow
                      key={conv.id}
                      onClick={() => navigate(`/convocatorias/${conv.id}`)}
                    >
                      <DataListCell label="Evento" span={DASH_CONV_COLUMNS.evento} priority="primary">
                        <div className="flex items-center gap-2 min-w-0">
                          <DeporteIcon nombre={conv.deporteNombre} size={18} className="text-foreground/80" />
                          <span className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {conv.titulo}
                          </span>
                          {miAsis?.autoAceptada && <AutoAceptadaBadge />}
                        </div>
                      </DataListCell>
                      <DataListCell label="Deporte" span={DASH_CONV_COLUMNS.deporte} priority="secondary">
                        <span className="text-muted-foreground font-medium text-xs">
                          {conv.deporteNombre}
                        </span>
                      </DataListCell>
                      <DataListCell label="Cuándo" span={DASH_CONV_COLUMNS.cuando} priority="secondary">
                        <div className="space-y-0.5 text-xs">
                          <div className="flex items-center gap-1 flex-wrap">
                            <Calendar size={11} className="opacity-70 shrink-0" />
                            <span className="font-medium text-foreground/90">
                              {formatDateTime(conv.fechaHora ?? null)}
                            </span>
                            <EventProximityPill schedule={conv} />
                          </div>
                          {conv.lugar && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MapPin size={11} className="shrink-0" />
                              <span className="truncate max-w-[140px]">{conv.lugar}</span>
                            </div>
                          )}
                        </div>
                      </DataListCell>
                      <DataListCell label="Confirmados" span={DASH_CONV_COLUMNS.cupo} priority="detail">
                        {loadingDetails[conv.id] ? (
                          <InlineRowsSkeleton rows={2} />
                        ) : (
                          <>
                            <span
                              className={cn(
                                "text-sm font-bold text-foreground",
                                isFull && "text-tone-warning"
                              )}
                            >
                              {confirmedCount} / {maxCupo > 0 ? maxCupo : "∞"}
                            </span>
                            <CupoLabel cupoMaximo={conv.cupoMaximo} className="text-[10px] block mt-0.5" />
                          </>
                        )}
                      </DataListCell>
                      <DataListCell label="Estado" span={DASH_CONV_COLUMNS.estado} priority="primary">
                        <ConvocatoriaEstadoBadge estado={conv.estado} />
                      </DataListCell>
                      <DataListActions span={DASH_CONV_COLUMNS.rsvp}>
                        {conv.estado === "ABIERTA" ? (
                          <>
                            <Tooltip
                              content={
                                rsvp === "ASISTIRE"
                                  ? "Ya estás confirmado"
                                  : isFull
                                    ? "Cupo lleno — lista de espera"
                                    : "Confirmar asistencia"
                              }
                            >
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleQuickRsvp(conv.id, "ASISTIRE")}
                                disabled={
                                  isSuspended ||
                                  rsvpSubmitting[`${conv.id}-ASISTIRE`] ||
                                  rsvpSubmitting[`${conv.id}-NO_ASISTIRE`]
                                }
                                className={cn(
                                  "h-7 w-7 rounded-md",
                                  rsvp === "ASISTIRE"
                                    ? "status-pill--success border"
                                    : "text-muted-foreground hover:text-tone-success"
                                )}
                              >
                                {rsvpSubmitting[`${conv.id}-ASISTIRE`] ? (
                                  <Spinner className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle size={14} />
                                )}
                              </Button>
                            </Tooltip>
                            <Tooltip
                              content={
                                rsvp === "NO_ASISTIRE" ? "Ya rechazaste" : "No podré asistir"
                              }
                            >
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleQuickRsvp(conv.id, "NO_ASISTIRE")}
                                disabled={
                                  isSuspended ||
                                  rsvpSubmitting[`${conv.id}-ASISTIRE`] ||
                                  rsvpSubmitting[`${conv.id}-NO_ASISTIRE`]
                                }
                                className={cn(
                                  "h-7 w-7 rounded-md",
                                  rsvp === "NO_ASISTIRE"
                                    ? "bg-destructive/10 text-destructive border border-destructive/20"
                                    : "text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                                )}
                              >
                                {rsvpSubmitting[`${conv.id}-NO_ASISTIRE`] ? (
                                  <Spinner className="h-3 w-3 animate-spin" />
                                ) : (
                                  <XCircle size={14} />
                                )}
                              </Button>
                            </Tooltip>
                          </>
                        ) : (
                          <span className="text-[10px] font-bold uppercase text-muted-foreground/80">
                            Cerrado
                          </span>
                        )}
                      </DataListActions>
                    </DataListRow>
                  );
                })}

                {activeConvs.length === 0 && (
                  <EmptyState
                    icon={<Calendar size={28} />}
                    title="Sin convocatorias activas"
                    description={
                      canCreate
                        ? "Cuando crees una convocatoria abierta o programes un ciclo recurrente, aparecerá aquí."
                        : "Aún no hay convocatorias publicadas para inscribirte."
                    }
                    action={
                      canCreate ? (
                        <Link to="/convocatorias/new">
                          <Button className="h-8 text-xs">
                            <Plus size={12} className="mr-1" />
                            Crear convocatoria
                          </Button>
                        </Link>
                      ) : undefined
                    }
                    className="bg-transparent border-0 py-10"
                  />
                )}
              </DataListBody>
            </DataListShell>
          </div>

          {/* RIGHT: Notion Player Ficha & Properties (1/3 width) */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-foreground tracking-tight border-b pb-2 border-border">Ficha de Jugador</h2>
            
            <Card className="border-border bg-card/60 backdrop-blur-md rounded-lg shadow-none">
              <div className="p-5 space-y-6">
                
                {/* Username Header */}
                <PlayerIdentity
                  nombre={user?.nombre}
                  username={user?.username}
                  email={user?.email}
                  variant="list"
                  className="w-full"
                />

                {/* Notion Property grid */}
                <div className="notion-property-grid border-t pt-4 border-dashed border-border">
                  
                  {/* Jersey Property */}
                  <span className="notion-property-label">
                    <Hash size={13} />
                    <span>Dorsal</span>
                  </span>
                  <span className="notion-property-value">
                    {user?.numeroCamiseta !== undefined && user?.numeroCamiseta !== null ? (
                      <Badge variant="outline" className="font-extrabold text-xs px-2 py-0">
                        N° {user?.numeroCamiseta}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground/50">— Sin dorsal —</span>
                    )}
                  </span>

                  {/* Roles Property */}
                  <span className="notion-property-label">
                    <Layers size={13} />
                    <span>Roles de Usuario</span>
                  </span>
                  <span className="notion-property-value">
                    <div className="flex flex-wrap gap-1">
                      {(user?.roles || []).map((role) => (
                        <Badge key={role} className="bg-secondary text-foreground text-[10px] font-bold px-1.5 py-0">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </span>

                  {/* Registered Property */}
                  <span className="notion-property-label">
                    <Briefcase size={13} />
                    <span>Estado Ficha</span>
                  </span>
                  <span className="notion-property-value">
                    {isSuspended ? (
                      <span className="text-destructive font-bold">Suspendido</span>
                    ) : (
                      <span className="text-tone-success font-bold">✓ Activo</span>
                    )}
                  </span>
                </div>

                {/* Preferred Positions */}
                <div className="space-y-2 border-t pt-4 border-dashed border-border">
                  <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <Trophy size={11} className="text-primary" />
                    <span>Posiciones de Juego Preferidas</span>
                  </h5>

                  {posicionesPreferidas.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1.5">
                      {posicionesPreferidas.sort((a, b) => a.prioridad - b.prioridad).map((pos) => (
                        <Badge 
                          key={`${pos.deporteId}-${pos.posicionId}`} 
                          variant="outline" 
                          className="text-[10px] font-semibold bg-background uppercase border-border/80 px-1.5 py-0.5 flex items-center gap-1"
                        >
                          <span className="h-1 w-1 rounded-full bg-primary" />
                          <span>{pos.posicionNombre}</span>
                          <span className="text-[8px] text-muted-foreground ml-0.5">({pos.deporteNombre})</span>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3.5 bg-secondary/30 rounded border text-center text-xs">
                      <p className="text-muted-foreground font-medium">No has definido tus posiciones de juego</p>
                      <Link to="/perfil" className="text-[10px] text-primary hover:underline font-bold mt-1 inline-block">
                        Configurar ahora
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Quick shortcuts in Notion styled Callout block */}
            <div className="panel-subtle p-4 space-y-3">
              <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Navegación del Workspace</h5>
              <div className="space-y-1 text-xs">
                <Link 
                  to="/mis-asistencias" 
                  className="flex items-center justify-between p-2 interactive-hover rounded-md text-foreground group"
                >
                  <span className="flex items-center gap-2">
                    <Users size={12} className="text-muted-foreground" />
                    <span className="font-semibold">Mis Asistencias</span>
                  </span>
                  <ChevronRight size={12} className="text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link 
                  to="/perfil" 
                  className="flex items-center justify-between p-2 interactive-hover rounded-md text-foreground group"
                >
                  <span className="flex items-center gap-2">
                    <Shirt size={12} className="text-muted-foreground" />
                    <span className="font-semibold">Ajustes Deportivos</span>
                  </span>
                  <ChevronRight size={12} className="text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
  );
}
