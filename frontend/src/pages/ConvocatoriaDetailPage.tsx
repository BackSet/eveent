import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/services/api";
import { formatDateTime } from "@/lib/formatDate";
import { ESTADO_COLORS, TEAM_COLORS, getTeamColorHex, getApiErrorMessage } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  UserCheck,
  UserX,
  AlertTriangle,
  Sparkles,
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
      <Alert variant="destructive" className="max-w-xl mx-auto rounded-2xl">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error || "Convocatoria no encontrada."}</AlertDescription>
      </Alert>
    );
  }

  const isOrganizador = hasPermission("crear_convocatoria") || hasPermission("dividir_bandos") || hasPermission("gestionar_convocatorias");
  const slotsRemaining = (convocatoria.cupoMaximo || 0) - playerLists.confirmadosTotales.length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => navigate("/convocatorias")}
        className="gap-1.5 font-semibold text-xs text-muted-foreground hover:text-foreground group transition-premium"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        Volver a Convocatorias
      </Button>

      {error && (
        <Alert variant="destructive" className="rounded-xl border border-destructive/15">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Grid Layout (2/3 & 1/3) */}
      <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
        {/* Left Column: Detail card & Interactive Tabs (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info Card */}
          <Card className="border-border/50 shadow-md relative overflow-hidden bg-card">
            {/* Visual top border with gradient decoration */}
            <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-primary via-purple-500 to-indigo-500" />
            
            <CardHeader className="pb-4 pt-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2.5 py-0.5 rounded-full">
                      {convocatoria.deporteNombre}
                    </span>
                    {convocatoria.categoria && (
                      <Badge variant="outline" className="text-[9px] uppercase font-bold py-0">
                        <Tag size={9} className="mr-0.5 shrink-0" />
                        {convocatoria.categoria}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-2xl font-black tracking-tight leading-tight">
                    {convocatoria.titulo}
                  </CardTitle>
                </div>

                <Badge 
                  variant={ESTADO_COLORS[convocatoria.estado] || "default"} 
                  className="text-xs uppercase px-3 py-1 font-black self-start tracking-wider shadow-sm"
                >
                  {convocatoria.estado}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {convocatoria.descripcion ? (
                <div className="space-y-1 bg-muted/20 p-4 rounded-2xl border border-border/40">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Información Adicional</span>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {convocatoria.descripcion}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Sin descripción proporcionada.</p>
              )}

              {/* RSVP Response Panel */}
              <div className="border-t pt-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-br from-primary/5 via-indigo-600/5 to-transparent border border-primary/10 glow-primary">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-foreground flex items-center gap-1.5">
                      <Sparkles size={14} className="text-yellow-500 animate-pulse" />
                      <span>Registra tu Asistencia</span>
                    </h4>
                    <p className="text-xs text-muted-foreground font-medium">
                      {convocatoria.estado === "ABIERTA" 
                        ? "¿Vas a participar en esta convocatoria? Confirma para reservar cupo."
                        : "Las inscripciones para este partido se encuentran actualmente cerradas."
                      }
                    </p>
                  </div>

                  {convocatoria.estado === "ABIERTA" ? (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button 
                        disabled={responderLoading}
                        onClick={() => handleRespondedAsistencia("ASISTIRE")}
                        className={`flex-1 sm:flex-initial gap-1.5 rounded-xl font-bold text-xs py-5 px-4 transition-premium shadow-md hover:scale-[1.02] border border-emerald-500/20 ${
                          miAsistencia?.estado === "ASISTIRE" 
                            ? "bg-emerald-600 text-white hover:bg-emerald-700 glow-success" 
                            : "bg-background text-foreground border-border/80 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
                        }`}
                      >
                        {responderLoading && miAsistencia?.estado !== "ASISTIRE" ? (
                          <Spinner size="sm" />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}
                        Asistiré
                      </Button>

                      <Button 
                        disabled={responderLoading}
                        onClick={() => handleRespondedAsistencia("NO_ASISTIRE")}
                        className={`flex-1 sm:flex-initial gap-1.5 rounded-xl font-bold text-xs py-5 px-4 transition-premium border border-destructive/10 ${
                          miAsistencia?.estado === "NO_ASISTIRE" 
                            ? "bg-destructive text-white hover:bg-destructive/90" 
                            : "bg-background text-foreground border-border/80 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20"
                        }`}
                      >
                        {responderLoading && miAsistencia?.estado !== "NO_ASISTIRE" ? (
                          <Spinner size="sm" />
                        ) : (
                          <XCircle size={14} />
                        )}
                        No asistiré
                      </Button>
                    </div>
                  ) : (
                    <Badge variant="secondary" className="px-3 py-1 font-bold text-xs">
                      Inscripciones Cerradas
                    </Badge>
                  )}
                </div>

                {miAsistencia && (
                  <div className="flex items-center justify-between p-3 mt-3 rounded-xl bg-muted/40 border border-border/60 text-xs">
                    <span className="font-semibold text-muted-foreground">Tu estado registrado:</span>
                    <div className="flex items-center gap-1.5 font-bold">
                      {miAsistencia.estado === "ASISTIRE" && <CheckCircle2 size={13} className="text-emerald-500" />}
                      {miAsistencia.estado === "NO_ASISTIRE" && <XCircle size={13} className="text-destructive" />}
                      <Badge variant={ESTADO_COLORS[miAsistencia.estado]} className="text-[9px] uppercase font-black px-2 py-0">
                        {miAsistencia.estado}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Interactive Panels Tabs */}
          <Tabs defaultValue="asistencias" className="w-full">
            <TabsList className="bg-muted/40 p-1.5 rounded-xl border border-border/40 max-w-sm mb-6 flex gap-1 shadow-sm">
              <TabsTrigger 
                value="asistencias" 
                className="rounded-lg font-bold text-xs py-2 px-3 flex-1 transition-premium data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                Alineación / Asistencias ({asistencias.length})
              </TabsTrigger>
              <TabsTrigger 
                value="bandos" 
                className="rounded-lg font-bold text-xs py-2 px-3 flex-1 transition-premium data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                Bandos ({bandos.length})
              </TabsTrigger>
            </TabsList>

            {/* Panel 1: Roster & Balanced Teams */}
            <TabsContent value="asistencias" className="space-y-6 focus:outline-none">
              {/* Intelligent Balance Admin Tool */}
              {isOrganizador && (
                <Card className="border-primary/20 bg-primary/[0.02] overflow-hidden shadow-sm relative">
                  <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-primary" />
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Activity size={14} />
                      </div>
                      <CardTitle className="text-sm font-bold text-foreground">Herramientas de Balanceo</CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      Autobalancea los jugadores confirmados usando el algoritmo de prioridad de posición de juego.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pt-0">
                    <div className="text-xs text-muted-foreground">
                      Confirmados actuales: <span className="font-extrabold text-foreground">{playerLists.confirmadosTotales.length}</span>
                    </div>

                    <Button 
                      onClick={handleMatchmaking} 
                      disabled={matchmakingLoading || playerLists.confirmadosTotales.length < 2} 
                      className="rounded-xl font-bold gap-1.5 shrink-0 text-xs py-4 px-4 transition-premium shadow-md hover:scale-[1.02]"
                    >
                      {matchmakingLoading ? (
                        <>
                          <Spinner size="sm" className="text-white animate-spin" />
                          <span>Calculando alineaciones...</span>
                        </>
                      ) : (
                        <>
                          <Activity size={14} />
                          <span>Autobalancear Equipos</span>
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Roster lists logic */}
              {asistencias.length === 0 ? (
                <Card className="border-border/60">
                  <CardContent className="pt-10 pb-10 text-center">
                    <Users size={32} className="mx-auto text-muted-foreground/60 mb-2 animate-pulse" />
                    <p className="text-sm text-muted-foreground font-semibold">No se registran asistencias aún</p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
                      Los jugadores invitados o registrados aparecerán aquí una vez respondan.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Balanced Teams Tactics Board */}
                  {matchmakerRun && bandos.length >= 2 ? (
                    <div className="space-y-6">
                      <div className="border-b pb-2">
                        <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-1.5">
                          <Shirt size={14} className="text-primary" />
                          <span>Equipos Balanceados</span>
                        </h3>
                        <p className="text-[11px] text-muted-foreground">Alineación equilibrada generada para el partido.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {playerLists.teamPlayersMap.map(({ team, players }) => {
                          const teamColorHex = getTeamColorHex(team.color || "");
                          return (
                            <Card 
                              key={team.id} 
                              className="overflow-hidden hover:shadow-lg transition-premium border-border/50" 
                              style={{ borderTop: `4px solid ${teamColorHex}` }}
                            >
                              <CardHeader className="pb-3 pt-4 bg-muted/10 border-b border-border/30">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <div 
                                      className="h-7 w-7 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-sm" 
                                      style={{ backgroundColor: teamColorHex }}
                                    >
                                      {players.length}
                                    </div>
                                    <CardTitle className="text-sm font-black text-foreground">{team.nombre}</CardTitle>
                                  </div>
                                  <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: teamColorHex }} />
                                </div>
                              </CardHeader>

                              <CardContent className="p-3 space-y-1.5 bg-card/60">
                                {players.length === 0 ? (
                                  <p className="text-xs text-muted-foreground text-center py-6 italic font-medium">Sin jugadores asignados</p>
                                ) : (
                                  players.map((asis) => (
                                    <div 
                                      key={asis.id} 
                                      className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-border/40 bg-background/50 hover:bg-muted/30 transition-premium hover:-translate-y-0.5 shadow-sm group"
                                    >
                                      <div className="flex items-center gap-3">
                                        <span 
                                          className="h-6 w-6 rounded-lg text-xs font-extrabold flex items-center justify-center shadow-inner" 
                                          style={{ backgroundColor: `${teamColorHex}15`, color: teamColorHex }}
                                        >
                                          {asis.numeroCamiseta ?? "#"}
                                        </span>
                                        <div className="overflow-hidden">
                                          <p className="text-xs font-bold truncate text-foreground group-hover:text-primary transition-colors">
                                            {asis.usuarioNombre}
                                          </p>
                                          {asis.posicionPreferidaNombre && (
                                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-0.5 block">
                                              {asis.posicionPreferidaNombre}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>

                      {/* Comodines (Wildcards) */}
                      {playerLists.comodines.length > 0 && (
                        <Card className="overflow-hidden border-amber-500/20 bg-amber-500/[0.01]">
                          <CardHeader className="pb-2 pt-3 border-b border-amber-500/10">
                            <div className="flex items-center gap-2">
                              <Compass size={14} className="text-amber-500" />
                              <CardTitle className="text-xs font-black uppercase text-amber-600 tracking-wider">Comodines</CardTitle>
                              <Badge variant="outline" className="text-[9px] bg-amber-500/5 text-amber-600 border-amber-500/20">{playerLists.comodines.length}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 p-4">
                            {playerLists.comodines.map((asis) => (
                              <div key={asis.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-amber-500/10 bg-background/50 shadow-sm">
                                <span className="h-6 w-6 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center text-[10px] font-extrabold">C</span>
                                <div className="overflow-hidden">
                                  <p className="text-xs font-bold text-foreground truncate">{asis.usuarioNombre}</p>
                                  {asis.posicionPreferidaNombre && <p className="text-[8px] text-muted-foreground uppercase font-black tracking-widest">{asis.posicionPreferidaNombre}</p>}
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}

                      {/* Waitlist (Lista de Espera) */}
                      {playerLists.waitlist.length > 0 && (
                        <Card className="overflow-hidden border-blue-500/20 bg-blue-500/[0.01]">
                          <CardHeader className="pb-2 pt-3 border-b border-blue-500/10">
                            <div className="flex items-center gap-2">
                              <Clock size={14} className="text-blue-500" />
                              <CardTitle className="text-xs font-black uppercase text-blue-600 tracking-wider">Lista de Espera</CardTitle>
                              <Badge variant="outline" className="text-[9px] bg-blue-500/5 text-blue-600 border-blue-500/20">{playerLists.waitlist.length}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="p-3">
                            <div className="divide-y divide-border/40">
                              {playerLists.waitlist.map((asis, idx) => (
                                <div key={asis.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                                  <div className="flex items-center gap-3">
                                    <span className="h-5 w-5 rounded bg-blue-500/10 text-blue-600 flex items-center justify-center text-[10px] font-extrabold">{idx + 1}</span>
                                    <span className="text-xs font-bold text-foreground">{asis.usuarioNombre}</span>
                                  </div>
                                  <Badge variant="outline" className="text-[9px] text-blue-500 font-extrabold uppercase">En Espera</Badge>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Not attending & pending list */}
                      {(playerLists.pendientes.length > 0 || playerLists.noAsistiran.length > 0) && (
                        <Card className="border-border/40 bg-muted/10">
                          <CardContent className="p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                              {playerLists.pendientes.length > 0 && (
                                <div className="space-y-1.5">
                                  <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1">
                                    <Clock size={10} />
                                    <span>Pendientes ({playerLists.pendientes.length})</span>
                                  </span>
                                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                    {playerLists.pendientes.map(p => (
                                      <p key={p.id} className="text-xs text-muted-foreground font-semibold bg-background/50 px-2.5 py-1 rounded-lg border border-border/20 truncate">
                                        • {p.usuarioNombre}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {playerLists.noAsistiran.length > 0 && (
                                <div className="space-y-1.5">
                                  <span className="text-[9px] font-black text-destructive uppercase tracking-widest flex items-center gap-1">
                                    <XCircle size={10} />
                                    <span>No asistirán ({playerLists.noAsistiran.length})</span>
                                  </span>
                                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                    {playerLists.noAsistiran.map(p => (
                                      <p key={p.id} className="text-xs text-muted-foreground font-semibold bg-background/50 px-2.5 py-1 rounded-lg border border-border/20 truncate">
                                        • {p.usuarioNombre}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ) : (
                    /* Flat assistants roster segmented in tabs */
                    <Card className="border-border/50">
                      <CardContent className="p-0">
                        <Tabs defaultValue="confirmados" className="w-full">
                          <div className="px-4 border-b bg-muted/10">
                            <TabsList className="bg-transparent border-0 gap-3 py-1 flex h-10 w-fit">
                              <TabsTrigger value="confirmados" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none font-bold text-xs px-1">
                                Confirmados ({playerLists.confirmadosTotales.length})
                              </TabsTrigger>
                              <TabsTrigger value="espera" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none font-bold text-xs px-1">
                                Espera ({playerLists.waitlist.length})
                              </TabsTrigger>
                              <TabsTrigger value="otros" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none font-bold text-xs px-1">
                                Sin Confirmar ({playerLists.pendientes.length})
                              </TabsTrigger>
                            </TabsList>
                          </div>

                          <TabsContent value="confirmados" className="p-4 space-y-2 focus:outline-none">
                            {playerLists.confirmadosTotales.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic py-6 text-center">Nadie ha confirmado asistencia todavía.</p>
                            ) : (
                              playerLists.confirmadosTotales.map((asis) => (
                                <div key={asis.id} className="flex items-center justify-between p-2.5 rounded-xl border border-border/40 bg-card hover:bg-muted/20 transition-premium">
                                  <div className="flex items-center gap-3">
                                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center font-black text-primary text-xs shrink-0 select-none">
                                      {asis.usuarioNombre ? asis.usuarioNombre.charAt(0).toUpperCase() : "?"}
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-foreground">{asis.usuarioNombre || asis.nombreExterno}</p>
                                      {asis.posicionPreferidaNombre && (
                                        <p className="text-[9px] text-primary uppercase font-black tracking-widest mt-0.5">
                                          {asis.posicionPreferidaNombre}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <Badge variant="success" className="text-[8px] font-black uppercase">Confirmado</Badge>
                                </div>
                              ))
                            )}
                          </TabsContent>

                          <TabsContent value="espera" className="p-4 space-y-2 focus:outline-none">
                            {playerLists.waitlist.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic py-6 text-center">Lista de espera vacía.</p>
                            ) : (
                              playerLists.waitlist.map((asis, idx) => (
                                <div key={asis.id} className="flex items-center justify-between p-2.5 rounded-xl border border-border/40 bg-card hover:bg-muted/20 transition-premium">
                                  <div className="flex items-center gap-3">
                                    <span className="h-5 w-5 rounded bg-blue-500/10 text-blue-600 flex items-center justify-center text-[10px] font-extrabold">{idx + 1}</span>
                                    <span className="text-xs font-bold text-foreground">{asis.usuarioNombre}</span>
                                  </div>
                                  <Badge variant="info" className="text-[8px] font-black uppercase">En Espera</Badge>
                                </div>
                              ))
                            )}
                          </TabsContent>

                          <TabsContent value="otros" className="p-4 space-y-2 focus:outline-none">
                            {playerLists.pendientes.length === 0 && playerLists.noAsistiran.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic py-6 text-center">Todos los invitados han respondido.</p>
                            ) : (
                              <>
                                {playerLists.pendientes.map((asis) => (
                                  <div key={asis.id} className="flex items-center justify-between p-2.5 rounded-xl border border-border/40 bg-card hover:bg-muted/20 transition-premium">
                                    <span className="text-xs font-bold text-foreground">{asis.usuarioNombre}</span>
                                    <Badge variant="warning" className="text-[8px] font-black uppercase">Pendiente</Badge>
                                  </div>
                                ))}
                                {playerLists.noAsistiran.map((asis) => (
                                  <div key={asis.id} className="flex items-center justify-between p-2.5 rounded-xl border border-border/40 bg-card hover:bg-muted/20 transition-premium">
                                    <span className="text-xs font-bold text-muted-foreground">{asis.usuarioNombre}</span>
                                    <Badge variant="destructive" className="text-[8px] font-black uppercase">No Asistirá</Badge>
                                  </div>
                                ))}
                              </>
                            )}
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>

            {/* Panel 2: Bandos Configurations */}
            <TabsContent value="bandos" className="space-y-4 focus:outline-none">
              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <Trophy size={14} className="text-primary" />
                    <span>Bandos y Colores</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">Grupos de juego configurados para dividir los jugadores.</p>
                </div>
                
                {isOrganizador && (
                  <Dialog open={bandoDialogOpen} onOpenChange={setbandoDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        onClick={() => openBandoDialog()} 
                        size="sm" 
                        variant="outline" 
                        className="gap-1 font-bold text-xs rounded-xl"
                      >
                        <Plus size={13} />Nuevo Bando
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl border bg-card">
                      <DialogHeader>
                        <DialogTitle className="font-extrabold text-base tracking-tight">
                          {editingBando ? "Editar Bando" : "Nuevo Bando"}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                          Define el nombre y color táctico que identificará a este equipo en la pizarra.
                        </DialogDescription>
                      </DialogHeader>
                      {bandoError && (
                        <Alert variant="destructive" className="rounded-xl border border-destructive/15">
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
                            className="rounded-xl bg-background/50 border-border/80"
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
                                className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer shadow-md hover:scale-110 ${
                                  bandoForm.color === c 
                                    ? "border-foreground scale-115 ring-2 ring-primary/20" 
                                    : "border-transparent"
                                }`}
                                style={{ backgroundColor: c }} 
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
                        <Button 
                          variant="outline" 
                          onClick={() => setbandoDialogOpen(false)} 
                          className="font-bold text-xs rounded-xl"
                        >
                          Cancelar
                        </Button>
                        <Button 
                          onClick={handleSaveBando} 
                          disabled={bandoSaving || !bandoForm.nombre} 
                          className="font-bold text-xs rounded-xl"
                        >
                          {bandoSaving ? <Spinner className="text-white" /> : editingBando ? "Actualizar" : "Crear Bando"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              <Card className="border-border/50">
                <CardContent className="p-5">
                  {bandos.length === 0 ? (
                    <div className="text-center py-8">
                      <Trophy size={28} className="mx-auto text-muted-foreground/60 mb-2" />
                      <p className="text-xs text-muted-foreground font-semibold">No hay bandos configurados</p>
                      {isOrganizador && <p className="text-[10px] text-muted-foreground mt-0.5">Crea bandos para poder distribuir a los jugadores en la alineación.</p>}
                    </div>
                  ) : (
                    <div className="grid gap-3.5 sm:grid-cols-2">
                      {bandos.map((eq) => (
                        <div 
                          key={eq.id} 
                          className="flex items-center justify-between p-3 rounded-xl border border-border/40 hover:border-primary/20 bg-background/50 hover:bg-muted/10 transition-premium relative overflow-hidden group shadow-sm"
                        >
                          {eq.color && (
                            <div className="absolute top-0 bottom-0 left-0 w-[4px]" style={{ backgroundColor: eq.color }} />
                          )}
                          <div className="flex items-center gap-3 pl-2.5 overflow-hidden">
                            <div className="w-3.5 h-3.5 rounded-full shrink-0 border border-border shadow-inner" style={{ backgroundColor: eq.color || '#ccc' }} />
                            <p className="text-xs font-bold text-foreground truncate">{eq.nombre}</p>
                          </div>
                          {isOrganizador && (
                            <div className="flex gap-1 items-center shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5" 
                                onClick={() => openBandoDialog(eq)}
                              >
                                <Edit size={13} />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5" 
                                onClick={() => handleDeleteBando(eq.id)}
                              >
                                <Trash2 size={13} />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Sticky Sidebar with Details Card & Organizer Panel (1/3 width) */}
        <div className="space-y-6">
          {/* Metadata Sidebar Card */}
          <Card className="border-border/50 shadow-md sticky top-6">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-xs font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                <span>Información del Evento</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              {/* Info Items grid */}
              <div className="space-y-4">
                {/* Date-time */}
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Calendar size={15} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Fecha y Hora</p>
                    <p className="text-xs font-black text-foreground">{formatDateTime(convocatoria.fechaHora ?? null)}</p>
                  </div>
                </div>

                {/* Location */}
                {convocatoria.lugar && (
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <MapPin size={15} />
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Lugar</p>
                      <p className="text-xs font-black text-foreground truncate" title={convocatoria.lugar}>{convocatoria.lugar}</p>
                    </div>
                  </div>
                )}

                {/* Limit RSVP Time */}
                {convocatoria.fechaLimiteInscripcion && (
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive shrink-0">
                      <Clock size={15} />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-destructive uppercase tracking-widest">Límite Confirmación</p>
                      <p className="text-xs font-black text-foreground">{formatDateTime(convocatoria.fechaLimiteInscripcion)}</p>
                    </div>
                  </div>
                )}

                {/* Slots remaining details */}
                {convocatoria.cupoMaximo != null && convocatoria.cupoMaximo > 0 && (
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Users size={15} />
                    </div>
                    <div className="space-y-0.5 w-full">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cupos del Partido</p>
                      <div className="flex items-center justify-between text-xs font-black text-foreground">
                        <span>Máximo {convocatoria.cupoMaximo}</span>
                        <span className={slotsRemaining <= 3 && slotsRemaining > 0 ? "text-amber-600 font-black animate-pulse" : "text-muted-foreground"}>
                          {slotsRemaining > 0 ? `${slotsRemaining} libres` : "Sin cupos"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Creator/Organizer */}
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <User size={15} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Organizado por</p>
                    <p className="text-xs font-black text-foreground">{convocatoria.creadoPorNombre}</p>
                  </div>
                </div>
              </div>

              {/* Action buttons for Organizer */}
              {isOrganizador && (
                <div className="border-t border-border/40 pt-4 space-y-2">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2">Panel de Administración</span>
                  
                  <div className="grid grid-cols-1 gap-2">
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
                        className="w-full gap-1.5 font-bold text-xs py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-md transition-premium"
                      >
                        <CheckCircle2 size={13} />
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
                        className="w-full gap-1.5 font-bold text-xs py-2 rounded-xl border border-destructive/10"
                      >
                        <XCircle size={13} />
                        Cancelar Partido
                      </Button>
                    )}

                    {(convocatoria.estado === "BORRADOR" || convocatoria.estado === "ABIERTA") && (
                      <Button 
                        variant="outline"
                        onClick={() => navigate(`/convocatorias/${id}/edit`)}
                        className="w-full gap-1.5 font-bold text-xs py-2 rounded-xl border-border/80 hover:bg-muted"
                      >
                        <Edit size={13} />
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
                        className="w-full gap-1.5 font-bold text-xs py-2 rounded-xl border border-destructive/10"
                      >
                        <Trash2 size={13} />
                        Eliminar Convocatoria
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
