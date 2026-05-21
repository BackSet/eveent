import { useState, useEffect, useCallback } from "react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Edit, Trophy, Compass, Sparkles, LayoutList, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Deporte {
  id: number;
  nombre: string;
}

interface Posicion {
  id: number;
  nombre: string;
  abreviatura: string | null;
  deporteId: number;
}

interface PosicionFormData {
  nombre: string;
  abreviatura: string;
}

export default function DeportesPage() {
  const { hasPermission } = useAuth();
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [selectedDeporte, setSelectedDeporte] = useState<Deporte | null>(null);
  const [Posiciónes, setPosiciones] = useState<Posicion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [deporteDialogOpen, setDeporteDialogOpen] = useState(false);
  const [editingDeporte, setEditingDeporte] = useState<Deporte | null>(null);
  const [deporteForm, setDeporteForm] = useState({ nombre: "" });
  const [deporteSaving, setDeporteSaving] = useState(false);
  const [deporteError, setDeporteError] = useState("");

  const [PosiciónDialogOpen, setPosicionDialogOpen] = useState(false);
  const [editingPosicion, setEditingPosicion] = useState<Posicion | null>(null);
  const [PosiciónForm, setPosicionForm] = useState<PosicionFormData>({ nombre: "", abreviatura: "" });
  const [PosiciónSaving, setPosicionSaving] = useState(false);
  const [PosiciónError, setPosicionError] = useState("");

  const canManage = hasPermission("gestionar_deportes");

  const fetchDeportes = useCallback(async () => {
    try {
      const { data } = await api.get("/api/deportes");
      setDeportes(data);
      if (data.length > 0 && !selectedDeporte) {
        setSelectedDeporte(data[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al cargar deportes");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPosiciones = useCallback(async (deporteId: number) => {
    try {
      const { data } = await api.get(`/api/deportes/${deporteId}/Posiciónes`);
      setPosiciones(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al cargar Posiciónes");
    }
  }, []);

  useEffect(() => {
    fetchDeportes();
  }, []);

  useEffect(() => {
    if (selectedDeporte) {
      fetchPosiciones(selectedDeporte.id);
    }
  }, [selectedDeporte]);

  const handleSaveDeporte = async () => {
    setDeporteSaving(true);
    setDeporteError("");
    try {
      if (editingDeporte) {
        await api.put(`/api/deportes/${editingDeporte.id}`, { nombre: deporteForm.nombre });
      } else {
        await api.post("/api/deportes", { nombre: deporteForm.nombre });
      }
      setDeporteDialogOpen(false);
      setEditingDeporte(null);
      setDeporteForm({ nombre: "" });
      fetchDeportes();
    } catch (err: any) {
      setDeporteError(err.response?.data?.message || "Error al guardar deporte");
    } finally {
      setDeporteSaving(false);
    }
  };

  const handleDeleteDeporte = async (id: number) => {
    if (!confirm("¿Eliminar este deporte?")) return;
    try {
      await api.delete(`/api/deportes/${id}`);
      if (selectedDeporte?.id === id) {
        setSelectedDeporte(null);
      }
      fetchDeportes();
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al eliminar deporte");
    }
  };

  const handleSavePosicion = async () => {
    if (!selectedDeporte) return;
    setPosicionSaving(true);
    setPosicionError("");
    try {
      if (editingPosicion) {
        await api.put(`/api/Posiciónes/${editingPosicion.id}`, {
          nombre: PosiciónForm.nombre,
          abreviatura: PosiciónForm.abreviatura,
        });
      } else {
        await api.post(`/api/deportes/${selectedDeporte.id}/Posiciónes`, {
          nombre: PosiciónForm.nombre,
          abreviatura: PosiciónForm.abreviatura,
        });
      }
      setPosicionDialogOpen(false);
      setEditingPosicion(null);
      setPosicionForm({ nombre: "", abreviatura: "" });
      fetchPosiciones(selectedDeporte.id);
    } catch (err: any) {
      setPosicionError(err.response?.data?.message || "Error al guardar Posición");
    } finally {
      setPosicionSaving(false);
    }
  };

  const handleDeletePosicion = async (id: number) => {
    if (!confirm("¿Eliminar esta Posición?")) return;
    if (!selectedDeporte) return;
    try {
      await api.delete(`/api/Posiciónes/${id}`);
      fetchPosiciones(selectedDeporte.id);
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al eliminar Posición");
    }
  };

  const openDeporteDialog = (deporte?: Deporte) => {
    if (deporte) {
      setEditingDeporte(deporte);
      setDeporteForm({ nombre: deporte.nombre });
    } else {
      setEditingDeporte(null);
      setDeporteForm({ nombre: "" });
    }
    setDeporteError("");
    setDeporteDialogOpen(true);
  };

  const openPosicionDialog = (Posición?: Posicion) => {
    if (Posición) {
      setEditingPosicion(Posición);
      setPosicionForm({ nombre: Posición.nombre, abreviatura: Posición.abreviatura || "" });
    } else {
      setEditingPosicion(null);
      setPosicionForm({ nombre: "", abreviatura: "" });
    }
    setPosicionError("");
    setPosicionDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-10 w-10 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/45 backdrop-blur-md p-6 rounded-3xl border border-border/80 shadow-md">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary uppercase tracking-wider mb-2">
            <Compass size={12} />
            Configuración Deportiva
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Deportes & Posiciones</h1>
          <p className="text-muted-foreground text-sm font-medium mt-0.5">
            Administra las disciplinas deportivas disponibles y define las Posiciónes de juego oficiales
          </p>
        </div>
        
        {canManage && (
          <Dialog open={deporteDialogOpen} onOpenChange={setDeporteDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDeporteDialog()} className="glow-btn flex items-center gap-2">
                <Plus size={16} />
                <span>Nuevo Deporte</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl border border-border">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Trophy size={18} className="text-primary" />
                  {editingDeporte ? "Editar Deporte" : "Nuevo Deporte"}
                </DialogTitle>
                <DialogDescription className="text-xs font-semibold">
                  Define el nombre de la disciplina deportiva para las convocatorias.
                </DialogDescription>
              </DialogHeader>
              
              {deporteError && (
                <Alert variant="destructive" className="rounded-2xl">
                  <AlertDescription>{deporteError}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre de la Disciplina</Label>
                  <Input
                    id="nombre"
                    value={deporteForm.nombre}
                    onChange={(e) => setDeporteForm({ nombre: e.target.value })}
                    placeholder="Ej: Básquetbol, Vóleibol"
                    className="rounded-xl"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setDeporteDialogOpen(false)} className="rounded-xl font-bold">
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveDeporte}
                  disabled={deporteSaving || !deporteForm.nombre}
                  className="rounded-xl font-bold"
                >
                  {deporteSaving ? <Spinner /> : editingDeporte ? "Actualizar" : "Crear"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Grid splits */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sports Column */}
        <Card className="border border-border shadow-md">
          <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-bold text-foreground">Disciplinas</CardTitle>
            </div>
            <span className="text-xs font-bold text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-xl">
              {deportes.length} registradas
            </span>
          </CardHeader>
          <CardContent className="pt-6">
            {deportes.length === 0 ? (
              <p className="text-muted-foreground text-center py-10 font-medium">
                No hay deportes registrados
              </p>
            ) : (
              <div className="grid gap-3">
                {deportes.map((deporte) => {
                  const isSelected = selectedDeporte?.id === deporte.id;
                  return (
                    <div
                      key={deporte.id}
                      className={`flex items-center justify-between p-4.5 rounded-2xl border cursor-pointer transition-all duration-300 relative overflow-hidden group ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-md shadow-primary/5 scale-[1.01]"
                          : "border-border/70 hover:border-primary/25 hover:bg-muted/10"
                      }`}
                      onClick={() => setSelectedDeporte(deporte)}
                    >
                      {isSelected && (
                        <div className="absolute top-0 bottom-0 left-0 w-[3px] bg-primary" />
                      )}
                      <div className="flex items-center gap-3 pl-1">
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center border shrink-0 transition-colors ${
                          isSelected ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted/40 border-border text-muted-foreground group-hover:text-primary"
                        }`}>
                          <Target size={14} />
                        </div>
                        <span className={`font-bold text-sm transition-colors ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {deporte.nombre}
                        </span>
                      </div>
                      
                      {canManage && (
                        <div className="flex gap-1 items-center shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl hover:bg-primary/5"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeporteDialog(deporte);
                            }}
                          >
                            <Edit size={14} className="text-muted-foreground hover:text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl hover:bg-destructive/5"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDeporte(deporte.id);
                            }}
                          >
                            <Trash2 size={14} className="text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Positions Column */}
        <Card className="border border-border shadow-md">
          <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <LayoutList className="h-5 w-5 text-purple-500" />
              <CardTitle className="text-lg font-bold text-foreground">
                {selectedDeporte ? `Posiciones • ${selectedDeporte.nombre}` : "Posiciones"}
              </CardTitle>
            </div>
            {selectedDeporte && canManage && (
              <Button size="sm" onClick={() => openPosicionDialog()} className="gap-1.5 font-bold">
                <Plus size={14} />
                <span>Nueva Posición</span>
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            {!selectedDeporte ? (
              <div className="text-center py-12 space-y-2">
                <p className="text-muted-foreground font-medium">Selecciona una disciplina</p>
                <p className="text-xs text-muted-foreground font-medium">Elige un deporte del panel izquierdo para ver sus Posiciónes.</p>
              </div>
            ) : Posiciónes.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <p className="text-muted-foreground font-medium">No hay Posiciónes oficiales</p>
                {canManage && (
                  <p className="text-xs text-muted-foreground font-medium">Agrega las Posiciónes para que los jugadores puedan elegirlas.</p>
                )}
              </div>
            ) : (
              <div className="grid gap-3">
                {Posiciónes.map((pos) => (
                  <div
                    key={pos.id}
                    className="flex items-center justify-between p-4.5 rounded-2xl border border-border/70 bg-card hover:border-primary/25 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500 flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                        {pos.abreviatura || "P"}
                      </div>
                      <div>
                        <span className="font-extrabold text-sm text-foreground">{pos.nombre}</span>
                        {pos.abreviatura && (
                          <Badge variant="outline" className="ml-2 bg-purple-500/5 text-purple-500 border-purple-500/10 font-extrabold text-[9px] uppercase rounded-md px-1.5 py-0">
                            {pos.abreviatura}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex gap-1 items-center shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-xl hover:bg-primary/5"
                          onClick={() => openPosicionDialog(pos)}
                        >
                          <Edit size={14} className="text-muted-foreground hover:text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-xl hover:bg-destructive/5"
                          onClick={() => handleDeletePosicion(pos.id)}
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
      </div>

      {/* Position Dialog */}
      <Dialog open={PosiciónDialogOpen} onOpenChange={setPosicionDialogOpen}>
        <DialogContent className="rounded-3xl border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-18 w-18 text-primary" />
              {editingPosicion ? "Editar Posición de Juego" : "Nueva Posición de Juego"}
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold">
              Agrega una demarcación oficial para el deporte {selectedDeporte?.nombre}.
            </DialogDescription>
          </DialogHeader>
          
          {PosiciónError && (
            <Alert variant="destructive" className="rounded-2xl">
              <AlertDescription>{PosiciónError}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pos-nombre" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre de la Posición</Label>
              <Input
                id="pos-nombre"
                value={PosiciónForm.nombre}
                onChange={(e) =>
                  setPosicionForm({ ...PosiciónForm, nombre: e.target.value })
                }
                placeholder="Ej: Portero, Centrocampista"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pos-abreviatura" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Abreviatura Oficial</Label>
              <Input
                id="pos-abreviatura"
                value={PosiciónForm.abreviatura}
                onChange={(e) =>
                  setPosicionForm({ ...PosiciónForm, abreviatura: e.target.value })
                }
                placeholder="Ej: POR, MED"
                maxLength={10}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPosicionDialogOpen(false)} className="rounded-xl font-bold">
              Cancelar
            </Button>
            <Button
              onClick={handleSavePosicion}
              disabled={PosiciónSaving || !PosiciónForm.nombre}
              className="rounded-xl font-bold"
            >
              {PosiciónSaving ? <Spinner /> : editingPosicion ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}