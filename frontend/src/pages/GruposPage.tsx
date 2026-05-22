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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Grupos</h1>
          <p className="text-muted-foreground">
            Crea audiencias personalizadas (como ligas o equipos) para tus convocatorias recurrentes o individuales
          </p>
        </div>
        <Button onClick={openCreateDialog} className="">
          <Plus size={16} className="mr-2" /> Nuevo Grupo
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500/30 bg-green-500/10 text-green-400">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {grupos.length === 0 ? (
          <Card className="col-span-full py-12 flex flex-col items-center justify-center text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold">No hay grupos registrados</h3>
            <p className="text-muted-foreground max-w-sm mt-1">
              Crea un grupo de jugadores para poder convocarlos en lote rápidamente.
            </p>
            <Button onClick={openCreateDialog} className="mt-4" variant="outline">
              Crear tu primer grupo
            </Button>
          </Card>
        ) : (
          grupos.map((grupo) => (
            <Card key={grupo.id} className="relative overflow-hidden group hover:border-primary/20 transition-colors border">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold">{grupo.nombre}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1 min-h-[2.5rem]">
                      {grupo.descripcion || "Sin descripción"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Miembros:</span>
                  <Badge variant="secondary" className="font-bold">
                    {grupo.miembroIds?.length || 0} jugadores
                  </Badge>
                </div>

                {/* Micro-preview of members */}
                <div className="flex flex-wrap gap-1.5 pt-2 border-t">
                  {grupo.miembroNombres?.slice(0, 5).map((nombre, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs bg-muted/20">
                      {nombre}
                    </Badge>
                  ))}
                  {(grupo.miembroIds?.length || 0) > 5 && (
                    <Badge variant="outline" className="text-xs text-primary font-bold">
                      +{(grupo.miembroIds?.length || 0) - 5} más
                    </Badge>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t mt-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(grupo)}
                    title="Editar grupo"
                    className="hover:text-primary"
                  >
                    <Edit size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteGrupo(grupo.id)}
                    title="Eliminar grupo"
                    className="hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Creation / Edition Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl bg-card border">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {selectedGrupo ? "Editar Grupo" : "Crear Nuevo Grupo"}
            </DialogTitle>
            <DialogDescription>
              Configura los detalles del grupo y selecciona los miembros que formarán parte de esta audiencia.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 my-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del Grupo</Label>
                <Input
                  id="nombre"
                  placeholder="Ej. LEALES FC, Liga de los Lunes..."
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input
                  id="descripcion"
                  placeholder="Ej. Grupo de amigos para los partidos semanales de los lunes."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Seleccionar Jugadores ({selectedUserIds.length})</Label>
                <Input
                  placeholder="Buscar jugador..."
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  className="max-w-[250px] h-8 text-xs"
                />
              </div>

              <div className="border rounded-xl max-h-[220px] overflow-y-auto divide-y divide-border/60 bg-muted/10">
                {filteredUsers.length === 0 ? (
                  <p className="text-center py-6 text-sm text-muted-foreground">No se encontraron jugadores</p>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelected = selectedUserIds.includes(user.id);
                    return (
                      <div
                        key={user.id}
                        onClick={() => toggleUserSelection(user.id)}
                        className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors duration-200 ${
                          isSelected ? "bg-primary/5 text-foreground" : "hover:bg-muted/30"
                        }`}
                      >
                        <div>
                          <p className="text-sm font-semibold">{user.nombre}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors duration-200 ${
                          isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                        }`}>
                          {isSelected && <Check size={14} className="stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveGrupo} disabled={saving} className="">
              {saving ? <Spinner size="sm" className="mr-2" /> : null}
              {selectedGrupo ? "Actualizar Grupo" : "Crear Grupo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
