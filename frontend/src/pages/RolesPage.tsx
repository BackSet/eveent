import { useState, useEffect } from "react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Plus, Pencil, Trash2, Key } from "lucide-react";

interface Permiso {
  id: number;
  clave: string;
  descripcion: string;
}

interface Rol {
  id: number;
  nombre: string;
  permisos: string[];
}

interface RolFormData {
  nombre: string;
  permisoIds: number[];
}

const PROTECTED_ROLES = ["SuperAdmin", "Organizador", "Jugador"];

export default function RolesPage() {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRol, setEditingRol] = useState<Rol | null>(null);
  const [formData, setFormData] = useState<RolFormData>({ nombre: "", permisoIds: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      const [rolesRes, permisosRes] = await Promise.all([
        api.get("/api/roles"),
        api.get("/api/roles/permisos"),
      ]);
      setRoles(rolesRes.data);
      setPermisos(permisosRes.data);
    } catch (err) {
      console.error("Error al cargar datos", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openDialog = (rol?: Rol) => {
    if (rol) {
      setEditingRol(rol);
      setFormData({
        nombre: rol.nombre,
        permisoIds: rol.permisos
          .map(p => permisos.find(perm => perm.clave === p)?.id)
          .filter(Boolean) as number[],
      });
    } else {
      setEditingRol(null);
      setFormData({ nombre: "", permisoIds: [] });
    }
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      if (editingRol) {
        await api.put(`/api/roles/${editingRol.id}`, formData);
      } else {
        await api.post("/api/roles", formData);
      }
      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al guardar rol");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar el rol "${nombre}"?`)) return;
    try {
      await api.delete(`/api/roles/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Error al eliminar rol");
    }
  };

  const togglePermiso = (permisoId: number) => {
    setFormData(prev => ({
      ...prev,
      permisoIds: prev.permisoIds.includes(permisoId)
        ? prev.permisoIds.filter(id => id !== permisoId)
        : [...prev.permisoIds, permisoId],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles</h1>
          <p className="text-muted-foreground">
            Gestión de roles y permisos del sistema
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus size={16} /> Nuevo Rol
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingRol ? "Editar Rol" : "Nuevo Rol"}
              </DialogTitle>
              <DialogDescription>
                {editingRol ? `Editando rol: ${editingRol.nombre}` : "Crear un nuevo rol en el sistema"}
              </DialogDescription>
            </DialogHeader>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del Rol</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Moderador"
                  disabled={editingRol ? PROTECTED_ROLES.includes(editingRol.nombre) : false}
                />
              </div>
              <div className="space-y-2">
                <Label>Permisos</Label>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded-md p-3">
                  {permisos.map(permiso => (
                    <div key={permiso.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`perm-${permiso.id}`}
                        checked={formData.permisoIds.includes(permiso.id)}
                        onCheckedChange={() => togglePermiso(permiso.id)}
                      />
                      <label
                        htmlFor={`perm-${permiso.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {permiso.clave}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || !formData.nombre}>
                {saving ? <Spinner /> : editingRol ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map(rol => (
            <Card key={rol.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-md">
                    <Shield size={20} className="text-primary" />
                  </div>
                  <CardTitle className="text-lg">{rol.nombre}</CardTitle>
                </div>
                {PROTECTED_ROLES.includes(rol.nombre) && (
                  <Badge variant="secondary">Sistema</Badge>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {rol.permisos.map(perm => (
                    <Badge key={perm} variant="outline" className="text-xs">
                      <Key size={10} className="mr-1" />
                      {perm}
                    </Badge>
                  ))}
                </div>
                {!PROTECTED_ROLES.includes(rol.nombre) && (
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button variant="outline" size="sm" onClick={() => openDialog(rol)}>
                      <Pencil size={14} /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(rol.id, rol.nombre)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {roles.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay roles registrados</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}