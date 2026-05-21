import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Settings, 
  Repeat, 
  UserPlus, 
  ShieldCheck,
  Check
} from "lucide-react";
import { Deporte, Grupo, Usuario } from "@/types";

const ESTADOS = ["BORRADOR", "ABIERTA", "CERRADA", "CANCELADA"];
const DIAS_LIST = [
  { value: "MONDAY", label: "Lun" },
  { value: "TUESDAY", label: "Mar" },
  { value: "WEDNESDAY", label: "Mié" },
  { value: "THURSDAY", label: "Jue" },
  { value: "FRIDAY", label: "Vie" },
  { value: "SATURDAY", label: "Sáb" },
  { value: "SUNDAY", label: "Dom" }
];

export default function ConvocatoriaFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isEditing = Boolean(id);
  const isRecurrentRoute = location.pathname.includes("recurrentes");

  // General States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  
  // Toggle Mode State (Single vs Recurrent)
  const [isRecurrent, setIsRecurrent] = useState(isRecurrentRoute);

  // Single Convocatoria State
  const [formData, setFormData] = useState(() => {
    const now = new Date()
    const defaultFechaHora = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    return {
      titulo: "",
      descripcion: "",
      deporteId: 0,
      fechaHora: defaultFechaHora,
      lugar: "",
      estado: "BORRADOR",
      cupoMaximo: 0,
      categoria: "",
      fechaLimiteInscripcion: "",
      manejoExcedente: "LISTA_ESPERA",
    }
  })

  // Recurrent Convocatoria State
  const [recurrenteData, setRecurrenteData] = useState({
    titulo: "",
    descripcion: "",
    deporteId: 0,
    lugar: "",
    cupoMaximo: 0,
    categoria: "",
    patron: "SEMANAL",
    diasSemana: [] as string[],
    horaEvento: "08:00",
    horaPartido: "21:00",
    grupoDestinoId: "0",
    activo: true,
  });

  // Invitation Selection Mode (Only for Single)
  // "NONE" | "GROUP" | "MANUAL"
  const [invitationMode, setInvitationMode] = useState<"NONE" | "GROUP" | "MANUAL">("NONE");
  const [selectedGrupoId, setSelectedGrupoId] = useState<string>("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Load sports, groups, and users
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const [deportesRes, gruposRes, usuariosRes] = await Promise.all([
          api.get<Deporte[]>("/api/deportes"),
          api.get<Grupo[]>("/api/grupos"),
          api.get<Usuario[]>("/api/usuarios").catch(() => ({ data: [] })) // Fallback if no permissions to see all users
        ]);

        setDeportes(deportesRes.data);
        setGrupos(gruposRes.data);
        setUsuarios(usuariosRes.data);

        // Pre-select first sport
        if (deportesRes.data.length > 0 && !isEditing) {
          setFormData(prev => ({ ...prev, deporteId: deportesRes.data[0].id }));
          setRecurrenteData(prev => ({ ...prev, deporteId: deportesRes.data[0].id }));
        }

        // Fetch details if editing
        if (isEditing) {
          if (isRecurrentRoute) {
            const { data } = await api.get(`/api/convocatorias/recurrentes/${id}`);
            setRecurrenteData({
              titulo: data.titulo,
              descripcion: data.descripcion || "",
              deporteId: data.deporteId,
              lugar: data.lugar || "",
              cupoMaximo: data.cupoMaximo || 0,
              categoria: data.categoria || "",
              patron: data.patron || "SEMANAL",
              diasSemana: data.diasSemana ? data.diasSemana.split(",") : [],
              horaEvento: data.horaEvento ? data.horaEvento.slice(0, 5) : "08:00",
              horaPartido: data.horaPartido ? data.horaPartido.slice(0, 5) : "21:00",
              grupoDestinoId: data.grupoDestinoId || "",
              activo: data.activo,
            });
            setIsRecurrent(true);
          } else {
            const { data } = await api.get(`/api/convocatorias/${id}`);
            const fechaFormateada = data.fechaHora ? data.fechaHora.slice(0, 16) : "";
            const fechaLimiteFormateada = data.fechaLimiteInscripcion ? data.fechaLimiteInscripcion.slice(0, 16) : "";
            setFormData({
              titulo: data.titulo,
              descripcion: data.descripcion || "",
              deporteId: data.deporteId,
              fechaHora: fechaFormateada,
              lugar: data.lugar || "",
              estado: data.estado,
              cupoMaximo: data.cupoMaximo || 0,
              categoria: data.categoria || "",
              fechaLimiteInscripcion: fechaLimiteFormateada,
              manejoExcedente: data.manejoExcedente || "LISTA_ESPERA",
            });
            setIsRecurrent(false);
          }
        }
      } catch (err: any) {
        console.error("Error al cargar datos", err);
        setError(err.response?.data?.message || "Error al inicializar formulario");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isEditing, isRecurrentRoute]);

  const handleWeekdayToggle = (day: string) => {
    setRecurrenteData(prev => {
      const alreadySelected = prev.diasSemana.includes(day);
      const updated = alreadySelected
        ? prev.diasSemana.filter(d => d !== day)
        : [...prev.diasSemana, day];
      return { ...prev, diasSemana: updated };
    });
  };

  const handleUserSelect = (userId: number) => {
    setSelectedUserIds(prev => 
      prev.includes(userId)
        ? prev.filter(uid => uid !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (isRecurrent) {
        // Recurrent Flow
        const payload = {
          ...recurrenteData,
          diasSemana: recurrenteData.diasSemana.join(","),
          grupoDestinoId: recurrenteData.grupoDestinoId ? Number(recurrenteData.grupoDestinoId) : null,
          horaEvento: recurrenteData.horaEvento + ":00",
          horaPartido: recurrenteData.horaPartido + ":00",
        };

        if (isEditing) {
          await api.put(`/api/convocatorias/recurrentes/${id}`, payload);
        } else {
          await api.post("/api/convocatorias/recurrentes", payload);
        }
      } else {
        // Single Convocatoria Flow
        const payload = {
          ...formData,
          fechaHora: formData.fechaHora + ":00",
          fechaLimiteInscripcion: formData.fechaLimiteInscripcion 
            ? formData.fechaLimiteInscripcion + ":00" 
            : null,
        };

        let createdId: number;
        if (isEditing) {
          const { data } = await api.put(`/api/convocatorias/${id}`, payload);
          createdId = data.id;
        } else {
          const { data } = await api.post("/api/convocatorias", payload);
          createdId = data.id;
        }

        // Process Invitations if Creating a new event
        if (!isEditing && createdId) {
          let userIdsToInvite: number[] = [];

          if (invitationMode === "GROUP" && selectedGrupoId) {
            const targetGrp = grupos.find(g => g.id === Number(selectedGrupoId));
            if (targetGrp && targetGrp.miembroIds) {
              userIdsToInvite = targetGrp.miembroIds;
            }
          } else if (invitationMode === "MANUAL" && selectedUserIds.length > 0) {
            userIdsToInvite = selectedUserIds;
          }

          if (userIdsToInvite.length > 0) {
            await api.post(`/api/convocatorias/${createdId}/asistencias/bulk`, userIdsToInvite);
          }
        }
      }

      navigate("/convocatorias");
    } catch (err: any) {
      console.error("Error al guardar", err);
      setError(err.response?.data?.message || "Error al guardar el registro");
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = usuarios.filter(u => 
    u.nombre.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl animate-fadeIn pb-12">
      <Button 
        variant="ghost" 
        onClick={() => navigate("/convocatorias")}
        className="hover:bg-muted font-bold gap-1 rounded-xl text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} /> Volver
      </Button>

      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary uppercase tracking-wider mb-2">
          <Settings size={12} />
          {isEditing ? "Modificación de Evento" : "Planificación Deportiva"}
        </div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">
          {isEditing ? "Editar Convocatoria" : "Nueva Convocatoria"}
        </h1>
        <p className="text-muted-foreground text-sm font-medium mt-0.5">
          {isEditing 
            ? "Edita los detalles de este evento o de su plantilla automatizada"
            : "Define un partido de fecha única o programa un ciclo recurrente automatizado"
          }
        </p>
      </div>

      {/* Single vs Recurrent Mode Selector (Only when creating) */}
      {!isEditing && (
        <div className="grid grid-cols-2 p-1.5 bg-muted rounded-2xl border border-border/80">
          <button
            type="button"
            onClick={() => setIsRecurrent(false)}
            className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              !isRecurrent
                ? "bg-background text-foreground shadow-sm scale-[1.02]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar size={14} />
            Partido Único
          </button>
          <button
            type="button"
            onClick={() => setIsRecurrent(true)}
            className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              isRecurrent
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Repeat size={14} />
            Ciclo Recurrente
          </button>
        </div>
      )}

      {/* Notice for Generated Single Convocatoria */}
      {isEditing && !isRecurrentRoute && formData.cupoMaximo > 0 && (
        <Card className="border border-border/50 bg-gradient-to-r from-muted/20 to-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h5 className="font-bold text-foreground text-xs">Instancia Individual</h5>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
                Estás editando una fecha única de juego. Si esta convocatoria es parte de una serie recurrente, tus cambios se aplicarán únicamente a este partido y no alterarán la plantilla general.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive" className="rounded-xl border border-destructive/25 bg-destructive/5 text-destructive p-4">
            <AlertDescription className="font-semibold text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <Card className="border border-border shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary to-purple-500" />
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-lg font-extrabold text-foreground">
              {isRecurrent ? "Información de la Plantilla Recurrente" : "Información del Partido Único"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="titulo" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Título del Evento</Label>
              <Input
                id="titulo"
                placeholder={isRecurrent ? "ej. Partidos REALES FC, Cancha Don Rafa" : "ej. Partido Amistoso - Leales"}
                value={isRecurrent ? recurrenteData.titulo : formData.titulo}
                onChange={(e) =>
                  isRecurrent 
                    ? setRecurrenteData({ ...recurrenteData, titulo: e.target.value })
                    : setFormData({ ...formData, titulo: e.target.value })
                }
                required
                className="rounded-xl"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="descripcion" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descripción / Notas de Juego</Label>
              <Input
                id="descripcion"
                placeholder="Detalles sobre el partido, vestimenta, comodidades, etc."
                value={isRecurrent ? recurrenteData.descripcion : formData.descripcion}
                onChange={(e) =>
                  isRecurrent 
                    ? setRecurrenteData({ ...recurrenteData, descripcion: e.target.value })
                    : setFormData({ ...formData, descripcion: e.target.value })
                }
                className="rounded-xl"
              />
            </div>

            {/* Sport & Category Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deporte" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Deporte</Label>
                <Select
                  value={String(isRecurrent ? recurrenteData.deporteId : formData.deporteId)}
                  onValueChange={(value) =>
                    isRecurrent
                      ? setRecurrenteData({ ...recurrenteData, deporteId: Number(value) })
                      : setFormData({ ...formData, deporteId: Number(value) })
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Seleccionar deporte" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {deportes.map((dep) => (
                      <SelectItem key={dep.id} value={String(dep.id)}>
                        {dep.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                  </Select>
                </div>

              <div className="space-y-2">
                <Label htmlFor="categoria" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categoría de Nivel</Label>
                <Input
                  id="categoria"
                  placeholder="ej. Libre, Competitivo, Recreativo"
                  value={isRecurrent ? recurrenteData.categoria : formData.categoria}
                  onChange={(e) =>
                    isRecurrent 
                      ? setRecurrenteData({ ...recurrenteData, categoria: e.target.value })
                      : setFormData({ ...formData, categoria: e.target.value })
                  }
                  className="rounded-xl"
                />
              </div>
            </div>

            {/* Venue & Capacity Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lugar" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lugar / Cancha</Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground/60">
                    <MapPin size={16} />
                  </span>
                  <Input
                    id="lugar"
                    placeholder="ej. Cancha Don Rafa, Piso 2"
                    value={isRecurrent ? recurrenteData.lugar : formData.lugar}
                    onChange={(e) =>
                      isRecurrent 
                        ? setRecurrenteData({ ...recurrenteData, lugar: e.target.value })
                        : setFormData({ ...formData, lugar: e.target.value })
                    }
                    className="pl-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cupoMaximo" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cupo Máximo de Jugadores (0 = Libre)</Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground/60">
                    <Users size={16} />
                  </span>
                  <Input
                    id="cupoMaximo"
                    type="number"
                    min="0"
                    placeholder="Cupo total permitido"
                    value={isRecurrent ? recurrenteData.cupoMaximo : formData.cupoMaximo}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      isRecurrent
                        ? setRecurrenteData({ ...recurrenteData, cupoMaximo: val })
                        : setFormData({ ...formData, cupoMaximo: val });
                    }}
                    className="pl-10 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* If Single: Render Date & Time Boundaries */}
            {!isRecurrent && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
                <div className="space-y-2">
                  <Label htmlFor="fechaDate" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fecha del Partido</Label>
                  <Input
                    id="fechaDate"
                    type="date"
                    value={formData.fechaHora ? formData.fechaHora.split("T")[0] : ""}
                    onChange={(e) => {
                      const date = e.target.value;
                      const time = formData.fechaHora?.split("T")[1] || "20:00";
                      const newFechaHora = date + "T" + time;
                      setFormData({ ...formData, fechaHora: newFechaHora, fechaLimiteInscripcion: newFechaHora });
                    }}
                    required
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechaTime" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hora del Partido</Label>
                  <Input
                    id="fechaTime"
                    type="time"
                    value={formData.fechaHora ? formData.fechaHora.split("T")[1] : ""}
                    onChange={(e) => {
                      const date = formData.fechaHora?.split("T")[0] || "";
                      const time = e.target.value;
                      const newFechaHora = date + "T" + time;
                      setFormData({ ...formData, fechaHora: newFechaHora, fechaLimiteInscripcion: newFechaHora });
                    }}
                    required
                    className="rounded-xl"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground font-medium sm:col-span-2 -mt-2">La convocatoria abre al crearse y cierra automáticamente a esta fecha/hora.</p>
              </div>
            )}

            {/* If Single: Excess Mode Selector & State */}
            {!isRecurrent && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="manejoExcedente" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Manejo de Excedentes (Cupo Lleno)</Label>
                  <Select
                    value={formData.manejoExcedente}
                    onValueChange={(value) =>
                      setFormData({ ...formData, manejoExcedente: value })
                    }
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="LISTA_ESPERA">Cola de Lista de Espera</SelectItem>
                      <SelectItem value="COMODIN">Comodín Neutral (Asistente general)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estado Inicial de la Convocatoria</Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value) =>
                      setFormData({ ...formData, estado: value })
                    }
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {ESTADOS.map((est) => (
                        <SelectItem key={est} value={est}>
                          {est}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* If Recurrent: Recurrence Rules Cards */}
        {isRecurrent && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recurrence Rule Card */}
            <Card className="border border-border shadow-md">
              <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center gap-2">
                <Repeat className="h-5 w-5 text-purple-600 animate-pulse" />
                <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                  Patrón y Programación
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Patrón de Repetición</Label>
                  <Select
                    value={recurrenteData.patron}
                    onValueChange={(value) =>
                      setRecurrenteData({ ...recurrenteData, patron: value })
                    }
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="SEMANAL">Semanal (1 o varios días a la semana)</SelectItem>
                      <SelectItem value="DIARIO">Diario (Todos los días del ciclo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Weekday Selector (Only for SEMANAL) */}
                {recurrenteData.patron === "SEMANAL" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Días de Repetición</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {DIAS_LIST.map((day) => {
                        const isSelected = recurrenteData.diasSemana.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => handleWeekdayToggle(day.value)}
                            className={`h-9 w-10 text-xs font-bold rounded-xl border flex items-center justify-center transition-all ${
                              isSelected
                                ? "bg-purple-600 border-purple-600 text-white shadow-sm shadow-purple-600/20 scale-105"
                                : "bg-card border-border hover:bg-muted text-muted-foreground"
                            }`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="horaEvento" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Apertura de la Convocatoria</Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground/60">
                        <Clock size={16} />
                      </span>
                      <Input
                        id="horaEvento"
                        type="time"
                        value={recurrenteData.horaEvento}
                        onChange={(e) =>
                          setRecurrenteData({ ...recurrenteData, horaEvento: e.target.value })
                        }
                        required
                        className="pl-10 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="horaPartido" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hora del Partido</Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground/60">
                        <Clock size={16} />
                      </span>
                      <Input
                        id="horaPartido"
                        type="time"
                        value={recurrenteData.horaPartido}
                        onChange={(e) =>
                          setRecurrenteData({ ...recurrenteData, horaPartido: e.target.value })
                        }
                        required
                        className="pl-10 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Recurrence Active Toggle */}
                <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border/50">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-extrabold text-foreground">Regla Activa</Label>
                    <p className="text-[10px] text-muted-foreground font-medium">Auto-genera partidos y pre-invita miembros automáticamente</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={recurrenteData.activo}
                    onChange={(e) => setRecurrenteData({ ...recurrenteData, activo: e.target.checked })}
                    className="h-5 w-5 accent-purple-600 cursor-pointer rounded"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Automatically Invite Group (Audience) */}
            <Card className="border border-border shadow-md">
              <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                  Invitar Automáticamente al Grupo
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Seleccionar Grupo Receptor</Label>
                  <Select
                    value={String(recurrenteData.grupoDestinoId)}
                    onValueChange={(value) =>
                      setRecurrenteData({ ...recurrenteData, grupoDestinoId: value })
                    }
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Seleccionar grupo receptor" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="0">Ninguno (Abierto a todos)</SelectItem>
                      {grupos.map((g) => (
                        <SelectItem key={g.id} value={String(g.id)}>
                          {g.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* If Single: Interactive Invitation Card */}
        {!isRecurrent && !isEditing && (
          <Card className="border border-border shadow-md overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-lg font-extrabold text-foreground">Invitaciones al Partido</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              {/* Invitation Mode selector */}
              <div className="grid grid-cols-3 gap-2">
                {(["NONE", "GROUP", "MANUAL"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setInvitationMode(mode)}
                    className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                      invitationMode === mode
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                        : "bg-card border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {mode === "NONE" && "Abierto (Sin Pre-invitados)"}
                    {mode === "GROUP" && "Invitar Grupo"}
                    {mode === "MANUAL" && "Jugadores Manuales"}
                  </button>
                ))}
              </div>

              {/* Group selection mode */}
              {invitationMode === "GROUP" && (
                <div className="space-y-2 animate-fadeIn">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Selecciona el Grupo Receptor</Label>
                  <Select value={selectedGrupoId} onValueChange={setSelectedGrupoId}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecciona el grupo de jugadores" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {grupos.map((g) => (
                        <SelectItem key={g.id} value={String(g.id)}>
                          {g.nombre} ({g.miembroIds?.length || 0} miembros)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Manual selection mode */}
              {invitationMode === "MANUAL" && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between gap-4">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Selecciona Jugadores ({selectedUserIds.length} seleccionados)
                    </Label>
                    <Input
                      placeholder="Buscar jugador..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="max-w-[200px] h-8 text-[11px] rounded-lg"
                    />
                  </div>

                  <div className="border border-border/60 rounded-2xl max-h-[220px] overflow-y-auto divide-y divide-border/40 p-1 bg-background/50">
                    {filteredUsers.map((u) => {
                      const isSelected = selectedUserIds.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => handleUserSelect(u.id)}
                          className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer hover:bg-muted/80 transition-all ${
                            isSelected ? "bg-indigo-500/5" : ""
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-foreground">{u.nombre}</span>
                            <span className="text-[10px] text-muted-foreground">{u.email}</span>
                          </div>
                          <div className={`h-5 w-5 rounded-lg border flex items-center justify-center transition-all ${
                            isSelected
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-border/80 bg-card"
                          }`}>
                            {isSelected && <Check size={12} />}
                          </div>
                        </div>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4 font-medium">No se encontraron jugadores</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-4 border-t border-border/50">
          <Button 
            type="submit" 
            disabled={saving} 
            className={`glow-btn font-bold rounded-xl px-6 py-2.5 ${isRecurrent ? "bg-purple-600 hover:bg-purple-700" : "bg-primary hover:bg-primary/95"}`}
          >
            {saving ? (
              <Spinner />
            ) : isEditing ? (
              "Guardar Cambios"
            ) : isRecurrent ? (
              "Programar Recurrencia"
            ) : (
              "Crear Convocatoria"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/convocatorias")}
            className="rounded-xl px-6 py-2.5 font-bold hover:bg-muted"
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}