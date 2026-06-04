import { useState, useEffect, useCallback } from "react";
import api from "@/services/api";
import { getApiErrorMessage } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { DataListSkeleton } from "@/components/ui/page-skeletons";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { Shield, Trash2, Plus, UserX, UserCheck, Ban, Unlock, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PageIconKind } from "@/lib/iconography";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { PlayerIdentity } from "@/components/ui/player-identity";
import { SuspensionDialog } from "@/components/usuarios/SuspensionDialog";
import { FormModal } from "@/components/ui/form-modal";
import { PresetChips } from "@/components/ui/preset-chips";
import { FieldError } from "@/components/ui/field-error";
import { validateEmail, validateRequiredTrim } from "@/lib/formValidation";
import { canManageUsuarios } from "@/lib/permissions";
import { formatDateTime } from "@/lib/formatDate";
import {
  DataListShell,
  DataListHeader,
  DataListBody,
  DataListRow,
  DataListCell,
  DataListActions,
  type DataListColumns,
} from "@/components/ui/data-list";

const USER_LIST_COLUMNS: DataListColumns = {
  usuario: 4,
  cuenta: 2,
  roles: 3,
  alta: 1,
  acciones: 2,
};

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  username?: string;
  roles: string[];
  activo: boolean;
  fechaCreacion: string;
  fechaFinSuspension?: string | null;
  motivoSuspension?: string | null;
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
  const { hasPermission, user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
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

  const [suspensionDialogOpen, setSuspensionDialogOpen] = useState(false);
  const [selectedUsuarioForSuspension, setSelectedUsuarioForSuspension] = useState<Usuario | null>(null);
  const [createFormError, setCreateFormError] = useState("");

  const isSuspended = (usuario: Usuario) => {
    if (!usuario.fechaFinSuspension) return false;
    return new Date(usuario.fechaFinSuspension).getTime() > Date.now();
  };

  const handleLevantarSuspension = async (usuario: Usuario) => {
    const ok = await confirm({
      title: "Levantar suspensión",
      description: `¿Reactivar a ${usuario.nombre}? Volverá a poder confirmar asistencia inmediatamente.`,
      confirmLabel: "Sí, reactivar",
      variant: "info",
    });
    if (!ok) return;
    setError("");
    try {
      await api.post(`/api/usuarios/${usuario.id}/levantar-suspension`);
      showSuccess("Suspensión levantada correctamente");
      toast.success("Suspensión levantada", `${usuario.nombre} vuelve a estar activo.`);
      fetchData();
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err) || "Error al levantar la suspensión";
      setError(msg);
      toast.error(msg);
    }
  };

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
      toast.success("Roles actualizados", `${selectedUsuario.nombre} ahora tiene ${selectedRoles.length} rol(es).`);
      setEditDialogOpen(false);
      fetchData();
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err) || "Error al actualizar roles";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameErr = validateRequiredTrim(formData.nombre, "El nombre");
    const emailErr = validateEmail(formData.email);
    if (nameErr || emailErr) {
      setCreateFormError(nameErr || emailErr || "");
      return;
    }
    if (formData.roles.length === 0) {
      setCreateFormError("Selecciona al menos un rol.");
      return;
    }
    setCreateFormError("");
    setSaving(true);
    setError("");
    try {
      await api.post("/api/usuarios", {
        nombre: formData.nombre,
        email: formData.email,
        roles: formData.roles,
      });
      showSuccess("Usuario creado correctamente");
      toast.success("Usuario creado", `${formData.nombre} fue agregado al workspace.`);
      setCreateDialogOpen(false);
      fetchData();
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err) || "Error al crear usuario";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (usuario: Usuario) => {
    const ok = await confirm({
      title: "Dar de baja usuario",
      description: (
        <span>
          Vas a dar de baja a <strong>{usuario.nombre}</strong> (baja lógica: la cuenta queda
          desactivada y no podrá iniciar sesión). Sus convocatorias y registros históricos se
          conservan.
        </span>
      ),
      confirmLabel: "Sí, dar de baja",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`/api/usuarios/${usuario.id}`);
      showSuccess("Usuario eliminado correctamente");
      toast.success("Usuario eliminado", `${usuario.nombre} fue desactivado.`);
      fetchData();
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err) || "Error al eliminar usuario";
      setError(msg);
      toast.error(msg);
    }
  };

  const handleToggleActivo = async (usuario: Usuario) => {
    try {
      await api.patch(`/api/usuarios/${usuario.id}/toggle-activo`);
      showSuccess("Estado actualizado correctamente");
      toast.success(
        usuario.activo ? "Usuario desactivado" : "Usuario reactivado",
        usuario.activo
          ? `${usuario.nombre} no podrá iniciar sesión hasta que lo reactives.`
          : `${usuario.nombre} ya puede iniciar sesión.`
      );
      fetchData();
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err) || "Error al actualizar estado";
      setError(msg);
      toast.error(msg);
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

  const canManage = canManageUsuarios(hasPermission);

  if (!hasPermission("ver_usuarios") && !canManage) {
    return (
      <Alert variant="destructive">
        <AlertDescription>No tienes permisos para acceder a esta página</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="page-shell space-y-6 animate-fadeIn">
      <PageHeader
        iconKind={PageIconKind.USUARIOS}
        title="Gestión de Usuarios"
        description="Crea, edita y administra cuentas, permisos y suspensiones."
        hintProps={{ maxWidth: 320 }}
        hint={
          <>
            Aquí gestionas a todos los miembros del workspace: sus <strong>roles</strong>
            (permisos), <strong>estado</strong> (activo/inactivo) y posibles
            <strong> suspensiones temporales</strong>.
          </>
        }
        actions={
          (hasPermission("crear_usuarios") || canManage) ? (
            <Button
              onClick={openCreateDialog}
              className="h-9 px-3 gap-1.5 font-medium text-xs rounded-md shadow-none bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus size={14} />
              <span>Nuevo Usuario</span>
            </Button>
          ) : undefined
        }
      />

      {error && (
        <div className="notion-callout border-destructive/20 bg-destructive/5 text-destructive p-3">
          <div className="notion-callout-icon">
            <Shield size={16} className="shrink-0" />
          </div>
          <div className="text-xs font-medium">{error}</div>
        </div>
      )}

      {success && (
        <div className="notion-callout tone-success p-3">
          <div className="notion-callout-icon">
            <UserCheck size={16} className="shrink-0" />
          </div>
          <div className="text-xs font-medium">{success}</div>
        </div>
      )}

      {loading ? (
        <DataListSkeleton
          columns={USER_LIST_COLUMNS}
          labels={{
            usuario: "Usuario",
            cuenta: "Cuenta",
            roles: "Roles",
            alta: "Alta",
            acciones: "Acciones",
          }}
          rowCount={8}
        />
      ) : (
      <DataListShell>
        <DataListHeader
          columns={USER_LIST_COLUMNS}
          labels={{
            usuario: "Usuario",
            cuenta: "Cuenta",
            roles: "Roles",
            alta: "Alta",
            acciones: "Acciones",
          }}
        />
        <DataListBody>
          {usuarios.map((usuario) => (
            <DataListRow key={usuario.id} className="hover:bg-secondary/20">
              <DataListCell label="Usuario" span={USER_LIST_COLUMNS.usuario} priority="primary">
                <PlayerIdentity
                  nombre={usuario.nombre}
                  username={usuario.username}
                  email={usuario.email}
                  variant="list"
                />
              </DataListCell>

              <DataListCell label="Cuenta" span={USER_LIST_COLUMNS.cuenta} priority="primary">
                <div className="flex flex-col gap-1">
                  <Badge
                    variant="outline"
                    className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold shadow-none w-fit ${
                      usuario.activo
                        ? "status-pill--success border"
                        : "bg-secondary border-border text-muted-foreground"
                    }`}
                  >
                    {usuario.activo ? "Activo" : "Inactivo"}
                  </Badge>
                  {isSuspended(usuario) && (
                    <Tooltip
                      content={
                        <span>
                          Hasta {new Date(usuario.fechaFinSuspension!).toLocaleString()}
                          <br />
                          Motivo: {usuario.motivoSuspension}
                        </span>
                      }
                      maxWidth={280}
                    >
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0.2 rounded font-bold bg-destructive/10 border-destructive/20 text-destructive w-fit cursor-help"
                      >
                        Suspendido
                      </Badge>
                    </Tooltip>
                  )}
                </div>
              </DataListCell>

              <DataListCell label="Roles" span={USER_LIST_COLUMNS.roles} priority="secondary">
                <div className="flex flex-wrap gap-1">
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
              </DataListCell>

              <DataListCell label="Alta" span={USER_LIST_COLUMNS.alta} priority="detail">
                <span className="text-[11px] text-muted-foreground font-medium">
                  {usuario.fechaCreacion
                    ? formatDateTime(usuario.fechaCreacion)
                    : "—"}
                </span>
              </DataListCell>

              <DataListActions span={USER_LIST_COLUMNS.acciones}>
                {(hasPermission("dar_baja_usuarios") || canManage) && (
                  <Tooltip
                    content={
                      usuario.activo
                        ? "Desactivar (no podrá iniciar sesión)"
                        : "Reactivar usuario"
                    }
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActivo(usuario)}
                      className="h-7 w-7 rounded hover:bg-secondary text-muted-foreground"
                      aria-label={usuario.activo ? `Desactivar a ${usuario.nombre}` : `Reactivar a ${usuario.nombre}`}
                    >
                      {usuario.activo ? (
                        <UserX size={13} className="text-tone-warning" />
                      ) : (
                        <UserCheck size={13} className="text-tone-success" />
                      )}
                    </Button>
                  </Tooltip>
                )}

                {hasPermission("suspender_jugadores") &&
                  usuario.id !== user?.id &&
                  (isSuspended(usuario) ? (
                    <Tooltip content="Levantar suspensión y reactivar al jugador">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleLevantarSuspension(usuario)}
                        className="h-7 w-7 rounded hover:bg-[hsl(var(--success)/0.12)] text-tone-success"
                        aria-label={`Levantar suspensión de ${usuario.nombre}`}
                      >
                        <Unlock size={13} />
                      </Button>
                    </Tooltip>
                  ) : (
                    <Tooltip content="Suspender por un período (no podrá inscribirse)">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedUsuarioForSuspension(usuario);
                          setSuspensionDialogOpen(true);
                          setError("");
                        }}
                        className="h-7 w-7 rounded hover:bg-destructive/10 text-destructive"
                        aria-label={`Suspender a ${usuario.nombre}`}
                      >
                        <Ban size={13} />
                      </Button>
                    </Tooltip>
                  ))}

                {hasPermission("gestionar_roles") && (
                  <Tooltip content="Editar los roles (permisos) del usuario">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(usuario)}
                      className="h-7 px-2 text-[10px] font-semibold rounded border-border hover:bg-secondary gap-1"
                    >
                      <Shield size={11} />
                      <span>Roles</span>
                    </Button>
                  </Tooltip>
                )}

                {(hasPermission("dar_baja_usuarios") || canManage) && (
                  <Tooltip content="Dar de baja (desactiva la cuenta; no borra datos históricos)">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteUser(usuario)}
                      className="h-7 w-7 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      aria-label={`Dar de baja a ${usuario.nombre}`}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </Tooltip>
                )}
              </DataListActions>
            </DataListRow>
          ))}

          {usuarios.length === 0 && (
            <EmptyState
              icon={<Users size={32} />}
              title="Sin usuarios registrados"
              description="Aún no hay miembros en el workspace. Crea el primero para empezar."
              action={
                hasPermission("crear_usuarios") || canManage ? (
                  <Button onClick={openCreateDialog} className="h-8 text-xs">
                    <Plus size={12} className="mr-1" />
                    Crear usuario
                  </Button>
                ) : undefined
              }
              className="border-0 bg-transparent"
            />
          )}
        </DataListBody>
      </DataListShell>
      )}

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
      <FormModal
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title="Crear nuevo usuario"
        description="Ingresa los datos básicos. Recibirá una contraseña temporal por el administrador."
        onSubmit={handleCreateUser}
        submitLabel="Crear usuario"
        loading={saving}
        disabled={!formData.nombre.trim() || !formData.email.trim() || formData.roles.length === 0}
        error={createFormError}
      >
        <div className="space-y-1.5">
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            placeholder="Nombre completo"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="email@ejemplo.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Roles iniciales</Label>
          <PresetChips
            showIcon={false}
            options={[
              {
                id: "jugador",
                label: "Solo jugador",
                onClick: () => setFormData((p) => ({ ...p, roles: ["Jugador"] })),
              },
              {
                id: "admin",
                label: "Admin + jugador",
                onClick: () => {
                  const admin = roles.find((r) => r.nombre.toLowerCase().includes("admin"));
                  setFormData((p) => ({
                    ...p,
                    roles: admin ? ["Jugador", admin.nombre] : ["Jugador"],
                  }));
                },
              },
            ]}
          />
          <div className="space-y-1.5 max-h-[140px] overflow-y-auto border border-border p-2 rounded">
            {roles.map((rol) => (
              <div key={rol.id} className="flex items-center space-x-2.5 px-1 py-1">
                <Checkbox
                  id={`new-rol-${rol.id}`}
                  checked={formData.roles.includes(rol.nombre)}
                  onCheckedChange={() => toggleFormRole(rol.nombre)}
                />
                <Label htmlFor={`new-rol-${rol.id}`} className="text-xs cursor-pointer flex-1">
                  {rol.nombre}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </FormModal>

      <SuspensionDialog
        open={suspensionDialogOpen}
        onOpenChange={(open) => {
          setSuspensionDialogOpen(open);
          if (!open) setSelectedUsuarioForSuspension(null);
        }}
        userId={selectedUsuarioForSuspension?.id ?? null}
        userName={selectedUsuarioForSuspension?.nombre ?? ""}
        onSuccess={() => {
          showSuccess("Usuario suspendido correctamente");
          fetchData();
        }}
      />
    </div>
  );
}