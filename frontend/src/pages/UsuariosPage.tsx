import { useState, useEffect, useCallback } from "react";
import api from "@/services/api";
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
import { Shield, Trash2, Edit, Plus, UserX, UserCheck } from "lucide-react";

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
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), 3000);
  };

  const openEditDialog = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setSelectedRoles([...usuario.roles]);
    setEditDialogOpen(true);
    setError("");
  };

  const openCreateDialog = () => {
    setFormData({ nombre: "", email: "", roles: ["Jugador"] });
    setCreateDialogOpen(true);
    setError("");
  };

  const handleSaveRoles = async () => {
    if (!selectedUsuario) return;
    setSaving(true);
    setError("");
    try {
      await api.put("/api/usuarios/roles", {
        usuarioId: selectedUsuario.id,
        roles: selectedRoles,
      });
      showSuccess("Roles actualizados correctamente");
      setEditDialogOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al actualizar roles");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    setSaving(true);
    setError("");
    try {
      await api.post("/api/usuarios", {
        nombre: formData.nombre,
        email: formData.email,
        roles: formData.roles,
      });
      showSuccess("Usuario creado correctamente");
      setCreateDialogOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al crear usuario");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm("¿Eliminar este usuario? Esta acción lo desactivará.")) return;
    try {
      await api.delete(`/api/usuarios/${id}`);
      showSuccess("Usuario eliminado correctamente");
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al eliminar usuario");
    }
  };

  const handleToggleActivo = async (id: number) => {
    try {
      await api.patch(`/api/usuarios/${id}/toggle-activo`);
      showSuccess("Estado actualizado correctamente");
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al actualizar estado");
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra los usuarios y sus roles en el sistema
          </p>
        </div>
        <Button onClick={openCreateDialog} className="glow-btn">
          <Plus size={16} /> Nuevo Usuario
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Usuarios Registrados ({usuarios.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {usuarios.map((usuario) => (
              <div
                key={usuario.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{usuario.nombre}</span>
                    <Badge variant={usuario.activo ? "success" : "secondary"}>
                      {usuario.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{usuario.email}</p>
                  <div className="flex gap-1">
                    {usuario.roles.map((rol) => (
                      <Badge key={rol} variant="info">
                        {rol}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleActivo(usuario.id)}
                    title={usuario.activo ? "Desactivar" : "Activar"}
                  >
                    {usuario.activo ? (
                      <UserX size={16} className="text-warning" />
                    ) : (
                      <UserCheck size={16} className="text-success" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(usuario)}
                  >
                    <Shield size={14} className="mr-1" /> Editar Roles
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteUser(usuario.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
            {usuarios.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No hay usuarios registrados
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Roles de Usuario</DialogTitle>
            <DialogDescription>
              Asigna los roles correspondientes a {selectedUsuario?.nombre}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-4 py-4">
            {roles.map((rol) => (
              <div key={rol.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`rol-${rol.id}`}
                  checked={selectedRoles.includes(rol.nombre)}
                  onCheckedChange={() => toggleRole(rol.nombre)}
                />
                <Label htmlFor={`rol-${rol.id}`} className="cursor-pointer">
                  {rol.nombre}
                </Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveRoles}
              disabled={saving || selectedRoles.length === 0}
              className="glow-btn"
            >
              {saving ? <Spinner /> : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Ingresa los datos del nuevo usuario
            </DialogDescription>
          </DialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Nombre completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@ejemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Roles iniciales</Label>
              <div className="space-y-2">
                {roles.map((rol) => (
                  <div key={rol.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`new-rol-${rol.id}`}
                      checked={formData.roles.includes(rol.nombre)}
                      onCheckedChange={() => toggleFormRole(rol.nombre)}
                    />
                    <Label htmlFor={`new-rol-${rol.id}`} className="cursor-pointer">
                      {rol.nombre}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={saving || !formData.nombre || !formData.email}
              className="glow-btn"
            >
              {saving ? <Spinner /> : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}