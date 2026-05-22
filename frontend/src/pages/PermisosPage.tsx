import { useState, useEffect, useMemo } from "react";
import api from "@/services/api";
import { getApiErrorMessage } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
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

const MODULE_COLORS: Record<string, string> = {
  "Convocatorias": "from-blue-500/15 to-indigo-500/5 border-blue-500/20 text-blue-400",
  "Asistencias": "from-emerald-500/15 to-teal-500/5 border-emerald-500/20 text-emerald-400",
  "Equipos": "from-purple-500/15 to-fuchsia-500/5 border-purple-500/20 text-purple-400",
  "Roles y Permisos": "from-amber-500/15 to-orange-500/5 border-amber-500/20 text-amber-400",
  "Usuarios": "from-cyan-500/15 to-blue-500/5 border-cyan-500/20 text-cyan-400",
  "Deportes": "from-rose-500/15 to-pink-500/5 border-rose-500/20 text-rose-400",
  "Otros Módulos": "from-slate-500/15 to-zinc-500/5 border-slate-500/20 text-slate-400"
};

const getModulo = (clave: string): string => {
  const c = clave.toLowerCase();
  if (c.includes("convocatoria")) return "Convocatorias";
  if (c.includes("asistencia") || c.includes("externo") || c.includes("invitar")) return "Asistencias";
  if (c.includes("equipo") || c.includes("bando")) return "Bandos";
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
      <Alert variant="destructive">
        <AlertDescription>No tienes permisos para acceder a esta página</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
            Permisos del Sistema
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestione y supervise todos los privilegios y accesos agrupados por módulos deportivos.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()} className="">
              <Plus size={16} className="mr-2" /> Nuevo Permiso
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border border-border/60">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {editingPermiso ? "Editar Permiso" : "Crear Permiso"}
              </DialogTitle>
              <DialogDescription>
                {editingPermiso
                  ? `Editando los detalles del permiso: ${editingPermiso.clave}`
                  : "Defina una nueva clave y descripción para el permiso."}
              </DialogDescription>
            </DialogHeader>

            {error && (
              <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
                <Info size={16} className="text-destructive shrink-0" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="clave">Nombre / Clave del Permiso</Label>
                <Input
                  id="clave"
                  value={formData.clave}
                  onChange={(e) => setFormData({ ...formData, clave: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  placeholder="Ej: editar_marcador"
                  className="font-mono bg-background/50"
                />
                <p className="text-[10px] text-muted-foreground">
                  Se recomienda usar formato snake_case en minúsculas. El administrador puede editar este campo para cualquier permiso.
                </p>

                {editingPermiso && SYSTEM_PERMISSIONS.includes(editingPermiso.clave) && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-[11px] flex gap-2 items-start mt-2">
                    <Info size={14} className="shrink-0 mt-0.5" />
                    <p>
                      <strong>Atención:</strong> Está editando una clave de sistema principal. Asegúrese de que el código del backend o las anotaciones de seguridad coincidan con este nuevo nombre.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Ej: Permite actualizar el resultado de un partido"
                  className="bg-background/50"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-border/60">
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || !formData.clave || !formData.descripcion} className="">
                {saving ? <Spinner className="h-4 w-4" /> : editingPermiso ? "Actualizar" : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Quick Stats Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar permisos por nombre o descripción..."
            className="pl-10 bg-card/50 border-border/60 focus:border-primary/45 transition-all duration-300"
          />
        </div>
        <div className="flex gap-4 items-center bg-card/45 backdrop-blur-md px-4 py-2 rounded-xl border border-border/40 text-xs font-semibold">
          <span className="text-muted-foreground">Total Permisos: <strong className="text-foreground">{permisos.length}</strong></span>
          <span className="text-border">|</span>
          <span className="text-muted-foreground">Filtrados: <strong className="text-primary">{filteredPermisos.length}</strong></span>
        </div>
      </div>

      {/* Main List Grouped by Modules */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner className="h-10 w-10 text-primary" />
        </div>
      ) : filteredPermisos.length === 0 ? (
        <Card className="border-dashed border-2 py-16 flex flex-col items-center justify-center bg-card/30">
          <Shield className="h-12 w-12 text-muted-foreground/60 mb-4 animate-pulse" />
          <h3 className="text-lg font-bold text-foreground">No se encontraron permisos</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm text-center">
            {searchTerm ? "No se encontraron coincidencias para su búsqueda." : "No se han cargado privilegios en el sistema. Presione el botón superior para agregar uno."}
          </p>
        </Card>
      ) : (
        <div className="space-y-10">
          {/* Order and display the defined modules */}
          {moduloOrder.map((modulo) => {
            const permisosModulo = groupedPermisos[modulo];
            if (!permisosModulo || permisosModulo.length === 0) return null;

            const Icon = MODULE_ICONS[modulo] || Settings;
            const colorClass = MODULE_COLORS[modulo] || "from-slate-500/15 to-zinc-500/5 border-slate-500/20 text-slate-400";

            return (
              <div key={modulo} className="space-y-4">
                {/* Module Heading */}
                <div className={`flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r border backdrop-blur-sm ${colorClass}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-background/40 rounded-xl border border-white/10 shadow-sm">
                      <Icon size={20} className="stroke-[2.5px]" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-lg text-foreground tracking-tight">{modulo}</h3>
                      <p className="text-[10px] text-muted-foreground/80 font-bold uppercase tracking-wider">MÓDULO DE GESTIÓN</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-background/30 border-white/10 text-foreground font-semibold px-2.5 py-1">
                    {permisosModulo.length} {permisosModulo.length === 1 ? "permiso" : "permisos"}
                  </Badge>
                </div>

                {/* Permissions Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {permisosModulo.map((permiso) => {
                    const isSystem = SYSTEM_PERMISSIONS.includes(permiso.clave);
                    return (
                      <Card key={permiso.id} className="relative group overflow-hidden border-border/50 bg-card/60 backdrop-blur-md hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/[0.02]">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full pointer-events-none transition-opacity opacity-0 group-hover:opacity-100" />
                        <CardHeader className="flex flex-row items-start justify-between pb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
                              <Key size={16} className="text-primary" />
                            </div>
                            <div className="overflow-hidden">
                              <CardTitle className="text-sm font-mono font-bold truncate max-w-[155px] sm:max-w-[190px]" title={permiso.clave}>
                                {permiso.clave}
                              </CardTitle>
                              {isSystem && (
                                <span className="inline-block mt-1 text-[8px] font-extrabold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                  Core del Sistema
                                </span>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-xs text-muted-foreground line-clamp-2 h-8">
                            {permiso.descripcion}
                          </p>

                          <div className="flex items-center gap-2 pt-2.5 border-t border-border/40">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDialog(permiso)}
                              className="h-8 text-xs border-border/60 hover:bg-primary/5 hover:text-primary transition-all duration-200"
                            >
                              <Pencil size={11} className="mr-1" /> Editar
                            </Button>
                            {!isSystem && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(permiso.id, permiso.clave)}
                                className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                              >
                                <Trash2 size={11} className="mr-1" /> Eliminar
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
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