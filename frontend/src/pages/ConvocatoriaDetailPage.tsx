import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/services/api";
import { formatDateTime } from "@/lib/formatDate";
import { TEAM_COLORS, getTeamColorHex, getApiErrorMessage } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ConvocatoriaDetailSkeleton } from "@/components/ui/page-skeletons";
import { PageHeader } from "@/components/ui/page-header";
import { getDeporteIcon } from "@/lib/iconography";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PresetChips } from "@/components/ui/preset-chips";
import { SeoHead } from "@/components/SeoHead";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Share2,
  Link2,
  Copy,
  Check,
  Lock,
  Info,
  Timer,
  Settings,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Convocatoria, Asistencia, BandoConvocatoria } from "@/types";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { InfoHint } from "@/components/ui/info-hint";
import { Tooltip } from "@/components/ui/tooltip";
import { LineupBoard } from "@/components/lineup/LineupBoard";
import { PlayerIdentity, PlayerIdentityChip } from "@/components/ui/player-identity";
import {
  AsistenciaTableRow,
  ASISTENCIA_TABLE_COLUMNS,
} from "@/components/convocatoria/AsistenciaTableRow";
import { DataListHeader, DataListShell, DataListBody } from "@/components/ui/data-list";
import { useConvocatoriaCapabilities } from "@/hooks/useConvocatoriaCapabilities";
import {
  buildConvocatoriaDeleteConfirm,
  countInscritosConvocatoria,
} from "@/lib/convocatoriaDelete";
import { canManageAsistencia } from "@/lib/permissions";
import { EmptyState } from "@/components/ui/empty-state";
import { ConvocatoriaEstadoCell } from "@/components/ui/entity-badges";
import {
  puedePublicarBorrador,
  MENSAJE_BORRADOR_FECHA_PASADA,
} from "@/lib/convocatoriaDraft";
import { isEventScheduleInPast } from "@/lib/convocatoriaSchedule";

interface bandoFormData {
  nombre: string;
  color: string;
}

function categoriaTooltip(cat: string): string {
  switch (cat?.toUpperCase()) {
    case "LIBRE":
      return "Libre: sin límite de cupo, cualquier persona puede unirse.";
    case "COMPETITIVO":
      return "Competitivo: enfoque en rendimiento, con balanceo táctico estricto.";
    case "AMISTOSO":
      return "Amistoso: encuentro casual sin competencia formal.";
    case "ENTRENAMIENTO":
      return "Entrenamiento: práctica técnica o táctica.";
    default:
      return cat;
  }
}

function estadoTooltip(estado: string): string {
  switch (estado) {
    case "BORRADOR":
      return "Borrador: solo el organizador puede verla. No acepta inscripciones hasta que la publiques con una fecha futura.";
    case "ABIERTA":
      return "Abierta: publicada y aceptando inscripciones de los jugadores.";
    case "EN_PROGRESO":
      return "En progreso: el evento ya comenzó. La inscripción está cerrada.";
    case "FINALIZADA":
      return "Finalizada: el evento ya terminó. Solo lectura.";
    case "CANCELADA":
      return "Cancelada: el evento no se llevará a cabo.";
    default:
      return estado;
  }
}

export default function ConvocatoriaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [convocatoria, setConvocatoria] = useState<Convocatoria | null>(null);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [bandos, setBandos] = useState<BandoConvocatoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
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
  const [shareSuccess, setShareSuccess] = useState(false);
  const canNativeShare =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function";
  const [userPosiciones, setUserPosiciones] = useState<any[]>([]);
  const [positionsDialogOpen, setPositionsDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setError("");
    setAccessDenied(false);
    try {
      const convRes = await api.get(`/api/convocatorias/${id}`);
      setConvocatoria(convRes.data);

      const [asisRes, equipRes, posRes] = await Promise.all([
        api.get(`/api/convocatorias/${id}/asistencias`),
        api.get(`/api/convocatorias/${id}/bandos`),
        api.get(`/api/usuarios/me/posiciones`),
      ]);
      setAsistencias(asisRes.data);
      setBandos(equipRes.data);
      setUserPosiciones(posRes.data || []);
      if (equipRes.data && equipRes.data.length > 0) {
        setNumEquipos(equipRes.data.length);
      } else {
        const isEquipos = convRes.data.deporteEsPorEquipos !== false;
        setNumEquipos(isEquipos ? 2 : 1);
      }
      const miAsis = asisRes.data.find((a: Asistencia) => a.usuarioId === user?.id);
      setMiAsistencia(miAsis || null);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        setAccessDenied(true);
      }
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
      toast.success(
        "Equipos balanceados",
        `Se generaron ${teamsCount ?? "los"} bandos con los jugadores confirmados.`
      );
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err);
      toast.error(msg || "No se pudieron balancear los equipos.");
      setError(msg);
    } finally {
      setMatchmakingLoading(false);
    }
  };

  const handleRespondedAsistencia = async (estado: string) => {
    if (estado === "ASISTIRE" && convocatoria) {
      const hasPositions = userPosiciones.some((up) => up.deporteId === convocatoria.deporteId);
      if (!hasPositions) {
        setPositionsDialogOpen(true);
        return;
      }
    }
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

  const handleSaveBando = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setbandoSaving(true);
    setbandoError("");
    try {
      if (editingBando) {
        await api.put(`/api/bandos/${editingBando.id}`, bandoForm);
        toast.success("Bando actualizado");
      } else {
        await api.post(`/api/convocatorias/${id}/bandos`, bandoForm);
        toast.success("Bando creado", "Ya puedes asignarle jugadores manualmente o con autobalanceo.");
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

  const handleDeleteBando = async (bandoId: number, nombre: string) => {
    const ok = await confirm({
      title: "Eliminar bando",
      description: (
        <>
          Vas a eliminar el bando <strong>{nombre}</strong>. Los jugadores asignados quedarán como
          comodines sin equipo.
        </>
      ),
      confirmLabel: "Sí, eliminar",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`/api/bandos/${bandoId}`);
      toast.success("Bando eliminado");
      fetchData();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err) || "No se pudo eliminar el bando.");
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

  const handleSaveInvitado = async (e?: React.FormEvent) => {
    e?.preventDefault();
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
        toast.success("Invitado actualizado");
      } else {
        await api.post(`/api/convocatorias/${id}/asistencias`, payload);
        toast.success("Invitado registrado", `${invitadoForm.nombreExterno.trim()} fue añadido a la convocatoria.`);
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
    const ok = await confirm({
      title: "Eliminar invitados",
      description: `Vas a eliminar a ${selectedInvitados.length} invitado(s) de esta convocatoria. Esta acción no se puede deshacer.`,
      confirmLabel: `Eliminar ${selectedInvitados.length}`,
      variant: "danger",
    });
    if (!ok) return;

    setBulkDeleting(true);
    try {
      await api.delete(`/api/asistencias/bulk?ids=${selectedInvitados.join(",")}`);
      toast.success(`${selectedInvitados.length} invitado(s) eliminado(s)`);
      setSelectedInvitados([]);
      fetchData();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err) || "No se pudieron eliminar los invitados.");
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

  const handleDeleteInvitado = async (asistenciaId: number, nombre: string) => {
    const ok = await confirm({
      title: "Quitar invitado",
      description: (
        <>
          Vas a quitar a <strong>{nombre}</strong> de la convocatoria. Si era un usuario registrado,
          podrá volver a inscribirse por su cuenta.
        </>
      ),
      confirmLabel: "Sí, quitar",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`/api/asistencias/${asistenciaId}`);
      toast.success("Invitado eliminado");
      fetchData();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err) || "No se pudo eliminar al invitado.");
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

  const getShareUrl = useCallback(() => {
    if (typeof window === "undefined") return "";
    return window.location.href;
  }, []);

  const buildLineupShareText = useCallback(() => {
    if (!convocatoria) return "";

    let shareText = `🏆 *Alineación: ${convocatoria.titulo}* 🏆\n`;
    if (convocatoria.fechaHora) {
      const date = new Date(convocatoria.fechaHora);
      const formattedDate = date.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      });
      shareText += `📅 *Fecha:* ${formattedDate}\n`;
    }
    shareText += `📍 *Lugar:* ${convocatoria.lugar || "Por definir"}\n\n`;

    playerLists.teamPlayersMap.forEach(({ team, players }) => {
      const teamColor = team.color ? team.color.toUpperCase() : "";
      const teamEmoji = teamColor === "BLANCO" ? "⚪" : teamColor === "NEGRO" ? "⚫" : teamColor === "ROJO" ? "🔴" : teamColor === "AZUL" ? "🔵" : teamColor === "VERDE" ? "🟢" : teamColor === "AMARILLO" ? "🟡" : "👥";

      shareText += `${teamEmoji} *${team.nombre.toUpperCase()}* (${players.length} jugadores):\n`;
      if (players.length === 0) {
        shareText += `  _Sin jugadores asignados_\n`;
      } else {
        players.forEach((p) => {
          const handle = p.usuarioUsername
            ? `@${p.usuarioUsername}`
            : p.nombreExterno || p.usuarioNombre || "Invitado";
          const legend = p.usuarioUsername && p.usuarioNombre ? ` (${p.usuarioNombre})` : "";
          const invBy = p.nombreExterno && p.invitadoPorNombre && !p.usuarioUsername ? ` (Invitado de ${p.invitadoPorNombre})` : "";
          const pos = p.posicionAsignadaNombre ? ` - ${p.posicionAsignadaNombre}` : p.posicionPreferidaNombre ? ` - ${p.posicionPreferidaNombre}` : "";
          shareText += `  • ${handle}${legend}${invBy}${pos}\n`;
        });
      }
      shareText += `\n`;
    });

    if (playerLists.comodines.length > 0) {
      shareText += `🌟 *RESERVAS / COMODINES* (${playerLists.comodines.length}):\n`;
      playerLists.comodines.forEach((p) => {
        const handle = p.usuarioUsername
          ? `@${p.usuarioUsername}`
          : p.nombreExterno || p.usuarioNombre || "Invitado";
        const legend = p.usuarioUsername && p.usuarioNombre ? ` (${p.usuarioNombre})` : "";
        const invBy = p.nombreExterno && p.invitadoPorNombre && !p.usuarioUsername ? ` (Invitado de ${p.invitadoPorNombre})` : "";
        shareText += `  • ${handle}${legend}${invBy}\n`;
      });
      shareText += `\n`;
    }

    shareText += `⚡ _Generado por Event App_\n`;
    shareText += `🔗 Ver convocatoria: ${getShareUrl()}`;
    return shareText;
  }, [convocatoria, getShareUrl, playerLists]);

  const copyToClipboard = async (text: string, successTitle: string, successDesc: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShareSuccess(true);
      toast.success(successTitle, successDesc);
      setTimeout(() => setShareSuccess(false), 3000);
    } catch (err) {
      toast.error("No se pudo copiar al portapapeles. Intenta de nuevo.");
      console.error("Error al copiar al portapapeles", err);
    }
  };

  const handleCopyLink = () => {
    const url = getShareUrl();
    if (!url) {
      toast.error("No se pudo obtener el enlace.");
      return;
    }
    void copyToClipboard(url, "Enlace copiado", "Pégalo donde quieras compartir la convocatoria.");
  };

  const handleShareLineup = () => {
    if (!convocatoria) {
      toast.error("No se pudo cargar la información para compartir.");
      return;
    }
    void copyToClipboard(
      buildLineupShareText(),
      "Alineación copiada",
      "Incluye el enlace a la convocatoria. Pégala en WhatsApp o donde la necesites."
    );
  };

  const handleNativeShare = async () => {
    if (!convocatoria || !canNativeShare) return;
    const url = getShareUrl();
    const text = buildLineupShareText().replace(`🔗 Ver convocatoria: ${url}`, "").trim();
    try {
      await navigator.share({
        title: `Alineación: ${convocatoria.titulo}`,
        text,
        url,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("No se pudo compartir", "Prueba copiar el enlace o la alineación.");
    }
  };

  const caps = useConvocatoriaCapabilities(convocatoria);

  const isUserSuspended = useMemo(() => {
    if (!user?.fechaFinSuspension) return false;
    return new Date(user.fechaFinSuspension).getTime() > Date.now();
  }, [user]);

  const isInProgressOrDone = useMemo(() => {
    if (!convocatoria) return false;
    const isStateProgress =
      convocatoria.estado === "EN_PROGRESO" ||
      convocatoria.estado === "FINALIZADA" ||
      convocatoria.estado === "CANCELADA";
    if (isStateProgress) return true;
    if (convocatoria.fechaEventoPasada === true) return true;
    return isEventScheduleInPast(convocatoria.fechaHora);
  }, [convocatoria]);

  const managedInvitados = useMemo(() => {
    return asistencias.filter((a) =>
      caps.canManageAllAttendance
        ? a.invitadoPorId !== null || a.nombreExterno !== null
        : a.invitadoPorId === user?.id
    );
  }, [asistencias, caps.canManageAllAttendance, user?.id]);

  const slotsRemaining = (convocatoria?.cupoMaximo || 0) - playerLists.confirmadosTotales.length;

  if (loading) {
    return <ConvocatoriaDetailSkeleton />;
  }

  if (!convocatoria) {
    return (
      <div className="max-w-xl mx-auto space-y-4 pt-8">
        {accessDenied ? (
          <EmptyState
            icon={<Lock size={28} className="text-muted-foreground" />}
            title="Convocatoria restringida"
            description={
              error ||
              "No tienes permiso para ver esta convocatoria. Puede ser solo para un grupo o para jugadores invitados."
            }
            action={
              <Button variant="outline" size="sm" onClick={() => navigate("/convocatorias")}>
                Volver a convocatorias
              </Button>
            }
          />
        ) : (
          <Alert variant="destructive" className="rounded">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error || "Convocatoria no encontrada."}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <div className="page-shell space-y-6 notion-animate-fade">
      <SeoHead
        title={convocatoria.titulo}
        noindex
        canonicalPath={`/convocatorias/${convocatoria.id}`}
      />
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
        <Tooltip content={estadoTooltip(convocatoria.estado)} maxWidth={260}>
          <div className="cursor-help">
            <ConvocatoriaEstadoCell
              conv={convocatoria}
              recurrente={!!convocatoria.configuracionRecurrenteId}
              align="end"
            />
          </div>
        </Tooltip>
      </div>

      <PageHeader
        icon={getDeporteIcon(convocatoria.deporteNombre)}
        title={convocatoria.titulo}
        description={convocatoria.deporteNombre ?? undefined}
      />

      {user?.autoAceptacionActiva && user.autoAceptacionResumen && (
        <div className="notion-callout tone-info p-3">
          <div className="notion-callout-icon">
            <Zap size={14} />
          </div>
          <div className="text-xs leading-relaxed">
            <span className="font-semibold text-foreground">Disponibilidad automática activa.</span>{" "}
            {user.autoAceptacionResumen}. Las invitaciones en esa ventana se confirmarán solas.
          </div>
        </div>
      )}

      {isInProgressOrDone && (caps.canManageConvocatoria || caps.canManageLineup) && (
        <div className="notion-callout tone-info items-center">
          <div className="notion-callout-icon">
            <Info size={15} />
          </div>
          <div className="text-xs text-foreground/80 font-medium">
            Esta convocatoria está en progreso, finalizada o cancelada. El registro de asistencia y la
            configuración táctica están en modo de solo lectura.
          </div>
        </div>
      )}

      {/* Error Alert inside Notion style callout */}
      {error && (
        <div className="notion-callout tone-danger items-center">
          <div className="notion-callout-icon">⚠️</div>
          <div className="text-sm text-destructive">{error}</div>
        </div>
      )}

      {convocatoria.estado === "BORRADOR" && !puedePublicarBorrador(convocatoria) && (
        <div className="notion-callout tone-warning flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex gap-3 min-w-0">
            <div className="notion-callout-icon shrink-0">
              <Timer size={15} />
            </div>
            <div className="space-y-1 text-xs">
              <p className="font-bold text-foreground">Borrador con fecha pasada</p>
              <p className="text-muted-foreground leading-relaxed">{MENSAJE_BORRADOR_FECHA_PASADA}</p>
            </div>
          </div>
          {caps.canEdit && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 h-8 text-xs font-semibold"
              onClick={() => navigate(`/convocatorias/${id}/edit`)}
            >
              <Edit size={12} className="mr-1.5" />
              Editar fecha
            </Button>
          )}
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
              <Tooltip content={categoriaTooltip(convocatoria.categoria)} maxWidth={260}>
                <Badge variant="outline" className="text-[9px] uppercase font-extrabold py-0 cursor-help">
                  <Tag size={9} className="mr-0.5" />
                  {convocatoria.categoria}
                </Badge>
              </Tooltip>
            )}
          </div>

          <div className="notion-property-label">
            <Calendar size={13} /> Fecha y Hora
          </div>
          <div
            className={cn(
              "notion-property-value text-sm font-semibold",
              convocatoria.estado === "BORRADOR" &&
                !puedePublicarBorrador(convocatoria) &&
                "text-amber-700/90 dark:text-amber-400/90 line-through decoration-amber-500/40"
            )}
          >
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
                    ? "pulse-soft-amber px-1.5 py-0.2 rounded" 
                    : "bg-muted text-muted-foreground px-1.5 py-0.2 rounded"
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

          <div className="notion-property-label">
            <Users size={13} /> Acceso
          </div>
          <div className="notion-property-value">
            <Badge variant="outline" className="text-[10px] font-semibold">
              {convocatoria.tipoInvitacion === "GRUPO"
                ? `Grupo${convocatoria.grupoNombre ? `: ${convocatoria.grupoNombre}` : ""}`
                : convocatoria.tipoInvitacion === "MANUAL"
                  ? "Solo invitados"
                  : "Abierta (por deporte)"}
            </Badge>
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
          <div className="notion-callout tone-danger p-5 flex flex-col md:flex-row items-center gap-4 mb-8">
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
        ) : convocatoria.estado === "ABIERTA" && !isInProgressOrDone && convocatoria.puedeInscribirse === false ? (
          <div className="notion-callout tone-warning mb-8 p-4">
            <div className="font-bold text-sm text-tone-warning">No puedes confirmar asistencia</div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {convocatoria.tipoInvitacion === "ABIERTA"
                ? `Solo jugadores con posiciones de ${convocatoria.deporteNombre} pueden inscribirse. Configúralas en tu perfil.`
                : convocatoria.tipoInvitacion === "GRUPO"
                  ? `Esta convocatoria es solo para miembros del grupo${convocatoria.grupoNombre ? ` «${convocatoria.grupoNombre}»` : ""}.`
                  : "Esta convocatoria es solo para jugadores invitados individualmente por el organizador."}
            </p>
          </div>
        ) : (
          <div className="notion-callout bg-muted/30 border-border mb-8 items-center justify-between flex flex-col sm:flex-row gap-4">
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

            {convocatoria.estado === "ABIERTA" &&
            !isInProgressOrDone &&
            convocatoria.puedeInscribirse !== false &&
            caps.canRespondSelf ? (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button 
                  disabled={responderLoading}
                  onClick={() => handleRespondedAsistencia("ASISTIRE")}
                  className={`w-full sm:w-auto flex-1 sm:flex-initial h-9 sm:h-8 px-4 text-xs font-semibold rounded border transition-all ${
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
                  className={`w-full sm:w-auto flex-1 sm:flex-initial h-9 sm:h-8 px-4 text-xs font-semibold rounded border transition-all ${
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

                {caps.canInviteGuests && (
                  <Tooltip
                    content={
                      <span>
                        Registra a alguien externo (un amigo no registrado) que asistirá contigo. Tú te
                        haces responsable de su asistencia.
                      </span>
                    }
                    maxWidth={280}
                  >
                    <Button
                      onClick={openInvitadoDialog}
                      className="w-full sm:w-auto flex-1 sm:flex-initial h-9 sm:h-8 px-4 text-xs font-semibold rounded border transition-all bg-background text-foreground hover:bg-muted border-border"
                    >
                      <Plus size={13} className="mr-1.5" />
                      Llevar un invitado
                    </Button>
                  </Tooltip>
                )}
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
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Shirt size={16} className="text-primary" />
                  <h2 className="font-extrabold text-sm text-foreground tracking-tight">Alineación / Roster</h2>
                </div>
                {/* SHARE MENU */}
                {matchmakerRun && bandos.length > 0 && (
                  <div className="flex items-center gap-2">
                    {shareSuccess && (
                      <span className="status-pill status-pill--success text-[10px] font-bold animate-fadeIn">
                        <Check size={10} />
                        Copiado
                      </span>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] font-bold gap-1 px-2.5 rounded border border-border bg-background text-foreground hover:bg-muted"
                        >
                          <Share2 size={11} />
                          Compartir
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleCopyLink}>
                          <Link2 size={12} />
                          Copiar enlace
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleShareLineup}>
                          <Copy size={12} />
                          Copiar alineación
                        </DropdownMenuItem>
                        {canNativeShare && (
                          <DropdownMenuItem onClick={() => void handleNativeShare()}>
                            <Share2 size={12} />
                            Compartir…
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            </div>

            {/* Intelligent Matchmaking Balance Callout */}
            {caps.showMatchmakingTools && !isInProgressOrDone && (
              <div className="notion-callout bg-primary/[0.03] border-primary/20 flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex gap-3">
                  <div className="notion-callout-icon">⚡</div>
                  <div>
                    <div className="font-bold text-sm flex items-center gap-1.5">
                      <span>Autobalanceo de Equipos</span>
                      <InfoHint side="right" maxWidth={300}>
                        El <strong>autobalanceo</strong> distribuye automáticamente a los jugadores
                        confirmados en bandos parejos, intentando respetar sus posiciones preferidas
                        y mantener equipos del mismo tamaño. Puedes volver a ejecutarlo cuando
                        cambien los confirmados.
                      </InfoHint>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Reparte a los jugadores confirmados en {convocatoria.deporteEsPorEquipos === false ? "duelos" : "bandos"} parejos según sus posiciones.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-end">
                  {/* Nuevo Bando Button */}
                  {caps.showMatchmakingTools && (
                    <Tooltip
                      content={
                        <span>
                          Un <strong>bando</strong> es uno de los lados del juego (ej. "Equipo Azul").
                          Créalos manualmente o usa el autobalanceo para generarlos automáticamente.
                        </span>
                      }
                      maxWidth={280}
                    >
                      <Button 
                        onClick={() => openBandoDialog()} 
                        size="sm" 
                        variant="outline" 
                        className="h-8 gap-1 font-bold text-xs rounded border border-border hover:bg-muted bg-background text-foreground shrink-0"
                      >
                        <Plus size={13} />
                        Nuevo Bando
                      </Button>
                    </Tooltip>
                  )}

                  <Tooltip content="Cantidad de bandos que se formarán al autobalancear">
                    <div className="flex items-center gap-1.5 bg-background border border-border rounded px-2.5 py-1 h-8">
                      <span className="text-[10px] text-muted-foreground font-black uppercase shrink-0 select-none">Equipos:</span>
                      <select
                        value={numEquipos}
                        onChange={(e) => setNumEquipos(Number(e.target.value))}
                        className="text-xs bg-transparent border-0 text-foreground cursor-pointer font-bold focus:outline-none py-0 pr-1 pl-0 shrink-0"
                        aria-label="Número de equipos"
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
                  </Tooltip>
                  
                  <Tooltip
                    content={
                      playerLists.confirmadosTotales.length < numEquipos
                        ? `Necesitas al menos ${numEquipos} confirmado(s) para formar ${numEquipos} equipo(s)`
                        : "Genera los bandos automáticamente con los jugadores confirmados"
                    }
                  >
                    <Button 
                      onClick={() => handleMatchmaking(numEquipos)} 
                      disabled={matchmakingLoading || playerLists.confirmadosTotales.length < numEquipos}
                      className="h-8 px-4 font-bold text-xs bg-primary hover:bg-primary/95 text-primary-foreground rounded transition-premium shrink-0"
                    >
                      {matchmakingLoading ? (
                        <>
                          <Spinner size="sm" className="mr-1.5" />
                          Calculando equipos...
                        </>
                      ) : (
                        <>
                          <Activity size={14} className="mr-1.5" />
                          Autobalancear Equipos
                        </>
                      )}
                    </Button>
                  </Tooltip>
                </div>
              </div>
            )}

            {/* Mis Invitados Panel */}
            {managedInvitados.length > 0 && (
              <div className="notion-callout bg-muted/20 border-border flex-col p-4 rounded-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between w-full pb-3 border-b border-border/40 gap-3">
                  <div className="flex items-center gap-2">
                    <Users size={15} className="text-primary" />
                    <div className="font-bold text-sm text-foreground">
                      {caps.canManageAllAttendance ? "Gestión Global de Invitados" : "Mis Invitados"} (
                      {managedInvitados.length})
                    </div>
                  </div>
                  
                  {/* Bulk actions bar */}
                  <div className="flex flex-wrap gap-2">
                    {caps.canManageAllAttendance && selectedInvitados.length > 0 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateBulkEstado("ASISTIRE")}
                          disabled={bulkDeleting}
                          className="h-7 px-2.5 text-[10px] font-black uppercase rounded border-[hsl(var(--success)/0.25)] hover:bg-[hsl(var(--success)/0.1)] text-tone-success flex items-center gap-1 shrink-0"
                        >
                          <CheckCircle2 size={11} />
                          Confirmar ({selectedInvitados.length})
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateBulkEstado("NO_ASISTIRE")}
                          disabled={bulkDeleting}
                          className="h-7 px-2.5 text-[10px] font-black uppercase rounded border-destructive/20 hover:bg-destructive/10 text-destructive flex items-center gap-1 shrink-0"
                        >
                          <XCircle size={11} />
                          Desconfirmar ({selectedInvitados.length})
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDeleteBulk}
                          disabled={bulkDeleting}
                          className="h-7 px-2.5 text-[10px] font-black uppercase rounded border-destructive/20 hover:bg-destructive/10 text-destructive flex items-center gap-1 shrink-0"
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
                    const canManageThisGuest = canManageAsistencia(caps, asis, user?.id);
                    return (
                      <div 
                        key={asis.id} 
                        className={`flex flex-col p-3 rounded-lg border transition-premium relative overflow-hidden group bg-background hover:bg-muted/10 h-full min-h-[140px] ${
                          isSelected ? "border-primary bg-primary/[0.01]" : "border-border/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 overflow-hidden flex-1">
                            {!isInProgressOrDone && caps.canManageAllAttendance && (
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
                            <PlayerIdentity
                              nombre={asis.usuarioNombre}
                              nombreExterno={asis.nombreExterno}
                              username={asis.usuarioUsername}
                              invitadoPorNombre={asis.invitadoPorNombre}
                              variant="card"
                              className="flex-1 min-w-0"
                            />
                          </div>

                          {/* Action badges based on state */}
                          <div className="flex items-center gap-1 shrink-0">
                            {asis.estado === 'ASISTIRE' && <Badge variant="success" className="text-[8px] font-black uppercase px-1.5 py-0.2">Confirmado</Badge>}
                            {asis.estado === 'NO_ASISTIRE' && <Badge variant="destructive" className="text-[8px] font-black uppercase px-1.5 py-0.2">No Asiste</Badge>}
                            {asis.estado === 'LISTA_ESPERA' && <Badge variant="info" className="text-[8px] font-black uppercase px-1.5 py-0.2">En Espera</Badge>}
                            {asis.estado === 'PENDIENTE' && <Badge variant="warning" className="text-[8px] font-black uppercase px-1.5 py-0.2">Pendiente</Badge>}
                          </div>
                        </div>

                        {/* Preferred positions */}
                        <div className="flex-grow mt-2 flex flex-col justify-start">
                          {asis.posicionesPreferidasNombres && asis.posicionesPreferidasNombres.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {asis.posicionesPreferidasNombres.map((name: string) => (
                                <span key={name} className="text-[9px] font-bold text-primary bg-primary/10 uppercase tracking-widest px-1.5 py-0.5 rounded">
                                  {name}
                                </span>
                              ))}
                            </div>
                          ) : asis.posicionPreferidaNombre ? (
                            <div className="flex">
                              <span className="text-[9px] font-bold text-primary bg-primary/10 uppercase tracking-widest px-1.5 py-0.5 rounded">
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
                        {!isInProgressOrDone && canManageThisGuest && (
                          <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between gap-2">
                            <div className="flex gap-1.5">
                              {/* Toggle confirmation check */}
                              {asis.estado !== 'ASISTIRE' ? (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleUpdateInvitadoEstado(asis.id, 'ASISTIRE')}
                                  className="h-6 w-6 rounded bg-[hsl(var(--success)/0.12)] text-tone-success hover:bg-[hsl(var(--success))] hover:text-primary-foreground"
                                  title="Confirmar Asistencia"
                                >
                                  <CheckCircle2 size={11} />
                                </Button>
                              ) : (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleUpdateInvitadoEstado(asis.id, 'NO_ASISTIRE')}
                                  className="h-6 w-6 rounded bg-[hsl(var(--warning)/0.12)] text-tone-warning hover:bg-[hsl(var(--warning))] hover:text-primary-foreground"
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
                                  className="h-6 w-6 rounded bg-[hsl(var(--warning)/0.12)] text-tone-warning hover:bg-[hsl(var(--warning))] hover:text-primary-foreground"
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

                            <Tooltip content="Quitar de la convocatoria">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteInvitado(asis.id, asis.usuarioNombre || asis.nombreExterno || "este jugador")}
                                className="h-6 w-6 rounded bg-destructive/10 text-destructive hover:bg-destructive hover:text-white opacity-40 group-hover:opacity-100 transition-opacity"
                                aria-label="Quitar invitado"
                              >
                                <Trash2 size={11} />
                              </Button>
                            </Tooltip>
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
                {/* Alineación: equipos + banquillo */}
                {matchmakerRun && bandos.length >= 2 ? (
                  <div className="space-y-6">
                    <LineupBoard
                      teamPlayersMap={playerLists.teamPlayersMap}
                      comodines={playerLists.comodines}
                      waitlist={playerLists.waitlist}
                      bandos={bandos}
                      isOrganizador={caps.showMatchmakingTools}
                      canAssign={caps.canAssignPlayersToTeams && !isInProgressOrDone}
                      onEditTeam={openBandoDialog}
                      onDeleteTeam={handleDeleteBando}
                      onMovePlayer={handleMovePlayer}
                    />

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
                                <PlayerIdentityChip
                                  key={p.id}
                                  nombre={p.usuarioNombre}
                                  nombreExterno={p.nombreExterno}
                                  username={p.usuarioUsername}
                                  invitadoPorNombre={p.invitadoPorNombre}
                                />
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
                                <PlayerIdentityChip
                                  key={p.id}
                                  nombre={p.usuarioNombre}
                                  nombreExterno={p.nombreExterno}
                                  username={p.usuarioUsername}
                                  invitadoPorNombre={p.invitadoPorNombre}
                                  className="opacity-60 line-through decoration-muted-foreground/50"
                                />
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
                          {caps.showMatchmakingTools && (
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
                                {caps.showMatchmakingTools && (
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
                                      onClick={() => handleDeleteBando(eq.id, eq.nombre)}
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

                    {bandos.length === 0 && caps.showMatchmakingTools && (
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
                          <DataListShell className="border-border/80">
                            <DataListHeader
                              columns={ASISTENCIA_TABLE_COLUMNS}
                              labels={{
                                jugador: "Jugador",
                                posicion: "Posición",
                                bando: "Bando",
                                invitado: "Invitado por",
                                estado: "Estado",
                              }}
                            />
                            <DataListBody>
                              {playerLists.confirmadosTotales.map((asis) => (
                                <AsistenciaTableRow key={asis.id} asis={asis} />
                              ))}
                            </DataListBody>
                          </DataListShell>
                        )}
                      </TabsContent>

                      <TabsContent value="espera" className="space-y-2 focus:outline-none pt-2">
                        {playerLists.waitlist.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-8 text-center bg-muted/5 border rounded">No hay jugadores en lista de espera.</p>
                        ) : (
                          <DataListShell className="border-border/80">
                            <DataListHeader
                              columns={ASISTENCIA_TABLE_COLUMNS}
                              labels={{
                                jugador: "Jugador",
                                posicion: "Posición",
                                bando: "Bando",
                                invitado: "Invitado por",
                                estado: "Estado",
                              }}
                            />
                            <DataListBody>
                              {playerLists.waitlist.map((asis, idx) => (
                                <AsistenciaTableRow
                                  key={asis.id}
                                  asis={asis}
                                  showWaitlistIndex={idx}
                                />
                              ))}
                            </DataListBody>
                          </DataListShell>
                        )}
                      </TabsContent>

                      <TabsContent value="otros" className="space-y-2 focus:outline-none pt-2">
                        {playerLists.pendientes.length === 0 && playerLists.noAsistiran.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-8 text-center bg-muted/5 border rounded">Todos los invitados han respondido.</p>
                        ) : (
                          <DataListShell className="border-border/80">
                            <DataListHeader
                              columns={ASISTENCIA_TABLE_COLUMNS}
                              labels={{
                                jugador: "Jugador",
                                posicion: "Posición",
                                bando: "Bando",
                                invitado: "Invitado por",
                                estado: "Estado",
                              }}
                            />
                            <DataListBody>
                              {playerLists.pendientes.map((asis) => (
                                <AsistenciaTableRow key={asis.id} asis={asis} />
                              ))}
                              {playerLists.noAsistiran.map((asis) => (
                                <AsistenciaTableRow
                                  key={asis.id}
                                  asis={asis}
                                  className="opacity-75"
                                />
                              ))}
                            </DataListBody>
                          </DataListShell>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Admin Operations Callout (Shown below) */}
          {caps.showAdminPanel && (
            <div className="notion-callout tone-danger mt-8 flex-col">
              <div className="flex gap-2 items-center">
                <span className="notion-callout-icon">
                  <Settings size={15} />
                </span>
                <div className="font-bold text-xs text-muted-foreground uppercase tracking-widest">Panel de Administración</div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {caps.canPublish && (
                  <Tooltip
                    content={
                      puedePublicarBorrador(convocatoria)
                        ? "Publicar y abrir inscripciones"
                        : MENSAJE_BORRADOR_FECHA_PASADA
                    }
                    maxWidth={300}
                  >
                    <span className="inline-flex">
                      <Button
                        onClick={async () => {
                          try {
                            await api.put(`/api/convocatorias/${id}/abrir`);
                            toast.success(
                              "Convocatoria publicada",
                              "Los jugadores ya pueden confirmar asistencia."
                            );
                            fetchData();
                          } catch (err: unknown) {
                            const msg = getApiErrorMessage(err);
                            setError(msg);
                            toast.error(msg);
                          }
                        }}
                        disabled={!puedePublicarBorrador(convocatoria)}
                        className="h-8 px-3 font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-premium cursor-pointer border border-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle2 size={13} className="mr-1.5" />
                        Abrir Convocatoria
                      </Button>
                    </span>
                  </Tooltip>
                )}

                {caps.canCancel && (
                  <Button 
                    variant="outline"
                    onClick={async () => {
                      const ok = await confirm({
                        title: "Cancelar convocatoria",
                        description:
                          "La convocatoria quedará marcada como cancelada. Los jugadores confirmados ya no asistirán y no podrán volver a inscribirse.",
                        confirmLabel: "Sí, cancelar",
                        cancelLabel: "Volver",
                        variant: "warning",
                      });
                      if (!ok) return;
                      try {
                        await api.put(`/api/convocatorias/${id}/cancelar`);
                        await fetchData();
                        toast.success("Convocatoria cancelada");
                      } catch (err: unknown) {
                        toast.error(getApiErrorMessage(err) || "No se pudo cancelar.");
                        setError(getApiErrorMessage(err));
                      }
                    }}
                    className="h-8 px-3 font-semibold text-xs rounded border border-destructive/20 hover:bg-destructive/10 bg-background text-destructive cursor-pointer"
                  >
                    <XCircle size={13} className="mr-1.5" />
                    Cancelar Convocatoria
                  </Button>
                )}

                {caps.canEdit && !isInProgressOrDone && (
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/convocatorias/${id}/edit`)}
                    className="h-8 px-3 font-semibold text-xs rounded border border-border hover:bg-muted text-foreground bg-background cursor-pointer"
                  >
                    <Edit size={13} className="mr-1.5" />
                    Editar Detalles
                  </Button>
                )}

                {caps.canDelete && (
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      let inscritosCount = 0;
                      if (convocatoria.estado === "ABIERTA") {
                        try {
                          inscritosCount = await countInscritosConvocatoria(convocatoria.id);
                        } catch {
                          /* sin conteo */
                        }
                      }
                      const { title, description } = buildConvocatoriaDeleteConfirm(
                        convocatoria,
                        inscritosCount
                      );
                      const ok = await confirm({
                        title,
                        description,
                        confirmLabel: "Sí, eliminar",
                        variant: "danger",
                      });
                      if (!ok) return;
                      try {
                        await api.delete(`/api/convocatorias/${id}`);
                        toast.success(
                          convocatoria.estado === "BORRADOR"
                            ? "Borrador eliminado"
                            : "Convocatoria eliminada"
                        );
                        navigate("/convocatorias");
                      } catch (err: unknown) {
                        toast.error(getApiErrorMessage(err) || "No se pudo eliminar.");
                        setError(getApiErrorMessage(err));
                      }
                    }}
                    className="h-8 px-3 font-semibold text-xs rounded border border-destructive/20 hover:bg-destructive/10 bg-background text-destructive cursor-pointer"
                  >
                    <Trash2 size={13} className="mr-1.5" />
                    {convocatoria.estado === "BORRADOR"
                      ? "Eliminar Borrador"
                      : "Eliminar Convocatoria"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Configure Positions Warning Dialog */}
        <Dialog open={positionsDialogOpen} onOpenChange={setPositionsDialogOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-[min(100%,25rem)] border border-border bg-card text-foreground rounded-lg p-5">
            <DialogHeader className="space-y-2 text-center">
              <div className="text-3xl select-none mb-1">🎯</div>
              <DialogTitle className="text-base font-extrabold tracking-tight">
                ¡Configura tus posiciones primero!
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Para confirmar tu asistencia a la convocatoria de{" "}
                <strong>{convocatoria?.deporteNombre}</strong>, es necesario
                que definas tus posiciones preferidas de juego en tu perfil. Esto
                permite al sistema autobalancear los equipos de manera justa.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPositionsDialogOpen(false)}
                className="flex-1 text-xs font-semibold h-9 rounded border border-border shadow-none"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setPositionsDialogOpen(false);
                  navigate("/perfil");
                }}
                className="flex-1 text-xs font-semibold h-9 rounded bg-primary text-primary-foreground hover:bg-primary/95 shadow-none"
              >
                Configurar Perfil
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Invitado Dialog */}
        <Dialog open={invitadoDialogOpen} onOpenChange={setInvitadoDialogOpen}>
          <DialogContent className="rounded-lg border bg-card p-4 sm:p-6 w-[calc(100vw-2rem)] max-w-[min(100%,28rem)] sm:max-w-md">
            <form onSubmit={handleSaveInvitado}>
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
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Label className="text-xs font-bold text-muted-foreground">Posiciones preferidas</Label>
                  {deportePosiciones.length > 0 && (
                    <button
                      type="button"
                      className="text-[10px] font-semibold text-primary hover:underline"
                      onClick={() => {
                        const sorted = [...deportePosiciones].sort((a, b) =>
                          a.nombre.localeCompare(b.nombre)
                        );
                        setInvitadoForm({
                          ...invitadoForm,
                          posicionesPreferidasIds: sorted.map((p) => p.id),
                          posicionPreferidaId: String(sorted[0]?.id ?? ""),
                        });
                      }}
                    >
                      Ordenar A–Z
                    </button>
                  )}
                </div>
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
                type="button"
                variant="outline" 
                onClick={() => setInvitadoDialogOpen(false)} 
                className="font-bold text-xs rounded border hover:bg-muted"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={invitadoSaving || !invitadoForm.nombreExterno.trim()} 
                className="font-bold text-xs rounded bg-primary text-primary-foreground hover:bg-primary/95"
              >
                {invitadoSaving ? <Spinner className="text-white" /> : editingInvitado ? "Guardar Cambios" : "Confirmar Invitado"}
              </Button>
            </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Bando Dialog */}
        <Dialog open={bandoDialogOpen} onOpenChange={setbandoDialogOpen}>
          <DialogContent className="rounded-lg border bg-card p-4 sm:p-6 w-[calc(100vw-2rem)] max-w-[min(100%,28rem)] sm:max-w-md">
            <form onSubmit={handleSaveBando}>
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
                <PresetChips
                  showIcon={false}
                  options={[
                    { id: "a", label: "Equipo A", onClick: () => setbandoForm({ nombre: "Equipo A", color: "#3B82F6" }) },
                    { id: "b", label: "Equipo B", onClick: () => setbandoForm({ nombre: "Equipo B", color: "#EF4444" }) },
                    { id: "local", label: "Local", onClick: () => setbandoForm({ nombre: "Local", color: "#22C55E" }) },
                    { id: "visit", label: "Visitante", onClick: () => setbandoForm({ nombre: "Visitante", color: "#F59E0B" }) },
                  ]}
                />
                <Input 
                  id="equipo-nombre" 
                  value={bandoForm.nombre} 
                  onChange={(e) => setbandoForm({ ...bandoForm, nombre: e.target.value })} 
                  placeholder="Ej: Bando Rojo, Los Leones" 
                  className="rounded bg-background border border-border px-3 py-1.5 text-sm"
                  required
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
                type="button"
                variant="outline" 
                onClick={() => setbandoDialogOpen(false)} 
                className="font-bold text-xs rounded border hover:bg-muted"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={bandoSaving || !bandoForm.nombre} 
                className="font-bold text-xs rounded bg-primary text-primary-foreground hover:bg-primary/95"
              >
                {bandoSaving ? <Spinner className="text-white" /> : editingBando ? "Actualizar" : "Crear Bando"}
              </Button>
            </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
  );
}
