import { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/services/api";
import { getApiErrorMessage } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { Users, Trash2, Edit, Plus, Check, X, Search, Settings } from "lucide-react";
import { Grupo, Usuario } from "@/types";

export default function GruposPage() {
  const { hasPermission } = useAuth();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [selectedGrupo, setSelectedGrupo] = useState<Grupo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [searchUserQuery, setSearchUserQuery] = useState("");
  const [searchMemberQuery, setSearchMemberQuery] = useState("");

  const isOrganizer = hasPermission("crear_convocatoria");

  const fetchData = useCallback(async (selectGroupIdToKeep?: number) => {
    try {
      const [gruposRes, usersRes] = await Promise.all([
        api.get("/api/grupos"),
        api.get("/api/usuarios"),
      ]);
      setGrupos(gruposRes.data);
      setUsuarios(usersRes.data);

      if (gruposRes.data.length > 0) {
        if (selectGroupIdToKeep) {
          const match = gruposRes.data.find((g: Grupo) => g.id === selectGroupIdToKeep);
          setSelectedGrupo(match || gruposRes.data[0]);
        } else if (!selectedGrupo) {
          setSelectedGrupo(gruposRes.data[0]);
        } else {
          // Sync current selected group
          const match = gruposRes.data.find((g: Grupo) => g.id === selectedGrupo.id);
          setSelectedGrupo(match || gruposRes.data[0]);
        }
      } else {
        setSelectedGrupo(null);
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [selectedGrupo]);

  useEffect(() => {
    fetchData();
  }, []);

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), 3000);
  };

  const openCreateDialog = () => {
    setSelectedGrupo(null);
    setNombre("");
    setDescripcion("");
    setSelectedUserIds([]);
    setSearchUserQuery("");
    setDialogOpen(true);
    setError("");
  };

  const openEditDialog = (e: React.MouseEvent, grupo: Grupo) => {
    e.stopPropagation();
    setNombre(grupo.nombre);
    setDescripcion(grupo.descripcion || "");
    setSelectedUserIds(grupo.miembroIds || []);
    setSearchUserQuery("");
    setDialogOpen(true);
    setError("");
  };

  const openGestionarMiembros = () => {
    if (!selectedGrupo) return;
    setNombre(selectedGrupo.nombre);
    setDescripcion(selectedGrupo.descripcion || "");
    setSelectedUserIds(selectedGrupo.miembroIds || []);
    setSearchUserQuery("");
    setDialogOpen(true);
    setError("");
  };

  const handleSaveGrupo = async () => {
    if (!nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        nombre,
        descripcion,
        miembroIds: selectedUserIds,
      };

      if (selectedGrupo && selectedGrupo.id) {
        const { data } = await api.put(`/api/grupos/${selectedGrupo.id}`, payload);
        showSuccess("Grupo actualizado correctamente");
        await fetchData(data.id);
      } else {
        const { data } = await api.post("/api/grupos", payload);
        showSuccess("Grupo creado correctamente");
        await fetchData(data.id);
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || "Error al guardar el grupo");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGrupo = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm("¿Estás seguro de que deseas eliminar este grupo?")) return;
    try {
      await api.delete(`/api/grupos/${id}`);
      showSuccess("Grupo eliminado correctamente");
      if (selectedGrupo?.id === id) {
        setSelectedGrupo(null);
      }
      fetchData();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || "Error al eliminar el grupo");
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!selectedGrupo) return;
    try {
      const updatedIds = selectedGrupo.miembroIds?.filter(id => id !== userId) || [];
      const payload = {
        nombre: selectedGrupo.nombre,
        descripcion: selectedGrupo.descripcion,
        miembroIds: updatedIds,
      };
      await api.put(`/api/grupos/${selectedGrupo.id}`, payload);
      showSuccess("Jugador removido del grupo");
      await fetchData(selectedGrupo.id);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || "Error al remover jugador");
    }
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredUsers = usuarios.filter(
    (u) =>
      u.nombre.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUserQuery.toLowerCase())
  );

  const selectedGrupoMembers = useMemo(() => {
    if (!selectedGrupo || !selectedGrupo.miembroIds) return [];
    return selectedGrupo.miembroIds
      .map(id => usuarios.find(u => u.id === id))
      .filter((u): u is Usuario => u !== undefined)
      .filter(u => 
        !searchMemberQuery || 
        u.nombre.toLowerCase().includes(searchMemberQuery.toLowerCase()) || 
        u.email.toLowerCase().includes(searchMemberQuery.toLowerCase())
      );
  }, [selectedGrupo, usuarios, searchMemberQuery]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!hasPermission("ver_convocatoria")) {
    return (
      <Alert variant="destructive" className="max-w-5xl mx-auto my-6">
        <AlertDescription>No tienes permisos para acceder a esta página</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto notion-animate-fade pb-12 px-4 sm:px-6">
      {/* Cover / Header section */}
      <div className="relative rounded-lg overflow-hidden border border-border bg-muted/30">
        <div className="h-28 notion-cover notion-cover-sports" />
        <div className="p-6 relative pt-10">
          <div className="absolute top-[-36px] left-6 text-5xl bg-background p-2 rounded-xl border border-border/80 shadow-sm select-none">
            👥
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Gestión de Grupos</h1>
              <p className="text-muted-foreground text-xs mt-1">Crea y gestiona audiencias personalizadas de jugadores para realizar convocatorias en lote rápidamente.</p>
            </div>
            {isOrganizer && (
              <Button onClick={openCreateDialog} className="gap-1.5 font-medium text-xs h-9 rounded-md shadow-none bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus size={14} />
                <span>Nuevo Grupo</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="notion-callout border-destructive/20 bg-destructive/5 text-destructive p-3 animate-fadeIn">
          <div className="notion-callout-icon">
            <X className="h-5 w-5" />
          </div>
          <div className="text-xs font-medium">{error}</div>
        </div>
      )}

      {success && (
        <div className="notion-callout border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 p-3 animate-fadeIn">
          <div className="notion-callout-icon">
            <Check className="h-5 w-5" />
          </div>
          <div className="text-xs font-medium">{success}</div>
        </div>
      )}

      {/* Split Workspace Layout */}
      <div className="grid gap-6 md:grid-cols-12 items-start">
        {/* Left Column: Groups list */}
        <div className="md:col-span-5 border border-border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between select-none">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Grupos</span>
            <span className="text-[10px] font-semibold text-muted-foreground bg-muted border border-border/80 px-2 py-0.5 rounded-full">
              {grupos.length} registrados
            </span>
          </div>

          <div className="p-3 space-y-1.5">
            {grupos.length === 0 ? (
              <div className="text-center py-12 select-none">
                <p className="text-muted-foreground text-xs font-medium">Sin grupos configurados</p>
                <Button onClick={openCreateDialog} className="h-7 text-[10px] font-bold px-3 mt-3" variant="outline">
                  Crear primer grupo
                </Button>
              </div>
            ) : (
              grupos.map((grupo) => {
                const isSelected = selectedGrupo?.id === grupo.id;
                return (
                  <div
                    key={grupo.id}
                    onClick={() => setSelectedGrupo(grupo)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded border transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-accent/70 border-border/100"
                        : "hover:bg-muted/40 border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg shrink-0">👥</span>
                      <div className="min-w-0">
                        <span className={`text-sm font-semibold truncate block ${isSelected ? "text-foreground font-bold" : "text-muted-foreground"}`}>
                          {grupo.nombre}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">{grupo.miembroIds?.length || 0} Jugadores</span>
                      </div>
                    </div>
                    
                    {isOrganizer && (
                      <div className="flex gap-0.5 items-center shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 rounded hover:bg-muted" 
                          onClick={(e) => openEditDialog(e, grupo)}
                        >
                          <Edit size={11} className="text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 rounded hover:bg-destructive/10" 
                          onClick={(e) => handleDeleteGrupo(e, grupo.id)}
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

        {/* Right Column: Group Members */}
        <div className="md:col-span-7 border border-border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between select-none">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider truncate max-w-[220px]">
              {selectedGrupo ? `Miembros · ${selectedGrupo.nombre}` : "Miembros del Grupo"}
            </span>
            {selectedGrupo && isOrganizer && (
              <Button size="sm" variant="outline" onClick={openGestionarMiembros} className="gap-1 font-medium h-7 text-xs border-border px-2.5 hover:bg-accent shadow-none">
                <Settings size={11} />
                <span>Gestionar</span>
              </Button>
            )}
          </div>

          <div className="p-4 space-y-4">
            {!selectedGrupo ? (
              <div className="text-center py-12 select-none">
                <p className="text-xs text-muted-foreground font-semibold">Selecciona un grupo del panel izquierdo</p>
              </div>
            ) : (
              <>
                {/* Description and Search */}
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground bg-muted/20 border border-border/60 p-3 rounded-lg leading-relaxed">
                    <span className="font-semibold text-foreground block mb-0.5">Descripción del Grupo</span>
                    {selectedGrupo.descripcion || "Sin descripción establecida."}
                  </div>
                  
                  {selectedGrupo.miembroIds && selectedGrupo.miembroIds.length > 0 && (
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-muted-foreground/50">
                        <Search size={12} />
                      </span>
                      <Input
                        placeholder="Buscar jugador por nombre o correo..."
                        value={searchMemberQuery}
                        onChange={(e) => setSearchMemberQuery(e.target.value)}
                        className="h-8 pl-7 text-[11px] border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border"
                      />
                    </div>
                  )}
                </div>

                {/* Members list */}
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {selectedGrupoMembers.length === 0 ? (
                    <div className="text-center py-12 select-none border border-dashed border-border rounded-lg bg-muted/[0.02]">
                      <p className="text-xs text-muted-foreground font-medium">
                        {searchMemberQuery ? "Sin resultados para la búsqueda" : "Este grupo no tiene jugadores asociados"}
                      </p>
                      {!searchMemberQuery && isOrganizer && (
                        <Button onClick={openGestionarMiembros} className="h-7 text-[10px] font-bold px-3 mt-3" variant="outline">
                          Agregar Jugadores
                        </Button>
                      )}
                    </div>
                  ) : (
                    selectedGrupoMembers.map((user) => (
                      <div 
                        key={user.id} 
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-border/60 bg-card gap-4 hover:border-border hover:bg-muted/10 transition-all shadow-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-full bg-primary/[0.04] flex items-center justify-center font-bold text-xs text-primary border border-primary/10 shrink-0 select-none">
                            {user.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate leading-tight">{user.nombre}</p>
                            <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">{user.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3.5 shrink-0 ml-auto sm:ml-0">
                          {/* Preferred positions */}
                          <div className="flex flex-wrap sm:justify-end gap-1 max-w-[200px]">
                            {user.posiciones && user.posiciones.length > 0 ? (
                              user.posiciones.map(pos => (
                                <div key={pos.posicionId} className="flex items-center bg-primary/[0.03] border border-primary/15 px-2 py-0.5 rounded-md select-none">
                                  <span className="text-[9px] font-bold text-foreground/80">{pos.posicionNombre}</span>
                                </div>
                              ))
                            ) : (
                              <span className="text-[9px] text-muted-foreground italic font-medium">Sin posiciones</span>
                            )}
                          </div>

                          {/* Action button */}
                          {isOrganizer && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleRemoveMember(user.id)}
                              className="h-6 w-6 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                              title="Quitar del grupo"
                            >
                              <X size={13} />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Creation / Edition Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-popover border border-border shadow-none rounded-lg max-w-md p-5 space-y-4">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-sm font-semibold tracking-tight">
              {selectedGrupo ? "⚙️ Editar Grupo" : "✨ Crear Nuevo Grupo"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Configura los detalles del grupo y selecciona los miembros que formarán parte.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="nombre" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre del Grupo</Label>
                <Input
                  id="nombre"
                  placeholder="Ej. LEALES FC, Liga de los Lunes..."
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="descripcion" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descripción</Label>
                <Input
                  id="descripcion"
                  placeholder="Ej. Grupo de amigos para las convocatorias semanales de los lunes."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between border-b border-border pb-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Seleccionar Jugadores ({selectedUserIds.length})
                </Label>
                <input
                  type="text"
                  placeholder="Buscar jugador..."
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  className="px-2 py-1 h-7 w-[160px] rounded border border-border bg-background text-[11px] font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="border border-border rounded bg-secondary/10 max-h-[160px] overflow-y-auto divide-y divide-border pr-1">
                {filteredUsers.length === 0 ? (
                  <p className="text-center py-6 text-xs text-muted-foreground">No se encontraron jugadores</p>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelected = selectedUserIds.includes(user.id);
                    return (
                      <div
                        key={user.id}
                        onClick={() => toggleUserSelection(user.id)}
                        className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/5 text-foreground font-semibold" : "hover:bg-secondary/30"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{user.nombre}</p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">{user.email}</p>
                        </div>
                        <div className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-colors ${
                          isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border bg-background"
                        }`}>
                          {isSelected && <Check size={11} className="stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-3 gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)} 
              disabled={saving}
              className="h-8 text-xs font-semibold px-3 border-border hover:bg-secondary shadow-none"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveGrupo} 
              disabled={saving || !nombre}
              className="h-8 text-xs font-semibold px-3 shadow-none bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving && <Spinner size="sm" className="mr-1.5" />}
              <span>{selectedGrupo ? "Guardar Cambios" : "Crear Grupo"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
