import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/services/api";
import { formatDateTime } from "@/lib/formatDate";
import { ESTADO_COLORS, TEAM_COLORS, getTeamColorHex, getApiErrorMessage } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Calendar,
  MapPin,
  User,
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  Tag,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Trophy,
  Activity,
  AlertTriangle,
  Shirt,
  Compass
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Convocatoria, Asistencia, BandoConvocatoria } from "@/types";

interface bandoFormData {
  nombre: string;
  color: string;
}

export default function ConvocatoriaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [convocatoria, setConvocatoria] = useState<Convocatoria | null>(null);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [bandos, setBandos] = useState<BandoConvocatoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [miAsistencia, setMiAsistencia] = useState<Asistencia | null>(null);
  const [responderLoading, setResponderLoading] = useState(false);
  const [matchmakingLoading, setMatchmakingLoading] = useState(false);

  const [bandoDialogOpen, setbandoDialogOpen] = useState(false);
  const [editingBando, setEditingBando] = useState<BandoConvocatoria | null>(null);
  const [bandoForm, setbandoForm] = useState<bandoFormData>({ nombre: "", color: "" });
  const [bandoSaving, setbandoSaving] = useState(false);
  const [bandoError, setbandoError] = useState("");

  const fetchData = useCallback(async () => {
    if (!user) return;
    setError("");
    try {
      const [convRes, asisRes, equipRes] = await Promise.all([
        api.get(`/api/convocatorias/${id}`),
        api.get(`/api/convocatorias/${id}/asistencias`),
        api.get(`/api/convocatorias/${id}/bandos`),
      ]);
      setConvocatoria(convRes.data);
      setAsistencias(asisRes.data);
      setBandos(equipRes.data);
      const miAsis = asisRes.data.find((a: Asistencia) => a.usuarioId === user?.id);
      setMiAsistencia(miAsis || null);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    if (user) fetchData();
  }, [id, user?.id, fetchData]);

  const handleMatchmaking = async () => {
    setMatchmakingLoading(true);
    setError("");
    try {
      await api.post(`/api/convocatorias/${id}/matchmaking`);
      await fetchData();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    } finally {
      setMatchmakingLoading(false);
    }
  };

  const handleRespondedAsistencia = async (estado: string) => {
    setResponderLoading(true);
    setError("");
    try {
      if (miAsistencia) {
        await api.put(`/api/asistencias/${miAsistencia.id}`, { estado });
      } else {
        await api.post(`/api/convocatorias/${id}/asistencias`, { convocatoriaId: Number(id), estado });
      }
      fetchData();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    } finally {
      setResponderLoading(false);
    }
  };

  const openBandoDialog = (bando?: BandoConvocatoria) => {
    if (bando) {
      setEditingBando(bando);
      setbandoForm({ nombre: bando.nombre, color: bando.color || "" });
    } else {
      setEditingBando(null);
      setbandoForm({ nombre: "", color: "" });
    }
    setbandoError("");
    setbandoDialogOpen(true);
  };

  const handleSaveBando = async () => {
    setbandoSaving(true);
    setbandoError("");
    try {
      if (editingBando) {
        await api.put(`/api/bandos/${editingBando.id}`, bandoForm);
      } else {
        await api.post(`/api/convocatorias/${id}/bandos`, bandoForm);
      }
      setbandoDialogOpen(false);
      setbandoForm({ nombre: "", color: "" });
      setEditingBando(null);
      fetchData();
    } catch (err: unknown) {
      setbandoError(getApiErrorMessage(err));
    } finally {
      setbandoSaving(false);
    }
  };

  const handleDeleteBando = async (bandoId: number) => {
    if (!confirm("¿Eliminar este bando?")) return;
    try {
      await api.delete(`/api/bandos/${bandoId}`);
      fetchData();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    }
  };

  // Helper to determine if matchmaking has been executed
  const matchmakerRun = useMemo(() => {
    return asistencias.some(a => a.bandoId !== null || a.bandoNombre !== null);
  }, [asistencias]);

  // Player filter categorizations
  const playerLists = useMemo(() => {
    const activeTeams = bandos;
    const teamPlayersMap = activeTeams.map(eq => ({
      team: eq,
      players: asistencias.filter(a => (a.bandoId === eq.id || a.bandoNombre === eq.nombre) && a.estado === 'ASISTIRE')
    }));

    const comodines = matchmakerRun 
      ? asistencias.filter(a => a.estado === 'ASISTIRE' && a.bandoId === null && a.bandoNombre === null) 
      : [];

    const waitlist = asistencias.filter(a => a.estado === 'LISTA_ESPERA')
      .sort((a, b) => new Date(a.fechaRespuesta).getTime() - new Date(b.fechaRespuesta).getTime());

    const confirmadosTotales = asistencias.filter(a => a.estado === 'ASISTIRE');
    const noAsistiran = asistencias.filter(a => a.estado === 'NO_ASISTIRE');
    const pendientes = asistencias.filter(a => a.estado === 'PENDIENTE');

    return {
      teamPlayersMap,
      comodines,
      waitlist,
      confirmadosTotales,
      noAsistiran,
      pendientes
    };
  }, [asistencias, bandos, matchmakerRun]);

  const isOrganizador = hasPermission("crear_convocatoria") || hasPermission("dividir_bandos") || hasPermission("gestionar_convocatorias");
  const slotsRemaining = (convocatoria?.cupoMaximo || 0) - playerLists.confirmadosTotales.length;

  // Determine sport emoji helper
  const getSportEmoji = (deporte: string) => {
    const name = deporte.toLowerCase();
    if (name.includes("futbol") || name.includes("fútbol") || name.includes("soccer")) return "⚽";
    if (name.includes("basquet") || name.includes("básquet") || name.includes("basketball") || name.includes("baloncesto")) return "🏀";
    if (name.includes("tenis") || name.includes("tennis")) return "🎾";
    if (name.includes("voley") || name.includes("voleibol") || name.includes("volleyball")) return "🏐";
    return "🏆";
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Spinner className="h-10 w-10 text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Cargando convocatoria...</p>
      </div>
    );
  }

  if (!convocatoria) {
    return (
      <Alert variant="destructive" className="max-w-xl mx-auto rounded">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error || "Convocatoria no encontrada."}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto notion-animate-fade pb-12 px-4 sm:px-6">
      {/* Navigation / Actions Bar */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          onClick={() => navigate("/convocatorias")}
          className="h-8 gap-1.5 font-semibold text-xs text-muted-foreground hover:text-foreground group px-2 rounded-md hover:bg-muted/50"
        >
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
          Volver a Convocatorias
        </Button>

        {/* Quick status badge */}
        <Badge 
          variant={ESTADO_COLORS[convocatoria.estado] || "default"} 
          className="text-[10px] uppercase px-2.5 py-0.5 font-extrabold tracking-wider"
        >
          {convocatoria.estado}
        </Badge>
      </div>

      {/* Cover / Header section */}
      <div className="relative rounded-lg overflow-hidden border border-border bg-muted/30">
        <div className={`h-28 notion-cover ${
          convocatoria.deporteNombre?.toLowerCase().includes("futbol") || convocatoria.deporteNombre?.toLowerCase().includes("fútbol")
            ? "notion-cover-soccer"
            : "notion-cover-sports"
        }`} />
        <div className="p-6 relative pt-10">
          <div className="absolute top-[-36px] left-6 text-5xl bg-background p-2 rounded-xl border border-border/80 shadow-sm select-none">
            {getSportEmoji(convocatoria.deporteNombre || "")}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{convocatoria.titulo}</h1>
          </div>
        </div>
      </div>

      {/* Error Alert inside Notion style callout */}
      {error && (
        <div className="notion-callout border-destructive/20 bg-destructive/5 dark:bg-destructive/10 items-center">
          <div className="notion-callout-icon">⚠️</div>
          <div className="text-sm text-destructive">{error}</div>
        </div>
      )}

        {/* Notion Properties Grid */}
        <div className="notion-property-grid border-b border-border pb-6 mb-6">
          <div className="notion-property-label">
            <Activity size={13} /> Deporte
          </div>
          <div className="notion-property-value flex items-center gap-2">
            <span className="font-semibold text-sm">{convocatoria.deporteNombre}</span>
            {convocatoria.categoria && (
              <Badge variant="outline" className="text-[9px] uppercase font-extrabold py-0">
                <Tag size={9} className="mr-0.5" />
                {convocatoria.categoria}
              </Badge>
            )}
          </div>

          <div className="notion-property-label">
            <Calendar size={13} /> Fecha y Hora
          </div>
          <div className="notion-property-value text-sm font-semibold">
            {formatDateTime(convocatoria.fechaHora ?? null)}
          </div>

          {convocatoria.lugar && (
            <>
              <div className="notion-property-label">
                <MapPin size={13} /> Lugar
              </div>
              <div className="notion-property-value text-sm font-semibold truncate" title={convocatoria.lugar}>
                {convocatoria.lugar}
              </div>
            </>
          )}

          {convocatoria.fechaLimiteInscripcion && (
            <>
              <div className="notion-property-label text-destructive">
                <Clock size={13} /> Límite Registro
              </div>
              <div className="notion-property-value text-sm font-bold text-destructive">
                {formatDateTime(convocatoria.fechaLimiteInscripcion)}
              </div>
            </>
          )}

          {convocatoria.cupoMaximo != null && convocatoria.cupoMaximo > 0 && (
            <>
              <div className="notion-property-label">
                <Users size={13} /> Cupos libres
              </div>
              <div className="notion-property-value text-sm font-semibold flex items-center gap-2">
                <span>{playerLists.confirmadosTotales.length} / {convocatoria.cupoMaximo}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  slotsRemaining <= 3 && slotsRemaining > 0 
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 animate-pulse" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  {slotsRemaining > 0 ? `${slotsRemaining} cupos` : "Lleno"}
                </span>
              </div>
            </>
          )}

          <div className="notion-property-label">
            <User size={13} /> Organizador
          </div>
          <div className="notion-property-value text-sm font-semibold">
            {convocatoria.creadoPorNombre}
          </div>
        </div>

        {/* Additional Info Callout */}
        {convocatoria.descripcion && (
          <div className="notion-callout mb-6">
            <div className="notion-callout-icon">💡</div>
            <div className="flex-1 space-y-1">
              <div className="font-semibold text-xs text-muted-foreground uppercase tracking-widest">Información Adicional</div>
              <div className="text-sm text-foreground leading-relaxed">{convocatoria.descripcion}</div>
            </div>
          </div>
        )}

        {/* RSVP Responsive Action Panel */}
        <div className="notion-callout border-primary/20 bg-primary/[0.03] dark:bg-primary/[0.06] mb-8 items-center justify-between flex-col md:flex-row gap-4">
          <div className="flex items-center gap-3">
            <div className="notion-callout-icon">📝</div>
            <div className="space-y-0.5">
              <div className="font-bold text-sm">Registro de Asistencia</div>
              <p className="text-xs text-muted-foreground">
                {convocatoria.estado === "ABIERTA" 
                  ? "¿Vas a participar en esta convocatoria? Confirma tu asistencia."
                  : "Las inscripciones para este partido se encuentran cerradas."}
              </p>
            </div>
          </div>

          {convocatoria.estado === "ABIERTA" ? (
            <div className="flex gap-2 w-full md:w-auto">
              <Button 
                disabled={responderLoading}
                onClick={() => handleRespondedAsistencia("ASISTIRE")}
                className={`flex-1 md:flex-initial h-8 px-4 text-xs font-semibold rounded border transition-all ${
                  miAsistencia?.estado === "ASISTIRE" 
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600" 
                    : "bg-background text-foreground hover:bg-muted border-border"
                }`}
              >
                {responderLoading && miAsistencia?.estado !== "ASISTIRE" ? (
                  <Spinner size="sm" className="mr-1.5" />
                ) : (
                  <CheckCircle2 size={13} className="mr-1.5" />
                )}
                Asistiré
              </Button>

              <Button 
                disabled={responderLoading}
                onClick={() => handleRespondedAsistencia("NO_ASISTIRE")}
                className={`flex-1 md:flex-initial h-8 px-4 text-xs font-semibold rounded border transition-all ${
                  miAsistencia?.estado === "NO_ASISTIRE" 
                    ? "bg-destructive hover:bg-destructive/90 text-white border-destructive" 
                    : "bg-background text-foreground hover:bg-muted border-border"
                }`}
              >
                {responderLoading && miAsistencia?.estado !== "NO_ASISTIRE" ? (
                  <Spinner size="sm" className="mr-1.5" />
                ) : (
                  <XCircle size={13} className="mr-1.5" />
                )}
                No asistiré
              </Button>
            </div>
          ) : (
            <Badge variant="secondary" className="px-2.5 py-0.5 font-bold text-xs">
              Inscripciones Cerradas
            </Badge>
          )}
        </div>

        {/* Main Content Area (Alineaciones, Roster, etc) */}
        <div className="space-y-8">
          <Tabs defaultValue="asistencias" className="w-full">
            <div className="notion-db-header">
              <TabsList className="bg-transparent border-0 gap-3 py-1 flex h-10 w-fit">
                <TabsTrigger 
                  value="asistencias" 
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none font-bold text-xs px-2 cursor-pointer pb-2"
                >
                  <Shirt size={14} className="inline mr-1" />
                  Alineación / Roster
                </TabsTrigger>
                <TabsTrigger 
                  value="bandos" 
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none font-bold text-xs px-2 cursor-pointer pb-2"
                >
                  <Trophy size={14} className="inline mr-1" />
                  Bandos ({bandos.length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Panel: Rosters */}
            <TabsContent value="asistencias" className="space-y-6 focus:outline-none">
              {/* Intelligent Matchmaking Balance Callout */}
              {isOrganizador && (
                <div className="notion-callout bg-primary/[0.03] border-primary/20 flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex gap-3">
                    <div className="notion-callout-icon">⚡</div>
                    <div>
                      <div className="font-bold text-sm">Herramientas de Balanceo Táctico</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Autobalancea los jugadores confirmados en bandos equitativos según su nivel y posición.
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleMatchmaking} 
                    disabled={matchmakingLoading || playerLists.confirmadosTotales.length < 2}
                    className="h-8 px-4 font-bold text-xs bg-primary hover:bg-primary/95 text-primary-foreground rounded transition-premium shrink-0"
                  >
                    {matchmakingLoading ? (
                      <>
                        <Spinner size="sm" className="mr-1.5" />
                        Calculando...
                      </>
                    ) : (
                      <>
                        <Activity size={14} className="mr-1.5" />
                        Autobalancear Equipos
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Roster Layout */}
              {asistencias.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-lg bg-muted/10">
                  <Users size={32} className="mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm font-semibold text-muted-foreground">No se registran asistencias aún</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                    Los jugadores invitados o registrados aparecerán aquí una vez respondan.
                  </p>
                </div>
              ) : (
                <>
                  {/* Balanced Teams Kanban Board */}
                  {matchmakerRun && bandos.length >= 2 ? (
                    <div className="space-y-6">
                      <div className="notion-board">
                        {playerLists.teamPlayersMap.map(({ team, players }) => {
                          const teamColorHex = getTeamColorHex(team.color || "");
                          return (
                            <div key={team.id} className="notion-board-column">
                              {/* Board Column Header */}
                              <div className="notion-board-column-header border-b border-border pb-2 mb-2">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <span 
                                    className="w-3 h-3 rounded-full border shrink-0" 
                                    style={{ backgroundColor: teamColorHex }} 
                                  />
                                  <span className="font-bold text-sm truncate text-foreground">{team.nombre}</span>
                                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.2 rounded font-normal">
                                    {players.length}
                                  </span>
                                </div>
                                {isOrganizador && (
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6 text-muted-foreground hover:bg-muted"
                                      onClick={() => openBandoDialog(team)}
                                    >
                                      <Edit size={11} />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                      onClick={() => handleDeleteBando(team.id)}
                                    >
                                      <Trash2 size={11} />
                                    </Button>
                                  </div>
                                )}
                              </div>

                              {/* Player cards inside column */}
                              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                                {players.length === 0 ? (
                                  <p className="text-xs text-muted-foreground text-center py-6 italic font-medium">Sin jugadores asignados</p>
                                ) : (
                                  players.map((asis) => (
                                    <div key={asis.id} className="notion-board-card">
                                      <div className="flex items-center justify-between gap-2 overflow-hidden">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                          <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-muted rounded border shrink-0 text-muted-foreground">
                                            {asis.numeroCamiseta != null ? `#${asis.numeroCamiseta}` : "—"}
                                          </span>
                                          <span className="text-xs font-semibold text-foreground truncate">{asis.usuarioNombre}</span>
                                        </div>
                                      </div>
                                      {asis.posicionPreferidaNombre && (
                                        <div className="mt-2 flex">
                                          <span className="text-[9px] font-bold text-primary bg-primary/10 dark:bg-primary/20 uppercase tracking-widest px-1.5 py-0.5 rounded">
                                            {asis.posicionPreferidaNombre}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Comodines & Waitlist side-by-side */}
                      {(playerLists.comodines.length > 0 || playerLists.waitlist.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                          {playerLists.comodines.length > 0 && (
                            <div className="border border-amber-500/20 rounded bg-amber-500/[0.02] p-4">
                              <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <Compass size={13} />
                                Comodines ({playerLists.comodines.length})
                              </h4>
                              <div className="space-y-2">
                                {playerLists.comodines.map((asis) => (
                                  <div key={asis.id} className="flex items-center justify-between p-2.5 rounded bg-background border border-border/60 text-xs">
                                    <span className="font-semibold">{asis.usuarioNombre}</span>
                                    {asis.posicionPreferidaNombre && (
                                      <Badge variant="outline" className="text-[9px]">{asis.posicionPreferidaNombre}</Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {playerLists.waitlist.length > 0 && (
                            <div className="border border-blue-500/20 rounded bg-blue-500/[0.02] p-4">
                              <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <Clock size={13} />
                                Lista de Espera ({playerLists.waitlist.length})
                              </h4>
                              <div className="space-y-2">
                                {playerLists.waitlist.map((asis, idx) => (
                                  <div key={asis.id} className="flex items-center justify-between p-2.5 rounded bg-background border border-border/60 text-xs">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-muted-foreground font-bold">{idx + 1}.</span>
                                      <span className="font-semibold">{asis.usuarioNombre}</span>
                                    </div>
                                    <Badge variant="outline" className="text-[9px] bg-blue-500/5 text-blue-600 border-blue-500/20 uppercase font-bold">En Espera</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Not attending & pending list */}
                      {(playerLists.pendientes.length > 0 || playerLists.noAsistiran.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 border-t border-border pt-6">
                          {playerLists.pendientes.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1">
                                <Clock size={11} />
                                <span>Sin Confirmar ({playerLists.pendientes.length})</span>
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {playerLists.pendientes.map(p => (
                                  <span key={p.id} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded border">
                                    {p.usuarioNombre}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {playerLists.noAsistiran.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-[10px] font-black text-destructive uppercase tracking-widest flex items-center gap-1">
                                <XCircle size={11} />
                                <span>No Asistirán ({playerLists.noAsistiran.length})</span>
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {playerLists.noAsistiran.map(p => (
                                  <span key={p.id} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded border line-through">
                                    {p.usuarioNombre}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Flat roster segmented in sub-tabs */
                    <Tabs defaultValue="confirmados" className="w-full">
                      <div className="border-b mb-3">
                        <TabsList className="bg-transparent border-0 gap-4 py-1 flex h-10 w-fit">
                          <TabsTrigger value="confirmados" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none font-bold text-xs px-1 pb-2 cursor-pointer">
                            Confirmados ({playerLists.confirmadosTotales.length})
                          </TabsTrigger>
                          <TabsTrigger value="espera" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none font-bold text-xs px-1 pb-2 cursor-pointer">
                            Espera ({playerLists.waitlist.length})
                          </TabsTrigger>
                          <TabsTrigger value="otros" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none font-bold text-xs px-1 pb-2 cursor-pointer">
                            Sin Confirmar ({playerLists.pendientes.length})
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="confirmados" className="space-y-2 focus:outline-none pt-2">
                        {playerLists.confirmadosTotales.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-8 text-center bg-muted/5 border rounded">Nadie ha confirmado asistencia todavía.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {playerLists.confirmadosTotales.map((asis) => (
                              <div key={asis.id} className="flex items-center justify-between p-3 rounded border border-border bg-background hover:bg-muted/10 transition-premium">
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center font-black text-primary text-xs shrink-0 select-none">
                                    {asis.usuarioNombre ? asis.usuarioNombre.charAt(0).toUpperCase() : "?"}
                                  </div>
                                  <div className="overflow-hidden">
                                    <p className="text-xs font-semibold text-foreground truncate">{asis.usuarioNombre || asis.nombreExterno}</p>
                                    {asis.posicionPreferidaNombre && (
                                      <p className="text-[9px] text-primary uppercase font-black tracking-widest mt-0.5">
                                        {asis.posicionPreferidaNombre}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <Badge variant="success" className="text-[8px] font-black uppercase shrink-0">Confirmado</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="espera" className="space-y-2 focus:outline-none pt-2">
                        {playerLists.waitlist.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-8 text-center bg-muted/5 border rounded">Lista de espera vacía.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {playerLists.waitlist.map((asis, idx) => (
                              <div key={asis.id} className="flex items-center justify-between p-3 rounded border border-border bg-background hover:bg-muted/10 transition-premium">
                                <div className="flex items-center gap-3">
                                  <span className="h-5 w-5 rounded bg-blue-500/10 text-blue-600 flex items-center justify-center text-[10px] font-extrabold">{idx + 1}</span>
                                  <span className="text-xs font-semibold text-foreground">{asis.usuarioNombre}</span>
                                </div>
                                <Badge variant="info" className="text-[8px] font-black uppercase">En Espera</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="otros" className="space-y-2 focus:outline-none pt-2">
                        {playerLists.pendientes.length === 0 && playerLists.noAsistiran.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-8 text-center bg-muted/5 border rounded">Todos los invitados han respondido.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {playerLists.pendientes.map((asis) => (
                              <div key={asis.id} className="flex items-center justify-between p-3 rounded border border-border bg-background hover:bg-muted/10 transition-premium">
                                <span className="text-xs font-semibold text-foreground truncate">{asis.usuarioNombre}</span>
                                <Badge variant="warning" className="text-[8px] font-black uppercase shrink-0">Pendiente</Badge>
                              </div>
                            ))}
                            {playerLists.noAsistiran.map((asis) => (
                              <div key={asis.id} className="flex items-center justify-between p-3 rounded border border-border bg-background hover:bg-muted/10 transition-premium">
                                <span className="text-xs font-semibold text-muted-foreground line-through truncate">{asis.usuarioNombre}</span>
                                <Badge variant="destructive" className="text-[8px] font-black uppercase shrink-0">No Asistirá</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  )}
                </>
              )}
            </TabsContent>

            {/* Tab Panel: Bandos Settings */}
            <TabsContent value="bandos" className="space-y-4 focus:outline-none">
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Grupos y Equipos</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Grupos asignados a esta convocatoria.</p>
                </div>
                
                {isOrganizador && (
                  <Dialog open={bandoDialogOpen} onOpenChange={setbandoDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        onClick={() => openBandoDialog()} 
                        size="sm" 
                        variant="outline" 
                        className="h-8 gap-1 font-bold text-xs rounded border border-border hover:bg-muted"
                      >
                        <Plus size={13} /> Nuevo Bando
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-lg border bg-card p-6 max-w-md">
                      <DialogHeader>
                        <DialogTitle className="font-extrabold text-base tracking-tight">
                          {editingBando ? "Editar Bando" : "Nuevo Bando"}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                          Define el nombre y color táctico que identificará a este equipo.
                        </DialogDescription>
                      </DialogHeader>
                      {bandoError && (
                        <Alert variant="destructive" className="rounded border border-destructive/15 my-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{bandoError}</AlertDescription>
                        </Alert>
                      )}
                      <div className="space-y-4 py-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="equipo-nombre" className="text-xs font-bold text-muted-foreground">Nombre del Bando</Label>
                          <Input 
                            id="equipo-nombre" 
                            value={bandoForm.nombre} 
                            onChange={(e) => setbandoForm({ ...bandoForm, nombre: e.target.value })} 
                            placeholder="Ej: Bando Rojo, Los Leones" 
                            className="rounded bg-background border border-border px-3 py-1.5 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-muted-foreground">Color Táctico</Label>
                          <div className="flex gap-2.5 flex-wrap pt-1">
                            {TEAM_COLORS.map((c) => (
                              <button 
                                key={c} 
                                type="button" 
                                onClick={() => setbandoForm({ ...bandoForm, color: c })}
                                className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                                  bandoForm.color === c 
                                    ? "border-foreground scale-110 ring-2 ring-primary/20" 
                                    : "border-transparent"
                                }`}
                                style={{ backgroundColor: c }} 
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <DialogFooter className="gap-2 border-t pt-4">
                        <Button 
                          variant="outline" 
                          onClick={() => setbandoDialogOpen(false)} 
                          className="font-bold text-xs rounded border hover:bg-muted"
                        >
                          Cancelar
                        </Button>
                        <Button 
                          onClick={handleSaveBando} 
                          disabled={bandoSaving || !bandoForm.nombre} 
                          className="font-bold text-xs rounded bg-primary text-primary-foreground hover:bg-primary/95"
                        >
                          {bandoSaving ? <Spinner className="text-white" /> : editingBando ? "Actualizar" : "Crear Bando"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              {bandos.length === 0 ? (
                <div className="text-center py-10 border border-dashed rounded bg-muted/5">
                  <Trophy size={28} className="mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-xs text-muted-foreground font-semibold">No hay bandos configurados</p>
                  {isOrganizador && <p className="text-[10px] text-muted-foreground mt-0.5">Crea bandos para poder distribuir a los jugadores en la alineación.</p>}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {bandos.map((eq) => (
                    <div 
                      key={eq.id} 
                      className="flex items-center justify-between p-3 rounded border border-border bg-background hover:bg-muted/10 transition-premium relative overflow-hidden group shadow-sm"
                    >
                      {eq.color && (
                        <div className="absolute top-0 bottom-0 left-0 w-[4px]" style={{ backgroundColor: eq.color }} />
                      )}
                      <div className="flex items-center gap-3 pl-2 overflow-hidden">
                        <div className="w-3.5 h-3.5 rounded-full shrink-0 border border-border" style={{ backgroundColor: eq.color || '#ccc' }} />
                        <p className="text-xs font-semibold text-foreground truncate">{eq.nombre}</p>
                      </div>
                      {isOrganizador && (
                        <div className="flex gap-1 items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded text-muted-foreground hover:text-primary hover:bg-muted" 
                            onClick={() => openBandoDialog(eq)}
                          >
                            <Edit size={12} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                            onClick={() => handleDeleteBando(eq.id)}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Admin Operations Callout (Shown below) */}
          {isOrganizador && (
            <div className="notion-callout border-destructive/20 bg-destructive/[0.02] dark:bg-destructive/[0.04] mt-8 flex-col">
              <div className="flex gap-2 items-center">
                <span className="notion-callout-icon">⚙️</span>
                <div className="font-bold text-xs text-muted-foreground uppercase tracking-widest">Panel de Administración</div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {convocatoria.estado === "BORRADOR" && (
                  <Button 
                    onClick={async () => {
                      try {
                        await api.put(`/api/convocatorias/${id}/abrir`);
                        fetchData();
                      } catch (err: unknown) {
                        setError(getApiErrorMessage(err));
                      }
                    }}
                    className="h-8 px-3 font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-premium cursor-pointer border border-emerald-600"
                  >
                    <CheckCircle2 size={13} className="mr-1.5" />
                    Abrir Convocatoria
                  </Button>
                )}

                {convocatoria.estado !== "CANCELADA" && convocatoria.estado !== "FINALIZADA" && (
                  <Button 
                    variant="destructive"
                    onClick={async () => {
                      if (confirm("¿Estás seguro de cancelar esta convocatoria?")) {
                        try {
                          await api.put(`/api/convocatorias/${id}/cancelar`);
                          fetchData();
                        } catch (err: unknown) {
                          setError(getApiErrorMessage(err));
                        }
                      }
                    }}
                    className="h-8 px-3 font-semibold text-xs rounded border border-destructive/20 hover:bg-destructive/10 bg-background text-destructive cursor-pointer"
                  >
                    <XCircle size={13} className="mr-1.5" />
                    Cancelar Partido
                  </Button>
                )}

                {(convocatoria.estado === "BORRADOR" || convocatoria.estado === "ABIERTA") && (
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/convocatorias/${id}/edit`)}
                    className="h-8 px-3 font-semibold text-xs rounded border border-border hover:bg-muted text-foreground bg-background cursor-pointer"
                  >
                    <Edit size={13} className="mr-1.5" />
                    Editar Detalles
                  </Button>
                )}

                {convocatoria.estado === "BORRADOR" && (
                  <Button 
                    variant="destructive"
                    onClick={async () => {
                      if (confirm("¿Estás seguro de eliminar completamente esta convocatoria?")) {
                        try {
                          await api.delete(`/api/convocatorias/${id}`);
                          navigate("/convocatorias");
                        } catch (err: unknown) {
                          setError(getApiErrorMessage(err));
                        }
                      }
                    }}
                    className="h-8 px-3 font-semibold text-xs rounded border border-destructive/20 hover:bg-destructive/10 bg-background text-destructive cursor-pointer"
                  >
                    <Trash2 size={13} className="mr-1.5" />
                    Eliminar Convocatoria
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
  );
}
