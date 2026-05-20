import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Calendar, MapPin, User, ArrowLeft, Plus, Trash2, Edit, Tag, Users, Clock, CheckCircle2, XCircle, Trophy, Sparkles, Paintbrush } from "lucide-react";
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

interface Asistencia {
  id: number;
  usuarioId: number;
  usuarioNombre: string;
  estado: string;
  posicionNombre: string | null;
  equipoNombre: string | null;
}

interface Equipo {
  id: number;
  nombre: string;
  color: string;
  convocatoriaId: number;
}

interface EquipoFormData {
  nombre: string;
  color: string;
}

const estadoColors: Record<string, "default" | "secondary" | "destructive" | "success" | "warning" | "info"> = {
  ASISTIRE: "success",
  NO_ASISTIRE: "destructive",
  PENDIENTE: "warning",
  LISTA_ESPERA: "info",
};

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];

export default function ConvocatoriaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [convocatoria, setConvocatoria] = useState<Convocatoria | null>(null);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [miAsistencia, setMiAsistencia] = useState<Asistencia | null>(null);
  const [responderLoading, setResponderLoading] = useState(false);

  const [equipoDialogOpen, setEquipoDialogOpen] = useState(false);
  const [editingEquipo, setEditingEquipo] = useState<Equipo | null>(null);
  const [equipoForm, setEquipoForm] = useState<EquipoFormData>({ nombre: "", color: "" });
  const [equipoSaving, setEquipoSaving] = useState(false);
  const [equipoError, setEquipoError] = useState("");

  const fetchData = async () => {
    try {
      const [convRes, asisRes, equipRes] = await Promise.all([
        api.get(`/api/convocatorias/${id}`),
        api.get(`/api/convocatorias/${id}/asistencias`),
        api.get(`/api/convocatorias/${id}/equipos`),
      ]);
      setConvocatoria(convRes.data);
      setAsistencias(asisRes.data);
      setEquipos(equipRes.data);

      const miAsis = asisRes.data.find((a: Asistencia) => a.usuarioId === user?.id);
      setMiAsistencia(miAsis || null);
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al cargar convocatoria");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleRespondedAsistencia = async (estado: string) => {
    setResponderLoading(true);
    setError("");
    try {
      if (miAsistencia) {
        await api.put(`/api/asistencias/${miAsistencia.id}`, { estado });
      } else {
        await api.post(`/api/convocatorias/${id}/asistencias`, {
          convocatoriaId: Number(id),
          estado,
        });
      }
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al responder asistencia");
    } finally {
      setResponderLoading(false);
    }
  };

  const openEquipoDialog = (equipo?: Equipo) => {
    if (equipo) {
      setEditingEquipo(equipo);
      setEquipoForm({ nombre: equipo.nombre, color: equipo.color || "" });
    } else {
      setEditingEquipo(null);
      setEquipoForm({ nombre: "", color: "" });
    }
    setEquipoError("");
    setEquipoDialogOpen(true);
  };

  const handleSaveEquipo = async () => {
    setEquipoSaving(true);
    setEquipoError("");
    try {
      if (editingEquipo) {
        await api.put(`/api/equipos/${editingEquipo.id}`, equipoForm);
      } else {
        await api.post(`/api/convocatorias/${id}/equipos`, equipoForm);
      }
      setEquipoDialogOpen(false);
      setEquipoForm({ nombre: "", color: "" });
      setEditingEquipo(null);
      fetchData();
    } catch (err: any) {
      setEquipoError(err.response?.data?.message || "Error al guardar equipo");
    } finally {
      setEquipoSaving(false);
    }
  };

  const handleDeleteEquipo = async (equipoId: number) => {
    if (!confirm("¿Eliminar este equipo?")) return;
    try {
      await api.delete(`/api/equipos/${equipoId}`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al eliminar equipo");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-10 w-10 text-primary" />
      </div>
    );
  }

  if (!convocatoria) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error || "Convocatoria no encontrada"}</AlertDescription>
      </Alert>
    );
  }

  const isOrganizador = hasPermission("crear_convocatoria") || hasPermission("dividir_equipos") || hasPermission("gestionar_convocatorias");

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Back button */}
      <Button variant="ghost" onClick={() => navigate("/convocatorias")} className="gap-2 font-bold group">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        <span>Volver a convocatorias</span>
      </Button>

      {/* Main Details Card */}
      <Card className="relative overflow-hidden border border-border shadow-xl">
        <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-primary to-purple-600" />
        
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-xl">
                  {convocatoria.deporteNombre}
                </span>
                {convocatoria.categoria && (
                  <span className="text-xs font-bold text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-xl flex items-center gap-1">
                    <Tag size={12} />
                    {convocatoria.categoria}
                  </span>
                )}
              </div>
              <CardTitle className="text-3xl font-black text-foreground tracking-tight">
                {convocatoria.titulo}
              </CardTitle>
            </div>
            
            <Badge
              variant={
                convocatoria.estado === "ABIERTA"
                  ? "success"
                  : convocatoria.estado === "CERRADA"
                  ? "outline"
                  : "destructive"
              }
              className="font-bold text-xs uppercase tracking-wide px-3 py-1 rounded-lg self-start"
            >
              {convocatoria.estado}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {convocatoria.descripcion && (
            <div className="p-4.5 rounded-2xl bg-muted/20 border border-border/40 text-sm leading-relaxed text-muted-foreground font-medium">
              {convocatoria.descripcion}
            </div>
          )}

          {/* Details Grid */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 border-t border-border/50 pt-5">
            <div className="flex items-center gap-3 text-muted-foreground font-semibold text-sm">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                <Calendar size={16} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Fecha & Hora</p>
                <p className="text-foreground text-xs.5">
                  {new Date(convocatoria.fechaHora).toLocaleString("es-ES", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            </div>

            {convocatoria.lugar && (
              <div className="flex items-center gap-3 text-muted-foreground font-semibold text-sm">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                  <MapPin size={16} />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Lugar / Ubicación</p>
                  <p className="text-foreground text-xs.5 truncate">{convocatoria.lugar}</p>
                </div>
              </div>
            )}

            {convocatoria.cupoMaximo > 0 && (
              <div className="flex items-center gap-3 text-muted-foreground font-semibold text-sm">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                  <Users size={16} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Cupo Disponible</p>
                  <p className="text-foreground text-xs.5">Máximo {convocatoria.cupoMaximo} Jugadores</p>
                </div>
              </div>
            )}

            {convocatoria.fechaLimiteInscripcion && (
              <div className="flex items-center gap-3 text-muted-foreground font-semibold text-sm">
                <div className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive shrink-0 border border-destructive/20">
                  <Clock size={16} />
                </div>
                <div>
                  <p className="text-[10px] text-destructive/80 uppercase font-bold tracking-wider">Límite Inscripción</p>
                  <p className="text-foreground text-xs.5">
                    {new Date(convocatoria.fechaLimiteInscripcion).toLocaleString("es-ES", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 text-muted-foreground font-semibold text-sm">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                <User size={16} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Organizador</p>
                <p className="text-foreground text-xs.5">{convocatoria.creadoPorNombre}</p>
              </div>
            </div>
          </div>

          {/* Action Footer (Responses & Admin Actions) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-border/50">
            {/* Player Response Actions */}
            {convocatoria.estado === "ABIERTA" ? (
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <Button
                  className={`flex-1 sm:flex-initial gap-2 rounded-xl glow-btn ${
                    miAsistencia?.estado === "ASISTIRE" 
                      ? "bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-600/20" 
                      : "bg-background border border-border text-foreground hover:bg-primary/5 hover:text-primary hover:border-primary/20"
                  }`}
                  onClick={() => handleRespondedAsistencia("ASISTIRE")}
                  disabled={responderLoading}
                >
                  <CheckCircle2 size={16} />
                  <span>Asistiré</span>
                </Button>
                
                <Button
                  className={`flex-1 sm:flex-initial gap-2 rounded-xl ${
                    miAsistencia?.estado === "NO_ASISTIRE" 
                      ? "bg-destructive text-white hover:bg-destructive/95 shadow-md shadow-destructive/20" 
                      : "bg-background border border-border text-foreground hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20"
                  }`}
                  onClick={() => handleRespondedAsistencia("NO_ASISTIRE")}
                  disabled={responderLoading}
                >
                  <XCircle size={16} />
                  <span>No asistiré</span>
                </Button>
              </div>
            ) : (
              <div className="text-xs font-bold text-muted-foreground bg-muted/40 px-3.5 py-2.5 rounded-xl border border-border/30">
                Las respuestas de asistencia están cerradas para esta convocatoria.
              </div>
            )}

            {/* Admin/Organizer Tools */}
            {isOrganizador && (
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/convocatorias/${id}/edit`)}
                  className="gap-1.5 font-bold"
                >
                  <Edit size={14} /> 
                  <span>Editar</span>
                </Button>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    if (confirm("¿Eliminar esta convocatoria?")) {
                      try {
                        await api.delete(`/api/convocatorias/${id}`);
                        navigate("/convocatorias");
                      } catch (err: any) {
                        setError(err.response?.data?.message || "Error al eliminar");
                      }
                    }
                  }}
                  className="gap-1.5 font-bold"
                >
                  <Trash2 size={14} /> 
                  <span>Eliminar</span>
                </Button>
              </div>
            )}
          </div>

          {/* Current Status Notification */}
          {miAsistencia && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/20 shadow-sm animate-pulse-slow">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-5 w-5 text-primary shrink-0" />
                <span className="text-xs font-semibold text-foreground">
                  Tu respuesta actual para este evento:
                </span>
              </div>
              <Badge variant={estadoColors[miAsistencia.estado]} className="font-extrabold uppercase text-[10px] tracking-wider rounded-lg px-2.5 py-0.5">
                {miAsistencia.estado}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs list (Asistencias and Teams) */}
      <Tabs defaultValue="asistencias" className="w-full">
        <TabsList className="bg-muted/40 p-1.5 rounded-2xl border border-border/50 max-w-sm mb-6 flex gap-1">
          <TabsTrigger value="asistencias" className="rounded-xl font-bold text-xs py-2 px-4 flex-1">
            Asistencias ({asistencias.length})
          </TabsTrigger>
          <TabsTrigger value="equipos" className="rounded-xl font-bold text-xs py-2 px-4 flex-1">
            Equipos ({equipos.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="asistencias" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {asistencias.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground font-medium">No hay asistencias registradas</p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {asistencias.map((asis) => (
                    <div
                      key={asis.id}
                      className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary/10 to-purple-500/10 flex items-center justify-center font-bold text-primary text-xs border border-primary/20 shadow-sm">
                          {asis.usuarioNombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-sm">{asis.usuarioNombre}</p>
                          <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                            {asis.posicionNombre && <span className="text-primary">{asis.posicionNombre}</span>}
                            {asis.posicionNombre && asis.equipoNombre && " • "}
                            {asis.equipoNombre && (
                              <span className="text-purple-500 font-bold bg-purple-500/10 px-2 py-0.5 rounded-lg">
                                Equipo {asis.equipoNombre}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <Badge variant={estadoColors[asis.estado]} className="font-bold tracking-wide text-[10px] rounded-lg">
                        {asis.estado}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipos" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
              <Trophy size={18} className="text-primary" />
              Equipos de la Convocatoria
            </h3>
            
            {isOrganizador && (
              <Dialog open={equipoDialogOpen} onOpenChange={setEquipoDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => openEquipoDialog()} size="sm" className="gap-1.5 font-bold">
                    <Plus size={14} /> 
                    <span>Nuevo Equipo</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-3xl border border-border">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                      <Paintbrush size={18} className="text-primary" />
                      {editingEquipo ? "Editar Equipo" : "Nuevo Equipo"}
                    </DialogTitle>
                    <DialogDescription className="text-xs font-semibold">
                      Ingresa el nombre del equipo y selecciona un color representativo.
                    </DialogDescription>
                  </DialogHeader>
                  
                  {equipoError && (
                    <Alert variant="destructive">
                      <AlertDescription>{equipoError}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-5 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="equipo-nombre" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Nombre del Equipo
                      </Label>
                      <Input
                        id="equipo-nombre"
                        value={equipoForm.nombre}
                        onChange={(e) =>
                          setEquipoForm({ ...equipoForm, nombre: e.target.value })
                        }
                        placeholder="Ej: Guerreros del Norte"
                        className="rounded-xl"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                        Color Identificador
                      </Label>
                      <div className="flex gap-2.5 flex-wrap">
                        {COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEquipoForm({ ...equipoForm, color: c })}
                            className={`w-9 h-9 rounded-full border-2 transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer shadow-sm ${
                              equipoForm.color === c
                                ? "border-foreground ring-2 ring-primary/40 scale-110"
                                : "border-transparent"
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      
                      {equipoForm.color && (
                        <p className="text-xs font-bold text-muted-foreground pt-1.5 flex items-center gap-1.5">
                          <span>Color seleccionado:</span>
                          <span 
                            className="inline-block w-4 h-4 rounded-full border border-black/10" 
                            style={{ backgroundColor: equipoForm.color }} 
                          />
                          <span className="font-mono text-[10px] uppercase" style={{ color: equipoForm.color }}>
                            {equipoForm.color}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                      variant="outline"
                      onClick={() => setEquipoDialogOpen(false)}
                      className="rounded-xl font-bold"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveEquipo}
                      disabled={equipoSaving || !equipoForm.nombre}
                      className="rounded-xl font-bold"
                    >
                      {equipoSaving ? <Spinner /> : editingEquipo ? "Actualizar" : "Crear"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <Card>
            <CardContent className="pt-6">
              {equipos.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <p className="text-muted-foreground font-medium">No hay equipos registrados</p>
                  {isOrganizador && (
                    <p className="text-xs text-muted-foreground font-medium">Crea equipos para organizar las asistencias.</p>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {equipos.map((eq) => (
                    <div
                      key={eq.id}
                      className="flex items-center justify-between p-4.5 rounded-2xl border border-border/70 bg-card hover:border-primary/30 transition-all shadow-sm hover:shadow-md relative overflow-hidden"
                    >
                      {eq.color && (
                        <div 
                          className="absolute top-0 bottom-0 left-0 w-[4px]"
                          style={{ backgroundColor: eq.color }}
                        />
                      )}
                      
                      <div className="flex items-center gap-3 pl-2.5">
                        <div 
                          className="w-4 h-4 rounded-full border border-black/10 shadow-sm shrink-0" 
                          style={{ backgroundColor: eq.color || '#cccccc' }}
                        />
                        <p className="font-extrabold text-foreground text-sm tracking-tight">{eq.nombre}</p>
                      </div>
                      
                      {isOrganizador && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEquipoDialog(eq)}
                            className="rounded-xl hover:bg-primary/5"
                          >
                            <Edit size={14} className="text-muted-foreground hover:text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteEquipo(eq.id)}
                            className="rounded-xl hover:bg-destructive/5"
                          >
                            <Trash2 size={14} className="text-destructive" />
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
  );
}