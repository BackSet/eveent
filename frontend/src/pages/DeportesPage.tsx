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
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deportes & Posiciones</h1>
          <p className="text-muted-foreground text-sm">Administra disciplinas y posiciones de juego</p>
        </div>
        
        {canManage && (
          <Dialog open={deporteDialogOpen} onOpenChange={setDeporteDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDeporteDialog()} className="gap-1.5 font-semibold">
                <Plus size={15} />
                <span>Nuevo Deporte</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-xl border">
              <DialogHeader>
                <DialogTitle className="font-semibold">
                  {editingDeporte ? "Editar Deporte" : "Nuevo Deporte"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Define el nombre de la disciplina deportiva.
                </DialogDescription>
              </DialogHeader>
              
              {deporteError && (
                <Alert variant="destructive"><AlertDescription>{deporteError}</AlertDescription></Alert>
              )}
              
              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="nombre" className="text-xs font-medium text-muted-foreground">Nombre</Label>
                  <Input
                    id="nombre"
                    value={deporteForm.nombre}
                    onChange={(e) => setDeporteForm({ ...deporteForm, nombre: e.target.value })}
                    placeholder="Ej: Básquetbol, Vóleibol"
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                  <div>
                    <Label className="text-xs font-semibold">Por Equipos</Label>
                    <p className="text-[10px] text-muted-foreground">Si es falso, matchmaking individual (1 por bando)</p>
                  </div>
                  <input type="checkbox" checked={deporteForm.esPorEquipos} onChange={(e) => setDeporteForm({ ...deporteForm, esPorEquipos: e.target.checked })} className="h-4 w-4 accent-primary cursor-pointer rounded" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="minJugadores" className="text-xs font-medium text-muted-foreground">Mín. por Bando</Label>
                    <Input id="minJugadores" type="number" min="1" value={deporteForm.minJugadoresPorBando} onChange={(e) => setDeporteForm({ ...deporteForm, minJugadoresPorBando: parseInt(e.target.value) || 1 })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="maxJugadores" className="text-xs font-medium text-muted-foreground">Máx. por Bando</Label>
                    <Input id="maxJugadores" type="number" min="1" value={deporteForm.maxJugadoresPorBando} onChange={(e) => setDeporteForm({ ...deporteForm, maxJugadoresPorBando: parseInt(e.target.value) || 11 })} />
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setDeporteDialogOpen(false)} className="font-medium">Cancelar</Button>
                <Button onClick={handleSaveDeporte} disabled={deporteSaving || !deporteForm.nombre} className="font-medium">
                  {deporteSaving ? <Spinner /> : editingDeporte ? "Actualizar" : "Crear"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {error && (
        <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Disciplinas</CardTitle>
              <span className="text-xs text-muted-foreground">{deportes.length}</span>
            </div>
          </CardHeader>
          <CardContent>
            {deportes.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">Sin deportes</p>
            ) : (
              <div className="space-y-1">
                {deportes.map((deporte) => {
                  const isSelected = selectedDeporte?.id === deporte.id;
                  return (
                    <div
                      key={deporte.id}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-primary/5 border border-primary/15"
                          : "hover:bg-muted/50 border border-transparent"
                      }`}
                      onClick={() => setSelectedDeporte(deporte)}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isSelected ? "text-primary" : ""}`}>
                          {deporte.nombre}
                        </span>
                        <Badge variant={deporte.esPorEquipos ? "default" : "outline"} className="text-[8px] px-1 py-0">
                          {deporte.esPorEquipos ? "Equipos" : "Individual"}
                        </Badge>
                      </div>
                      
                      {canManage && (
                        <div className="flex gap-0.5 items-center shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-muted" onClick={(e) => { e.stopPropagation(); openDeporteDialog(deporte); }}>
                            <Edit size={13} className="text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-destructive/5" onClick={(e) => { e.stopPropagation(); handleDeleteDeporte(deporte.id); }}>
                            <Trash2 size={13} className="text-destructive" />
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

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                {selectedDeporte ? `Posiciones · ${selectedDeporte.nombre}` : "Posiciones"}
              </CardTitle>
              {selectedDeporte && canManage && (
                <Button size="sm" variant="outline" onClick={() => openPosicionDialog()} className="gap-1 font-medium h-7 text-xs">
                  <Plus size={12} />
                  Nueva
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedDeporte ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Selecciona una disciplina</p>
              </div>
            ) : posiciones.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Sin posiciones</p>
              </div>
            ) : (
              <div className="space-y-1">
                {posiciones.map((pos) => (
                  <div
                    key={pos.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/50 hover:border-primary/20 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border bg-primary/10 border-primary/15 text-primary shrink-0">
                        {pos.abreviatura || "P"}
                      </span>
                      <span className="text-sm font-medium">{pos.nombre}</span>
                    </div>
                    {canManage && (
                      <div className="flex gap-0.5 items-center shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-muted" onClick={() => openPosicionDialog(pos)}>
                          <Edit size={13} className="text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-destructive/5" onClick={() => handleDeletePosicion(pos.id)}>
                          <Trash2 size={13} className="text-destructive" />
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

      <Dialog open={posicionDialogOpen} onOpenChange={setPosicionDialogOpen}>
        <DialogContent className="rounded-xl border">
          <DialogHeader>
            <DialogTitle className="font-semibold">
              {editingPosicion ? "Editar Posición" : "Nueva Posición"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Agrega una demarcación para {selectedDeporte?.nombre}.
            </DialogDescription>
          </DialogHeader>
          
          {posicionError && (
            <Alert variant="destructive"><AlertDescription>{posicionError}</AlertDescription></Alert>
          )}
          
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pos-nombre" className="text-xs font-medium text-muted-foreground">Nombre</Label>
              <Input
                id="pos-nombre"
                value={posicionForm.nombre}
                onChange={(e) => setPosicionForm({ ...posicionForm, nombre: e.target.value })}
                placeholder="Ej: Portero, Centrocampista"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pos-abreviatura" className="text-xs font-medium text-muted-foreground">Abreviatura</Label>
              <Input
                id="pos-abreviatura"
                value={posicionForm.abreviatura}
                onChange={(e) => setPosicionForm({ ...posicionForm, abreviatura: e.target.value })}
                placeholder="Ej: POR, MED"
                maxLength={10}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPosicionDialogOpen(false)} className="font-medium">Cancelar</Button>
            <Button onClick={handleSavePosicion} disabled={posicionSaving || !posicionForm.nombre} className="font-medium">
              {posicionSaving ? <Spinner /> : editingPosicion ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
