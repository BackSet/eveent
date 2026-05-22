import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "@/services/api";
import { formatDateTime } from "@/lib/formatDate";
import { ESTADO_COLORS, CONVOCATORIA_ESTADO_COLORS, ESTADO_LABELS, getApiErrorMessage } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar, MapPin, Users, Clock, Tag, ArrowRight, Repeat, Play, Trash2, Edit, CheckCircle, XCircle, KanbanSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Convocatoria, ConfiguracionRecurrente } from "@/types";

const ESTADOS = ["TODOS", "BORRADOR", "ABIERTA", "EN_PROGRESO", "FINALIZADA", "CANCELADA"];

export default function ConvocatoriasPage() {
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [recurrentes, setRecurrentes] = useState<ConfiguracionRecurrente[]>([]);
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
    if (!confirm("¿Eliminar esta convocatoria?")) return;
    try {
      await api.delete(`/api/convocatorias/${id}`);
      fetchConvocatorias();
    } catch (err: unknown) {
      console.error("Error al eliminar convocatoria", err);
    }
  };

  const handleAbrir = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await api.put(`/api/convocatorias/${id}/abrir`);
      fetchConvocatorias();
    } catch (err: unknown) {
      console.error("Error al abrir convocatoria", err);
    }
  };

  const handleCancelar = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm("¿Cancelar esta convocatoria?")) return;
    try {
      await api.put(`/api/convocatorias/${id}/cancelar`);
      fetchConvocatorias();
    } catch (err: unknown) {
      console.error("Error al cancelar convocatoria", err);
    }
  };

  const fetchConvocatorias = useCallback(async () => {
    try {
      const url = estadoFilter === "TODOS" ? "/api/convocatorias" : `/api/convocatorias?estado=${estadoFilter}`;
      const { data } = await api.get(url);
      const filtered = isOrganizer ? data : data.filter((c: Convocatoria) => c.estado !== "BORRADOR");
      setConvocatorias(filtered);
    } catch (err) {
      console.error("Error al cargar convocatorias", err);
    } finally {
      setLoading(false);
    }
  }, [estadoFilter, isOrganizer]);

  const fetchRecurrentes = useCallback(async () => {
    setLoadingRecurrentes(true);
    try {
      const { data } = await api.get("/api/configuraciones-recurrentes");
      setRecurrentes(data);
    } catch (err) {
      console.error("Error al cargar recurrentes", err);
    } finally {
      setLoadingRecurrentes(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "PARTIDOS") { fetchConvocatorias(); } else { fetchRecurrentes(); }
  }, [activeTab, fetchConvocatorias, fetchRecurrentes]);

  const handleForceScheduler = async () => {
    setRunningScheduler(true);
    setSchedulerMessage("");
    try {
      await api.post("/api/convocatorias/recurrentes/generar");
      setSchedulerMessage("Planificador ejecutado con éxito.");
      setTimeout(() => setSchedulerMessage(""), 5000);
      if (activeTab === "PARTIDOS") fetchConvocatorias();
    } catch (err: unknown) {
      setSchedulerMessage("Error: " + getApiErrorMessage(err));
    } finally {
      setRunningScheduler(false);
    }
  };

  const handleDeleteRecurrencia = async (id: number) => {
    if (!confirm("¿Eliminar esta regla recurrente?")) return;
    try {
      await api.delete(`/api/convocatorias/recurrentes/${id}`);
      fetchRecurrentes();
    } catch (err) { console.error("Error", err); }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Convocatorias</h1>
          <p className="text-muted-foreground text-sm">Organiza partidos y programa ciclos automáticos</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "PARTIDOS" && (
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="w-[150px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ESTADOS.filter((est) => isOrganizer || est !== "BORRADOR").map((est) => (
                  <SelectItem key={est} value={est}>{est === "TODOS" ? "Todos" : ESTADO_LABELS[est] ?? est}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {isOrganizer && activeTab === "PLANTILLAS" && (
            <Button onClick={handleForceScheduler} disabled={runningScheduler} variant="outline" className="gap-1.5 text-xs font-medium">
              {runningScheduler ? <Spinner size="sm" /> : <Play size={13} />}
              Ejecutar Planificador
            </Button>
          )}
          {user && isOrganizer && (
            <Link to={activeTab === "PLANTILLAS" ? "/convocatorias/recurrentes/new" : "/convocatorias/new"}>
              <Button className="gap-1.5 font-semibold text-sm">
                <Plus size={15} />
                {activeTab === "PLANTILLAS" ? "Nueva Plantilla" : "Nueva Convocatoria"}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {schedulerMessage && (
        <div className={`p-3 rounded-lg border text-sm font-medium flex items-center gap-2 ${
          schedulerMessage.includes("Error") ? "bg-destructive/5 border-destructive/15 text-destructive" : "bg-green-500/5 border-green-500/15 text-green-600"
        }`}>
          {schedulerMessage.includes("Error") ? <XCircle size={15} /> : <CheckCircle size={15} />}
          {schedulerMessage}
        </div>
      )}

      {isOrganizer && (
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          <button onClick={() => setActiveTab("PARTIDOS")} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === "PARTIDOS" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <Calendar size={13} className="inline mr-1.5" />Partidos
          </button>
          <button onClick={() => setActiveTab("PLANTILLAS")} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === "PLANTILLAS" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <Repeat size={13} className="inline mr-1.5" />Recurrentes
          </button>
        </div>
      )}

      {activeTab === "PARTIDOS" ? (
        loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {convocatorias.map((conv) => (
              <div key={conv.id} onClick={() => navigate(`/convocatorias/${conv.id}`)} className="cursor-pointer group">
                <Card className="h-full flex flex-col justify-between hover:border-primary/30 transition-colors group">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                        {conv.deporteNombre}
                      </span>
                      <div className="flex items-center gap-1">
                        {conv.configuracionRecurrenteId && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 uppercase">
                            <Repeat size={8} className="mr-0.5" />Rec.
                          </Badge>
                        )}
                        <Badge variant={CONVOCATORIA_ESTADO_COLORS[conv.estado] || "default"} className="text-[9px] px-1.5 py-0 uppercase">
                          {conv.estado}
                        </Badge>
                      </div>
                    </div>
                    <CardTitle className="text-sm font-semibold group-hover:text-primary transition-colors line-clamp-1">
                      {conv.titulo}
                    </CardTitle>
                    <div className="flex gap-2 items-center text-[10px] text-muted-foreground font-medium">
                      {conv.categoria && <span className="flex items-center gap-0.5"><Tag size={10} />{conv.categoria}</span>}
                      {conv.cupoMaximo != null && conv.cupoMaximo > 0 && <span className="flex items-center gap-0.5"><Users size={10} />{conv.cupoMaximo}</span>}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2 pt-0">
                    {conv.descripcion && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{conv.descripcion}</p>
                    )}
                    <div className="space-y-1 text-xs text-muted-foreground border-t pt-2">
                      <div className="flex items-center gap-1.5"><Calendar size={12} />{formatDateTime(conv.fechaHora ?? null)}</div>
                      {conv.lugar && <div className="flex items-center gap-1.5"><MapPin size={12} /><span className="truncate">{conv.lugar}</span></div>}
                      {conv.fechaLimiteInscripcion && <div className="flex items-center gap-1.5 text-destructive"><Clock size={12} />Límite: {formatDateTime(conv.fechaLimiteInscripcion)}</div>}
                    </div>
                  </CardContent>

                  <div className="px-6 pb-3 pt-1 flex items-center justify-between border-t text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
                    <span className="truncate">{conv.creadoPorNombre}</span>
                    <div className="flex items-center gap-2">
                      {isOrganizer && conv.estado === "BORRADOR" && (
                        <button onClick={(e) => handleAbrir(e, conv.id)} className="text-green-600 hover:underline" title="Abrir convocatoria">
                          <CheckCircle size={12} />
                        </button>
                      )}
                      {isOrganizer && conv.estado !== "CANCELADA" && conv.estado !== "FINALIZADA" && (
                        <button onClick={(e) => handleCancelar(e, conv.id)} className="text-destructive hover:underline" title="Cancelar convocatoria">
                          <XCircle size={12} />
                        </button>
                      )}
                      {isOrganizer && conv.estado === "BORRADOR" && (
                        <button onClick={(e) => handleDeleteConvocatoria(e, conv.id)} className="text-destructive hover:underline" title="Eliminar">
                          <Trash2 size={12} />
                        </button>
                      )}
                      <span className="inline-flex items-center gap-0.5">
                        Ver <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
            
            {convocatorias.length === 0 && (
              <div className="col-span-full text-center py-16 border border-dashed rounded-lg">
                <KanbanSquare size={24} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Sin convocatorias</p>
              </div>
            )}
          </div>
        )
      ) : (
        loadingRecurrentes ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recurrentes.map((rec) => (
              <Card key={rec.id} className="hover:border-primary/30 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">{rec.deporteNombre}</span>
                    <Badge variant={rec.activo ? "success" : "secondary"} className="text-[9px] px-1.5 py-0 uppercase">
                      {rec.activo ? "Activo" : "Pausado"}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-semibold line-clamp-1">{rec.titulo}</CardTitle>
                  <div className="flex gap-1.5">
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 uppercase"><Repeat size={9} className="mr-0.5" />{rec.rruleExpression}</Badge>
                    {rec.grupoDestinoNombre && <Badge variant="outline" className="text-[9px] px-1.5 py-0 uppercase">{rec.grupoDestinoNombre}</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-1.5 text-xs text-muted-foreground border-t pt-3">
                  <div><span className="font-medium">Regla:</span> {rec.rruleExpression}</div>
                  {rec.horariosPorDia && Object.keys(rec.horariosPorDia).length > 0 && (
                    <div><span className="font-medium">Horarios:</span> {Object.entries(rec.horariosPorDia).map(([day, h]) => `${day}: ${h.horaEvento ?? "—"} (${h.duracionMinutos ?? "—"} min)`).join(", ")}</div>
                  )}
                  {rec.lugar && <div><span className="font-medium">Lugar:</span> {rec.lugar}</div>}
                </CardContent>
                <div className="px-6 pb-3 pt-1 flex items-center justify-end border-t gap-1.5">
                  <Link to={`/convocatorias/recurrentes/${rec.id}/edit`}>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-medium gap-1"><Edit size={11} />Editar</Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteRecurrencia(rec.id)} className="h-7 px-2 text-xs font-medium text-destructive hover:text-destructive gap-1">
                    <Trash2 size={11} />Eliminar
                  </Button>
                </div>
              </Card>
            ))}
            {recurrentes.length === 0 && (
              <div className="col-span-full text-center py-16 border border-dashed rounded-lg">
                <Repeat size={24} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Sin programaciones recurrentes</p>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
