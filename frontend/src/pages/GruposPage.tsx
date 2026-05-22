import { useState, useEffect, useCallback } from "react";
import api from "@/services/api";
import { getApiErrorMessage } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Users, Trash2, Edit, Plus, UserPlus, Check, X } from "lucide-react";
import { Grupo, Usuario } from "@/types";

export default function GruposPage() {
  const { hasPermission } = useAuth();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGrupo, setSelectedGrupo] = useState<Grupo | null>(null);
  const [saving, setSaving] = useState(false);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [searchUserQuery, setSearchUserQuery] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [gruposRes, usersRes] = await Promise.all([
        api.get("/api/grupos"),
        api.get("/api/usuarios"),
      ]);
      setGrupos(gruposRes.data);
      setUsuarios(usersRes.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const openEditDialog = (grupo: Grupo) => {
    setSelectedGrupo(grupo);
    setNombre(grupo.nombre);
    setDescripcion(grupo.descripcion || "");
    setSelectedUserIds(grupo.miembroIds || []);
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

      if (selectedGrupo) {
        await api.put(`/api/grupos/${selectedGrupo.id}`, payload);
        showSuccess("Grupo actualizado correctamente");
      } else {
        await api.post("/api/grupos", payload);
        showSuccess("Grupo creado correctamente");
      }
      setDialogOpen(false);
      fetchData();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || "Error al guardar el grupo");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGrupo = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este grupo?")) return;
    try {
      await api.delete(`/api/grupos/${id}`);
      showSuccess("Grupo eliminado correctamente");
      fetchData();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || "Error al eliminar el grupo");
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!hasPermission("gestionar_usuarios")) {
    return (
      <Alert variant="destructive">
        <AlertDescription>No tienes permisos para acceder a esta página</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl animate-fadeIn pb-12">
      {/* Cover/Header area */}
      <div className="flex items-center justify-between border-b border-border pb-4 pt-2">
        <div className="flex items-center gap-3">
          <span className="text-3xl select-none">👥</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestión de Grupos</h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              Crea audiencias personalizadas (como ligas o equipos) para convocar jugadores en lote rápidamente.
            </p>
          </div>
        </div>
        <Button 
          onClick={openCreateDialog} 
          className="h-9 px-3 gap-1.5 font-medium text-xs rounded-md shadow-none bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={14} /> 
          <span>Nuevo Grupo</span>
        </Button>
      </div>

      {error && (
        <div className="notion-callout border-destructive/20 bg-destructive/5 text-destructive p-3">
          <div className="notion-callout-icon">
            <X className="h-5 w-5" />
          </div>
          <div className="text-xs font-medium">{error}</div>
        </div>
      )}

      {success && (
        <div className="notion-callout border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 p-3">
          <div className="notion-callout-icon">
            <Check className="h-5 w-5" />
          </div>
          <div className="text-xs font-medium">{success}</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {grupos.length === 0 ? (
          <div className="col-span-full py-16 border border-dashed border-border rounded-lg bg-card text-center flex flex-col items-center justify-center space-y-3">
            <span className="text-4xl select-none">👥</span>
            <div>
              <h3 className="text-sm font-semibold">No hay grupos registrados</h3>
              <p className="text-xs text-muted-foreground max-w-xs mt-1">
                Crea un grupo de jugadores para poder convocarlos rápidamente en tus partidos.
              </p>
            </div>
            <Button onClick={openCreateDialog} className="h-8 px-4 text-xs font-semibold" variant="outline">
              Crear tu primer grupo
            </Button>
          </div>
        ) : (
          grupos.map((grupo) => (
            <div key={grupo.id} className="relative rounded-lg border border-border bg-card p-5 space-y-4 hover:border-foreground/20 transition-colors shadow-none">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold tracking-tight text-foreground">{grupo.nombre}</h3>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase bg-secondary px-1.5 py-0.5 rounded border border-border">
                    {grupo.miembroIds?.length || 0} jugadores
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
                  {grupo.descripcion || "Sin descripción"}
                </p>
              </div>

              {/* Preview of members */}
              <div className="pt-3 border-t border-border space-y-2">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Miembros</span>
                <div className="flex flex-wrap gap-1">
                  {grupo.miembroNombres?.slice(0, 4).map((nombre, idx) => (
                    <Badge key={idx} variant="outline" className="text-[9px] px-1.5 py-0 bg-secondary/50 border-border text-foreground font-semibold rounded shadow-none">
                      {nombre}
                    </Badge>
                  ))}
                  {(grupo.miembroIds?.length || 0) > 4 && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-bold border-border bg-foreground/5 text-foreground rounded shadow-none">
                      +{(grupo.miembroIds?.length || 0) - 4} más
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-1.5 pt-2 border-t border-border">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditDialog(grupo)}
                  className="h-7 w-7 rounded text-muted-foreground hover:text-foreground"
                  title="Editar grupo"
                >
                  <Edit size={13} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteGrupo(grupo.id)}
                  className="h-7 w-7 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Eliminar grupo"
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          ))
        )}
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
                <Label htmlFor="nombre" className="text-xs font-semibold text-muted-foreground">Nombre del Grupo</Label>
                <Input
                  id="nombre"
                  placeholder="Ej. LEALES FC, Liga de los Lunes..."
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="descripcion" className="text-xs font-semibold text-muted-foreground">Descripción</Label>
                <Input
                  id="descripcion"
                  placeholder="Ej. Grupo de amigos para los partidos semanales de los lunes."
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
                          isSelected ? "bg-primary/5 text-foreground" : "hover:bg-secondary/30"
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
              disabled={saving}
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
