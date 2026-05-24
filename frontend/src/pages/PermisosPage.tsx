import { useState, useEffect, useMemo } from "react";
import api from "@/services/api";
import { getApiErrorMessage } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PermisosPageSkeleton } from "@/components/ui/page-skeletons";
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
import { Shield, Pencil, Key, Search } from "lucide-react";
import {
  getPermissionModuleId,
  PageIconKind,
  PermissionModuleId,
  PERMISSION_MODULES,
} from "@/lib/iconography";
import { ModuleIcon } from "@/components/ui/page-icon";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { PresetChips } from "@/components/ui/preset-chips";
import { validateRequiredTrim } from "@/lib/formValidation";

const DESCRIPCION_TEMPLATES = [
  { id: "ver", label: "Ver/listar", text: "Permite ver y listar recursos del módulo." },
  { id: "crear", label: "Crear", text: "Permite crear nuevos registros en el módulo." },
  { id: "editar", label: "Editar", text: "Permite modificar registros existentes." },
  { id: "eliminar", label: "Eliminar", text: "Permite eliminar o desactivar registros." },
];

interface Permiso {
  id: number;
  clave: string;
  descripcion: string;
}

const MODULO_ORDER: PermissionModuleId[] = [
  PermissionModuleId.CONVOCATORIAS,
  PermissionModuleId.GRUPOS,
  PermissionModuleId.DEPORTES,
  PermissionModuleId.USUARIOS,
  PermissionModuleId.ROLES,
  PermissionModuleId.OTROS,
];

export default function PermisosPage() {
  const { hasPermission } = useAuth();
  const toast = useToast();
  const canEdit = hasPermission("gestionar_roles");

  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPermiso, setEditingPermiso] = useState<Permiso | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchPermisos = async () => {
    try {
      const { data } = await api.get("/api/roles/permisos");
      setPermisos(data);
    } catch (err) {
      console.error("Error al cargar permisos", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermisos();
  }, []);

  const openEditDialog = (permiso: Permiso) => {
    setEditingPermiso(permiso);
    setDescripcion(permiso.descripcion);
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editingPermiso) return;

    const descErr = validateRequiredTrim(descripcion, "El nombre");
    if (descErr) {
      setError(descErr);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.put(`/api/permisos/${editingPermiso.id}`, { descripcion: descripcion.trim() });
      toast.success("Nombre actualizado", `El permiso "${editingPermiso.clave}" tiene un nuevo nombre visible.`);
      setDialogOpen(false);
      fetchPermisos();
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err) || "No se pudo guardar el nombre del permiso.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const filteredPermisos = useMemo(
    () =>
      permisos.filter(
        (permiso) =>
          permiso.clave.toLowerCase().includes(searchTerm.toLowerCase()) ||
          permiso.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [permisos, searchTerm]
  );

  const groupedPermisos = useMemo(() => {
    const groups = new Map<PermissionModuleId, Permiso[]>();
    for (const id of MODULO_ORDER) {
      groups.set(id, []);
    }
    filteredPermisos.forEach((permiso) => {
      const moduleId = getPermissionModuleId(permiso.clave);
      groups.get(moduleId)!.push(permiso);
    });
    return groups;
  }, [filteredPermisos]);

  if (!hasPermission("gestionar_roles") && !hasPermission("ver_permisos")) {
    return (
      <div className="notion-callout border-destructive/20 bg-destructive/5 text-destructive p-4 rounded-lg">
        <div className="notion-callout-icon">
          <Shield size={16} />
        </div>
        <div className="text-xs font-semibold">No tienes permisos para acceder a esta página</div>
      </div>
    );
  }

  return (
    <div className="page-shell space-y-6 animate-fadeIn">
      <PageHeader
        iconKind={PageIconKind.PERMISOS}
        title="Permisos del Sistema"
        description={
          canEdit
            ? "Consulta los permisos y personaliza cómo se muestran en la interfaz."
            : "Consulta los permisos disponibles en el sistema (solo lectura)."
        }
        hintProps={{ maxWidth: 360 }}
        hint={
          <>
            Las <strong>claves técnicas</strong> (ej. <code>crear_convocatorias</code>) se definen en el
            código del backend y no se pueden cambiar aquí. Solo puedes editar el{" "}
            <strong>nombre visible</strong> que ven los administradores al asignar roles.
          </>
        }
      />

      <div className="notion-callout tone-info p-3 rounded-lg text-[11px] leading-relaxed">
        <div className="notion-callout-icon">
          <Key size={14} className="shrink-0" />
        </div>
        <div>
          Los permisos se incorporan mediante <strong>código y migraciones</strong>. No es posible crear,
          eliminar ni modificar la clave desde esta pantalla.
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-popover border border-border shadow-none rounded-lg w-[calc(100vw-2rem)] max-w-[min(100%,28rem)] sm:max-w-md p-5 space-y-4">
          <form onSubmit={handleSave}>
            <DialogHeader className="border-b border-border pb-3">
              <DialogTitle className="text-sm font-semibold tracking-tight">Editar nombre visible</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                La clave técnica no se puede modificar.
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
                <Label className="text-xs font-semibold text-muted-foreground">Clave técnica (solo lectura)</Label>
                <Input
                  value={editingPermiso?.clave ?? ""}
                  readOnly
                  disabled
                  className="font-mono h-9 text-xs border-border bg-muted/50 shadow-none cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="descripcion" className="text-xs font-semibold text-muted-foreground">
                  Nombre visible
                </Label>
                <PresetChips
                  showIcon={false}
                  options={DESCRIPCION_TEMPLATES.map((t) => ({
                    id: t.id,
                    label: t.label,
                    onClick: () => setDescripcion(t.text),
                  }))}
                />
                <Input
                  id="descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Permite crear convocatorias"
                  className="h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border"
                  required
                />
              </div>
            </div>

            <DialogFooter className="border-t border-border pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="h-8 text-xs font-semibold px-3 border-border hover:bg-secondary shadow-none"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving || !descripcion.trim()}
                className="h-8 text-xs font-semibold px-3 shadow-none bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {saving ? <Spinner size="sm" /> : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por clave o nombre visible..."
            className="pl-8 h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border"
          />
        </div>
        <div className="flex gap-3 items-center border border-border bg-card px-3 py-1.5 rounded-lg text-[10px] font-semibold text-muted-foreground select-none">
          <span>
            Total: <strong className="text-foreground">{permisos.length}</strong>
          </span>
          <span className="text-border">|</span>
          <span>
            Filtrados: <strong className="text-foreground">{filteredPermisos.length}</strong>
          </span>
        </div>
      </div>

      {loading ? (
        <PermisosPageSkeleton />
      ) : filteredPermisos.length === 0 ? (
        <EmptyState
          variant={searchTerm ? "search" : "default"}
          icon={<Shield size={32} />}
          title={searchTerm ? "Sin resultados" : "No hay permisos cargados"}
          description={
            searchTerm
              ? `No encontramos permisos que coincidan con "${searchTerm}". Prueba con otra palabra clave.`
              : "Los permisos se cargan desde el backend al iniciar la aplicación."
          }
          action={
            searchTerm ? (
              <Button variant="outline" onClick={() => setSearchTerm("")} className="h-8 text-xs">
                Limpiar búsqueda
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-8">
          {MODULO_ORDER.map((moduleId) => {
            const permisosModulo = groupedPermisos.get(moduleId);
            if (!permisosModulo || permisosModulo.length === 0) return null;

            const meta = PERMISSION_MODULES[moduleId];

            return (
              <div key={moduleId} className="space-y-3">
                <div className="flex items-center gap-2 border-b border-border pb-2 pt-2 select-none">
                  <ModuleIcon icon={meta.icon} size={14} className="p-0.5" />
                  <span className="font-bold text-xs text-foreground tracking-wide uppercase">{meta.label}</span>
                  <span className="text-[10px] text-muted-foreground">({permisosModulo.length})</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {permisosModulo.map((permiso) => (
                    <div
                      key={permiso.id}
                      className="bg-card border border-border rounded-lg shadow-none p-4 space-y-3 hover:border-muted-foreground/30 transition-colors flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Key size={13} className="text-muted-foreground shrink-0" />
                            <span
                              className="font-mono text-xs font-bold text-foreground truncate select-all"
                              title={permiso.clave}
                            >
                              {permiso.clave}
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground leading-normal line-clamp-3">
                          {permiso.descripcion}
                        </p>
                      </div>

                      {canEdit && (
                        <div className="flex gap-2 pt-2.5 border-t border-border mt-auto">
                          <Tooltip content="Editar solo el nombre visible">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(permiso)}
                              className="h-6 px-2 text-[10px] font-semibold rounded border-border hover:bg-secondary gap-1"
                            >
                              <Pencil size={10} /> Editar nombre
                            </Button>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
