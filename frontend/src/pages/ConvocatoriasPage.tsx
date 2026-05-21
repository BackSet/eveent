import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "@/services/api";
import { formatDateTime, formatTimeOnly } from "@/lib/formatDate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  Tag, 
  Trophy, 
  ArrowRight, 
  KanbanSquare,
  Repeat,
  Play,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  HelpCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Convocatoria, ConvocatoriaRecurrente } from "@/types";

const estadoColors: Record<string, "default" | "secondary" | "destructive" | "success" | "warning" | "info"> = {
  BORRADOR: "secondary",
  ABIERTA: "success",
  CERRADA: "secondary",
  CANCELADA: "destructive",
};

const ESTADOS = ["TODOS", "BORRADOR", "ABIERTA", "CERRADA", "CANCELADA"];

const DIAS_TRADUCCION: Record<string, string> = {
  MONDAY: "Lunes",
  TUESDAY: "Martes",
  WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves",
  FRIDAY: "Viernes",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo"
};

export default function ConvocatoriasPage() {
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [recurrentes, setRecurrentes] = useState<ConvocatoriaRecurrente[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecurrentes, setLoadingRecurrentes] = useState(false);
  const [estadoFilter, setEstadoFilter] = useState("TODOS");
  const [activeTab, setActiveTab] = useState<"PARTIDOS" | "PLANTILLAS">("PARTIDOS");
  const [schedulerMessage, setSchedulerMessage] = useState("");
  const [runningScheduler, setRunningScheduler] = useState(false);
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();

  const isOrganizer = hasPermission("crear_convocatoria");

  const handleDeleteConvocatoria = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm("¿Estás seguro de que deseas eliminar esta convocatoria?")) return;
    try {
      await api.delete(`/api/convocatorias/${id}`);
      fetchConvocatorias();
    } catch (err: any) {
      console.error("Error al eliminar convocatoria", err);
    }
  };

  const fetchConvocatorias = useCallback(async () => {
    try {
      const url = estadoFilter === "TODOS"
        ? "/api/convocatorias"
        : `/api/convocatorias?estado=${estadoFilter}`;
      const { data } = await api.get(url);
      setConvocatorias(data);
    } catch (err) {
      console.error("Error al cargar convocatorias", err);
    } finally {
      setLoading(false);
    }
  }, [estadoFilter]);

  const fetchRecurrentes = useCallback(async () => {
    setLoadingRecurrentes(true);
    try {
      const { data } = await api.get("/api/convocatorias/recurrentes");
      setRecurrentes(data);
    } catch (err) {
      console.error("Error al cargar recurrentes", err);
    } finally {
      setLoadingRecurrentes(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "PARTIDOS") {
      fetchConvocatorias();
    } else {
      fetchRecurrentes();
    }
  }, [activeTab, fetchConvocatorias, fetchRecurrentes]);

  const handleForceScheduler = async () => {
    setRunningScheduler(true);
    setSchedulerMessage("");
    try {
      await api.post("/api/convocatorias/recurrentes/generar");
      setSchedulerMessage("¡Planificador ejecutado con éxito! Se han auto-generado los próximos eventos y pre-invitado a los miembros.");
      setTimeout(() => setSchedulerMessage(""), 6000);
      if (activeTab === "PARTIDOS") {
        fetchConvocatorias();
      }
    } catch (err: any) {
      console.error("Error al ejecutar scheduler", err);
      setSchedulerMessage("Error al ejecutar planificador: " + (err.response?.data?.message || err.message));
    } finally {
      setRunningScheduler(false);
    }
  };

  const handleDeleteRecurrencia = async (id: number) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta regla recurrente? Las convocatorias individuales ya generadas permanecerán.")) return;
    try {
      await api.delete(`/api/convocatorias/recurrentes/${id}`);
      fetchRecurrentes();
    } catch (err) {
      console.error("Error al eliminar recurrencia", err);
    }
  };

  const formatearDiasSemana = (diasStr: string) => {
    if (!diasStr) return "";
    return diasStr.split(",").map(d => DIAS_TRADUCCION[d.trim()] || d).join(", ");
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card/45 backdrop-blur-md p-6 rounded-3xl border border-border/80 shadow-md">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary uppercase tracking-wider mb-2">
            <Trophy size={12} />
            Eventos Planificados
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Gestión de Convocatorias</h1>
          <p className="text-muted-foreground text-sm font-medium mt-0.5">
            Organiza partidos individuales o programa ciclos repetitivos y convocatorias automáticas
          </p>
        </div>
        
        {/* Actions bar */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
          {activeTab === "PARTIDOS" && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider hidden sm:inline">Filtrar:</span>
              <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger className="w-[160px] rounded-xl border border-border shadow-sm bg-background/50 text-sm font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {ESTADOS.map((est) => (
                    <SelectItem key={est} value={est} className="font-medium">
                      {est === "TODOS" ? "Todos los estados" : est}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isOrganizer && activeTab === "PLANTILLAS" && (
            <Button
              onClick={handleForceScheduler}
              disabled={runningScheduler}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md shadow-purple-600/10 gap-2 text-xs py-2"
            >
              {runningScheduler ? <Spinner size="sm" /> : <Play size={14} />}
              <span>Ejecutar Planificador (Scheduler)</span>
            </Button>
          )}
          
          {user && isOrganizer && (
            <Link to={activeTab === "PLANTILLAS" ? "/convocatorias/recurrentes/new" : "/convocatorias/new"}>
              <Button className="glow-btn flex items-center gap-2 rounded-xl text-xs py-2">
                <Plus size={16} />
                <span>{activeTab === "PLANTILLAS" ? "Nueva Plantilla" : "Nueva Convocatoria"}</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Scheduler Alert Message */}
      {schedulerMessage && (
        <div className={`p-4 rounded-2xl border text-sm font-medium flex items-center gap-2.5 animate-bounce-slow ${
          schedulerMessage.includes("Error")
            ? "bg-destructive/10 border-destructive/25 text-destructive"
            : "bg-green-500/10 border-green-500/25 text-green-600 dark:text-green-400"
        }`}>
          {schedulerMessage.includes("Error") ? <XCircle size={18} /> : <CheckCircle size={18} />}
          <span>{schedulerMessage}</span>
        </div>
      )}

      {/* Tab Switcher (Organizers only) */}
      {isOrganizer && (
        <div className="flex gap-2 p-1 bg-muted rounded-2xl w-fit border border-border/60">
          <button
            onClick={() => setActiveTab("PARTIDOS")}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
              activeTab === "PARTIDOS"
                ? "bg-background text-foreground shadow-sm scale-102"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar size={14} />
            Partidos Planificados
          </button>
          <button
            onClick={() => setActiveTab("PLANTILLAS")}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
              activeTab === "PLANTILLAS"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/10 scale-102"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Repeat size={14} />
            Programaciones Recurrentes
          </button>
        </div>
      )}

      {/* Matches Grid List */}
      {activeTab === "PARTIDOS" ? (
        loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {convocatorias.map((conv) => (
              <div
                key={conv.id}
                onClick={() => navigate(`/convocatorias/${conv.id}`)}
                className="cursor-pointer group h-full block"
              >
                <Card className="h-full flex flex-col justify-between hover:scale-[1.02] hover:-translate-y-1 hover:border-primary/45 transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-transparent group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-purple-500 transition-all duration-300" />
                  
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-xl">
                        {conv.deporteNombre}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {conv.recurrenciaId && (
                          <Badge variant="outline" className="bg-purple-500/5 text-purple-600 border-purple-500/25 px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase flex items-center gap-0.5">
                            <Repeat size={8} /> Recurrente
                          </Badge>
                        )}
                        <Badge variant={estadoColors[conv.estado] || "default"} className="font-bold rounded-lg px-2.5 py-0.5 text-[9px] tracking-wide uppercase">
                          {conv.estado}
                        </Badge>
                      </div>
                    </div>
                    
                    <CardTitle className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {conv.titulo}
                    </CardTitle>
                    
                    <div className="flex gap-3 items-center text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1">
                      {conv.categoria && (
                        <span className="flex items-center gap-1">
                          <Tag size={12} className="text-primary/70" />
                          {conv.categoria}
                        </span>
                      )}
                      {conv.cupoMaximo !== undefined && conv.cupoMaximo > 0 && (
                        <span className="flex items-center gap-1">
                          <Users size={12} className="text-primary/70" />
                          Cupo: {conv.cupoMaximo}
                        </span>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    {conv.descripcion && (
                      <p className="text-xs font-medium text-muted-foreground line-clamp-2 leading-relaxed">
                        {conv.descripcion}
                      </p>
                    )}
                    
                    <div className="space-y-2.5 text-xs border-t border-border/40 pt-3">
                      <div className="flex items-center gap-2.5 text-muted-foreground font-medium">
                        <Calendar size={14} className="text-primary/70" />
                        <span>
                          {formatDateTime(conv.fechaHora)}
                        </span>
                      </div>
                      {conv.lugar && (
                        <div className="flex items-center gap-2.5 text-muted-foreground font-medium">
                          <MapPin size={14} className="text-primary/70" />
                          <span className="truncate">{conv.lugar}</span>
                        </div>
                      )}
                      {conv.fechaLimiteInscripcion && (
                        <div className="flex items-center gap-2.5 text-destructive/80 font-bold">
                          <Clock size={14} className="text-destructive/70" />
                          <span>
                            Límite: {formatDateTime(conv.fechaLimiteInscripcion)}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <div className="px-6 pb-4 pt-2 flex items-center justify-between border-t border-border/30 text-xs font-bold text-muted-foreground group-hover:text-primary transition-all">
                    <span className="truncate">Org: {conv.creadoPorNombre}</span>
                    <div className="flex items-center gap-2">
                      {isOrganizer && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteConvocatoria(e, conv.id)}
                          className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg"
                        >
                          <Trash2 size={12} className="mr-1" /> Eliminar
                        </Button>
                      )}
                      <span className="inline-flex items-center gap-1">
                        Ver Detalles
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
            
            {convocatorias.length === 0 && (
              <Card className="col-span-full border-dashed border-2 py-16 bg-muted/5 flex flex-col items-center justify-center text-center">
                <CardContent className="space-y-4">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
                    <KanbanSquare size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">No hay convocatorias registradas</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Actualmente no existen convocatorias en este estado. ¡Sé el primero en planificar un partido!
                  </p>
                  {user && (
                    <Link to="/convocatorias/new" className="inline-block mt-2">
                      <Button size="sm">
                        <Plus size={14} className="mr-1" />
                        Crear Convocatoria
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )
      ) : (
        /* Recurrent templates list */
        loadingRecurrentes ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recurrentes.map((rec) => (
              <Card key={rec.id} className="flex flex-col justify-between hover:border-purple-500/40 border border-border shadow-md transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-purple-600" />
                
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest bg-purple-500/5 border border-purple-500/20 px-2.5 py-1 rounded-xl">
                      {rec.deporteNombre}
                    </span>
                    <Badge variant={rec.activo ? "success" : "secondary"} className="font-bold rounded-lg px-2 py-0.5 text-[9px] tracking-wide uppercase">
                      {rec.activo ? "Activo" : "Pausado"}
                    </Badge>
                  </div>
                  
                  <CardTitle className="text-lg font-bold text-foreground line-clamp-1">
                    {rec.titulo}
                  </CardTitle>

                  <div className="flex flex-wrap gap-2 pt-1.5">
                    <span className="text-[9px] font-black uppercase text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <Repeat size={10} /> {rec.patron}
                    </span>
                    {rec.grupoDestinoNombre && (
                      <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <Users size={10} /> {rec.grupoDestinoNombre}
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  {rec.descripcion && (
                    <p className="text-xs font-medium text-muted-foreground line-clamp-2 leading-relaxed">
                      {rec.descripcion}
                    </p>
                  )}
                  
                  <div className="space-y-2 text-xs border-t border-border/40 pt-3">
                    <div className="flex items-start gap-2.5 text-muted-foreground font-medium">
                      <Calendar size={14} className="text-purple-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Días de repetición:</span>
                        <p className="text-xs text-foreground mt-0.5">{formatearDiasSemana(rec.diasSemana)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 text-muted-foreground font-medium">
                      <Clock size={14} className="text-purple-600" />
                      <span>
                        <span className="font-bold">Apertura:</span> {formatTimeOnly(rec.horaEvento)}h
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 text-muted-foreground font-medium">
                      <Clock size={14} className="text-purple-600" />
                      <span>
                        <span className="font-bold">Partido:</span> {formatTimeOnly(rec.horaPartido)}h
                      </span>
                    </div>

                    {rec.lugar && (
                      <div className="flex items-center gap-2.5 text-muted-foreground font-medium">
                        <MapPin size={14} className="text-purple-600" />
                        <span className="truncate">
                          <span className="font-bold">Lugar:</span> {rec.lugar}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>

                <div className="px-6 pb-4 pt-3 flex items-center justify-end border-t border-border/30 gap-2">
                  <Link to={`/convocatorias/recurrentes/${rec.id}/edit`}>
                    <Button variant="outline" size="sm" className="h-8 rounded-xl px-3 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60">
                      <Edit size={12} className="mr-1" /> Editar
                    </Button>
                  </Link>
                  <Button
                    onClick={() => handleDeleteRecurrencia(rec.id)}
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-xl px-3 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={12} className="mr-1" /> Eliminar
                  </Button>
                </div>
              </Card>
            ))}

            {recurrentes.length === 0 && (
              <Card className="col-span-full border-dashed border-2 py-16 bg-muted/5 flex flex-col items-center justify-center text-center">
                <CardContent className="space-y-4">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
                    <Repeat size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">No hay programaciones recurrentes</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    No has programado ninguna repetición semanal o diaria para auto-generar convocatorias de juego.
                  </p>
                  <Link to="/convocatorias/recurrentes/new" className="inline-block mt-2">
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                      <Plus size={14} className="mr-1" />
                      Nueva Programación
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        )
      )}
    </div>
  );
}