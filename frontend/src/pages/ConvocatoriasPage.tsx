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
import { Plus, Calendar, MapPin, Users, Clock, Tag, ArrowRight, Repeat, Play, Trash2, Edit, CheckCircle, XCircle, KanbanSquare, Search, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Convocatoria, ConfiguracionRecurrente } from "@/types";
import { humanizeRRule } from "@/lib/rruleHumanizer";

const ESTADOS = ["TODOS", "BORRADOR", "ABIERTA", "EN_PROGRESO", "FINALIZADA", "CANCELADA"];

export default function ConvocatoriasPage() {
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [recurrentes, setRecurrentes] = useState<ConfiguracionRecurrente[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecurrentes, setLoadingRecurrentes] = useState(false);
  const [estadoFilter, setEstadoFilter] = useState("TODOS");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"CONVOCATORIAS" | "PLANTILLAS">("CONVOCATORIAS");
  const [schedulerMessage, setSchedulerMessage] = useState("");
  const [runningScheduler, setRunningScheduler] = useState(false);
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();

  const isOrganizer = hasPermission("crear_convocatoria");

  const getSportEmoji = (deporteNombre?: string) => {
    if (!deporteNombre) return "🏆";
    const name = deporteNombre.toLowerCase();
    if (name.includes("futbol") || name.includes("fútbol") || name.includes("soccer")) return "⚽";
    if (name.includes("basquet") || name.includes("básquet") || name.includes("basketball") || name.includes("baloncesto")) return "🏀";
    if (name.includes("tenis") || name.includes("tennis")) return "🎾";
    if (name.includes("voley") || name.includes("voleibol") || name.includes("volleyball")) return "🏐";
    if (name.includes("running") || name.includes("correr")) return "🏃";
    return "🏆";
  };

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

  const handleToggleActivoRecurrente = async (e: React.MouseEvent, id: number, currentActivo: boolean) => {
    e.stopPropagation();
    try {
      await api.put(`/api/configuraciones-recurrentes/${id}`, { activo: !currentActivo });
      fetchRecurrentes();
    } catch (err: unknown) {
      console.error("Error al cambiar estado de la regla", err);
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
    fetchConvocatorias();
    if (isOrganizer) {
      fetchRecurrentes();
    }
  }, [fetchConvocatorias, fetchRecurrentes, isOrganizer]);



  const handleDeleteRecurrencia = async (id: number) => {
    if (!confirm("¿Eliminar esta regla recurrente?")) return;
    try {
      await api.delete(`/api/convocatorias/recurrentes/${id}`);
      fetchRecurrentes();
    } catch (err) { console.error("Error", err); }
  };

  // Filter convocatorias/recurrentes locally based on search query
  const filteredConvocatorias = convocatorias.filter(conv =>
    conv.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (conv.lugar || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (conv.deporteNombre || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRecurrentes = recurrentes.filter(rec =>
    rec.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (rec.lugar || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (rec.deporteNombre || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto notion-animate-fade pb-12 px-4 sm:px-6">
      {/* Cover / Header section */}
      <div className="relative rounded-lg overflow-hidden border border-border bg-muted/30">
        <div className="h-28 notion-cover notion-cover-sports" />
        <div className="p-6 relative pt-10">
          <div className="absolute top-[-36px] left-6 text-5xl bg-background p-2 rounded-xl border border-border/80 shadow-sm select-none">
            📅
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Convocatorias</h1>
            <p className="text-muted-foreground text-xs mt-1">Base de datos de convocatorias programadas y configuraciones recurrentes en el workspace.</p>
          </div>
        </div>
      </div>

      {schedulerMessage && (
        <div className={`notion-callout ${
          schedulerMessage.includes("Error") ? "border-destructive bg-destructive/5 text-destructive" : "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
        }`}>
          <div className="notion-callout-icon">
            {schedulerMessage.includes("Error") ? <XCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
          </div>
          <div className="text-sm font-medium">{schedulerMessage}</div>
        </div>
      )}

      {/* Notion Database Toolbar & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Database tabs */}
        <div className="flex notion-db-header border-none m-0 p-0">
          <button
            onClick={() => { setActiveTab("CONVOCATORIAS"); setSearchQuery(""); }}
            className={`notion-db-header-item px-3 py-1.5 text-xs font-semibold ${activeTab === "CONVOCATORIAS" ? "active" : ""}`}
          >
            <Calendar size={13} className="opacity-70" />
            <span>Todas las Convocatorias</span>
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded-full font-medium ml-1">
              {convocatorias.length}
            </span>
          </button>
          
          {isOrganizer && (
            <button
              onClick={() => { setActiveTab("PLANTILLAS"); setSearchQuery(""); }}
              className={`notion-db-header-item px-3 py-1.5 text-xs font-semibold ${activeTab === "PLANTILLAS" ? "active" : ""}`}
            >
              <Repeat size={13} className="opacity-70" />
              <span>Reglas Recurrentes</span>
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded-full font-medium ml-1">
                {recurrentes.length}
              </span>
            </button>
          )}
        </div>

        {/* Database filters / search & actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/70" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 h-9 w-[180px] sm:w-[220px] rounded-md border border-border bg-background text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {activeTab === "CONVOCATORIAS" && (
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="w-[125px] h-9 text-xs font-medium border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ESTADOS.filter((est) => isOrganizer || est !== "BORRADOR").map((est) => (
                  <SelectItem key={est} value={est} className="text-xs">{est === "TODOS" ? "Todos" : ESTADO_LABELS[est] ?? est}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          

          
          {user && isOrganizer && (
            <Link to={activeTab === "PLANTILLAS" ? "/convocatorias/recurrentes/new" : "/convocatorias/new"}>
              <Button className="h-9 px-3 gap-1.5 font-medium text-xs rounded-md shadow-none bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus size={14} />
                <span>{activeTab === "PLANTILLAS" ? "Plantilla" : "Convocatoria"}</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Main Database Content Grid/List */}
      {activeTab === "CONVOCATORIAS" ? (
        loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            {/* Database header row */}
            <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 border-b border-border bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
              <div className="col-span-5 flex items-center gap-2">Título / Convocatoria</div>
              <div className="col-span-2">Deporte / Categoría</div>
              <div className="col-span-3">Fecha y Lugar</div>
              <div className="col-span-2 text-right">Estado / Acciones</div>
            </div>

            {/* Database Rows */}
            <div className="divide-y divide-border/80">
              {filteredConvocatorias.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => navigate(`/convocatorias/${conv.id}`)}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 items-center px-4 py-3.5 hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  {/* Title & Emojis */}
                  <div className="col-span-1 md:col-span-5 flex items-start gap-3">
                    <span className="text-2xl shrink-0 select-none mt-0.5" role="img" aria-label="sport-emoji">
                      {getSportEmoji(conv.deporteNombre)}
                    </span>
                    <div className="space-y-0.5">
                      <div className="text-sm font-semibold text-foreground group-hover:text-primary group-hover:underline decoration-1 underline-offset-2 transition-colors">
                        {conv.titulo}
                      </div>
                      {conv.descripcion && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{conv.descripcion}</p>
                      )}
                    </div>
                  </div>

                  {/* Sport & Category Tags */}
                  <div className="col-span-1 md:col-span-2 flex flex-wrap gap-1.5">
                    <span className="text-[10px] font-medium text-foreground bg-secondary px-2 py-0.5 rounded border border-border uppercase">
                      {conv.deporteNombre}
                    </span>
                    {conv.categoria && (
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border">
                        {conv.categoria}
                      </span>
                    )}
                  </div>

                  {/* Location & Date details */}
                  <div className="col-span-1 md:col-span-3 space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="opacity-70 shrink-0" />
                      <span>{formatDateTime(conv.fechaHora ?? null)}</span>
                    </div>
                    {conv.lugar && (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="opacity-70 shrink-0" />
                        <span className="truncate max-w-[200px]">{conv.lugar}</span>
                      </div>
                    )}
                  </div>

                  {/* Badges & Actions */}
                  <div className="col-span-1 md:col-span-2 flex items-center justify-between md:justify-end gap-2 md:text-right">
                    <div className="flex items-center gap-1.5">
                      {conv.configuracionRecurrenteId && (
                        <Badge variant="outline" className="text-[8px] bg-sky-50 dark:bg-sky-950/20 text-sky-600 border-sky-200 dark:border-sky-800/40 px-1 py-0 uppercase">
                          <Repeat size={8} className="mr-0.5" />Rec.
                        </Badge>
                      )}
                      <Badge variant={CONVOCATORIA_ESTADO_COLORS[conv.estado] || "default"} className="text-[9px] px-1.5 py-0.5 uppercase tracking-wide">
                        {ESTADO_LABELS[conv.estado] || conv.estado}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1">
                      {isOrganizer && conv.estado === "BORRADOR" && (
                        <button
                          onClick={(e) => handleAbrir(e, conv.id)}
                          className="h-7 w-7 flex items-center justify-center rounded hover:bg-green-500/10 text-green-600 hover:text-green-700 transition-colors"
                          title="Abrir convocatoria"
                        >
                          <CheckCircle size={13} />
                        </button>
                      )}
                      {isOrganizer && conv.estado !== "CANCELADA" && conv.estado !== "FINALIZADA" && (
                        <button
                          onClick={(e) => handleCancelar(e, conv.id)}
                          className="h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/10 text-destructive transition-colors"
                          title="Cancelar convocatoria"
                        >
                          <XCircle size={13} />
                        </button>
                      )}
                      {isOrganizer && conv.estado === "BORRADOR" && (
                        <button
                          onClick={(e) => handleDeleteConvocatoria(e, conv.id)}
                          className="h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/10 text-destructive transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                      <div className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground group-hover:text-primary transition-colors">
                        <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {filteredConvocatorias.length === 0 && (
                <div className="text-center py-16 select-none bg-muted/5">
                  <KanbanSquare size={26} className="mx-auto text-muted-foreground/60 mb-2.5" />
                  <p className="text-xs text-muted-foreground font-medium">Ninguna convocatoria coincide con la búsqueda</p>
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        loadingRecurrentes ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            {/* Database header row */}
            <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 border-b border-border bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
              <div className="col-span-5 flex items-center gap-2">Regla Recurrente</div>
              <div className="col-span-2">Deporte</div>
              <div className="col-span-3">Frecuencia / Lugar</div>
              <div className="col-span-2 text-right">Estado / Acciones</div>
            </div>

            {/* Database Rows */}
            <div className="divide-y divide-border/80">
              {filteredRecurrentes.map((rec) => (
                <div
                  key={rec.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 items-center px-4 py-3.5 hover:bg-muted/40 transition-colors"
                >
                  {/* Title & Emojis */}
                  <div className="col-span-1 md:col-span-5 flex items-start gap-3">
                    <span className="text-2xl shrink-0 select-none mt-0.5" role="img" aria-label="sport-emoji">
                      {getSportEmoji(rec.deporteNombre)}
                    </span>
                    <div className="space-y-0.5">
                      <div className="text-sm font-semibold text-foreground">
                        {rec.titulo}
                      </div>
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        {rec.grupoDestinoNombre && (
                          <span className="text-muted-foreground bg-muted/50 border border-border px-1.5 py-0.2 rounded font-semibold uppercase">
                            {rec.grupoDestinoNombre}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sport Tag */}
                  <div className="col-span-1 md:col-span-2">
                    <span className="text-[10px] font-medium text-foreground bg-secondary px-2 py-0.5 rounded border border-border uppercase">
                      {rec.deporteNombre}
                    </span>
                  </div>

                  {/* Frequency & Location details */}
                  <div className="col-span-1 md:col-span-3 space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Repeat size={12} className="opacity-70 shrink-0" />
                      <span className="font-semibold">{humanizeRRule(rec.rruleExpression)}</span>
                    </div>
                    {rec.lugar && (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="opacity-70 shrink-0" />
                        <span className="truncate max-w-[200px]">{rec.lugar}</span>
                      </div>
                    )}
                  </div>

                  {/* Badges & Actions */}
                  <div className="col-span-1 md:col-span-2 flex items-center justify-between md:justify-end gap-2 md:text-right">
                    <Badge variant={rec.activo ? "success" : "default"} className="text-[9px] px-1.5 py-0.5 uppercase tracking-wide font-bold">
                      {rec.activo ? "Activa" : "Borrador"}
                    </Badge>

                    <div className="flex items-center gap-1.5">
                      {isOrganizer && (
                        <button
                          onClick={(e) => handleToggleActivoRecurrente(e, rec.id, rec.activo)}
                          className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${
                            rec.activo
                              ? "hover:bg-amber-500/10 text-amber-600 hover:text-amber-700"
                              : "hover:bg-green-500/10 text-green-600 hover:text-green-700"
                          }`}
                          title={rec.activo ? "Desactivar regla" : "Activar regla"}
                        >
                          {rec.activo ? <XCircle size={13} /> : <CheckCircle size={13} />}
                        </button>
                      )}
                      <Link to={`/convocatorias/recurrentes/${rec.id}/edit`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded hover:bg-muted" title="Editar">
                          <Edit size={13} className="text-muted-foreground hover:text-foreground" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRecurrencia(rec.id)}
                        className="h-7 w-7 rounded hover:bg-destructive/10 text-destructive"
                        title="Eliminar"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredRecurrentes.length === 0 && (
                <div className="text-center py-16 select-none bg-muted/5">
                  <Repeat size={26} className="mx-auto text-muted-foreground/60 mb-2.5" />
                  <p className="text-xs text-muted-foreground font-medium">Ninguna regla recurrente coincide con la búsqueda</p>
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}
