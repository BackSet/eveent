import { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/services/api";
import { getApiErrorMessage } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { RolesGridSkeleton } from "@/components/ui/page-skeletons";
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
import { Shield, Plus, Pencil, Trash2, Key } from "lucide-react";
import {
  getPermissionModuleId,
  PermissionModuleId,
  PERMISSION_MODULES,
} from "@/lib/iconography";
import { ModuleIcon, PageHeaderIcon } from "@/components/ui/page-icon";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { InfoHint } from "@/components/ui/info-hint";
import { Tooltip } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { PresetChips } from "@/components/ui/preset-chips";
import { validateRequiredTrim } from "@/lib/formValidation";

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
  const toast = useToast();
  const confirm = useConfirm();
  const [roles, setRoles] = useState<Rol[]>([]);
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRol, setEditingRol] = useState<Rol | null>(null);
  const [formData, setFormData] = useState<RolFormData>({ nombre: "", permisoIds: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const groupedPermisos = useMemo(() => {
    const groups = new Map<PermissionModuleId, Permiso[]>();
    for (const id of Object.values(PermissionModuleId)) {
      groups.set(id, []);
    }
    permisos.forEach((p) => {
      const moduleId = getPermissionModuleId(p.clave);
      groups.get(moduleId)!.push(p);
    });
    return Array.from(groups.entries()).filter(([, items]) => items.length > 0);
  }, [permisos]);

  const fetchData = useCallback(async () => {
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
  }, []);

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

  const selectModulePermissions = (moduleId: PermissionModuleId, onlyVer = false) => {
    const ids = permisos
      .filter((p) => getPermissionModuleId(p.clave) === moduleId)
      .filter((p) => !onlyVer || p.clave.startsWith("ver_"))
      .map((p) => p.id);
    setFormData((prev) => ({
      ...prev,
      permisoIds: [...new Set([...prev.permisoIds, ...ids])],
    }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const nameErr = validateRequiredTrim(formData.nombre, "El nombre del rol");
    if (nameErr) {
      setError(nameErr);
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editingRol) {
        await api.put(`/api/roles/${editingRol.id}`, formData);
        toast.success("Rol actualizado", `Los permisos de "${formData.nombre}" se guardaron.`);
      } else {
        await api.post("/api/roles", formData);
        toast.success("Rol creado", `"${formData.nombre}" ya está disponible para asignar.`);
      }
      setDialogOpen(false);
      fetchData();
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err) || "Error al guardar rol";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, nombre: string) => {
    const ok = await confirm({
      title: "Eliminar rol",
      description: (
        <span>
          ¿Eliminar el rol <strong>"{nombre}"</strong>? Los usuarios que lo tenían asignado
          perderán los permisos correspondientes. No podrás recuperarlo después.
        </span>
      ),
      confirmLabel: "Sí, eliminar",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`/api/roles/${id}`);
      toast.success("Rol eliminado", `"${nombre}" se eliminó del sistema.`);
      fetchData();
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err) || "Error al eliminar rol";
      toast.error(msg);
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
    <div className="page-shell space-y-6 animate-fadeIn">
      {/* Cover/Header area */}
      <div className="flex items-center justify-between border-b border-border pb-4 pt-2">
        <div className="flex items-center gap-3">
          <PageHeaderIcon icon={PERMISSION_MODULES[PermissionModuleId.ROLES].icon} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Roles del Sistema
              <InfoHint side="right" maxWidth={320}>
                Los <strong>roles</strong> agrupan permisos. Asignas un rol a un usuario y este
                hereda todas sus capacidades. Los roles <em>de sistema</em> (SuperAdmin,
                Organizador, Jugador) no pueden eliminarse, pero sí editar sus permisos.
              </InfoHint>
            </h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              Define qué puede hacer cada tipo de usuario en el workspace.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()} className="h-9 px-3 gap-1.5 font-medium text-xs rounded-md shadow-none bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus size={14} /> 
              <span>Nuevo Rol</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-popover border border-border shadow-none rounded-lg w-[calc(100vw-2rem)] max-w-[min(100%,28rem)] sm:max-w-md p-5 space-y-4">
            <form onSubmit={handleSave}>
            <DialogHeader className="border-b border-border pb-3">
              <DialogTitle className="text-sm font-semibold tracking-tight">
                {editingRol ? "Editar Rol" : "Nuevo Rol"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                {editingRol ? `Editando rol: ${editingRol.nombre}` : "Crear un nuevo rol en el sistema"}
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
                <Label htmlFor="nombre" className="text-xs font-semibold text-muted-foreground">Nombre del Rol</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Moderador"
                  disabled={editingRol ? PROTECTED_ROLES.includes(editingRol.nombre) : false}
                  className="h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border"
                />
              </div>
              <div className="space-y-2.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Permisos por Módulo</Label>
                <PresetChips
                  showIcon={false}
                  options={[
                    {
                      id: "conv-all",
                      label: "Todos convocatorias",
                      onClick: () => selectModulePermissions(PermissionModuleId.CONVOCATORIAS),
                    },
                    {
                      id: "conv-read",
                      label: "Solo lectura conv.",
                      onClick: () =>
                        selectModulePermissions(PermissionModuleId.CONVOCATORIAS, true),
                    },
                  ]}
                />
                <div className="space-y-4 max-h-[min(50vh,300px)] overflow-y-auto overflow-x-hidden border border-border rounded-lg p-3 bg-secondary/10 pr-1 divide-y divide-border/30">
                  {groupedPermisos.map(([moduleId, list]) => {
                    const meta = PERMISSION_MODULES[moduleId];
                    return (
                    <div key={moduleId} className="space-y-2 pt-3 first:pt-0 first:border-0 border-t border-border/20">
                      <h4 className="text-[10px] font-extrabold text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <ModuleIcon icon={meta.icon} size={12} className="p-0.5" />
                        {meta.label}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {list.map((permiso: Permiso) => (
                          <div key={permiso.id} className="flex items-center space-x-2.5 px-1 py-1 rounded hover:bg-secondary/40 transition-colors">
                            <Checkbox
                              id={`perm-${permiso.id}`}
                              checked={formData.permisoIds.includes(permiso.id)}
                              onCheckedChange={() => togglePermiso(permiso.id)}
                              className="rounded border-border"
                            />
                            <Label
                              htmlFor={`perm-${permiso.id}`}
                              className="text-xs font-semibold text-foreground cursor-pointer flex-1 truncate"
                              title={permiso.descripcion}
                            >
                              {permiso.clave}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter className="border-t border-border pt-3 gap-2">
              <Button 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
                className="h-8 text-xs font-semibold px-3 border-border hover:bg-secondary shadow-none"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={saving || !formData.nombre}
                className="h-8 text-xs font-semibold px-3 shadow-none bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {saving ? <Spinner size="sm" /> : editingRol ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <RolesGridSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map(rol => (
            <div 
              key={rol.id} 
              className="bg-card border border-border rounded-lg shadow-none p-5 space-y-4 hover:border-muted-foreground/30 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-secondary rounded border border-border text-foreground">
                      <Shield size={16} />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">{rol.nombre}</h3>
                  </div>
                  {PROTECTED_ROLES.includes(rol.nombre) && (
                    <Badge 
                      variant="outline" 
                      className="text-[9px] uppercase px-1.5 py-0.2 font-semibold bg-secondary/80 border-border text-muted-foreground rounded shadow-none"
                    >
                      Sistema
                    </Badge>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-1 pt-1">
                  {rol.permisos.map(perm => (
                    <Badge 
                      key={perm} 
                      variant="outline" 
                      className="text-[9px] uppercase px-1.5 py-0.2 font-semibold bg-secondary/30 border-border text-foreground rounded shadow-none flex items-center gap-1"
                    >
                      <Key size={8} className="text-muted-foreground" />
                      <span>{perm}</span>
                    </Badge>
                  ))}
                  {rol.permisos.length === 0 && (
                    <span className="text-[10px] text-muted-foreground italic">Sin permisos asignados</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-border mt-auto">
                <Tooltip content="Editar los permisos asignados a este rol">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => openDialog(rol)}
                    className="h-7 px-2 text-[10px] font-semibold rounded border-border hover:bg-secondary gap-1"
                  >
                    <Pencil size={11} /> Editar
                  </Button>
                </Tooltip>
                {!PROTECTED_ROLES.includes(rol.nombre) && (
                  <Tooltip content="Eliminar este rol (los usuarios perderán sus permisos)">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(rol.id, rol.nombre)}
                      className="h-7 px-2 text-[10px] font-semibold rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-auto gap-1"
                    >
                      <Trash2 size={11} /> Eliminar
                    </Button>
                  </Tooltip>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {roles.length === 0 && !loading && (
        <EmptyState
          icon={<Shield size={32} />}
          title="Sin roles definidos"
          description="Crea un rol personalizado para agrupar permisos y asignárselos a varios usuarios de una vez."
          action={
            <Button onClick={() => openDialog()} className="h-8 text-xs">
              <Plus size={12} className="mr-1" />Crear rol
            </Button>
          }
        />
      )}
    </div>
  );
}