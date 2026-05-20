import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar, MapPin, Users, Clock, Tag, Sparkles, Trophy, ArrowRight, KanbanSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Convocatoria {
  id: number;
  titulo: string;
  descripcion: string;
  deporteId: number;
  deporteNombre: string;
  fechaHora: string;
  lugar: string;
  creadoPorId: number;
  creadoPorNombre: string;
  estado: string;
  fechaCreacion: string;
  cupoMaximo: number;
  categoria: string;
  fechaLimiteInscripcion: string;
}

const estadoColors: Record<string, "default" | "secondary" | "destructive" | "success" | "warning" | "info"> = {
  BORRADOR: "secondary",
  ABIERTA: "success",
  CERRADA: "secondary",
  CANCELADA: "destructive",
};

const ESTADOS = ["TODOS", "BORRADOR", "ABIERTA", "CERRADA", "CANCELADA"];

export default function ConvocatoriasPage() {
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [estadoFilter, setEstadoFilter] = useState("TODOS");
  const { user } = useAuth();

  const fetchConvocatorias = async () => {
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
  };

  useEffect(() => {
    fetchConvocatorias();
  }, [estadoFilter]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header and Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/45 backdrop-blur-md p-6 rounded-3xl border border-border/80 shadow-md">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary uppercase tracking-wider mb-2">
            <Trophy size={12} />
            Eventos Disponibles
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Convocatorias</h1>
          <p className="text-muted-foreground text-sm font-medium mt-0.5">
            Explora o gestiona todos los eventos y partidos deportivos planificados
          </p>
        </div>
        
        <div className="flex items-center gap-3 self-start md:self-center">
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
          
          {user && (
            <Link to="/convocatorias/new">
              <Button className="glow-btn flex items-center gap-2">
                <Plus size={16} />
                <span>Nueva Convocatoria</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-10 w-10 text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {convocatorias.map((conv) => (
            <Link key={conv.id} to={`/convocatorias/${conv.id}`} className="group h-full block">
              <Card className="h-full flex flex-col justify-between hover:scale-[1.02] hover:-translate-y-1 hover:border-primary/45 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-transparent group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-purple-500 transition-all duration-300" />
                
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-xl">
                      {conv.deporteNombre}
                    </span>
                    <Badge variant={estadoColors[conv.estado] || "default"} className="font-bold rounded-lg px-2.5 py-0.5 text-[10px] tracking-wide uppercase">
                      {conv.estado}
                    </Badge>
                  </div>
                  
                  <CardTitle className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {conv.titulo}
                  </CardTitle>
                  
                  <div className="flex gap-3 items-center text-xs text-muted-foreground font-semibold mt-1">
                    {conv.categoria && (
                      <span className="flex items-center gap-1">
                        <Tag size={12} className="text-primary/70" />
                        {conv.categoria}
                      </span>
                    )}
                    {conv.cupoMaximo > 0 && (
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
                        {new Date(conv.fechaHora).toLocaleString("es-ES", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
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
                          Límite: {new Date(conv.fechaLimiteInscripcion).toLocaleString("es-ES", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>

                <div className="px-6 pb-4 pt-2 flex items-center justify-between border-t border-border/30 text-xs font-bold text-muted-foreground group-hover:text-primary transition-all">
                  <span className="truncate">Org: {conv.creadoPorNombre}</span>
                  <span className="inline-flex items-center gap-1">
                    Ver Detalles
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </Card>
            </Link>
          ))}
          
          {convocatorias.length === 0 && (
            <Card className="col-span-full border-dashed border-2 py-16 bg-muted/5 flex flex-col items-center justify-center text-center">
              <CardContent className="space-y-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
                  <KanbanSquare size={32} />
                </div>
                <h3 className="text-lg font-bold text-foreground">No hay convocatorias registradas</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Actualmente no existen convocatorias en este estado. ¡Sé el primero en crear un evento deportivo!
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
      )}
    </div>
  );
}