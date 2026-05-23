import { useState, useEffect, useMemo } from "react";
import api from "@/services/api";
import { getApiErrorMessage } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
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
import { Shield, Plus, Pencil, Trash2, Key, Info, Calendar, Users, User, Trophy, Settings, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Permiso {
  id: number;
  clave: string;
  descripcion: string;
}

interface PermisoFormData {
  clave: string;
  descripcion: string;
}

const SYSTEM_PERMISSIONS = [
  "crear_convocatoria",
  "dividir_bandos",
  "invitar_externos",
  "gestionar_roles",
  "ver_convocatoria",
  "responder_asistencia",
  "gestionar_usuarios",
  "gestionar_deportes"
];

const MODULE_ICONS: Record<string, any> = {
  "Convocatorias": Calendar,
  "Asistencias": Users,
  "Equipos": Shield,
  "Roles y Permisos": Key,
  "Usuarios": User,
  "Deportes": Trophy,
  "Otros Módulos": Settings
};

const getModulo = (clave: string): string => {
  const c = clave.toLowerCase();
  if (c.includes("convocatoria")) return "Convocatorias";
  if (c.includes("asistencia") || c.includes("externo") || c.includes("invitar")) return "Asistencias";
  if (c.includes("equipo") || c.includes("bando")) return "Equipos";
  if (c.includes("rol") || c.includes("permiso")) return "Roles y Permisos";
  if (c.includes("usuario")) return "Usuarios";
  if (c.includes("deporte") || c.includes("posicion")) return "Deportes";
  return "Otros Módulos";
};

export default function PermisosPage() {
  const { hasPermission } = useAuth();
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPermiso, setEditingPermiso] = useState<Permiso | null>(null);
  const [formData, setFormData] = useState<PermisoFormData>({ clave: "", descripcion: "" });
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

  const openDialog = (permiso?: Permiso) => {
    if (permiso) {
      setEditingPermiso(permiso);
      setFormData({
        clave: permiso.clave,
        descripcion: permiso.descripcion,
      });
    } else {
      setEditingPermiso(null);
      setFormData({ clave: "", descripcion: "" });
    }
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      if (editingPermiso) {
        await api.put(`/api/permisos/${editingPermiso.id}`, formData);
      } else {
        await api.post("/api/permisos", formData);
      }
      setDialogOpen(false);
      fetchPermisos();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || "Error al guardar el permiso. Verifique que no exista un duplicado.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, clave: string) => {
    if (!confirm(`¿Está seguro que desea eliminar el permiso "${clave}"?`)) return;
    try {
      await api.delete(`/api/permisos/${id}`);
      fetchPermisos();
    } catch (err: unknown) {
      alert(getApiErrorMessage(err) || "Error al eliminar el permiso");
    }
  };

  // Filter and group permissions
  const filteredPermisos = useMemo(() =>
    permisos.filter(permiso =>
      permiso.clave.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permiso.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [permisos, searchTerm]
  );

  const groupedPermisos = useMemo(() =>
    filteredPermisos.reduce<Record<string, Permiso[]>>((acc, permiso) => {
      const modulo = getModulo(permiso.clave);
      if (!acc[modulo]) acc[modulo] = [];
      acc[modulo].push(permiso);
      return acc;
    }, {}),
    [filteredPermisos]
  );

  const moduloOrder = [
    "Convocatorias",
    "Asistencias",
    "Equipos",
    "Usuarios",
    "Deportes",
    "Roles y Permisos",
    "Otros Módulos"
  ];

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
    <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn pb-12 px-4 sm:px-6">
      {/* Cover/Header area */}
      <div className="flex items-center justify-between border-b border-border pb-4 pt-2">
        <div className="flex items-center gap-3">
          <span className="text-3xl select-none">🔑</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Permisos del Sistema</h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              Administración y supervisión de todos los privilegios y accesos agrupados por módulos.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()} className="h-9 px-3 gap-1.5 font-medium text-xs rounded-md shadow-none bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus size={14} /> 
              <span>Nuevo Permiso</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-popover border border-border shadow-none rounded-lg max-w-md p-5 space-y-4">
            <DialogHeader className="border-b border-border pb-3">
              <DialogTitle className="text-sm font-semibold tracking-tight">
                {editingPermiso ? "Editar Permiso" : "Crear Permiso"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                {editingPermiso
                  ? `Editando los detalles del permiso: ${editingPermiso.clave}`
                  : "Defina una nueva clave y descripción para el permiso."}
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
                <Label htmlFor="clave" className="text-xs font-semibold text-muted-foreground">Nombre / Clave del Permiso</Label>
                <Input
                  id="clave"
                  value={formData.clave}
                  onChange={(e) => setFormData({ ...formData, clave: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  placeholder="Ej: editar_marcador"
                  className="font-mono h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border"
                />
                <p className="text-[10px] text-muted-foreground">
                  Se recomienda usar formato snake_case en minúsculas.
                </p>

                {editingPermiso && SYSTEM_PERMISSIONS.includes(editingPermiso.clave) && (
                  <div className="notion-callout border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 p-3 rounded mt-2">
                    <div className="notion-callout-icon">
                      <Info size={14} className="shrink-0" />
                    </div>
                    <div className="text-[10px] leading-normal font-semibold">
                      <strong>Atención:</strong> Está editando una clave de sistema principal. Asegúrese de que el código del backend o las anotaciones de seguridad coincidan con este nuevo nombre.
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="descripcion" className="text-xs font-semibold text-muted-foreground">Descripción</Label>
                <Input
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Ej: Permite registrar el resultado de un evento"
                  className="h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border"
                />
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
                onClick={handleSave} 
                disabled={saving || !formData.clave || !formData.descripcion}
                className="h-8 text-xs font-semibold px-3 shadow-none bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {saving ? <Spinner size="sm" /> : editingPermiso ? "Actualizar" : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Stats bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar permisos por nombre o descripción..."
            className="pl-8 h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border"
          />
        </div>
        <div className="flex gap-3 items-center border border-border bg-card px-3 py-1.5 rounded-lg text-[10px] font-semibold text-muted-foreground select-none">
          <span>Total: <strong className="text-foreground">{permisos.length}</strong></span>
          <span className="text-border">|</span>
          <span>Filtrados: <strong className="text-foreground">{filteredPermisos.length}</strong></span>
        </div>
      </div>

      {/* Main List Grouped by Modules */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner className="h-10 w-10 text-primary" />
        </div>
      ) : filteredPermisos.length === 0 ? (
        <div className="border border-border border-dashed py-16 flex flex-col items-center justify-center bg-card rounded-lg">
          <Shield className="h-8 w-8 text-muted-foreground mb-3 animate-pulse" />
          <h3 className="text-sm font-bold text-foreground">No se encontraron permisos</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs text-center">
            {searchTerm ? "No se encontraron coincidencias para su búsqueda." : "No se han cargado privilegios en el sistema. Presione el botón superior para agregar uno."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Order and display the defined modules */}
          {moduloOrder.map((modulo) => {
            const permisosModulo = groupedPermisos[modulo];
            if (!permisosModulo || permisosModulo.length === 0) return null;

            const Icon = MODULE_ICONS[modulo] || Settings;

            return (
              <div key={modulo} className="space-y-3">
                {/* Module Heading */}
                <div className="flex items-center gap-2 border-b border-border pb-2 pt-2 select-none">
                  <Icon size={14} className="text-foreground shrink-0" />
                  <span className="font-bold text-xs text-foreground tracking-wide uppercase">{modulo}</span>
                  <span className="text-[10px] text-muted-foreground">({permisosModulo.length})</span>
                </div>

                {/* Permissions Grid */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {permisosModulo.map((permiso) => {
                    const isSystem = SYSTEM_PERMISSIONS.includes(permiso.clave);
                    return (
                      <div 
                        key={permiso.id} 
                        className="bg-card border border-border rounded-lg shadow-none p-4 space-y-3 hover:border-muted-foreground/30 transition-colors flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Key size={13} className="text-muted-foreground shrink-0" />
                              <span className="font-mono text-xs font-bold text-foreground truncate select-all" title={permiso.clave}>
                                {permiso.clave}
                              </span>
                            </div>
                            {isSystem && (
                              <Badge 
                                variant="outline" 
                                className="text-[8px] uppercase px-1.5 py-0.2 font-semibold bg-secondary border-border text-muted-foreground rounded shadow-none shrink-0"
                              >
                                Sistema
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-[11px] text-muted-foreground leading-normal line-clamp-3">
                            {permiso.descripcion}
                          </p>
                        </div>

                        <div className="flex gap-2 pt-2.5 border-t border-border mt-auto">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openDialog(permiso)}
                            className="h-6 px-2 text-[10px] font-semibold rounded border-border hover:bg-secondary gap-1"
                          >
                            <Pencil size={10} /> Editar
                          </Button>
                          {!isSystem && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(permiso.id, permiso.clave)}
                              className="h-6 px-2 text-[10px] font-semibold rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-auto gap-1"
                            >
                              <Trash2 size={10} /> Eliminar
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}