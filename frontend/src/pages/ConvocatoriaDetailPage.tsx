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
  const [numEquipos, setNumEquipos] = useState<number>(2);

  const [bandoDialogOpen, setbandoDialogOpen] = useState(false);
  const [editingBando, setEditingBando] = useState<BandoConvocatoria | null>(null);
  const [bandoForm, setbandoForm] = useState<bandoFormData>({ nombre: "", color: "" });
  const [bandoError, setbandoError] = useState("");
  const [bandoSaving, setbandoSaving] = useState(false);

  const [invitadoDialogOpen, setInvitadoDialogOpen] = useState(false);
  const [invitadoForm, setInvitadoForm] = useState<{ nombreExterno: string, posicionPreferidaId: string, posicionesPreferidasIds: number[] }>({ nombreExterno: "", posicionPreferidaId: "", posicionesPreferidasIds: [] });
  const [deportePosiciones, setDeportePosiciones] = useState<any[]>([]);
  const [invitadoSaving, setInvitadoSaving] = useState(false);
  const [invitadoError, setInvitadoError] = useState("");
  const [selectedInvitados, setSelectedInvitados] = useState<number[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [editingInvitado, setEditingInvitado] = useState<Asistencia | null>(null);

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
      if (equipRes.data && equipRes.data.length > 0) {
        setNumEquipos(equipRes.data.length);
      } else {
        const isEquipos = convRes.data.deporteEsPorEquipos !== false;
        setNumEquipos(isEquipos ? 2 : 1);
      }
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

  const handleMatchmaking = async (teamsCount?: number) => {
    setMatchmakingLoading(true);
    setError("");
    try {
      const url = `/api/convocatorias/${id}/matchmaking` + (teamsCount ? `?numEquipos=${teamsCount}` : "");
      await api.post(url);
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

  const openInvitadoDialog = async () => {
    setEditingInvitado(null);
    setInvitadoForm({ nombreExterno: "", posicionPreferidaId: "", posicionesPreferidasIds: [] });
    setInvitadoError("");
    setInvitadoDialogOpen(true);
    if (convocatoria?.deporteId) {
      try {
        const res = await api.get(`/api/deportes/${convocatoria.deporteId}/posiciones`);
        setDeportePosiciones(res.data);
      } catch (err: unknown) {
        console.error("Error al cargar posiciones", err);
      }
    }
  };

  const handleEditInvitadoClick = async (asis: Asistencia) => {
    setEditingInvitado(asis);
    setInvitadoForm({
      nombreExterno: asis.nombreExterno || "",
      posicionPreferidaId: asis.posicionPreferidaId ? String(asis.posicionPreferidaId) : "",
      posicionesPreferidasIds: asis.posicionesPreferidasIds || []
    });
    setInvitadoError("");
    setInvitadoDialogOpen(true);
    if (convocatoria?.deporteId) {
      try {
        const res = await api.get(`/api/deportes/${convocatoria.deporteId}/posiciones`);
        setDeportePosiciones(res.data);
      } catch (err: unknown) {
        console.error("Error al cargar posiciones", err);
      }
    }
  };

  const handleSaveInvitado = async () => {
    if (!invitadoForm.nombreExterno.trim()) {
      setInvitadoError("El nombre o apodo es obligatorio");
      return;
    }
    setInvitadoSaving(true);
    setInvitadoError("");
    try {
      const payload = {
        convocatoriaId: Number(id),
        nombreExterno: invitadoForm.nombreExterno.trim(),
        posicionPreferidaId: invitadoForm.posicionesPreferidasIds && invitadoForm.posicionesPreferidasIds.length > 0 
          ? Number(invitadoForm.posicionesPreferidasIds[0]) 
          : null,
        posicionesPreferidasIds: invitadoForm.posicionesPreferidasIds,
        estado: editingInvitado ? editingInvitado.estado : "ASISTIRE"
      };

      if (editingInvitado) {
        await api.put(`/api/asistencias/${editingInvitado.id}`, payload);
      } else {
        await api.post(`/api/convocatorias/${id}/asistencias`, payload);
      }

      setInvitadoDialogOpen(false);
      setInvitadoForm({ nombreExterno: "", posicionPreferidaId: "", posicionesPreferidasIds: [] });
      setEditingInvitado(null);
      fetchData();
    } catch (err: unknown) {
      setInvitadoError(getApiErrorMessage(err));
    } finally {
      setInvitadoSaving(false);
    }
  };

  const handleDeleteBulk = async () => {
    if (selectedInvitados.length === 0) return;
    if (!confirm(`¿Eliminar la asistencia de los ${selectedInvitados.length} invitados seleccionados?`)) return;
    
    setBulkDeleting(true);
    try {
      await api.delete(`/api/asistencias/bulk?ids=${selectedInvitados.join(",")}`);
      setSelectedInvitados([]);
      fetchData();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleUpdateInvitadoEstado = async (asistenciaId: number, estado: string) => {
    try {
      await api.put(`/api/asistencias/${asistenciaId}`, { estado });
      fetchData();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleUpdateBulkEstado = async (estado: string) => {
    if (selectedInvitados.length === 0) return;
    setBulkDeleting(true);
    try {
      await Promise.all(selectedInvitados.map(id => api.put(`/api/asistencias/${id}`, { estado })));
      setSelectedInvitados([]);
      fetchData();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDeleteInvitado = async (asistenciaId: number) => {
    if (!confirm("¿Cancelar la asistencia de este invitado?")) return;
    try {
      await api.delete(`/api/asistencias/${asistenciaId}`);
      fetchData();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleMovePlayer = async (asistenciaId: number, bandoId: number) => {
    try {
      await api.put(`/api/asistencias/${asistenciaId}`, { 
        bandoId: bandoId,
        estado: "ASISTIRE"
      });
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

  const isOrganizador = hasPermission("crear_convocatorias") || hasPermission("editar_convocatorias") || hasPermission("dividir_equipos");

  const isUserSuspended = useMemo(() => {
    if (!user?.fechaFinSuspension) return false;
    return new Date(user.fechaFinSuspension).getTime() > Date.now();
  }, [user]);

  const isInProgressOrDone = useMemo(() => {
    if (!convocatoria) return false;
    const isStateProgress = convocatoria.estado === 'EN_PROGRESO' || 
                            convocatoria.estado === 'FINALIZADA' || 
                            convocatoria.estado === 'CANCELADA';
    const isPastTime = convocatoria.fechaHora && new Date(convocatoria.fechaHora) <= new Date();
    return isStateProgress || isPastTime;
  }, [convocatoria]);

  const managedInvitados = useMemo(() => {
    return asistencias.filter(a => 
      isOrganizador 
        ? (a.invitadoPorId !== null || a.nombreExterno !== null) 
        : (a.invitadoPorId === user?.id)
    );
  }, [asistencias, isOrganizador, user?.id]);

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

      {isInProgressOrDone && (
        <div className="notion-callout border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10 items-center">
          <div className="notion-callout-icon">ℹ️</div>
          <div className="text-xs text-foreground/80 font-medium">
            Esta convocatoria está en progreso, finalizada o cancelada. El registro de asistencia y la configuración táctica están en modo de solo lectura.
          </div>
        </div>
      )}

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

        {/* RSVP Responsive Action Panel or Suspension Banner */}
        {isUserSuspended ? (
          <div className="notion-callout border-destructive bg-destructive/10 dark:bg-destructive/20 text-destructive p-5 flex flex-col md:flex-row items-center gap-4 mb-8">
            <div className="text-3xl select-none shrink-0">🚫</div>
            <div className="space-y-1.5 flex-1 text-left">
              <div className="font-extrabold text-base tracking-tight">Acceso Restringido - Cuenta Suspendida</div>
              <p className="text-xs text-foreground/80 leading-normal">
                Te encuentras temporalmente suspendido hasta el{" "}
                <span className="font-bold underline">
                  {new Date(user!.fechaFinSuspension!).toLocaleString()}
                </span>{" "}
                por el siguiente motivo:{" "}
                <span className="font-bold font-mono bg-destructive/15 px-1.5 py-0.5 rounded border border-destructive/25 text-destructive dark:text-destructive">
                  {user!.motivoSuspension}
                </span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                No tienes permitido confirmar asistencia ni registrar reservas en las convocatorias del sistema durante este período.
              </p>
            </div>
          </div>
        ) : (
          <div className="notion-callout border-primary/20 bg-primary/[0.03] dark:bg-primary/[0.06] mb-8 items-center justify-between flex-col md:flex-row gap-4">
            <div className="flex items-center gap-3">
              <div className="notion-callout-icon">📝</div>
              <div className="space-y-0.5">
                <div className="font-bold text-sm">Registro de Asistencia</div>
                <p className="text-xs text-muted-foreground">
                  {convocatoria.estado === "ABIERTA" 
                    ? "¿Vas a participar en esta convocatoria? Confirma tu asistencia."
                    : "Las inscripciones para esta convocatoria se encuentran cerradas."}
                </p>
              </div>
            </div>

            {convocatoria.estado === "ABIERTA" && !isInProgressOrDone ? (
              <div className="flex gap-2 w-full md:w-auto">
                <Button 
                  disabled={responderLoading}
                  onClick={() => handleRespondedAsistencia("ASISTIRE")}
                  className={`flex-1 md:flex-initial h-8 px-4 text-xs font-semibold rounded border transition-all ${
                    miAsistencia?.estado === "ASISTIRE" 
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600" 
                      : miAsistencia?.estado === "LISTA_ESPERA"
                        ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                        : "bg-background text-foreground hover:bg-muted border-border"
                  }`}
                >
                  {responderLoading && miAsistencia?.estado !== "ASISTIRE" && miAsistencia?.estado !== "LISTA_ESPERA" ? (
                    <Spinner size="sm" className="mr-1.5" />
                  ) : (
                    <CheckCircle2 size={13} className="mr-1.5" />
                  )}
                  {miAsistencia?.estado === "LISTA_ESPERA" ? "En Espera" : "Asistiré"}
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

                <Button 
                  onClick={openInvitadoDialog}
                  className="flex-1 md:flex-initial h-8 px-4 text-xs font-semibold rounded border transition-all bg-background text-foreground hover:bg-muted border-border"
                >
                  <Plus size={13} className="mr-1.5" />
                  Llevar un invitado
                </Button>
              </div>
            ) : (
              <Badge variant="secondary" className="px-2.5 py-0.5 font-bold text-xs">
                Inscripciones Cerradas
              </Badge>
            )}
          </div>
        )}

        {/* Main Content Area (Alineaciones, Roster, etc) */}
        <div className="space-y-8">
          <div className="space-y-6">
            <div className="notion-db-header border-b pb-1 mb-2">
              <div className="flex items-center gap-2 py-1">
                <Shirt size={16} className="text-primary" />
                <h2 className="font-extrabold text-sm text-foreground tracking-tight">Alineación / Roster</h2>
              </div>
            </div>

            {/* Intelligent Matchmaking Balance Callout */}
            {isOrganizador && !isInProgressOrDone && (
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
                
                <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-end">
                  {/* Nuevo Bando Button */}
                  {isOrganizador && (
                    <Button 
                      onClick={() => openBandoDialog()} 
                      size="sm" 
                      variant="outline" 
                      className="h-8 gap-1 font-bold text-xs rounded border border-border hover:bg-muted bg-background text-foreground shrink-0"
                    >
                      <Plus size={13} />
                      Nuevo Bando
                    </Button>
                  )}

                  <div className="flex items-center gap-1.5 bg-background border border-border rounded px-2.5 py-1 h-8">
                    <span className="text-[10px] text-muted-foreground font-black uppercase shrink-0 select-none">Equipos:</span>
                    <select
                      value={numEquipos}
                      onChange={(e) => setNumEquipos(Number(e.target.value))}
                      className="text-xs bg-transparent border-0 text-foreground cursor-pointer font-bold focus:outline-none py-0 pr-1 pl-0 shrink-0"
                    >
                      {Array.from({ length: 8 }, (_, i) => i + 1)
                        .filter(n => {
                          const isEquipos = convocatoria?.deporteEsPorEquipos !== false;
                          return isEquipos ? n >= 2 : n >= 1;
                        })
                        .map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                  </div>
                  
                  <Button 
                    onClick={() => handleMatchmaking(numEquipos)} 
                    disabled={matchmakingLoading || playerLists.confirmadosTotales.length < numEquipos}
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
              </div>
            )}

            {/* Mis Invitados Panel */}
            {managedInvitados.length > 0 && (
              <div className="notion-callout bg-muted/20 border-border flex-col p-4 rounded-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between w-full pb-3 border-b border-border/40 gap-3">
                  <div className="flex items-center gap-2">
                    <Users size={15} className="text-primary" />
                    <div className="font-bold text-sm text-foreground">{isOrganizador ? "Gestión Global de Invitados" : "Mis Invitados"} ({managedInvitados.length})</div>
                  </div>
                  
                  {/* Bulk actions bar */}
                  <div className="flex flex-wrap gap-2">
                    {selectedInvitados.length > 0 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateBulkEstado("ASISTIRE")}
                          disabled={bulkDeleting}
                          className="h-7 px-2.5 text-[10px] font-black uppercase rounded border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0"
                        >
                          <CheckCircle2 size={11} />
                          Confirmar ({selectedInvitados.length})
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateBulkEstado("NO_ASISTIRE")}
                          disabled={bulkDeleting}
                          className="h-7 px-2.5 text-[10px] font-black uppercase rounded border-destructive/20 hover:bg-destructive/10 text-destructive-foreground dark:text-destructive flex items-center gap-1 shrink-0"
                        >
                          <XCircle size={11} />
                          Desconfirmar ({selectedInvitados.length})
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDeleteBulk}
                          disabled={bulkDeleting}
                          className="h-7 px-2.5 text-[10px] font-black uppercase rounded border-destructive/20 hover:bg-destructive/10 text-destructive-foreground dark:text-destructive flex items-center gap-1 shrink-0"
                        >
                          {bulkDeleting ? <Spinner className="w-3 h-3" /> : <Trash2 size={11} />}
                          Eliminar ({selectedInvitados.length})
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-3">
                  {managedInvitados.map((asis) => {
                    const isSelected = selectedInvitados.includes(asis.id);
                    return (
                      <div 
                        key={asis.id} 
                        className={`flex flex-col p-3 rounded-lg border transition-premium relative overflow-hidden group bg-background hover:bg-muted/10 h-full min-h-[140px] ${
                          isSelected ? "border-primary bg-primary/[0.01]" : "border-border/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 overflow-hidden flex-1">
                            {!isInProgressOrDone && (
                              <input 
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  if (isSelected) {
                                      setSelectedInvitados(selectedInvitados.filter(id => id !== asis.id));
                                  } else {
                                      setSelectedInvitados([...selectedInvitados, asis.id]);
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/20 shrink-0 cursor-pointer"
                              />
                            )}
                            <div className="overflow-hidden">
                              <span className="text-xs font-bold text-foreground block truncate">
                                {asis.nombreExterno}
                              </span>
                              <span className="text-[9px] text-muted-foreground block truncate">
                                {asis.usuarioNombre ? `Registrado: ${asis.usuarioNombre}` : `Invitado de: ${asis.invitadoPorNombre}`}
                              </span>
                            </div>
                          </div>

                          {/* Action badges based on state */}
                          <div className="flex items-center gap-1 shrink-0">
                            {asis.estado === 'ASISTIRE' && <Badge variant="success" className="text-[8px] font-black uppercase px-1.5 py-0.2">Confirmado</Badge>}
                            {asis.estado === 'NO_ASISTIRE' && <Badge variant="destructive" className="text-[8px] font-black uppercase px-1.5 py-0.2">No Asiste</Badge>}
                            {asis.estado === 'LISTA_ESPERA' && <Badge variant="info" className="text-[8px] font-black uppercase px-1.5 py-0.2 bg-blue-500/10 text-blue-600 border-blue-500/20">En Espera</Badge>}
                            {asis.estado === 'PENDIENTE' && <Badge variant="warning" className="text-[8px] font-black uppercase px-1.5 py-0.2">Pendiente</Badge>}
                          </div>
                        </div>

                        {/* Preferred positions */}
                        <div className="flex-grow mt-2 flex flex-col justify-start">
                          {asis.posicionesPreferidasNombres && asis.posicionesPreferidasNombres.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {asis.posicionesPreferidasNombres.map((name: string) => (
                                <span key={name} className="text-[9px] font-bold text-primary bg-primary/10 dark:bg-primary/20 uppercase tracking-widest px-1.5 py-0.5 rounded">
                                  {name}
                                </span>
                              ))}
                            </div>
                          ) : asis.posicionPreferidaNombre ? (
                            <div className="flex">
                              <span className="text-[9px] font-bold text-primary bg-primary/10 dark:bg-primary/20 uppercase tracking-widest px-1.5 py-0.5 rounded">
                                {asis.posicionPreferidaNombre}
                              </span>
                            </div>
                          ) : (
                            <div className="flex mt-1">
                              <span className="text-[9px] font-bold text-muted-foreground/45 bg-muted/40 uppercase tracking-widest px-1.5 py-0.5 rounded border border-dashed border-border">
                                Sin Posición
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Direct action buttons (hover actions / bottom actions) */}
                        {!isInProgressOrDone && (
                          <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between gap-2">
                            <div className="flex gap-1.5">
                              {/* Toggle confirmation check */}
                              {asis.estado !== 'ASISTIRE' ? (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleUpdateInvitadoEstado(asis.id, 'ASISTIRE')}
                                  className="h-6 w-6 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white"
                                  title="Confirmar Asistencia"
                                >
                                  <CheckCircle2 size={11} />
                                </Button>
                              ) : (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleUpdateInvitadoEstado(asis.id, 'NO_ASISTIRE')}
                                  className="h-6 w-6 rounded bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white"
                                  title="Marcar No Asistencia"
                                >
                                  <XCircle size={11} />
                                </Button>
                              )}

                              {/* If in Waitlist, also allow direct unconfirm */}
                              {asis.estado === 'LISTA_ESPERA' && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleUpdateInvitadoEstado(asis.id, 'NO_ASISTIRE')}
                                  className="h-6 w-6 rounded bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white"
                                  title="Retirar de Espera"
                                >
                                  <XCircle size={11} />
                                </Button>
                              )}

                              {/* Edit guest data (name, position priority) */}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEditInvitadoClick(asis)}
                                className="h-6 w-6 rounded bg-primary/10 text-primary hover:bg-primary hover:text-white"
                                title="Editar Datos"
                              >
                                <Edit size={11} />
                              </Button>
                            </div>

                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteInvitado(asis.id)}
                              className="h-6 w-6 rounded bg-destructive/10 text-destructive hover:bg-destructive hover:text-white opacity-40 group-hover:opacity-100 transition-opacity"
                              title="Eliminar Invitado de la lista"
                            >
                              <Trash2 size={11} />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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
                          <div key={team.id} className="notion-board-column" style={{ borderTop: `4px solid ${teamColorHex}` }}>
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
                            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1 custom-column-scrollbar">
                              {players.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-6 italic font-medium">Sin jugadores asignados</p>
                              ) : (
                                players.map((asis) => (
                                  <div key={asis.id} className="notion-board-card">
                                    <div className="flex items-center justify-between gap-2 overflow-hidden">
                                      <div className="flex items-center gap-2 overflow-hidden flex-1">
                                        <span className="text-[10px] font-black px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md shrink-0 monospace">
                                          {asis.numeroCamiseta != null ? `#${asis.numeroCamiseta}` : "—"}
                                        </span>
                                        <div className="overflow-hidden">
                                          <span className="text-xs font-semibold text-foreground truncate block">
                                            {asis.usuarioNombre || asis.nombreExterno}
                                          </span>
                                          {asis.nombreExterno && (
                                            <span className="text-[9px] text-muted-foreground block truncate">
                                              Invitado de {asis.invitadoPorNombre}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {asis.posicionesPreferidasNombres && asis.posicionesPreferidasNombres.length > 0 ? (
                                      <div className="mt-2 flex flex-wrap gap-1">
                                        {asis.posicionesPreferidasNombres.map((name: string) => (
                                          <span key={name} className="text-[9px] font-black text-primary bg-primary/10 dark:bg-primary/20 uppercase tracking-wider px-2 py-0.5 rounded-full">
                                            {name}
                                          </span>
                                        ))}
                                      </div>
                                    ) : asis.posicionPreferidaNombre ? (
                                      <div className="mt-2 flex">
                                        <span className="text-[9px] font-black text-primary bg-primary/10 dark:bg-primary/20 uppercase tracking-wider px-2 py-0.5 rounded-full">
                                          {asis.posicionPreferidaNombre}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="mt-2 flex">
                                        <span className="text-[9px] font-black text-muted-foreground/45 bg-muted/40 uppercase tracking-wider px-2 py-0.5 rounded-full border border-dashed border-border">
                                          Comodín
                                        </span>
                                      </div>
                                    )}
                                    
                                    {isOrganizador && !isInProgressOrDone && (
                                      <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between gap-1">
                                        <span className="text-[9px] text-muted-foreground font-medium shrink-0">Bando:</span>
                                        <select
                                          value={asis.bandoId || ""}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            handleMovePlayer(asis.id, val ? Number(val) : -1);
                                          }}
                                          className="text-[10px] bg-background border border-border rounded px-2 py-0.5 max-w-[115px] focus:ring-1 focus:ring-primary/20 text-foreground cursor-pointer font-bold focus:outline-none notion-select-pill transition-all"
                                        >
                                          <option value="">Comodín / Sin asignar</option>
                                          {bandos.map((b) => (
                                            <option key={b.id} value={b.id}>{b.nombre}</option>
                                          ))}
                                        </select>
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
                          <div className="border border-amber-500/20 rounded-2xl bg-gradient-to-br from-amber-500/[0.02] to-amber-500/[0.07] backdrop-blur-md p-5 shadow-sm transition-all hover:border-amber-500/30">
                            <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Compass size={14} />
                                <span>Reserva Táctica (Comodines)</span>
                              </div>
                              <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-extrabold text-[10px]">
                                {playerLists.comodines.length}
                              </span>
                            </h4>
                            <div className="space-y-2">
                              {playerLists.comodines.map((asis) => (
                                <div key={asis.id} className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border/50 text-xs gap-3 shadow-sm hover:border-amber-500/30 hover:translate-y-[-2px] transition-all duration-300">
                                  <div className="overflow-hidden flex-1">
                                    <span className="font-bold text-foreground truncate block">
                                      {asis.usuarioNombre || asis.nombreExterno}
                                    </span>
                                    {asis.nombreExterno && (
                                      <span className="text-[9px] text-muted-foreground block truncate mt-0.5">
                                        Invitado de {asis.invitadoPorNombre}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {asis.posicionesPreferidasNombres && asis.posicionesPreferidasNombres.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {asis.posicionesPreferidasNombres.map((name: string) => (
                                          <span key={name} className="text-[9px] font-bold text-amber-600 bg-amber-500/10 dark:bg-amber-500/20 uppercase tracking-wider px-2 py-0.5 rounded-full">
                                            {name}
                                          </span>
                                        ))}
                                      </div>
                                    ) : asis.posicionPreferidaNombre ? (
                                      <span className="text-[9px] font-bold text-amber-600 bg-amber-500/10 dark:bg-amber-500/20 uppercase tracking-wider px-2 py-0.5 rounded-full">
                                        {asis.posicionPreferidaNombre}
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-bold text-muted-foreground/50 bg-muted px-2 py-0.5 rounded-full border border-dashed border-border">
                                        Sin Posición
                                      </span>
                                    )}
                                    
                                    {isOrganizador && !isInProgressOrDone && (
                                      <select
                                        value=""
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val) handleMovePlayer(asis.id, Number(val));
                                        }}
                                        className="text-[10px] bg-background border border-border rounded px-2 py-0.5 focus:ring-1 focus:ring-primary/20 text-foreground cursor-pointer font-bold focus:outline-none notion-select-pill transition-all"
                                      >
                                        <option value="">Asignar...</option>
                                        {bandos.map((b) => (
                                          <option key={b.id} value={b.id}>{b.nombre}</option>
                                        ))}
                                      </select>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {playerLists.waitlist.length > 0 && (
                          <div className="border border-blue-500/20 rounded-2xl bg-gradient-to-br from-blue-500/[0.02] to-blue-500/[0.07] backdrop-blur-md p-5 shadow-sm transition-all hover:border-blue-500/30">
                            <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Clock size={14} />
                                <span>Sala de Espera (Lista de Espera)</span>
                              </div>
                              <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-extrabold text-[10px]">
                                {playerLists.waitlist.length}
                              </span>
                            </h4>
                            <div className="space-y-2">
                              {playerLists.waitlist.map((asis, idx) => (
                                <div key={asis.id} className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border/50 text-xs gap-3 shadow-sm hover:border-blue-500/30 hover:translate-y-[-2px] transition-all duration-300">
                                  <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                                    <span className="text-[10px] font-black bg-blue-500/10 text-blue-600 rounded-lg w-5 h-5 flex items-center justify-center border border-blue-500/20 shrink-0">
                                      {idx + 1}
                                    </span>
                                    <div className="overflow-hidden">
                                      <span className="font-bold text-foreground truncate block">
                                        {asis.usuarioNombre || asis.nombreExterno}
                                      </span>
                                      {asis.nombreExterno && (
                                        <span className="text-[9px] text-muted-foreground block truncate mt-0.5">
                                          Invitado de {asis.invitadoPorNombre}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[9px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase tracking-wider px-2 py-0.5 rounded-full">
                                      En Espera
                                    </span>
                                  </div>
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
                  <div className="space-y-6 w-full">
                    {/* Equipos Configurados list before matchmaking */}
                    {bandos.length > 0 && (
                      <div className="space-y-3 p-4 border border-border bg-muted/5 dark:bg-muted/10 rounded-lg">
                        <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <Trophy size={13} className="text-primary" />
                            <span>Bandos / Equipos Configurados ({bandos.length})</span>
                          </h4>
                          {isOrganizador && (
                            <Button 
                              onClick={() => openBandoDialog()} 
                              size="sm" 
                              variant="outline" 
                              className="h-6 gap-1 font-bold text-[10px] uppercase rounded border border-border hover:bg-muted bg-background text-foreground"
                            >
                              <Plus size={11} /> Nuevo Bando
                            </Button>
                          )}
                        </div>
                        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                          {bandos.map((eq) => {
                            const teamColorHex = getTeamColorHex(eq.color || "");
                            return (
                              <div 
                                key={eq.id} 
                                className="flex items-center justify-between p-2 rounded border border-border bg-background hover:bg-muted/10 transition-premium relative overflow-hidden group shadow-sm h-full min-h-[40px]"
                              >
                                {eq.color && (
                                  <div className="absolute top-0 bottom-0 left-0 w-[3px]" style={{ backgroundColor: teamColorHex }} />
                                )}
                                <div className="flex items-center gap-2 pl-1.5 overflow-hidden flex-1">
                                  <div className="w-2.5 h-2.5 rounded-full shrink-0 border border-border" style={{ backgroundColor: teamColorHex }} />
                                  <span className="text-xs font-semibold text-foreground truncate">{eq.nombre}</span>
                                </div>
                                {isOrganizador && (
                                  <div className="flex gap-0.5 items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-5 w-5 rounded text-muted-foreground hover:text-primary hover:bg-muted" 
                                      onClick={() => openBandoDialog(eq)}
                                    >
                                      <Edit size={10} />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-5 w-5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                                      onClick={() => handleDeleteBando(eq.id)}
                                    >
                                      <Trash2 size={10} />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {bandos.length === 0 && isOrganizador && (
                      <div className="text-center py-6 border border-dashed rounded-lg bg-muted/5">
                        <Trophy size={20} className="mx-auto text-muted-foreground/40 mb-1" />
                        <p className="text-xs text-muted-foreground font-semibold">No hay bandos configurados</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 mb-2.5">Crea bandos para poder distribuir a los jugadores en la alineación.</p>
                        <Button 
                          onClick={() => openBandoDialog()} 
                          size="sm" 
                          variant="outline" 
                          className="h-7 gap-1 font-bold text-xs rounded border border-border hover:bg-muted bg-background px-3 text-foreground"
                        >
                          <Plus size={12} /> Nuevo Bando
                        </Button>
                      </div>
                    )}

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
                              <div key={asis.id} className="flex items-center justify-between p-3 rounded border border-border bg-background hover:bg-muted/10 transition-premium h-full min-h-[56px]">
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center font-black text-primary text-xs shrink-0 select-none">
                                    {(asis.usuarioNombre || asis.nombreExterno || "?").charAt(0).toUpperCase()}
                                  </div>
                                  <div className="overflow-hidden">
                                    <span className="text-xs font-semibold text-foreground truncate block">
                                      {asis.usuarioNombre || asis.nombreExterno}
                                    </span>
                                    {asis.nombreExterno && (
                                      <span className="text-[9px] text-muted-foreground block truncate">
                                        Invitado de {asis.invitadoPorNombre}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {asis.posicionesPreferidasNombres && asis.posicionesPreferidasNombres.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {asis.posicionesPreferidasNombres.map((name: string) => (
                                        <Badge key={name} variant="outline" className="text-[9px]">{name}</Badge>
                                      ))}
                                    </div>
                                  ) : asis.posicionPreferidaNombre ? (
                                    <Badge variant="outline" className="text-[9px]">{asis.posicionPreferidaNombre}</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[9px] border-dashed text-muted-foreground/50 border-border bg-transparent">Comodín</Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="espera" className="space-y-2 focus:outline-none pt-2">
                        {playerLists.waitlist.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-8 text-center bg-muted/5 border rounded">No hay jugadores en lista de espera.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {playerLists.waitlist.map((asis, idx) => (
                              <div key={asis.id} className="flex items-center justify-between p-3 rounded border border-border bg-background hover:bg-muted/10 transition-premium h-full min-h-[56px]">
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <span className="text-xs text-muted-foreground font-black shrink-0">{idx + 1}.</span>
                                  <div className="overflow-hidden">
                                    <span className="text-xs font-semibold text-foreground truncate block">
                                      {asis.usuarioNombre || asis.nombreExterno}
                                    </span>
                                    {asis.nombreExterno && (
                                      <span className="text-[9px] text-muted-foreground block truncate">
                                        Invitado de {asis.invitadoPorNombre}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Badge variant="outline" className="text-[9px] bg-blue-500/5 text-blue-600 border-blue-500/20 uppercase font-bold">En Espera</Badge>
                                </div>
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
                              <div key={asis.id} className="flex items-center justify-between p-3 rounded border border-border bg-background hover:bg-muted/10 transition-premium h-full min-h-[50px]">
                                <span className="text-xs font-semibold text-foreground truncate">{asis.usuarioNombre}</span>
                                <Badge variant="warning" className="text-[8px] font-black uppercase shrink-0">Pendiente</Badge>
                              </div>
                            ))}
                            {playerLists.noAsistiran.map((asis) => (
                              <div key={asis.id} className="flex items-center justify-between p-3 rounded border border-border bg-background hover:bg-muted/10 transition-premium h-full min-h-[50px]">
                                <span className="text-xs font-semibold text-muted-foreground line-through truncate">{asis.usuarioNombre}</span>
                                <Badge variant="destructive" className="text-[8px] font-black uppercase shrink-0">No Asistirá</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </>
            )}
          </div>

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

                {convocatoria.estado === "ABIERTA" && !isInProgressOrDone && (
                  <Button 
                    variant="outline"
                    onClick={async () => {
                      if (confirm("¿Estás seguro de cancelar esta convocatoria?")) {
                        try {
                          await api.put(`/api/convocatorias/${id}/cancelar`);
                          const updated = await api.get(`/api/convocatorias/${id}`);
                          setConvocatoria(updated.data);
                        } catch (err: unknown) {
                          setError(getApiErrorMessage(err));
                        }
                      }
                    }}
                    className="h-8 px-3 font-semibold text-xs rounded border border-destructive/20 hover:bg-destructive/10 bg-background text-destructive cursor-pointer"
                  >
                    <XCircle size={13} className="mr-1.5" />
                    Cancelar Convocatoria
                  </Button>
                )}

                {(convocatoria.estado === "BORRADOR" || convocatoria.estado === "ABIERTA") && !isInProgressOrDone && (
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/convocatorias/${id}/edit`)}
                    className="h-8 px-3 font-semibold text-xs rounded border border-border hover:bg-muted text-foreground bg-background cursor-pointer"
                  >
                    <Edit size={13} className="mr-1.5" />
                    Editar Detalles
                  </Button>
                )}

                {convocatoria.estado === "BORRADOR" && !isInProgressOrDone && (
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

        {/* Invitado Dialog */}
        <Dialog open={invitadoDialogOpen} onOpenChange={setInvitadoDialogOpen}>
          <DialogContent className="rounded-lg border bg-card p-6 max-w-md">
            <DialogHeader>
              <DialogTitle className="font-extrabold text-base tracking-tight">
                {editingInvitado ? `Editar Datos de ${editingInvitado.nombreExterno}` : "Llevar un Invitado"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {editingInvitado 
                  ? "Modifica el nombre o apodo de tu invitado y actualiza sus posiciones preferidas y prioridades." 
                  : "Ingresa el nombre o apodo de tu invitado y selecciona su posición preferida para el juego."}
              </DialogDescription>
            </DialogHeader>
            {invitadoError && (
              <Alert variant="destructive" className="rounded border border-destructive/15 my-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{invitadoError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="invitado-nombre" className="text-xs font-bold text-muted-foreground">Nombre o Apodo</Label>
                <Input 
                  id="invitado-nombre" 
                  value={invitadoForm.nombreExterno} 
                  onChange={(e) => setInvitadoForm({ ...invitadoForm, nombreExterno: e.target.value })} 
                  placeholder="Ej: Juan Pérez, El Toro" 
                  className="rounded bg-background border border-border px-3 py-1.5 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground block mb-1">Posiciones Preferidas (Selecciona en orden de prioridad)</Label>
                {deportePosiciones.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No hay posiciones configuradas para este deporte.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {deportePosiciones.map((pos) => {
                      const isSelected = (invitadoForm.posicionesPreferidasIds || []).includes(pos.id);
                      const priorityIndex = (invitadoForm.posicionesPreferidasIds || []).indexOf(pos.id);
                      return (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() => {
                            const currentIds = invitadoForm.posicionesPreferidasIds || [];
                            const alreadySelected = currentIds.includes(pos.id);
                            let nextIds = [];
                            if (alreadySelected) {
                              nextIds = currentIds.filter(id => id !== pos.id);
                            } else {
                              nextIds = [...currentIds, pos.id];
                            }
                            setInvitadoForm({
                              ...invitadoForm,
                              posicionesPreferidasIds: nextIds,
                              posicionPreferidaId: nextIds.length > 0 ? String(nextIds[0]) : ""
                            });
                          }}
                          className={`text-xs px-3 py-1.5 rounded border font-bold transition-all select-none cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-sm hover:bg-primary/90"
                              : "bg-background text-foreground border-border hover:bg-muted"
                          }`}
                        >
                          <span>{pos.nombre} {pos.abreviatura ? `(${pos.abreviatura})` : ''}</span>
                          {isSelected && (
                            <span className="h-4 w-4 rounded-full bg-primary-foreground text-primary text-[9px] flex items-center justify-center font-extrabold shadow-sm shrink-0">
                              {priorityIndex + 1}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2 border-t pt-4">
              <Button 
                variant="outline" 
                onClick={() => setInvitadoDialogOpen(false)} 
                className="font-bold text-xs rounded border hover:bg-muted"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveInvitado} 
                disabled={invitadoSaving || !invitadoForm.nombreExterno.trim()} 
                className="font-bold text-xs rounded bg-primary text-primary-foreground hover:bg-primary/95"
              >
                {invitadoSaving ? <Spinner className="text-white" /> : editingInvitado ? "Guardar Cambios" : "Confirmar Invitado"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bando Dialog */}
        <Dialog open={bandoDialogOpen} onOpenChange={setbandoDialogOpen}>
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
      </div>
  );
}
