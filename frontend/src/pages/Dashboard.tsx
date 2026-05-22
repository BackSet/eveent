import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
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
  AlertCircle
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

  const isOrganizer = hasPermission("crear_convocatoria");

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
        // If state is already the same, do nothing or delete RSVP (for toggling, let's keep it simple: update it)
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
        <Spinner className="h-10 w-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Cargando tu área deportiva...</p>
      </div>
    );
  }

  const openConvocatorias = convocatorias.filter(c => c.estado === "ABIERTA");
  const answeredMisAsistencias = asistencias.filter(a => a.estado === "ASISTIRE");

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Premium Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-purple-600 to-indigo-700 p-6 md:p-8 text-white shadow-xl glow-primary">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl animate-pulse-slow" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl animate-pulse-slow" style={{ animationDelay: '2s' }} />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold uppercase tracking-wider text-purple-100">
              <Sparkles size={12} className="text-yellow-300" />
              <span>Centro de Control</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              {getGreeting()}, {user?.nombre}
            </h1>
            <p className="text-white/80 text-sm max-w-xl font-medium leading-relaxed">
              Tu portal deportivo premium. Confirma asistencia, visualiza las alineaciones balanceadas automáticamente y gestiona tus deportes favoritos.
            </p>
          </div>

          <div className="flex gap-2 self-start md:self-center">
            {isOrganizer && (
              <Link to="/convocatorias/new">
                <Button className="bg-white text-primary hover:bg-white/90 rounded-xl font-semibold gap-1.5 shadow-lg border-0 transition-premium hover:scale-[1.02]">
                  <Plus size={16} />
                  Crear Partido
                </Button>
              </Link>
            )}
            <Link to="/perfil">
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-xl font-semibold transition-premium">
                Ajustar Perfil
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/50 shadow-md hover:shadow-lg transition-premium relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Convocatorias Abiertas</p>
              <h3 className="text-3xl font-black tracking-tight text-foreground">{openConvocatorias.length}</h3>
              <p className="text-[11px] text-muted-foreground font-medium">Partidos disponibles para registrarse</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-premium">
              <Calendar className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-md hover:shadow-lg transition-premium relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Partidos Confirmados</p>
              <h3 className="text-3xl font-black tracking-tight text-foreground">{answeredMisAsistencias.length}</h3>
              <p className="text-[11px] text-muted-foreground font-medium">Eventos donde has dicho "Asistiré"</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-premium">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-md hover:shadow-lg transition-premium relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deportes Activos</p>
              <h3 className="text-3xl font-black tracking-tight text-foreground">{deportes.length}</h3>
              <p className="text-[11px] text-muted-foreground font-medium">Modalidades configuradas en el sistema</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-premium">
              <Trophy className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid Layout */}
      <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
        {/* Left Column: Upcoming Convocatorias (2/3 width) */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="space-y-0.5">
              <h2 className="text-xl font-bold tracking-tight text-foreground">Próximas Convocatorias</h2>
              <p className="text-xs text-muted-foreground font-medium">Regístrate y asegura tu cupo en los próximos eventos</p>
            </div>
            <Link to="/convocatorias" className="inline-flex items-center text-xs font-bold text-primary hover:underline gap-0.5 transition-premium group">
              Ver todas <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {error && (
            <div className="p-4 rounded-xl border border-destructive/15 bg-destructive/5 text-destructive text-sm font-medium flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2">
            {convocatorias.filter(c => c.estado === "ABIERTA" || c.estado === "EN_PROGRESO").slice(0, 4).map((conv) => {
              const rsvp = getUserRsvpStatus(conv.id);
              const list = convocatoriaAsistencias[conv.id] || [];
              const confirmedCount = list.filter(a => a.estado === "ASISTIRE").length;
              const maxCupo = conv.cupoMaximo || 0;
              const percent = maxCupo > 0 ? Math.min(100, Math.round((confirmedCount / maxCupo) * 100)) : 0;
              const detailsLoading = loadingDetails[conv.id];

              return (
                <Card 
                  key={conv.id}
                  className="hover:border-primary/40 hover:shadow-xl transition-all duration-300 relative overflow-hidden group flex flex-col justify-between border-border/60"
                >
                  <div className="p-5 space-y-4">
                    {/* Card Header Info */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{conv.deporteNombre}</span>
                        <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1 leading-snug">
                          {conv.titulo}
                        </h4>
                      </div>
                      <Badge variant={ESTADO_COLORS[conv.estado] || "default"} className="text-[8px] px-1.5 py-0 uppercase font-black shrink-0">
                        {conv.estado}
                      </Badge>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-1.5 text-xs text-muted-foreground border-t border-b py-3 border-border/40">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar size={12} className="text-primary shrink-0" />
                        <span>{formatDateTime(conv.fechaHora ?? null)}</span>
                      </div>
                      {conv.lugar && (
                        <div className="flex items-center gap-1.5 font-medium">
                          <MapPin size={12} className="text-primary shrink-0" />
                          <span className="truncate">{conv.lugar}</span>
                        </div>
                      )}
                    </div>

                    {/* Slots/Aforo Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-muted-foreground">Aforo Confirmado:</span>
                        {detailsLoading ? (
                          <Spinner className="h-3 w-3 text-muted-foreground animate-spin" />
                        ) : (
                          <span className={percent >= 90 ? "text-amber-600 font-extrabold" : "text-primary"}>
                            {confirmedCount} / {maxCupo > 0 ? maxCupo : "∞"}
                          </span>
                        )}
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            percent >= 90 ? "bg-amber-500" : "bg-gradient-to-r from-primary to-indigo-500"
                          }`}
                          style={{ width: `${maxCupo > 0 ? percent : 20}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Interactive Quick RSVP Actions or Status */}
                  <div className="bg-muted/30 border-t border-border/40 px-5 py-3.5 flex items-center justify-between gap-2 flex-wrap">
                    {conv.estado === "ABIERTA" ? (
                      <>
                        <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider shrink-0">Tu respuesta:</span>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleQuickRsvp(conv.id, "ASISTIRE")}
                            disabled={rsvpSubmitting[`${conv.id}-ASISTIRE`] || rsvpSubmitting[`${conv.id}-NO_ASISTIRE`]}
                            className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-premium gap-1 ${
                              rsvp === "ASISTIRE"
                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20"
                                : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/5"
                            }`}
                          >
                            {rsvpSubmitting[`${conv.id}-ASISTIRE`] ? (
                              <Spinner className="h-3 w-3 text-emerald-600 animate-spin" />
                            ) : (
                              <CheckCircle size={12} className={rsvp === "ASISTIRE" ? "scale-110" : ""} />
                            )}
                            Asistiré
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleQuickRsvp(conv.id, "NO_ASISTIRE")}
                            disabled={rsvpSubmitting[`${conv.id}-ASISTIRE`] || rsvpSubmitting[`${conv.id}-NO_ASISTIRE`]}
                            className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-premium gap-1 ${
                              rsvp === "NO_ASISTIRE"
                                ? "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20"
                                : "text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                            }`}
                          >
                            {rsvpSubmitting[`${conv.id}-NO_ASISTIRE`] ? (
                              <Spinner className="h-3 w-3 text-destructive animate-spin" />
                            ) : (
                              <XCircle size={12} className={rsvp === "NO_ASISTIRE" ? "scale-110" : ""} />
                            )}
                            No asistiré
                          </Button>
                        </div>
                      </>
                    ) : (
                      <button 
                        onClick={() => navigate(`/convocatorias/${conv.id}`)}
                        className="w-full flex items-center justify-between text-xs font-bold text-primary group-hover:underline"
                      >
                        <span>Ver desarrollo de equipos</span>
                        <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}

            {convocatorias.filter(c => c.estado === "ABIERTA" || c.estado === "EN_PROGRESO").length === 0 && (
              <div className="col-span-full py-16 text-center border border-dashed rounded-2xl border-border/80 bg-muted/10">
                <Calendar size={32} className="mx-auto text-muted-foreground mb-3 animate-pulse" />
                <h4 className="text-sm font-bold text-foreground">No hay convocatorias activas</h4>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1 leading-relaxed">
                  Actualmente no existen partidos abiertos para inscripción. Vuelve más tarde o crea uno nuevo si eres organizador.
                </p>
                {isOrganizer && (
                  <Link to="/convocatorias/new" className="inline-block mt-4">
                    <Button size="sm" className="font-semibold text-xs rounded-xl">Crear Convocatoria</Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Player Profile Sidebar (1/3 width) */}
        <div className="space-y-6">
          <div className="border-b pb-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Mi Perfil Deportivo</h2>
            <p className="text-xs text-muted-foreground font-medium">Tu ficha e información de juego</p>
          </div>

          <Card className="border-border/50 shadow-md relative overflow-hidden bg-card">
            {/* Visual Shirt Card Banner */}
            <div className="bg-gradient-to-br from-primary/10 to-indigo-600/5 p-6 flex flex-col items-center border-b relative">
              <div className="absolute top-3 right-3 text-primary/10">
                <Shirt size={100} strokeWidth={1} />
              </div>

              {/* Graphic Shirt Representer */}
              <div className="relative h-28 w-28 bg-gradient-to-tr from-primary to-indigo-600 rounded-full flex flex-col items-center justify-center text-white shadow-xl glow-primary z-10 select-none group border-4 border-background">
                <Shirt className="absolute h-14 w-14 text-white/10" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/70">Dorsal</span>
                <span className="text-4xl font-black tracking-tighter leading-none mt-1">
                  {user?.numeroCamiseta ?? "—"}
                </span>
              </div>

              <h4 className="text-base font-bold text-foreground mt-4">{user?.nombre}</h4>
              <p className="text-xs text-muted-foreground font-medium">{user?.email}</p>
            </div>

            <CardContent className="p-5 space-y-5">
              {/* Preferred Positions */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy size={13} className="text-primary shrink-0" />
                  <span>Posiciones Preferidas</span>
                </h5>

                {posicionesPreferidas.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {posicionesPreferidas.sort((a, b) => a.prioridad - b.prioridad).map((pos) => (
                      <Badge 
                        key={`${pos.deporteId}-${pos.posicionId}`} 
                        variant="outline" 
                        className="text-[10px] font-semibold bg-background uppercase border-border/80 px-2 py-0.5 flex items-center gap-1"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        <span>{pos.posicionNombre}</span>
                        <span className="text-[8px] text-muted-foreground ml-0.5">({pos.deporteNombre})</span>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-muted/30 border rounded-xl text-center">
                    <p className="text-xs text-muted-foreground font-medium">No has definido tus posiciones de juego</p>
                    <Link to="/perfil" className="text-[10px] text-primary hover:underline font-bold mt-1 inline-block">
                      Configurar ahora
                    </Link>
                  </div>
                )}
              </div>

              {/* Roles Badge List */}
              <div className="space-y-2 border-t pt-4">
                <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Roles de Sistema</h5>
                <div className="flex flex-wrap gap-1">
                  {(user?.roles || []).map((role) => (
                    <Badge key={role} variant="secondary" className="text-[9px] px-2 py-0 uppercase font-bold bg-muted/60">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Shortcuts */}
          <Card className="border-border/50 shadow-md">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-xs font-black uppercase text-muted-foreground tracking-wider">Atajos Rápidos</CardTitle>
            </CardHeader>
            <CardContent className="p-2 divide-y divide-border/40">
              <Link 
                to="/mis-asistencias" 
                className="flex items-center justify-between p-3 text-xs font-bold text-foreground hover:bg-muted/40 hover:text-primary transition-premium rounded-lg group"
              >
                <span className="flex items-center gap-2">
                  <Users size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  <span>Historial de Respuestas</span>
                </span>
                <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link 
                to="/perfil" 
                className="flex items-center justify-between p-3 text-xs font-bold text-foreground hover:bg-muted/40 hover:text-primary transition-premium rounded-lg group"
              >
                <span className="flex items-center gap-2">
                  <Shirt size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  <span>Mi Configuración de Juego</span>
                </span>
                <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
