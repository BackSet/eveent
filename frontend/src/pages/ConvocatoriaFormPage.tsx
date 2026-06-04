import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "@/services/api";
import { getApiErrorMessage, parseRrule, RRULE_DAYS } from "@/lib/constants";
import { RRuleBuilder } from "@/components/RRuleBuilder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { FormPageSkeleton } from "@/components/ui/page-skeletons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Calendar, Clock, MapPin, Users, Repeat, UserPlus, Check, X, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PageIconKind } from "@/lib/iconography";
import { Deporte, Grupo, Usuario, HorarioDia } from "@/types";
import { useToast } from "@/components/ui/toast";
import { InfoHint } from "@/components/ui/info-hint";
import { PlayerIdentity, PlayerIdentityChip } from "@/components/ui/player-identity";
import { EventDateTimePicker } from "@/components/convocatoria/EventDateTimePicker";
import { InscripcionDeadlinePicker } from "@/components/convocatoria/InscripcionDeadlinePicker";
import { PresetChips } from "@/components/ui/preset-chips";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useFormDirty } from "@/hooks/useFormDirty";
import { validateInscripcionDeadline, validateRequiredTrim } from "@/lib/formValidation";
import {
  getSuggestedDefaultDateTime,
  validateIndividualEventDateTime,
  validateRecurrentHorarios,
} from "@/lib/convocatoriaSchedule";

const CATEGORIAS = [
  { value: "LIBRE", label: "Libre" },
  { value: "COMPETITIVO", label: "Competitivo" },
  { value: "AMISTOSO", label: "Amistoso" },
  { value: "ENTRENAMIENTO", label: "Entrenamiento" },
];

const DEFAULT_HORARIO: HorarioDia = { horaApertura: "08:00", horaEvento: "20:00", duracionMinutos: 90 };

const getDayLabel = (key: string): string => {
  if (key === "DEFAULT") return "Cada ocurrencia";
  return RRULE_DAYS.find(d => d.value === key)?.label ?? key;
};

export default function ConvocatoriaFormPage({ recurrente }: { recurrente?: boolean } = {}) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const confirm = useConfirm();

  const isEditing = Boolean(id);
  // El modo recurrente llega como prop explícito desde el router; sólo recurrimos a
  // inspeccionar la ruta como respaldo para no romper enlaces directos.
  const isRecurrentRoute = recurrente ?? location.pathname.includes("recurrentes");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  const [isRecurrent, setIsRecurrent] = useState(isRecurrentRoute);

  const [formData, setFormData] = useState(() => {
    const { fechaHora } = getSuggestedDefaultDateTime();
    return {
      titulo: "",
      descripcion: "",
      deporteId: 0,
      fechaHora,
      lugar: "",
      estado: "BORRADOR",
      cupoMaximo: 0,
      categoria: "",
      fechaLimiteInscripcion: "",
      manejoExcedente: "LISTA_ESPERA",
      duracionEstimadaMinutos: 90,
    };
  });

  const [recurrenteData, setRecurrenteData] = useState({
    titulo: "", descripcion: "", deporteId: 0, lugar: "", cupoMaximo: 0, categoria: "",
    rruleExpression: "FREQ=WEEKLY;BYDAY=MO", horariosPorDia: { MO: { ...DEFAULT_HORARIO } } as Record<string, HorarioDia>,
    grupoDestinoId: "0", estado: "ABIERTA",
  });

  const [invitationMode, setInvitationMode] = useState<"NONE" | "GROUP" | "MANUAL">("NONE");
  const [selectedGrupoId, setSelectedGrupoId] = useState<string>("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const [deportesRes, gruposRes, usuariosRes] = await Promise.all([
          api.get<Deporte[]>("/api/deportes"),
          api.get<Grupo[]>("/api/grupos"),
          api.get<Usuario[]>("/api/usuarios").catch(() => ({ data: [] }))
        ]);
        setDeportes(deportesRes.data);
        setGrupos(gruposRes.data);
        setUsuarios(usuariosRes.data);

        if (deportesRes.data.length > 0 && !isEditing) {
          setFormData(prev => ({ ...prev, deporteId: deportesRes.data[0].id }));
          setRecurrenteData(prev => ({ ...prev, deporteId: deportesRes.data[0].id }));
        }

        if (isEditing) {
          if (isRecurrentRoute) {
            const { data } = await api.get(`/api/configuraciones-recurrentes/${id}`);
            const horarios = data.horariosPorDia || { DEFAULT: DEFAULT_HORARIO };
            setRecurrenteData({
              titulo: data.titulo, descripcion: data.descripcion || "", deporteId: data.deporteId, lugar: data.lugar || "",
              cupoMaximo: data.cupoMaximo || 0, categoria: data.categoria || "", rruleExpression: data.rruleExpression || "FREQ=WEEKLY;BYDAY=MO",
              horariosPorDia: horarios,
              grupoDestinoId: data.grupoDestinoId || "", estado: data.activo ? "ABIERTA" : "BORRADOR",
            });
            setIsRecurrent(true);
          } else {
            const { data } = await api.get(`/api/convocatorias/${id}`);
            setFormData({
              titulo: data.titulo, descripcion: data.descripcion || "", deporteId: data.deporteId,
              fechaHora: data.fechaHora ? data.fechaHora.slice(0, 16) : "", lugar: data.lugar || "",
              estado: data.estado, cupoMaximo: data.cupoMaximo || 0, categoria: data.categoria || "",
              fechaLimiteInscripcion: data.fechaLimiteInscripcion ? data.fechaLimiteInscripcion.slice(0, 16) : "",
              manejoExcedente: data.manejoExcedente || "LISTA_ESPERA",
              duracionEstimadaMinutos: data.duracionEstimadaMinutos || 90,
            });
            if (data.tipoInvitacion === "GRUPO") {
              setInvitationMode("GROUP");
              setSelectedGrupoId(data.grupoId ? String(data.grupoId) : "");
            } else if (data.tipoInvitacion === "MANUAL") {
              setInvitationMode("MANUAL");
            } else {
              setInvitationMode("NONE");
            }
            setIsRecurrent(false);
          }
        }
      } catch (err: unknown) {
        setError(getApiErrorMessage(err) || "Error al inicializar formulario");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isEditing, isRecurrentRoute]);

  const dirtySnapshot = useMemo(
    () => ({
      isRecurrent,
      formData,
      recurrenteData,
      invitationMode,
      selectedGrupoId,
      selectedUserIds,
    }),
    [isRecurrent, formData, recurrenteData, invitationMode, selectedGrupoId, selectedUserIds]
  );
  const { isDirty, checkDirty, resetSnapshot } = useFormDirty(dirtySnapshot);

  useEffect(() => {
    if (!loading) {
      resetSnapshot(dirtySnapshot);
    }
  }, [loading]);

  useEffect(() => {
    if (!loading) checkDirty(dirtySnapshot);
  }, [dirtySnapshot, loading]);

  const handleCancel = async () => {
    if (isDirty) {
      const ok = await confirm({
        title: "Descartar cambios",
        description: "Tienes cambios sin guardar. ¿Salir del formulario?",
        confirmLabel: "Sí, salir",
        variant: "warning",
      });
      if (!ok) return;
    }
    navigate("/convocatorias");
  };

  const handleRruleChange = (rrule: string) => {
    setRecurrenteData(prev => ({ ...prev, rruleExpression: rrule }));
  };

  const handleHorariosChange = (horarios: Record<string, HorarioDia>) => {
    setRecurrenteData(prev => ({ ...prev, horariosPorDia: horarios }));
  };

  const handleUserSelect = (userId: number) => {
    setSelectedUserIds(prev => prev.includes(userId) ? prev.filter(uid => uid !== userId) : [...prev, userId]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const titulo = isRecurrent ? recurrenteData.titulo : formData.titulo;
    const tituloErr = validateRequiredTrim(titulo, "El título");
    if (tituloErr) {
      setError(tituloErr);
      return;
    }

    if (isRecurrent) {
      if (!recurrenteData.deporteId) {
        setError("Selecciona un deporte.");
        return;
      }
      const parsedRrule = parseRrule(recurrenteData.rruleExpression || "FREQ=WEEKLY");
      const activeKeys: string[] = [];
      if (parsedRrule.freq === "WEEKLY") {
        activeKeys.push(...parsedRrule.byday);
      } else if (parsedRrule.freq === "DAILY") {
        activeKeys.push(...RRULE_DAYS.map(d => d.value));
      } else {
        activeKeys.push("DEFAULT");
      }

      const horarioError = validateRecurrentHorarios(recurrenteData.horariosPorDia, activeKeys);
      if (horarioError) {
        setError(horarioError);
        return;
      }
    } else {
      if (!formData.deporteId) {
        setError("Selecciona un deporte.");
        return;
      }
      const dateError = validateIndividualEventDateTime(formData.fechaHora);
      if (dateError) {
        setError(dateError);
        return;
      }
      const deadlineError = validateInscripcionDeadline(
        formData.fechaLimiteInscripcion,
        formData.fechaHora
      );
      if (deadlineError) {
        setError(deadlineError);
        return;
      }
    }

    if (!isRecurrent) {
      if (invitationMode === "GROUP" && !selectedGrupoId) {
        setError("Selecciona un grupo para convocatorias restringidas por grupo.");
        return;
      }
      if (invitationMode === "MANUAL" && selectedUserIds.length === 0) {
        setError("En modo manual debes invitar al menos un jugador.");
        return;
      }
    }

    setSaving(true);
    try {
      if (isRecurrent) {
        const { estado, ...rest } = recurrenteData;
        const payload = { ...rest, activo: estado === "ABIERTA", grupoDestinoId: recurrenteData.grupoDestinoId && recurrenteData.grupoDestinoId !== "0" ? Number(recurrenteData.grupoDestinoId) : null };
        if (isEditing) {
          await api.put(`/api/configuraciones-recurrentes/${id}`, payload);
          toast.success("Regla actualizada");
        } else {
          await api.post("/api/configuraciones-recurrentes", payload);
          toast.success(
            estado === "ABIERTA" ? "Regla creada y activa" : "Regla guardada como borrador",
            estado === "ABIERTA"
              ? "Comenzará a generar convocatorias automáticamente."
              : "Actívala cuando quieras que empiece a generar convocatorias."
          );
        }
      } else {
        const tipoInvitacion =
          invitationMode === "NONE" ? "ABIERTA" : invitationMode === "GROUP" ? "GRUPO" : "MANUAL";
        const payload = {
          ...formData,
          fechaHora: formData.fechaHora + ":00",
          fechaLimiteInscripcion: formData.fechaLimiteInscripcion ? formData.fechaLimiteInscripcion + ":00" : null,
          tipoInvitacion,
          grupoId: invitationMode === "GROUP" && selectedGrupoId ? Number(selectedGrupoId) : null,
        };
        let createdId: number;
        if (isEditing) {
          const { data } = await api.put(`/api/convocatorias/${id}`, payload);
          createdId = data.id;
          toast.success("Convocatoria actualizada");
        } else {
          const { data } = await api.post("/api/convocatorias", payload);
          createdId = data.id;
        }
        if (!isEditing && createdId) {
          let userIdsToInvite: number[] = [];
          if (invitationMode === "GROUP" && selectedGrupoId) {
            const targetGrp = grupos.find(g => g.id === Number(selectedGrupoId));
            if (targetGrp && targetGrp.miembroIds) userIdsToInvite = targetGrp.miembroIds;
          } else if (invitationMode === "MANUAL") {
            userIdsToInvite = selectedUserIds;
          }
          if (userIdsToInvite.length > 0) {
            await api.post(`/api/convocatorias/${createdId}/asistencias/bulk`, userIdsToInvite);
            toast.success(
              `Convocatoria creada con ${userIdsToInvite.length} invitación(es)`,
              formData.estado === "ABIERTA"
                ? "Los invitados ya pueden ver la convocatoria y confirmar."
                : "La convocatoria está como borrador hasta que la publiques."
            );
          } else {
            toast.success(
              formData.estado === "ABIERTA" ? "Convocatoria publicada" : "Borrador creado",
              formData.estado === "ABIERTA"
                ? "Ya está visible en la lista de convocatorias."
                : "Recuerda publicarla cuando esté lista."
            );
          }
        }
      }
      navigate("/convocatorias");
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err) || "Error al guardar";
      toast.error(msg);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = usuarios.filter(u => u.nombre.toLowerCase().includes(userSearchQuery.toLowerCase()) || u.email.toLowerCase().includes(userSearchQuery.toLowerCase()));

  if (loading) {
    return <FormPageSkeleton />;
  }

  const singleDateError = !isRecurrent ? validateIndividualEventDateTime(formData.fechaHora) : null;
  const deadlineError =
    !isRecurrent && formData.fechaLimiteInscripcion
      ? validateInscripcionDeadline(formData.fechaLimiteInscripcion, formData.fechaHora)
      : null;
  const canSubmit = !singleDateError && !deadlineError;

  return (
    <div className="page-shell space-y-5 max-w-3xl animate-fadeIn">
      <Button variant="ghost" onClick={() => navigate("/convocatorias")} className="gap-1 font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft size={15} /> Volver
      </Button>

      <PageHeader
        iconKind={PageIconKind.CONVOCATORIAS}
        title={isEditing ? "Editar Convocatoria" : "Nueva Convocatoria"}
        description={
          isEditing
            ? "Edita los detalles del evento"
            : "Define una convocatoria o programa un ciclo recurrente"
        }
      />

      {!isEditing && (
        <div>
          <div className="grid grid-cols-2 p-1 bg-muted rounded-lg">
            <button type="button" onClick={() => setIsRecurrent(false)} className={`py-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${!isRecurrent ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
              <Calendar size={13} /> Convocatoria Única
            </button>
            <button type="button" onClick={() => setIsRecurrent(true)} className={`py-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${isRecurrent ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
              <Repeat size={13} /> Ciclo Recurrente
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 px-1 leading-relaxed">
            {isRecurrent
              ? "Un ciclo recurrente genera convocatorias automáticamente según un calendario (ej. cada martes y jueves a las 8pm)."
              : "Una convocatoria única es un solo evento con fecha y hora específica."}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <Alert variant="destructive" className="text-xs"><AlertDescription>{error}</AlertDescription></Alert>}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{isRecurrent ? "Plantilla Recurrente" : "Convocatoria Única"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="titulo" className="text-xs font-medium text-muted-foreground">Título</Label>
              <Input id="titulo" placeholder="Ej: Encuentro Amistoso" value={isRecurrent ? recurrenteData.titulo : formData.titulo} onChange={(e) => isRecurrent ? setRecurrenteData({ ...recurrenteData, titulo: e.target.value }) : setFormData({ ...formData, titulo: e.target.value })} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descripcion" className="text-xs font-medium text-muted-foreground">Descripción</Label>
              <Input id="descripcion" placeholder="Notas de juego, vestimenta, etc." value={isRecurrent ? recurrenteData.descripcion : formData.descripcion} onChange={(e) => isRecurrent ? setRecurrenteData({ ...recurrenteData, descripcion: e.target.value }) : setFormData({ ...formData, descripcion: e.target.value })} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="deporte" className="text-xs font-medium text-muted-foreground">Deporte</Label>
                <Select value={String(isRecurrent ? recurrenteData.deporteId : formData.deporteId)} onValueChange={(v) => isRecurrent ? setRecurrenteData({ ...recurrenteData, deporteId: Number(v) }) : setFormData({ ...formData, deporteId: Number(v) })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{deportes.map((dep) => <SelectItem key={dep.id} value={String(dep.id)}>{dep.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="categoria" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <span>Categoría</span>
                  <InfoHint side="right" maxWidth={300}>
                    <strong>Libre</strong>: sin cupo. <strong>Competitivo</strong>: balanceo estricto.
                    <strong> Amistoso</strong>: casual. <strong> Entrenamiento</strong>: práctica técnica.
                  </InfoHint>
                </Label>
                <PresetChips
                  showIcon={false}
                  options={CATEGORIAS.map((cat) => ({
                    id: cat.value,
                    label: cat.label,
                    onClick: () => {
                      const isLibre = cat.value === "LIBRE";
                      if (isRecurrent) {
                        setRecurrenteData({
                          ...recurrenteData,
                          categoria: cat.value,
                          cupoMaximo: isLibre ? 0 : recurrenteData.cupoMaximo,
                        });
                      } else {
                        setFormData({
                          ...formData,
                          categoria: cat.value,
                          cupoMaximo: isLibre ? 0 : formData.cupoMaximo,
                        });
                      }
                    },
                  }))}
                  activeId={isRecurrent ? recurrenteData.categoria : formData.categoria}
                />
                <Select value={isRecurrent ? recurrenteData.categoria : formData.categoria} onValueChange={(v) => {
                  const isLibre = v === "LIBRE";
                  if (isRecurrent) {
                    setRecurrenteData({ ...recurrenteData, categoria: v, cupoMaximo: isLibre ? 0 : recurrenteData.cupoMaximo });
                  } else {
                    setFormData({ ...formData, categoria: v, cupoMaximo: isLibre ? 0 : formData.cupoMaximo });
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lugar" className="text-xs font-medium text-muted-foreground">Lugar</Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/50"><MapPin size={14} /></span>
                  <Input id="lugar" placeholder="Ej: Cancha Don Rafa" value={isRecurrent ? recurrenteData.lugar : formData.lugar} onChange={(e) => isRecurrent ? setRecurrenteData({ ...recurrenteData, lugar: e.target.value }) : setFormData({ ...formData, lugar: e.target.value })} className="pl-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cupoMaximo" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <span>
                    Cupo Máximo
                    {(isRecurrent ? recurrenteData.categoria === "LIBRE" : formData.categoria === "LIBRE") && " (sin límite)"}
                  </span>
                  <InfoHint side="right" maxWidth={280}>
                    Número máximo de jugadores confirmados. Si se llena, los siguientes pasan a
                    <strong> lista de espera</strong> o quedan como <strong>comodines</strong>
                    (según la opción "Excedentes"). Usa <code>0</code> para no limitar.
                  </InfoHint>
                </Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/50"><Users size={14} /></span>
                  <Input id="cupoMaximo" type="number" min="0" value={isRecurrent ? recurrenteData.cupoMaximo : formData.cupoMaximo} onChange={(e) => { const val = parseInt(e.target.value) || 0; isRecurrent ? setRecurrenteData({ ...recurrenteData, cupoMaximo: val }) : setFormData({ ...formData, cupoMaximo: val }); }} className="pl-9" disabled={(isRecurrent ? recurrenteData.categoria : formData.categoria) === "LIBRE"} />
                </div>
              </div>
            </div>

            {!isRecurrent && (
              <div className="space-y-1.5 pt-3 border-t">
                <Label className="text-xs font-medium text-muted-foreground">Estado de la Convocatoria</Label>
                <Select value={formData.estado} onValueChange={(v) => setFormData({ ...formData, estado: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BORRADOR">Borrador (Oculto)</SelectItem>
                    <SelectItem value="ABIERTA">Activo (Publicado)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                  {formData.estado === "BORRADOR"
                    ? "Borrador: La convocatoria se guarda como borrador de forma privada. No es visible en la lista pública, no permite inscripciones y no se notificará a los jugadores."
                    : "Activo: La convocatoria se publica inmediatamente con inscripciones abiertas. Los jugadores invitados podrán verla en la lista de convocatorias."}
                </p>
              </div>
            )}

            {isRecurrent && (
              <div className="space-y-1.5 pt-3 border-t animate-fadeIn">
                <Label className="text-xs font-medium text-muted-foreground">Estado de la Programación</Label>
                <Select value={recurrenteData.estado} onValueChange={(v) => setRecurrenteData({ ...recurrenteData, estado: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BORRADOR">Borrador (Inactivo)</SelectItem>
                    <SelectItem value="ABIERTA">Activo (Programado)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                  {recurrenteData.estado === "BORRADOR"
                    ? "Borrador (Inactivo): El ciclo recurrente se guarda como borrador. No se generarán convocatorias de forma automática hasta que decidas activar la programación."
                    : "Activo (Programado): El ciclo recurrente está activo e iniciará la generación automática de convocatorias en las fechas del calendario definidas."}
                </p>
              </div>
            )}

            {!isRecurrent && (
              <>
                <div className="pt-3 border-t space-y-4">
                  <EventDateTimePicker
                    value={formData.fechaHora}
                    onChange={(fechaHora) => setFormData({ ...formData, fechaHora })}
                  />
                  <InscripcionDeadlinePicker
                    value={formData.fechaLimiteInscripcion}
                    onChange={(fechaLimiteInscripcion) =>
                      setFormData({ ...formData, fechaLimiteInscripcion })
                    }
                    fechaEvento={formData.fechaHora}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="duracion" className="text-xs font-medium text-muted-foreground">Duración (min)</Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/50"><Clock size={14} /></span>
                      <Input id="duracion" type="number" min="1" value={formData.duracionEstimadaMinutos} onChange={(e) => setFormData({ ...formData, duracionEstimadaMinutos: parseInt(e.target.value) || 90 })} className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="manejoExcedente" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <span>¿Qué hacer con los excedentes?</span>
                      <InfoHint side="right" maxWidth={300}>
                        Los <strong>excedentes</strong> son los jugadores que confirman después de
                        que se llenó el cupo. Aquí decides cómo tratarlos.
                      </InfoHint>
                    </Label>
                    <Select value={formData.manejoExcedente} onValueChange={(v) => setFormData({ ...formData, manejoExcedente: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LISTA_ESPERA">Lista de Espera</SelectItem>
                        <SelectItem value="COMODIN">Comodín Neutral</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                      {formData.manejoExcedente === "LISTA_ESPERA"
                        ? "Lista de espera: los excedentes entran en una cola ordenada por orden de llegada. Si alguien cancela, el primero de la cola entra automáticamente."
                        : "Comodín neutral: los excedentes quedan como reservas sin equipo asignado, listos para entrar en cualquier bando el día del juego."}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {isRecurrent && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Programación y Horarios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RRuleBuilder value={recurrenteData.rruleExpression} horariosPorDia={recurrenteData.horariosPorDia} onRruleChange={handleRruleChange} onHorariosChange={handleHorariosChange} />
            </CardContent>
          </Card>
        )}

        {isRecurrent && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Grupo Destino</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Seleccionar Grupo</Label>
                <Select value={String(recurrenteData.grupoDestinoId)} onValueChange={(v) => setRecurrenteData({ ...recurrenteData, grupoDestinoId: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar grupo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Ninguno (Abierto)</SelectItem>
                    {grupos.map((g) => <SelectItem key={g.id} value={String(g.id)}>{g.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {!isRecurrent && !isEditing && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <UserPlus size={15} />
                <span>Invitaciones (solo al crear)</span>
                <InfoHint side="right" maxWidth={320}>
                  Define quién puede ver y confirmar asistencia. En grupo y manual puedes pre-cargar
                  invitaciones como pendientes. Al editar, el modo de acceso no se puede cambiar.
                </InfoHint>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-1.5">
                {(["NONE", "GROUP", "MANUAL"] as const).map((mode) => (
                  <button key={mode} type="button" onClick={() => setInvitationMode(mode)}
                    className={`py-1.5 rounded-md text-[10px] font-medium uppercase tracking-wider transition-colors border ${invitationMode === mode ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border hover:bg-muted text-muted-foreground"}`}>
                    {mode === "NONE" && "Abierto"}{mode === "GROUP" && "Grupo"}{mode === "MANUAL" && "Manual"}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {invitationMode === "NONE" &&
                  "Abierto: cualquier jugador que tenga posiciones del deporte seleccionado puede ver la convocatoria e inscribirse."}
                {invitationMode === "GROUP" &&
                  "Grupo: solo los miembros del grupo elegido pueden ver la convocatoria y confirmar. Se pueden pre-invitados como pendientes."}
                {invitationMode === "MANUAL" &&
                  "Manual: solo los jugadores que invites podrán ver la convocatoria y confirmar asistencia."}
              </p>

              {invitationMode === "GROUP" && (
                <div className="space-y-1.5 animate-fadeIn">
                  <Label className="text-xs font-medium text-muted-foreground">Grupo</Label>
                  <Select value={selectedGrupoId} onValueChange={setSelectedGrupoId}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar grupo" /></SelectTrigger>
                    <SelectContent>{grupos.map((g) => <SelectItem key={g.id} value={String(g.id)}>{g.nombre} ({g.miembroIds?.length || 0})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              {invitationMode === "MANUAL" && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-xs font-medium text-muted-foreground">Jugadores ({selectedUserIds.length})</Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-muted-foreground/50"><Search size={12} /></span>
                      <Input placeholder="Buscar..." value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} className="max-w-[180px] h-7 text-[11px] pl-7" />
                    </div>
                  </div>

                  {selectedUserIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 bg-primary/[0.03] border border-primary/10 rounded-lg p-2">
                      {selectedUserIds.map((uid) => {
                        const selUser = usuarios.find(u => u.id === uid);
                        if (!selUser) return null;
                        return (
                          <span key={uid} className="inline-flex items-center gap-0.5">
                            <PlayerIdentityChip
                              nombre={selUser.nombre}
                              username={selUser.username}
                            />
                            <button type="button" onClick={() => handleUserSelect(uid)} className="h-5 w-5 rounded hover:bg-destructive/10 hover:text-destructive flex items-center justify-center shrink-0" aria-label={`Quitar a ${selUser.nombre}`}><X size={10} /></button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <div className="border rounded-lg max-h-[180px] overflow-y-auto divide-y">
                    {filteredUsers.map((u) => {
                      const isSelected = selectedUserIds.includes(u.id);
                      return (
                        <div key={u.id} onClick={() => handleUserSelect(u.id)} className={`flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors ${isSelected ? "bg-primary/[0.03]" : ""}`}>
                          <PlayerIdentity
                            nombre={u.nombre}
                            username={u.username}
                            email={u.email}
                            variant="list"
                            className="flex-1 min-w-0"
                          />
                          <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ml-2 ${isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>
                            {isSelected && <Check size={10} />}
                          </div>
                        </div>
                      );
                    })}
                    {filteredUsers.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">Sin resultados</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-2 pt-3 border-t">
          {isDirty && (
            <span className="text-[10px] text-tone-warning font-medium mr-auto">
              Cambios sin guardar
            </span>
          )}
          <Button type="submit" disabled={saving || (!isRecurrent && !canSubmit)} className="font-semibold rounded-lg px-5">
            {saving
              ? <Spinner />
              : isEditing
                ? "Guardar cambios"
                : isRecurrent
                  ? "Crear regla recurrente"
                  : formData.estado === "ABIERTA"
                    ? "Crear y publicar"
                    : "Guardar como borrador"}
          </Button>
          <Button type="button" variant="outline" onClick={handleCancel} className="font-medium rounded-lg">
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
