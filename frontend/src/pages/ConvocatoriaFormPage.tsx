import { useState, useEffect } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Calendar, Clock, MapPin, Users, Repeat, UserPlus, Check, X, Search } from "lucide-react";
import { Deporte, Grupo, Usuario, HorarioDia } from "@/types";

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

export default function ConvocatoriaFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isEditing = Boolean(id);
  const isRecurrentRoute = location.pathname.includes("recurrentes");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  const [isRecurrent, setIsRecurrent] = useState(isRecurrentRoute);

  const [formData, setFormData] = useState(() => {
    const now = new Date();
    const defaultFechaHora = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    return { titulo: "", descripcion: "", deporteId: 0, fechaHora: defaultFechaHora, lugar: "", estado: "BORRADOR", cupoMaximo: 0, categoria: "", fechaLimiteInscripcion: "", manejoExcedente: "LISTA_ESPERA", duracionEstimadaMinutos: 90 };
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

    if (isRecurrent) {
      const parsedRrule = parseRrule(recurrenteData.rruleExpression || "FREQ=WEEKLY");
      const activeKeys: string[] = [];
      if (parsedRrule.freq === "WEEKLY") {
        activeKeys.push(...parsedRrule.byday);
      } else if (parsedRrule.freq === "DAILY") {
        activeKeys.push(...RRULE_DAYS.map(d => d.value));
      } else {
        activeKeys.push("DEFAULT");
      }

      for (const key of activeKeys) {
        const hor = recurrenteData.horariosPorDia[key] || DEFAULT_HORARIO;
        if (hor.horaApertura && hor.horaEvento && hor.horaApertura >= hor.horaEvento) {
          setError(`La hora de apertura para el día "${getDayLabel(key)}" debe ser estrictamente anterior a la hora del evento.`);
          return;
        }
      }
    } else {
      const eventDate = new Date(formData.fechaHora);
      const now = new Date();
      
      const eventDateOnly = formData.fechaHora.split("T")[0];
      const todayDateOnly = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];
      
      if (eventDateOnly === todayDateOnly) {
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
        if (eventDate < oneHourFromNow) {
          setError("Para convocatorias del mismo día, la hora del evento debe ser al menos una hora posterior a la hora actual.");
          return;
        }
      } else if (eventDate < now) {
        setError("La fecha y hora del evento no puede ser en el pasado.");
        return;
      }
    }

    setSaving(true);
    try {
      if (isRecurrent) {
        const { estado, ...rest } = recurrenteData;
        const payload = { ...rest, activo: estado === "ABIERTA", grupoDestinoId: recurrenteData.grupoDestinoId && recurrenteData.grupoDestinoId !== "0" ? Number(recurrenteData.grupoDestinoId) : null };
        if (isEditing) { await api.put(`/api/configuraciones-recurrentes/${id}`, payload); } else { await api.post("/api/configuraciones-recurrentes", payload); }
      } else {
        const payload = { ...formData, fechaHora: formData.fechaHora + ":00", fechaLimiteInscripcion: formData.fechaLimiteInscripcion ? formData.fechaLimiteInscripcion + ":00" : null };
        let createdId: number;
        if (isEditing) { const { data } = await api.put(`/api/convocatorias/${id}`, payload); createdId = data.id; }
        else { const { data } = await api.post("/api/convocatorias", payload); createdId = data.id; }
        if (!isEditing && createdId) {
          let userIdsToInvite: number[] = [];
          if (invitationMode === "GROUP" && selectedGrupoId) {
            const targetGrp = grupos.find(g => g.id === Number(selectedGrupoId));
            if (targetGrp && targetGrp.miembroIds) userIdsToInvite = targetGrp.miembroIds;
          } else if (invitationMode === "MANUAL" && selectedUserIds.length > 0) { userIdsToInvite = selectedUserIds; }
          if (userIdsToInvite.length > 0) { await api.post(`/api/convocatorias/${createdId}/asistencias/bulk`, userIdsToInvite); }
        }
      }
      navigate("/convocatorias");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = usuarios.filter(u => u.nombre.toLowerCase().includes(userSearchQuery.toLowerCase()) || u.email.toLowerCase().includes(userSearchQuery.toLowerCase()));

  if (loading) { return <div className="flex justify-center items-center py-20 min-h-[60vh]"><Spinner /></div>; }

  const nowForValidation = new Date();
  const todayDateStr = new Date(nowForValidation.getTime() - nowForValidation.getTimezoneOffset() * 60000).toISOString().split("T")[0];
  
  const oneHourLater = new Date(nowForValidation.getTime() + 60 * 60 * 1000);
  const oneHourLaterDateStr = new Date(oneHourLater.getTime() - oneHourLater.getTimezoneOffset() * 60000).toISOString().split("T")[0];
  
  const minDateStr = todayDateStr === oneHourLaterDateStr ? todayDateStr : oneHourLaterDateStr;
  const isToday = formData.fechaHora?.split("T")[0] === todayDateStr;
  const minTimeForToday = isToday ? new Date(oneHourLater.getTime() - oneHourLater.getTimezoneOffset() * 60000).toISOString().split("T")[1].slice(0, 5) : undefined;

  let singleMatchError = "";
  if (formData.fechaHora) {
    const eventDate = new Date(formData.fechaHora);
    if (isToday) {
      if (eventDate < oneHourLater) {
        singleMatchError = "La hora del evento debe ser al menos una hora posterior a la hora actual.";
      }
    } else if (eventDate < nowForValidation) {
      singleMatchError = "La fecha y hora no pueden ser en el pasado.";
    }
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto animate-fadeIn pb-12 px-4 sm:px-6">
      <Button variant="ghost" onClick={() => navigate("/convocatorias")} className="gap-1 font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft size={15} /> Volver
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{isEditing ? "Editar Convocatoria" : "Nueva Convocatoria"}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {isEditing ? "Edita los detalles del evento" : "Define una convocatoria o programa un ciclo recurrente"}
        </p>
      </div>

      {!isEditing && (
        <div className="grid grid-cols-2 p-1 bg-muted rounded-lg">
          <button type="button" onClick={() => setIsRecurrent(false)} className={`py-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${!isRecurrent ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            <Calendar size={13} /> Convocatoria Única
          </button>
          <button type="button" onClick={() => setIsRecurrent(true)} className={`py-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${isRecurrent ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            <Repeat size={13} /> Ciclo Recurrente
          </button>
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
                <Label htmlFor="categoria" className="text-xs font-medium text-muted-foreground">Categoría</Label>
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
                <Label htmlFor="cupoMaximo" className="text-xs font-medium text-muted-foreground">
                  Cupo Máximo{(isRecurrent ? recurrenteData.categoria === "LIBRE" : formData.categoria === "LIBRE") ? " (Libre = sin límite)" : ""}
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
                    : "Activo: La convocatoria se publica inmediatamente con inscripciones abiertas. Si seleccionaste invitaciones, los jugadores serán notificados al instante."}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t">
                  <div className="space-y-1.5">
                    <Label htmlFor="fechaDate" className="text-xs font-medium text-muted-foreground">Fecha</Label>
                    <Input id="fechaDate" type="date" min={minDateStr} value={formData.fechaHora ? formData.fechaHora.split("T")[0] : ""} onChange={(e) => { const date = e.target.value; const time = formData.fechaHora?.split("T")[1] || "20:00"; setFormData({ ...formData, fechaHora: date + "T" + time }); }} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fechaTime" className="text-xs font-medium text-muted-foreground">Hora del evento</Label>
                    <Input id="fechaTime" type="time" min={minTimeForToday} value={formData.fechaHora ? formData.fechaHora.split("T")[1] : ""} onChange={(e) => { const date = formData.fechaHora?.split("T")[0] || ""; setFormData({ ...formData, fechaHora: date + "T" + e.target.value }); }} required />
                  </div>
                </div>
                {singleMatchError && (
                  <p className="text-[10px] text-destructive font-medium pl-1.5 animate-fadeIn">
                    ⚠️ {singleMatchError}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="duracion" className="text-xs font-medium text-muted-foreground">Duración (min)</Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/50"><Clock size={14} /></span>
                      <Input id="duracion" type="number" min="1" value={formData.duracionEstimadaMinutos} onChange={(e) => setFormData({ ...formData, duracionEstimadaMinutos: parseInt(e.target.value) || 90 })} className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="manejoExcedente" className="text-xs font-medium text-muted-foreground">Excedentes</Label>
                    <Select value={formData.manejoExcedente} onValueChange={(v) => setFormData({ ...formData, manejoExcedente: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LISTA_ESPERA">Lista de Espera</SelectItem>
                        <SelectItem value="COMODIN">Comodín Neutral</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                      {formData.manejoExcedente === "LISTA_ESPERA"
                        ? "Lista de Espera: Los jugadores excedentes entran en una cola ordenada y pasan automáticamente a confirmados si alguien se da de baja."
                        : "Comodín Neutral: Los excedentes se registran como comodines sustitutos, ideales para balancear equipos el día del juego."}
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
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5"><UserPlus size={15} />Invitaciones</CardTitle>
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
                          <span key={uid} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded border bg-card text-xs font-medium">
                            {selUser.nombre}
                            <button type="button" onClick={() => handleUserSelect(uid)} className="h-4 w-4 rounded hover:bg-destructive/10 hover:text-destructive flex items-center justify-center"><X size={10} /></button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <div className="border rounded-lg max-h-[180px] overflow-y-auto divide-y">
                    {filteredUsers.map((u) => {
                      const isSelected = selectedUserIds.includes(u.id);
                      return (
                        <div key={u.id} onClick={() => handleUserSelect(u.id)} className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors ${isSelected ? "bg-primary/[0.03]" : ""}`}>
                          <div className="min-w-0">
                            <span className="text-xs font-medium truncate block">{u.nombre}</span>
                            <span className="text-[10px] text-muted-foreground truncate block">{u.email}</span>
                          </div>
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
          <Button type="submit" disabled={saving} className="font-semibold rounded-lg px-5">
            {saving ? <Spinner /> : isEditing ? "Guardar" : isRecurrent ? "Programar" : "Crear Borrador"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/convocatorias")} className="font-medium rounded-lg">
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
