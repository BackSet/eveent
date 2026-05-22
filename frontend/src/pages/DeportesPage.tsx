import { useState, useEffect } from "react";
import api from "@/services/api";
import { getApiErrorMessage } from "@/lib/constants";
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
import { Plus, Trash2, Edit, Trophy, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Deporte } from "@/types";

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
  const [posiciones, setPosiciones] = useState<Posicion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [deporteDialogOpen, setDeporteDialogOpen] = useState(false);
  const [editingDeporte, setEditingDeporte] = useState<Deporte | null>(null);
  const [deporteForm, setDeporteForm] = useState({ nombre: "", esPorEquipos: true, minJugadoresPorBando: 1, maxJugadoresPorBando: 11 });
  const [deporteSaving, setDeporteSaving] = useState(false);
  const [deporteError, setDeporteError] = useState("");

  const [posicionDialogOpen, setPosicionDialogOpen] = useState(false);
  const [editingPosicion, setEditingPosicion] = useState<Posicion | null>(null);
  const [posicionForm, setPosicionForm] = useState<PosicionFormData>({ nombre: "", abreviatura: "" });
  const [posicionSaving, setPosicionSaving] = useState(false);
  const [posicionError, setPosicionError] = useState("");

  const canManage = hasPermission("gestionar_deportes");

  const fetchDeportes = async () => {
    try {
      const { data } = await api.get("/api/deportes");
      setDeportes(data);
      if (data.length > 0 && !selectedDeporte) {
        setSelectedDeporte(data[0]);
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || "Error al cargar deportes");
    } finally {
      setLoading(false);
    }
  };

  const fetchPosiciones = async (deporteId: number) => {
    try {
      const { data } = await api.get(`/api/deportes/${deporteId}/posiciones`);
      setPosiciones(data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || "Error al cargar posiciones");
    }
  };

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
        await api.put(`/api/deportes/${editingDeporte.id}`, deporteForm);
      } else {
        await api.post("/api/deportes", deporteForm);
      }
      setDeporteDialogOpen(false);
      setEditingDeporte(null);
      setDeporteForm({ nombre: "", esPorEquipos: true, minJugadoresPorBando: 1, maxJugadoresPorBando: 11 });
      fetchDeportes();
    } catch (err: unknown) {
      setDeporteError(getApiErrorMessage(err) || "Error al guardar deporte");
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
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || "Error al eliminar deporte");
    }
  };

  const handleSavePosicion = async () => {
    if (!selectedDeporte) return;
    setPosicionSaving(true);
    setPosicionError("");
    try {
      if (editingPosicion) {
        await api.put(`/api/posiciones/${editingPosicion.id}`, {
          nombre: posicionForm.nombre,
          abreviatura: posicionForm.abreviatura,
        });
      } else {
        await api.post(`/api/deportes/${selectedDeporte.id}/posiciones`, {
          nombre: posicionForm.nombre,
          abreviatura: posicionForm.abreviatura,
        });
      }
      setPosicionDialogOpen(false);
      setEditingPosicion(null);
      setPosicionForm({ nombre: "", abreviatura: "" });
      fetchPosiciones(selectedDeporte.id);
    } catch (err: unknown) {
      setPosicionError(getApiErrorMessage(err) || "Error al guardar posicion");
    } finally {
      setPosicionSaving(false);
    }
  };

  const handleDeletePosicion = async (id: number) => {
    if (!confirm("¿Eliminar esta posicion?")) return;
    if (!selectedDeporte) return;
    try {
      await api.delete(`/api/posiciones/${id}`);
      fetchPosiciones(selectedDeporte.id);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || "Error al eliminar posicion");
    }
  };

  const openDeporteDialog = (deporte?: Deporte) => {
    if (deporte) {
      setEditingDeporte(deporte);
      setDeporteForm({ nombre: deporte.nombre, esPorEquipos: deporte.esPorEquipos ?? true, minJugadoresPorBando: deporte.minJugadoresPorBando ?? 1, maxJugadoresPorBando: deporte.maxJugadoresPorBando ?? 11 });
    } else {
      setEditingDeporte(null);
      setDeporteForm({ nombre: "", esPorEquipos: true, minJugadoresPorBando: 1, maxJugadoresPorBando: 11 });
    }
    setDeporteError("");
    setDeporteDialogOpen(true);
  };

  const openPosicionDialog = (posicion?: Posicion) => {
    if (posicion) {
      setEditingPosicion(posicion);
      setPosicionForm({ nombre: posicion.nombre, abreviatura: posicion.abreviatura || "" });
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
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 notion-animate-fade pb-12">
      {/* Cover / Header section */}
      <div className="relative rounded-lg overflow-hidden border border-border bg-muted/30">
        <div className="h-28 notion-cover notion-cover-soccer" />
        <div className="p-6 relative pt-10">
          <div className="absolute top-[-36px] left-6 text-5xl bg-background p-2 rounded-xl border border-border/80 shadow-sm select-none">
            🏆
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Deportes & Posiciones</h1>
              <p className="text-muted-foreground text-xs mt-1">Configura las disciplinas deportivas y posiciones oficiales en el workspace.</p>
            </div>
            {canManage && (
              <Dialog open={deporteDialogOpen} onOpenChange={setDeporteDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => openDeporteDialog()} className="gap-1.5 font-medium text-xs h-9 rounded-md shadow-none bg-primary text-primary-foreground hover:bg-primary/90">
                    <Plus size={14} />
                    <span>Nuevo Deporte</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-lg border border-border bg-popover shadow-none max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="font-semibold text-base">
                      {editingDeporte ? "Editar Deporte" : "Nuevo Deporte"}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Define los parámetros básicos de la disciplina.
                    </DialogDescription>
                  </DialogHeader>
                  
                  {deporteError && (
                    <Alert variant="destructive" className="py-2 px-3 text-xs"><AlertDescription>{deporteError}</AlertDescription></Alert>
                  )}
                  
                  <div className="space-y-3.5 py-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="nombre" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre del Deporte</Label>
                      <Input
                        id="nombre"
                        value={deporteForm.nombre}
                        onChange={(e) => setDeporteForm({ ...deporteForm, nombre: e.target.value })}
                        placeholder="Ej: Básquetbol, Vóleibol"
                        className="h-9 text-xs border-border"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-muted/40 rounded border border-border">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-semibold">Juego por Equipos</Label>
                        <p className="text-[10px] text-muted-foreground">Matchmaking en grupos divididos</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={deporteForm.esPorEquipos} 
                        onChange={(e) => setDeporteForm({ ...deporteForm, esPorEquipos: e.target.checked })} 
                        className="h-4 w-4 accent-primary cursor-pointer border-border rounded" 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="minJugadores" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mín. por Bando</Label>
                        <Input 
                          id="minJugadores" 
                          type="number" 
                          min="1" 
                          value={deporteForm.minJugadoresPorBando} 
                          onChange={(e) => setDeporteForm({ ...deporteForm, minJugadoresPorBando: parseInt(e.target.value) || 1 })} 
                          className="h-9 text-xs border-border"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="maxJugadores" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Máx. por Bando</Label>
                        <Input 
                          id="maxJugadores" 
                          type="number" 
                          min="1" 
                          value={deporteForm.maxJugadoresPorBando} 
                          onChange={(e) => setDeporteForm({ ...deporteForm, maxJugadoresPorBando: parseInt(e.target.value) || 11 })} 
                          className="h-9 text-xs border-border"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border mt-2">
                    <Button variant="outline" onClick={() => setDeporteDialogOpen(false)} className="h-8 text-xs font-medium border-border">Cancelar</Button>
                    <Button onClick={handleSaveDeporte} disabled={deporteSaving || !deporteForm.nombre} className="h-8 text-xs font-medium shadow-none">
                      {deporteSaving ? <Spinner size="sm" /> : editingDeporte ? "Guardar" : "Crear"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2 px-3 text-xs"><AlertDescription>{error}</AlertDescription></Alert>
      )}

      {/* Split Workspace Layout */}
      <div className="grid gap-6 md:grid-cols-12 items-start">
        {/* Left Column: Disciplines */}
        <div className="md:col-span-5 border border-border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between select-none">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Disciplinas</span>
            <span className="text-[10px] font-semibold text-muted-foreground bg-muted border border-border/80 px-2 py-0.5 rounded-full">
              {deportes.length} registradas
            </span>
          </div>

          <div className="p-3 space-y-1.5">
            {deportes.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-xs font-medium">Sin deportes configurados</p>
            ) : (
              deportes.map((deporte) => {
                const isSelected = selectedDeporte?.id === deporte.id;
                return (
                  <div
                    key={deporte.id}
                    onClick={() => setSelectedDeporte(deporte)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded border transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-accent/70 border-border/100"
                        : "hover:bg-muted/40 border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">🏃</span>
                      <span className={`text-sm font-semibold ${isSelected ? "text-foreground font-bold" : "text-muted-foreground"}`}>
                        {deporte.nombre}
                      </span>
                      <Badge variant={deporte.esPorEquipos ? "default" : "outline"} className="text-[8px] px-1.5 py-0 uppercase select-none font-bold tracking-wide">
                        {deporte.esPorEquipos ? "Equipos" : "1 v 1"}
                      </Badge>
                    </div>
                    
                    {canManage && (
                      <div className="flex gap-0.5 items-center shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 rounded hover:bg-muted" 
                          onClick={() => openDeporteDialog(deporte)}
                        >
                          <Edit size={11} className="text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 rounded hover:bg-destructive/10" 
                          onClick={() => handleDeleteDeporte(deporte.id)}
                        >
                          <Trash2 size={11} className="text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Positions */}
        <div className="md:col-span-7 border border-border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between select-none">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {selectedDeporte ? `Demarcaciones · ${selectedDeporte.nombre}` : "Posiciones oficiales"}
            </span>
            {selectedDeporte && canManage && (
              <Button size="sm" variant="outline" onClick={() => openPosicionDialog()} className="gap-1 font-medium h-7 text-xs border-border px-2.5 hover:bg-accent">
                <Plus size={11} />
                <span>Nueva</span>
              </Button>
            )}
          </div>

          <div className="p-3 space-y-1.5">
            {!selectedDeporte ? (
              <div className="text-center py-12 select-none">
                <p className="text-xs text-muted-foreground font-semibold">Selecciona una disciplina del panel izquierdo</p>
              </div>
            ) : posiciones.length === 0 ? (
              <div className="text-center py-12 select-none border border-dashed border-border/80 rounded-lg">
                <p className="text-xs text-muted-foreground font-medium">Sin posiciones oficiales definidas para {selectedDeporte.nombre}</p>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {posiciones.map((pos) => (
                  <div
                    key={pos.id}
                    className="flex items-center justify-between px-3 py-2 border border-border/80 rounded hover:border-border hover:bg-muted/10 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border border-primary/20 bg-primary/5 text-primary shrink-0 select-none">
                        {pos.abreviatura || "P"}
                      </span>
                      <span className="text-xs font-semibold truncate">{pos.nombre}</span>
                    </div>
                    {canManage && (
                      <div className="flex gap-0.5 items-center shrink-0">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 rounded hover:bg-muted" 
                          onClick={() => openPosicionDialog(pos)}
                        >
                          <Edit size={11} className="text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 rounded hover:bg-destructive/10" 
                          onClick={() => handleDeletePosicion(pos.id)}
                        >
                          <Trash2 size={11} className="text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Position Dialog */}
      <Dialog open={posicionDialogOpen} onOpenChange={setPosicionDialogOpen}>
        <DialogContent className="rounded-lg border border-border bg-popover shadow-none max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-semibold text-base">
              {editingPosicion ? "Editar Posición" : "Nueva Posición"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Agrega una demarcación oficial para {selectedDeporte?.nombre}.
            </DialogDescription>
          </DialogHeader>
          
          {posicionError && (
            <Alert variant="destructive" className="py-2 px-3 text-xs"><AlertDescription>{posicionError}</AlertDescription></Alert>
          )}
          
          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pos-nombre" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre de la Posición</Label>
              <Input
                id="pos-nombre"
                value={posicionForm.nombre}
                onChange={(e) => setPosicionForm({ ...posicionForm, nombre: e.target.value })}
                placeholder="Ej: Portero, Centrocampista"
                className="h-9 text-xs border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pos-abreviatura" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Abreviatura / Siglas</Label>
              <Input
                id="pos-abreviatura"
                value={posicionForm.abreviatura}
                onChange={(e) => setPosicionForm({ ...posicionForm, abreviatura: e.target.value })}
                placeholder="Ej: POR, MED"
                maxLength={10}
                className="h-9 text-xs border-border"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border mt-2">
            <Button variant="outline" onClick={() => setPosicionDialogOpen(false)} className="h-8 text-xs font-medium border-border">Cancelar</Button>
            <Button onClick={handleSavePosicion} disabled={posicionSaving || !posicionForm.nombre} className="h-8 text-xs font-medium shadow-none">
              {posicionSaving ? <Spinner size="sm" /> : editingPosicion ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
