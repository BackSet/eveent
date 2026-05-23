import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import api from "@/services/api";
import { formatDateTime } from "@/lib/formatDate";
import { ESTADO_COLORS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Calendar,
  Users,
  Trophy,
  ChevronRight,
  MapPin,
  Clock,
  Shirt,
  Sparkles,
  CheckCircle,
  XCircle,
  Plus,
  ArrowRight,
  AlertCircle,
  Settings,
  Briefcase,
  Layers,
  Map,
  Hash,
  TableProperties,
  KanbanSquare
} from "lucide-react";
import type { Convocatoria, Asistencia, Deporte, UsuarioPosicionDto } from "@/types";

export default function Dashboard() {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
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
  const [dbView, setDbView] = useState<"TABLE" | "BOARD">("TABLE");

  const isOrganizer = hasPermission("crear_convocatorias");

  // Get current greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "¡Buenos días!";
    if (hour < 18) return "¡Buenas tardes!";
    return "¡Buenas noches!";
  };

  // Helper to determine sport emojis in true Notion style
  const getSportEmoji = (deporteNombre: string) => {
    const name = deporteNombre.toLowerCase();
    if (name.includes("futbol") || name.includes("fútbol") || name.includes("soccer")) return "⚽";
    if (name.includes("basquet") || name.includes("básquet") || name.includes("basketball") || name.includes("baloncesto")) return "🏀";
    if (name.includes("tenis") || name.includes("tennis")) return "🎾";
    if (name.includes("voley") || name.includes("voleibol") || name.includes("volleyball")) return "🏐";
    if (name.includes("running") || name.includes("correr")) return "🏃";
    return "🏆";
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
      const filteredConvs = isOrganizer 
        ? convRes.data 
        : convRes.data.filter((c) => c.estado !== "BORRADOR" && c.estado !== "CANCELADA");

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
  }, [user, isOrganizer]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle Quick RSVP action
  const handleQuickRsvp = async (convocatoriaId: number, targetEstado: "ASISTIRE" | "NO_ASISTIRE") => {
    const key = `${convocatoriaId}-${targetEstado}`;
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

      // Refetch assistances for this convocatoria only to update details instantly
      const { data } = await api.get<Asistencia[]>(`/api/convocatorias/${convocatoriaId}/asistencias`);
      setConvocatoriaAsistencias(prev => ({ ...prev, [convocatoriaId]: data }));
      
      // Also update overall mis-asistencias count
      const asisRes = await api.get<Asistencia[]>("/api/asistencias/mis-asistencias");
      setAsistencias(asisRes.data);
    } catch (err) {
      console.error("Error setting quick RSVP", err);
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
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Spinner className="h-8 w-8 text-muted-foreground animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Cargando tu área deportiva...</p>
      </div>
    );
  }

  const openConvocatorias = convocatorias.filter(c => c.estado === "ABIERTA");
  const answeredMisAsistencias = asistencias.filter(a => a.estado === "ASISTIRE");
  const activeConvs = convocatorias.filter(c => c.estado === "ABIERTA" || c.estado === "EN_PROGRESO");

  return (
    <div className="space-y-6 max-w-5xl mx-auto notion-animate-fade pb-12 px-4 sm:px-6">
      {/* Cover / Header section */}
      <div className="relative rounded-lg overflow-hidden border border-border bg-muted/30">
        <div className="h-28 notion-cover notion-cover-sports" />
        <div className="p-6 relative pt-10">
          <div className="absolute top-[-36px] left-6 text-5xl bg-background p-2 rounded-xl border border-border/80 shadow-sm select-none">
            🏆
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest leading-none">Mi Espacio Personal</p>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{getGreeting()}, {user?.nombre}</h1>
            </div>

            <div className="flex items-center gap-2">
              {isOrganizer && (
                <Link to="/convocatorias/new">
                  <Button variant="outline" className="border-border hover:bg-[#efebee] dark:hover:bg-[#2c2c2c] h-8.5 rounded-md text-[13px] font-bold">
                    <Plus size={14} className="mr-1" />
                    Crear Convocatoria
                  </Button>
                </Link>
              )}
              <Link to="/perfil">
                <Button variant="ghost" className="hover:bg-[#efebee] dark:hover:bg-[#2c2c2c] h-8.5 rounded-md text-[13px] font-semibold text-muted-foreground hover:text-foreground">
                  Configurar Ficha
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Notion Callout Banner */}
      <div className="notion-callout bg-secondary/35">
        <span className="notion-callout-icon">💡</span>
        <div>
          <p className="font-semibold text-foreground">Acceso Directo al Centro Deportivo</p>
          <p className="text-muted-foreground mt-0.5 leading-relaxed text-[13.5px]">
            Este es tu panel deportivo Notion-style. Aquí puedes visualizar estadísticas clave en tiempo real, confirmar tu asistencia con un solo clic utilizando la base de datos inteligente de convocatorias, y ver la alineación balanceada automáticamente según tu posición.
          </p>
        </div>
      </div>

        {/* Flat Stat Properties Panel */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 border-t border-b border-[#ededeb] dark:border-[#2e2e2e] py-4 text-sm font-medium">
          <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded bg-[#e3f2fd] dark:bg-[#0d47a1]/25 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Calendar size={16} />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold leading-none">Abiertas</p>
              <p className="text-base font-extrabold mt-0.5 text-foreground">{openConvocatorias.length} convocatorias</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-2 border-t sm:border-t-0 sm:border-l border-[#ededeb] dark:border-[#2e2e2e] pt-3 sm:pt-0 sm:pl-4">
            <div className="h-8 w-8 rounded bg-[#e8f5e9] dark:bg-[#1b5e20]/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Users size={16} />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold leading-none">Confirmado</p>
              <p className="text-base font-extrabold mt-0.5 text-foreground">{answeredMisAsistencias.length} eventos</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-2 border-t sm:border-t-0 sm:border-l border-[#ededeb] dark:border-[#2e2e2e] pt-3 sm:pt-0 sm:pl-4">
            <div className="h-8 w-8 rounded bg-[#fff8e1] dark:bg-[#f57f17]/20 flex items-center justify-center text-amber-600 dark:text-amber-500 shrink-0">
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
              <h2 className="text-lg font-bold text-foreground tracking-tight">Base de Datos de Convocatorias</h2>
              
              {/* Notion-style database tabs */}
              <div className="notion-db-header mb-0 pb-0 border-0">
                <div 
                  onClick={() => setDbView("TABLE")}
                  className={cn("notion-db-header-item text-xs", dbView === "TABLE" && "active")}
                >
                  <TableProperties size={13} />
                  <span>Vista Tabla</span>
                </div>
                <div 
                  onClick={() => setDbView("BOARD")}
                  className={cn("notion-db-header-item text-xs", dbView === "BOARD" && "active")}
                >
                  <KanbanSquare size={13} />
                  <span>Vista Tablero</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            {/* TABULAR VIEW (Default Notion Database style) */}
            {dbView === "TABLE" ? (
              <div className="border border-[#ededeb] dark:border-[#2e2e2e] rounded-lg overflow-hidden bg-card text-[13px]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-secondary/40 border-b border-[#ededeb] dark:border-[#2e2e2e] text-muted-foreground font-semibold">
                        <th className="p-3 pl-4 font-semibold w-[40%]">Nombre</th>
                        <th className="p-3 font-semibold w-[15%]">Deporte</th>
                        <th className="p-3 font-semibold w-[20%]">Fecha y Hora</th>
                        <th className="p-3 font-semibold w-[15%]">Aforo</th>
                        <th className="p-3 pr-4 font-semibold w-[10%] text-right">Confirmar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ededeb] dark:divide-[#2e2e2e]">
                      {activeConvs.slice(0, 8).map((conv) => {
                        const rsvp = getUserRsvpStatus(conv.id);
                        const list = convocatoriaAsistencias[conv.id] || [];
                        const confirmedCount = list.filter(a => a.estado === "ASISTIRE").length;
                        const maxCupo = conv.cupoMaximo || 0;
                        const percent = maxCupo > 0 ? Math.min(100, Math.round((confirmedCount / maxCupo) * 100)) : 0;
                        const isFull = maxCupo > 0 && confirmedCount >= maxCupo;

                        return (
                          <tr 
                            key={conv.id} 
                            onClick={() => navigate(`/convocatorias/${conv.id}`)}
                            className="hover:bg-[#f7f7f5]/50 dark:hover:bg-[#1e1e1e]/50 cursor-pointer transition-colors group"
                          >
                            {/* Title with Emoji */}
                            <td className="p-3 pl-4 font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                              <span className="text-base shrink-0">{getSportEmoji(conv.deporteNombre || "")}</span>
                              <span className="truncate">{conv.titulo}</span>
                              {conv.estado === "EN_PROGRESO" && (
                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] uppercase font-black px-1.5 py-0">En Juego</Badge>
                              )}
                            </td>

                            {/* Sport name */}
                            <td className="p-3 text-muted-foreground font-medium">
                              {conv.deporteNombre}
                            </td>

                            {/* Date */}
                            <td className="p-3 font-medium text-muted-foreground">
                              {formatDateTime(conv.fechaHora ?? null)}
                            </td>

                            {/* Capacity */}
                            <td className="p-3 font-bold text-foreground">
                              <span className={isFull ? "text-amber-600 font-extrabold" : ""}>
                                {confirmedCount} / {maxCupo > 0 ? maxCupo : "∞"}
                              </span>
                            </td>

                            {/* Fast RSVP Triggers */}
                            <td className="p-3 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                              {conv.estado === "ABIERTA" ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleQuickRsvp(conv.id, "ASISTIRE")}
                                    disabled={rsvpSubmitting[`${conv.id}-ASISTIRE`] || rsvpSubmitting[`${conv.id}-NO_ASISTIRE`]}
                                    className={cn(
                                      "h-7 w-7 rounded-md",
                                      rsvp === "ASISTIRE"
                                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                        : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/5"
                                    )}
                                    title="Asistiré"
                                  >
                                    {rsvpSubmitting[`${conv.id}-ASISTIRE`] ? (
                                      <Spinner className="h-3 w-3 text-emerald-600 animate-spin" />
                                    ) : (
                                      <CheckCircle size={14} />
                                    )}
                                  </Button>

                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleQuickRsvp(conv.id, "NO_ASISTIRE")}
                                    disabled={rsvpSubmitting[`${conv.id}-ASISTIRE`] || rsvpSubmitting[`${conv.id}-NO_ASISTIRE`]}
                                    className={cn(
                                      "h-7 w-7 rounded-md",
                                      rsvp === "NO_ASISTIRE"
                                        ? "bg-destructive/10 text-destructive border border-destructive/20"
                                        : "text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                                    )}
                                    title="No asistiré"
                                  >
                                    {rsvpSubmitting[`${conv.id}-NO_ASISTIRE`] ? (
                                      <Spinner className="h-3 w-3 text-destructive animate-spin" />
                                    ) : (
                                      <XCircle size={14} />
                                    )}
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold uppercase text-muted-foreground/80 tracking-wider">Cerrado</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {activeConvs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground font-medium">
                            No existen convocatorias activas actualmente.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* KANBAN BOARD VIEW (Notion database board layout) */
              <div className="notion-board text-[13px]">
                {/* Column ABIERTA */}
                <div className="notion-board-column">
                  <div className="notion-board-column-header">
                    <span className="flex items-center gap-1.5 font-bold text-foreground">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      Inscripciones Abiertas
                    </span>
                    <span className="text-[11px] font-bold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                      {activeConvs.filter(c => c.estado === "ABIERTA").length}
                    </span>
                  </div>

                  <div className="space-y-2 mt-2">
                    {activeConvs.filter(c => c.estado === "ABIERTA").map(conv => {
                      const list = convocatoriaAsistencias[conv.id] || [];
                      const count = list.filter(a => a.estado === "ASISTIRE").length;
                      return (
                        <div 
                          key={conv.id} 
                          onClick={() => navigate(`/convocatorias/${conv.id}`)}
                          className="notion-board-card"
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-base">{getSportEmoji(conv.deporteNombre || "")}</span>
                            <h4 className="font-bold text-foreground leading-snug line-clamp-1">{conv.titulo}</h4>
                          </div>
                          <div className="space-y-1 text-xs text-muted-foreground font-medium pt-1.5 border-t border-border/40">
                            <div className="flex items-center gap-1">
                              <Clock size={11} />
                              <span>{formatDateTime(conv.fechaHora ?? null)}</span>
                            </div>
                            {conv.lugar && (
                              <div className="flex items-center gap-1">
                                <MapPin size={11} />
                                <span className="truncate">{conv.lugar}</span>
                              </div>
                            )}
                            <div className="pt-1 flex items-center justify-between text-[11px] font-bold text-foreground">
                              <span>Aforo:</span>
                              <span>{count} / {conv.cupoMaximo || "∞"}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {activeConvs.filter(c => c.estado === "ABIERTA").length === 0 && (
                      <p className="text-center text-xs text-muted-foreground/60 py-8 font-medium">Ninguno en esta columna</p>
                    )}
                  </div>
                </div>

                {/* Column EN JUEGO / FINALIZADO */}
                <div className="notion-board-column">
                  <div className="notion-board-column-header">
                    <span className="flex items-center gap-1.5 font-bold text-foreground">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Eventos En Juego
                    </span>
                    <span className="text-[11px] font-bold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                      {activeConvs.filter(c => c.estado === "EN_PROGRESO").length}
                    </span>
                  </div>

                  <div className="space-y-2 mt-2">
                    {activeConvs.filter(c => c.estado === "EN_PROGRESO").map(conv => (
                      <div 
                        key={conv.id} 
                        onClick={() => navigate(`/convocatorias/${conv.id}`)}
                        className="notion-board-card"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-base">{getSportEmoji(conv.deporteNombre || "")}</span>
                          <h4 className="font-bold text-foreground leading-snug line-clamp-1">{conv.titulo}</h4>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground font-medium pt-1.5 border-t border-border/40">
                          <div className="flex items-center gap-1">
                            <Clock size={11} />
                            <span>{formatDateTime(conv.fechaHora ?? null)}</span>
                          </div>
                          {conv.lugar && (
                            <div className="flex items-center gap-1">
                              <MapPin size={11} />
                              <span className="truncate">{conv.lugar}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {activeConvs.filter(c => c.estado === "EN_PROGRESO").length === 0 && (
                      <p className="text-center text-xs text-muted-foreground/60 py-8 font-medium">Ninguno en esta columna</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Notion Player Ficha & Properties (1/3 width) */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-foreground tracking-tight border-b pb-2 border-[#ededeb] dark:border-[#2e2e2e]">Ficha de Jugador</h2>
            
            <Card className="border border-[#ededeb] dark:border-[#2e2e2e] bg-card/60 backdrop-blur-md rounded-lg shadow-none">
              <div className="p-5 space-y-6">
                
                {/* Username Header */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded bg-primary flex items-center justify-center font-bold text-sm text-primary-foreground">
                    {user?.nombre?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-sm leading-tight">{user?.nombre}</h4>
                    <p className="text-xs text-muted-foreground font-medium">{user?.email}</p>
                  </div>
                </div>

                {/* Notion Property grid */}
                <div className="notion-property-grid border-t pt-4 border-dashed border-[#ededeb] dark:border-[#2e2e2e]">
                  
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
                    <span>Suscripciones</span>
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
                  <span className="notion-property-value text-emerald-600 dark:text-emerald-400 font-bold">
                    ✓ Activo
                  </span>
                </div>

                {/* Preferred Positions */}
                <div className="space-y-2 border-t pt-4 border-dashed border-[#ededeb] dark:border-[#2e2e2e]">
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
            <div className="border border-[#ededeb] dark:border-[#2e2e2e] bg-[#f7f7f5]/40 rounded-lg p-4 space-y-3">
              <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Navegación del Workspace</h5>
              <div className="space-y-1 text-xs">
                <Link 
                  to="/mis-asistencias" 
                  className="flex items-center justify-between p-2 hover:bg-[#efebee] dark:hover:bg-[#2c2c2c] transition-colors rounded-md text-foreground group"
                >
                  <span className="flex items-center gap-2">
                    <Users size={12} className="text-muted-foreground" />
                    <span className="font-semibold">Historial de Respuestas</span>
                  </span>
                  <ChevronRight size={12} className="text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link 
                  to="/perfil" 
                  className="flex items-center justify-between p-2 hover:bg-[#efebee] dark:hover:bg-[#2c2c2c] transition-colors rounded-md text-foreground group"
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
