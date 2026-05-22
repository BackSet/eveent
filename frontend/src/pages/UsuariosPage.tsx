import { useState, useEffect, useCallback } from "react";
import api from "@/services/api";
import { getApiErrorMessage } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { UserCog, Shield, Trash2, Edit, Plus, UserX, UserCheck } from "lucide-react";

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  roles: string[];
  activo: boolean;
  fechaCreacion: string;
}

interface Rol {
  id: number;
  nombre: string;
}

interface UsuarioFormData {
  nombre: string;
  email: string;
  roles: string[];
}

export default function UsuariosPage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<UsuarioFormData>({ nombre: "", email: "", roles: ["Jugador"] });

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get("/api/usuarios"),
        api.get("/api/usuarios/roles"),
      ]);
      setUsuarios(usersRes.data);
      setRoles(rolesRes.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const openEditDialog = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setSelectedRoles([...usuario.roles]);
    setEditDialogOpen(true);
  };

  const openCreateDialog = () => {
    setFormData({ nombre: "", email: "", roles: ["Jugador"] });
    setCreateDialogOpen(true);
  };

  const handleSaveRoles = async () => {
    if (!selectedUsuario) return;
    setSaving(true);
    try {
      await api.put("/api/usuarios/roles", {
        usuarioId: selectedUsuario.id,
        roles: selectedRoles,
      });
      toast.success("Roles actualizados correctamente");
      setEditDialogOpen(false);
      fetchData();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err) || "Error al actualizar roles");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    setSaving(true);
    try {
      await api.post("/api/usuarios", {
        nombre: formData.nombre,
        email: formData.email,
        roles: formData.roles,
      });
      toast.success("Usuario creado correctamente");
      setCreateDialogOpen(false);
      fetchData();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err) || "Error al crear usuario");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm("¿Eliminar este usuario? Esta acción lo desactivará.")) return;
    try {
      await api.delete(`/api/usuarios/${id}`);
      toast.success("Usuario eliminado correctamente");
      fetchData();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err) || "Error al eliminar usuario");
    }
  };

  const handleToggleActivo = async (id: number) => {
    try {
      await api.patch(`/api/usuarios/${id}/toggle-activo`);
      toast.success("Estado de usuario actualizado correctamente");
      fetchData();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err) || "Error al actualizar estado");
    }
  };

  const toggleRole = (roleName: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleName)
        ? prev.filter((r) => r !== roleName)
        : [...prev, roleName]
    );
  };

  const toggleFormRole = (roleName: string) => {
    setFormData((prev) => ({
      ...prev,
      roles: prev.roles.includes(roleName)
        ? prev.roles.filter((r) => r !== roleName)
        : [...prev.roles, roleName],
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!hasPermission("gestionar_usuarios") && !hasPermission("gestionar_roles")) {
    return (
      <Alert variant="destructive">
        <AlertDescription>No tienes permisos para acceder a esta página</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn pb-12 px-4 sm:px-6">
      {/* Cover/Header area */}
      <div className="flex items-center justify-between border-b border-border pb-4 pt-2">
        <div className="flex items-center gap-3">
          <span className="text-3xl select-none">🧑‍💻</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Usuarios del Sistema</h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              Base de datos y privilegios de todos los miembros del workspace.
            </p>
          </div>
        </div>
        <Button 
          onClick={openCreateDialog} 
          className="h-9 px-3 gap-1.5 font-medium text-xs rounded-md shadow-none bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={14} /> 
          <span>Nuevo Usuario</span>
        </Button>
      </div>

      {error && (
        <div className="notion-callout border-destructive/20 bg-destructive/5 text-destructive p-3">
          <div className="notion-callout-icon">
            <Shield size={16} className="shrink-0" />
          </div>
          <div className="text-xs font-medium">{error}</div>
        </div>
      )}

      {/* Notion List View Database */}
      <div className="border border-border rounded-lg bg-card overflow-hidden">
        {/* Database header row */}
        <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 border-b border-border bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
          <div className="col-span-4">Nombre / Email</div>
          <div className="col-span-2">Estado</div>
          <div className="col-span-4">Roles asignados</div>
          <div className="col-span-2 text-right">Acciones</div>
        </div>

        {/* Database records */}
        <div className="divide-y divide-border">
          {usuarios.map((usuario) => (
            <div
              key={usuario.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-4 py-3 items-center hover:bg-secondary/20 transition-colors"
            >
              {/* User details */}
              <div className="col-span-1 md:col-span-4 flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-secondary flex items-center justify-center font-bold text-xs text-foreground border border-border uppercase">
                  {usuario.nombre.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate">{usuario.nombre}</div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate">{usuario.email}</div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="col-span-1 md:col-span-2">
                <Badge 
                  variant="outline" 
                  className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold shadow-none ${
                    usuario.activo 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                      : "bg-secondary border-border text-muted-foreground"
                  }`}
                >
                  {usuario.activo ? "Activo" : "Inactivo"}
                </Badge>
              </div>

              {/* Roles */}
              <div className="col-span-1 md:col-span-4 flex flex-wrap gap-1">
                {usuario.roles.map((rol) => (
                  <Badge 
                    key={rol} 
                    variant="outline" 
                    className="text-[9px] uppercase px-1.5 py-0.2 font-semibold tracking-wider bg-secondary/50 border-border text-foreground rounded shadow-none"
                  >
                    {rol}
                  </Badge>
                ))}
              </div>

              {/* Actions */}
              <div className="col-span-1 md:col-span-2 flex items-center justify-end gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggleActivo(usuario.id)}
                  className="h-7 w-7 rounded hover:bg-secondary text-muted-foreground"
                  title={usuario.activo ? "Desactivar" : "Activar"}
                >
                  {usuario.activo ? (
                    <UserX size={13} className="text-amber-600 dark:text-amber-400" />
                  ) : (
                    <UserCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(usuario)}
                  className="h-7 px-2 text-[10px] font-semibold rounded border-border hover:bg-secondary gap-1"
                >
                  <Shield size={11} /> 
                  <span>Roles</span>
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteUser(usuario.id)}
                  className="h-7 w-7 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Eliminar"
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          ))}

          {usuarios.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xs text-muted-foreground">No hay usuarios registrados en el workspace.</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Roles Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-popover border border-border shadow-none rounded-lg max-w-sm p-5 space-y-4">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-sm font-semibold tracking-tight">Editar Roles de Usuario</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Asigna los roles y permisos de acceso para {selectedUsuario?.nombre}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="notion-callout border-destructive/20 bg-destructive/5 text-destructive p-3 rounded">
              <div className="notion-callout-icon">
                <Shield size={14} className="shrink-0" />
              </div>
              <div className="text-[11px] font-medium leading-normal">{error}</div>
            </div>
          )}

          <div className="space-y-2.5 py-2 max-h-[220px] overflow-y-auto pr-1">
            {roles.map((rol) => (
              <div key={rol.id} className="flex items-center space-x-2.5 px-1 py-1 rounded hover:bg-secondary/40 transition-colors">
                <Checkbox
                  id={`rol-${rol.id}`}
                  checked={selectedRoles.includes(rol.nombre)}
                  onCheckedChange={() => toggleRole(rol.nombre)}
                  className="rounded border-border"
                />
                <Label htmlFor={`rol-${rol.id}`} className="text-xs font-semibold text-foreground cursor-pointer flex-1">
                  {rol.nombre}
                </Label>
              </div>
            ))}
          </div>

          <DialogFooter className="border-t border-border pt-3 gap-2">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="h-8 text-xs font-semibold px-3 border-border hover:bg-secondary shadow-none"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveRoles}
              disabled={saving || selectedRoles.length === 0}
              className="h-8 text-xs font-semibold px-3 shadow-none bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? <Spinner size="sm" /> : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-popover border border-border shadow-none rounded-lg max-w-sm p-5 space-y-4">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-sm font-semibold tracking-tight">Crear Nuevo Usuario</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Ingresa los detalles básicos para invitar a un miembro al workspace.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="notion-callout border-destructive/20 bg-destructive/5 text-destructive p-3 rounded">
              <div className="notion-callout-icon">
                <Shield size={14} className="shrink-0" />
              </div>
              <div className="text-[11px] font-medium leading-normal">{error}</div>
            </div>
          )}

          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="nombre" className="text-xs font-semibold text-muted-foreground">Nombre</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Nombre completo"
                className="h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@ejemplo.com"
                className="h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Roles iniciales</Label>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto border border-border p-2 rounded bg-secondary/10">
                {roles.map((rol) => (
                  <div key={rol.id} className="flex items-center space-x-2.5 px-1 py-1 rounded hover:bg-secondary/40 transition-colors">
                    <Checkbox
                      id={`new-rol-${rol.id}`}
                      checked={formData.roles.includes(rol.nombre)}
                      onCheckedChange={() => toggleFormRole(rol.nombre)}
                      className="rounded border-border"
                    />
                    <Label htmlFor={`new-rol-${rol.id}`} className="text-xs font-semibold text-foreground cursor-pointer flex-1">
                      {rol.nombre}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-3 gap-2">
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              className="h-8 text-xs font-semibold px-3 border-border hover:bg-secondary shadow-none"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={saving || !formData.nombre || !formData.email}
              className="h-8 text-xs font-semibold px-3 shadow-none bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? <Spinner size="sm" /> : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}