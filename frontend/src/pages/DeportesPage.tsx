import { useState, useEffect } from "react";
import api from "@/services/api";
import { getApiErrorMessage } from "@/lib/constants";
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
import { MasterDetailSkeleton, PageCoverHeaderSkeleton } from "@/components/ui/page-skeletons";
import { DeporteIcon, PageCoverIcon } from "@/components/ui/page-icon";
import { PageIconKind } from "@/lib/iconography";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Edit, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Deporte } from "@/types";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { InfoHint } from "@/components/ui/info-hint";
import { Tooltip } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { PresetChips } from "@/components/ui/preset-chips";
import { validateMinMax, validateRequiredTrim } from "@/lib/formValidation";

const DEPORTE_PRESETS = [
  { id: "f11", label: "Fútbol 11", nombre: "Fútbol 11", min: 1, max: 11 },
  { id: "f5", label: "Futsal 5", nombre: "Futsal", min: 1, max: 5 },
  { id: "bb", label: "Básquet 5", nombre: "Básquetbol", min: 1, max: 5 },
  { id: "vb", label: "Vóley 6", nombre: "Vóleibol", min: 1, max: 6 },
];

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
  const toast = useToast();
  const confirm = useConfirm();
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

  const handleSaveDeporte = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const nameErr = validateRequiredTrim(deporteForm.nombre, "El nombre del deporte");
    const minMaxErr = validateMinMax(deporteForm.minJugadoresPorBando, deporteForm.maxJugadoresPorBando);
    if (nameErr || minMaxErr) {
      setDeporteError(nameErr || minMaxErr || "");
      return;
    }
    setDeporteSaving(true);
    setDeporteError("");
    try {
      if (editingDeporte) {
        await api.put(`/api/deportes/${editingDeporte.id}`, deporteForm);
        toast.success("Deporte actualizado", `"${deporteForm.nombre}" se guardó correctamente.`);
      } else {
        await api.post("/api/deportes", deporteForm);
        toast.success("Deporte creado", `Ya puedes crear convocatorias de "${deporteForm.nombre}".`);
      }
      setDeporteDialogOpen(false);
      setEditingDeporte(null);
      setDeporteForm({ nombre: "", esPorEquipos: true, minJugadoresPorBando: 1, maxJugadoresPorBando: 11 });
      fetchDeportes();
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err) || "Error al guardar deporte";
      setDeporteError(msg);
      toast.error(msg);
    } finally {
      setDeporteSaving(false);
    }
  };

  const handleDeleteDeporte = async (deporte: Deporte) => {
    const ok = await confirm({
      title: "Eliminar deporte",
      description: (
        <span>
          ¿Eliminar el deporte <strong>"{deporte.nombre}"</strong>?
          Esto también borrará todas sus posiciones asociadas y no podrás crear convocatorias para él.
        </span>
      ),
      confirmLabel: "Sí, eliminar",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`/api/deportes/${deporte.id}`);
      if (selectedDeporte?.id === deporte.id) {
        setSelectedDeporte(null);
      }
      toast.success("Deporte eliminado", `"${deporte.nombre}" se eliminó del sistema.`);
      fetchDeportes();
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err) || "Error al eliminar deporte";
      setError(msg);
      toast.error(msg);
    }
  };

  const handleSavePosicion = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedDeporte) return;
    const nameErr = validateRequiredTrim(posicionForm.nombre, "El nombre de la posición");
    if (nameErr) {
      setPosicionError(nameErr);
      return;
    }
    setPosicionSaving(true);
    setPosicionError("");
    try {
      if (editingPosicion) {
        await api.put(`/api/posiciones/${editingPosicion.id}`, {
          nombre: posicionForm.nombre,
          abreviatura: posicionForm.abreviatura,
        });
        toast.success("Posición actualizada", `"${posicionForm.nombre}" se guardó.`);
      } else {
        await api.post(`/api/deportes/${selectedDeporte.id}/posiciones`, {
          nombre: posicionForm.nombre,
          abreviatura: posicionForm.abreviatura,
        });
        toast.success("Posición creada", `"${posicionForm.nombre}" añadida a ${selectedDeporte.nombre}.`);
      }
      setPosicionDialogOpen(false);
      setEditingPosicion(null);
      setPosicionForm({ nombre: "", abreviatura: "" });
      fetchPosiciones(selectedDeporte.id);
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err) || "Error al guardar posición";
      setPosicionError(msg);
      toast.error(msg);
    } finally {
      setPosicionSaving(false);
    }
  };

  const handleDeletePosicion = async (pos: Posicion) => {
    if (!selectedDeporte) return;
    const ok = await confirm({
      title: "Eliminar posición",
      description: (
        <span>
          ¿Eliminar la posición <strong>"{pos.nombre}"</strong>?
          Los jugadores que la tenían como preferida la perderán de su perfil.
        </span>
      ),
      confirmLabel: "Sí, eliminar",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`/api/posiciones/${pos.id}`);
      toast.success("Posición eliminada", `"${pos.nombre}" eliminada de ${selectedDeporte.nombre}.`);
      fetchPosiciones(selectedDeporte.id);
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err) || "Error al eliminar posición";
      setError(msg);
      toast.error(msg);
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

  return (
    <div className="page-shell space-y-6 notion-animate-fade">
      {loading ? (
        <PageCoverHeaderSkeleton showActions={canManage} />
      ) : (
      <div className="relative rounded-lg overflow-hidden border border-border bg-muted/30">
        <div className="h-28 notion-cover notion-cover-soccer" />
        <div className="p-6 relative pt-10">
          <PageCoverIcon kind={PageIconKind.DEPORTES} />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                Deportes y Posiciones
                <InfoHint side="right" maxWidth={320}>
                  Define cada <strong>deporte</strong> con sus reglas (juego por equipos, jugadores
                  mín/máx por bando) y sus <strong>posiciones oficiales</strong> (ej. Portero,
                  Central). Estas configuraciones se usan al crear convocatorias y formar equipos.
                </InfoHint>
              </h1>
              <p className="text-muted-foreground text-xs mt-1">
                Configura las disciplinas disponibles y las posiciones que pueden elegir los jugadores.
              </p>
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
                  <form onSubmit={handleSaveDeporte}>
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
                      <PresetChips
                        showIcon={false}
                        options={DEPORTE_PRESETS.map((p) => ({
                          id: p.id,
                          label: p.label,
                          onClick: () =>
                            setDeporteForm({
                              nombre: p.nombre,
                              esPorEquipos: true,
                              minJugadoresPorBando: p.min,
                              maxJugadoresPorBando: p.max,
                            }),
                        }))}
                      />
                      <Input
                        id="nombre"
                        value={deporteForm.nombre}
                        onChange={(e) => setDeporteForm({ ...deporteForm, nombre: e.target.value })}
                        placeholder="Ej: Básquetbol, Vóleibol"
                        className="h-9 text-xs border-border"
                        required
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-muted/40 rounded border border-border">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-semibold flex items-center gap-1.5">
                          Juego por equipos
                          <InfoHint side="right" maxWidth={260}>
                            Activa esto si el deporte se juega dividiendo a los jugadores en
                            <strong> bandos</strong> (ej. fútbol). Desactívalo para deportes
                            individuales o 1v1 (ej. tenis singles).
                          </InfoHint>
                        </Label>
                        <p className="text-[10px] text-muted-foreground">¿Se forma matchmaking de equipos?</p>
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
                        <Label htmlFor="minJugadores" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          Mín. por bando
                          <InfoHint side="top" maxWidth={240}>
                            Cantidad mínima de jugadores para que un equipo pueda salir a jugar.
                          </InfoHint>
                        </Label>
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
                        <Label htmlFor="maxJugadores" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          Máx. por bando
                          <InfoHint side="top" maxWidth={240}>
                            Tope de jugadores en cancha por equipo. Ej: fútbol 11 = 11, fútsal = 5.
                          </InfoHint>
                        </Label>
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
                    <Button type="button" variant="outline" onClick={() => setDeporteDialogOpen(false)} className="h-8 text-xs font-medium border-border">Cancelar</Button>
                    <Button type="submit" disabled={deporteSaving || !deporteForm.nombre} className="h-8 text-xs font-medium shadow-none">
                      {deporteSaving ? <Spinner size="sm" /> : editingDeporte ? "Guardar" : "Crear"}
                    </Button>
                  </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
      )}

      {!loading && error && (
        <Alert variant="destructive" className="py-2 px-3 text-xs"><AlertDescription>{error}</AlertDescription></Alert>
      )}

      {loading ? (
        <MasterDetailSkeleton />
      ) : (
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-12 items-start">
        {/* Left Column: Disciplines */}
        <div className="lg:col-span-5 border border-border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between select-none">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Disciplinas</span>
            <span className="text-[10px] font-semibold text-muted-foreground bg-muted border border-border/80 px-2 py-0.5 rounded-full">
              {deportes.length} registradas
            </span>
          </div>

          <div className="p-3 space-y-1.5">
            {deportes.length === 0 ? (
              <EmptyState
                icon={<Trophy size={28} />}
                title="Sin deportes configurados"
                description="Crea tu primer deporte para empezar a programar convocatorias."
                action={
                  canManage ? (
                    <Button onClick={() => openDeporteDialog()} className="h-8 text-xs">
                      <Plus size={12} className="mr-1" />Nuevo deporte
                    </Button>
                  ) : undefined
                }
                className="border-0 bg-transparent py-6"
              />
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
                    <div className="flex items-center gap-2.5 min-w-0">
                      <DeporteIcon nombre={deporte.nombre} size={20} className="text-foreground/75" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-sm font-semibold ${isSelected ? "text-foreground font-bold" : "text-muted-foreground"}`}>
                            {deporte.nombre}
                          </span>
                          <Badge variant={deporte.esPorEquipos ? "default" : "outline"} className="text-[8px] px-1.5 py-0 uppercase select-none font-bold tracking-wide">
                            {deporte.esPorEquipos ? "Equipos" : "1 v 1"}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {deporte.esPorEquipos
                            ? `${deporte.minJugadoresPorBando ?? 1}–${deporte.maxJugadoresPorBando ?? 11} jugadores por bando`
                            : "Deporte individual o parejas"}
                        </p>
                      </div>
                    </div>
                    
                    {canManage && (
                      <div className="flex gap-0.5 items-center shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Tooltip content="Editar deporte">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 rounded hover:bg-muted" 
                            onClick={() => openDeporteDialog(deporte)}
                          >
                            <Edit size={11} className="text-muted-foreground hover:text-foreground" />
                          </Button>
                        </Tooltip>
                        <Tooltip content="Eliminar deporte y sus posiciones">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 rounded hover:bg-destructive/10" 
                            onClick={() => handleDeleteDeporte(deporte)}
                          >
                            <Trash2 size={11} className="text-destructive" />
                          </Button>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Positions */}
        <div className="lg:col-span-7 border border-border rounded-lg bg-card overflow-hidden">
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
              <EmptyState
                icon={<Trophy size={28} />}
                title="Selecciona una disciplina"
                description="Elige un deporte del panel de la izquierda para ver y configurar sus posiciones."
                className="border-0 bg-transparent py-8"
              />
            ) : posiciones.length === 0 ? (
              <EmptyState
                icon={<Trophy size={28} />}
                title={`Sin posiciones en ${selectedDeporte.nombre}`}
                description="Agrega posiciones (ej. Delantero, Defensa) para que los jugadores puedan elegirlas como preferidas."
                action={
                  canManage ? (
                    <Button size="sm" onClick={() => openPosicionDialog()} className="h-8 text-xs">
                      <Plus size={12} className="mr-1" />Nueva posición
                    </Button>
                  ) : undefined
                }
                className="border-0 bg-transparent py-8"
              />
            ) : (
              <div className="flex flex-col gap-2">
                {posiciones.map((pos) => (
                  <div
                    key={pos.id}
                    className="flex items-center justify-between px-4 py-3 border border-border/60 rounded-xl hover:border-border hover:bg-muted/20 transition-all shadow-sm bg-card hover:-translate-y-[1px]"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="h-7 w-12 flex items-center justify-center text-[10px] font-extrabold uppercase rounded-lg border border-primary/20 bg-primary/[0.04] text-primary shrink-0 select-none tracking-wide">
                        {pos.abreviatura || "POS"}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-foreground truncate block">{pos.nombre}</span>
                        <span className="text-[9px] text-muted-foreground block">Demarcación Oficial</span>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex gap-0.5 items-center shrink-0">
                        <Tooltip content="Editar nombre o abreviatura">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded-lg hover:bg-muted" 
                            onClick={() => openPosicionDialog(pos)}
                          >
                            <Edit size={12} className="text-muted-foreground hover:text-foreground" />
                          </Button>
                        </Tooltip>
                        <Tooltip content="Eliminar posición">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive" 
                            onClick={() => handleDeletePosicion(pos)}
                          >
                            <Trash2 size={12} className="text-destructive" />
                          </Button>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Position Dialog */}
      <Dialog open={posicionDialogOpen} onOpenChange={setPosicionDialogOpen}>
        <DialogContent className="rounded-lg border border-border bg-popover shadow-none max-w-sm">
          <form onSubmit={handleSavePosicion}>
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
                onChange={(e) => {
                  const nombre = e.target.value;
                  const autoAbbr = nombre.trim().slice(0, 3).toUpperCase();
                  setPosicionForm({
                    nombre,
                    abreviatura:
                      !editingPosicion && !posicionForm.abreviatura
                        ? autoAbbr
                        : posicionForm.abreviatura || autoAbbr,
                  });
                }}
                placeholder="Ej: Portero, Centrocampista"
                className="h-9 text-xs border-border"
                required
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
            <Button type="button" variant="outline" onClick={() => setPosicionDialogOpen(false)} className="h-8 text-xs font-medium border-border">Cancelar</Button>
            <Button type="submit" disabled={posicionSaving || !posicionForm.nombre} className="h-8 text-xs font-medium shadow-none">
              {posicionSaving ? <Spinner size="sm" /> : editingPosicion ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
