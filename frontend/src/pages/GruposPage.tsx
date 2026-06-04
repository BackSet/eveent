import { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/services/api";
import { getApiErrorMessage } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { MasterDetailSkeleton, PageHeaderSkeleton } from "@/components/ui/page-skeletons";
import { PageHeader } from "@/components/ui/page-header";
import { PageIconKind } from "@/lib/iconography";
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
import { Users, UsersRound, Trash2, Edit, Plus, Check, X, Search, Settings, Sparkles } from "lucide-react";
import { Grupo, Usuario } from "@/types";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DataListShell,
  DataListHeader,
  DataListBody,
  DataListRow,
  DataListCell,
  DataListActions,
  type DataListColumns,
} from "@/components/ui/data-list";

const GRUPO_MEMBER_COLUMNS: DataListColumns = {
  jugador: 5,
  posiciones: 4,
  acciones: 3,
};
import { PlayerIdentity } from "@/components/ui/player-identity";
import { PresetChips } from "@/components/ui/preset-chips";
import { validateRequiredTrim } from "@/lib/formValidation";

export default function GruposPage() {
  const { hasPermission } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [selectedGrupo, setSelectedGrupo] = useState<Grupo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [searchUserQuery, setSearchUserQuery] = useState("");
  const [searchMemberQuery, setSearchMemberQuery] = useState("");

  const isOrganizer = hasPermission("crear_grupos") || hasPermission("editar_grupos");

  const canDeleteGrupo = () => hasPermission("eliminar_grupos");

  const fetchData = useCallback(async (selectGroupIdToKeep?: number) => {
    try {
      const [gruposRes, usersRes] = await Promise.all([
        api.get("/api/grupos"),
        api.get("/api/usuarios"),
      ]);
      setGrupos(gruposRes.data);
      setUsuarios(usersRes.data);

      if (gruposRes.data.length > 0) {
        if (selectGroupIdToKeep) {
          const match = gruposRes.data.find((g: Grupo) => g.id === selectGroupIdToKeep);
          setSelectedGrupo(match || gruposRes.data[0]);
        } else if (!selectedGrupo) {
          setSelectedGrupo(gruposRes.data[0]);
        } else {
          // Sync current selected group
          const match = gruposRes.data.find((g: Grupo) => g.id === selectedGrupo.id);
          setSelectedGrupo(match || gruposRes.data[0]);
        }
      } else {
        setSelectedGrupo(null);
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [selectedGrupo]);

  useEffect(() => {
    fetchData();
  }, []);

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

  const openEditDialog = (e: React.MouseEvent, grupo: Grupo) => {
    e.stopPropagation();
    setNombre(grupo.nombre);
    setDescripcion(grupo.descripcion || "");
    setSelectedUserIds(grupo.miembroIds || []);
    setSearchUserQuery("");
    setDialogOpen(true);
    setError("");
  };

  const openGestionarMiembros = () => {
    if (!selectedGrupo) return;
    setNombre(selectedGrupo.nombre);
    setDescripcion(selectedGrupo.descripcion || "");
    setSelectedUserIds(selectedGrupo.miembroIds || []);
    setSearchUserQuery("");
    setDialogOpen(true);
    setError("");
  };

  const handleSaveGrupo = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const nameErr = validateRequiredTrim(nombre, "El nombre del grupo");
    if (nameErr) {
      setError(nameErr);
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

      if (selectedGrupo && selectedGrupo.id) {
        const { data } = await api.put(`/api/grupos/${selectedGrupo.id}`, payload);
        showSuccess("Grupo actualizado correctamente");
        toast.success("Grupo actualizado", `"${nombre}" tiene ahora ${selectedUserIds.length} miembro(s).`);
        await fetchData(data.id);
      } else {
        const { data } = await api.post("/api/grupos", payload);
        showSuccess("Grupo creado correctamente");
        toast.success("Grupo creado", `"${nombre}" listo con ${selectedUserIds.length} miembro(s).`);
        await fetchData(data.id);
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err) || "Error al guardar el grupo";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGrupo = async (e: React.MouseEvent, grupo: Grupo) => {
    e.stopPropagation();
    const ok = await confirm({
      title: "Eliminar grupo",
      description: (
        <span>
          ¿Eliminar el grupo <strong>"{grupo.nombre}"</strong>? Los jugadores no se eliminan, pero
          ya no podrás usar este grupo para invitarlos en bloque a futuras convocatorias.
        </span>
      ),
      confirmLabel: "Sí, eliminar",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`/api/grupos/${grupo.id}`);
      showSuccess("Grupo eliminado correctamente");
      toast.success("Grupo eliminado", `"${grupo.nombre}" se eliminó.`);
      if (selectedGrupo?.id === grupo.id) {
        setSelectedGrupo(null);
      }
      fetchData();
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err) || "Error al eliminar el grupo";
      setError(msg);
      toast.error(msg);
    }
  };

  const handleRemoveMember = async (user: Usuario) => {
    if (!selectedGrupo) return;
    const ok = await confirm({
      title: "Quitar del grupo",
      description: `¿Quitar a ${user.nombre} de "${selectedGrupo.nombre}"? La cuenta no se elimina, solo deja de pertenecer a este grupo.`,
      confirmLabel: "Sí, quitar",
      variant: "warning",
    });
    if (!ok) return;
    try {
      const updatedIds = selectedGrupo.miembroIds?.filter(id => id !== user.id) || [];
      const payload = {
        nombre: selectedGrupo.nombre,
        descripcion: selectedGrupo.descripcion,
        miembroIds: updatedIds,
      };
      await api.put(`/api/grupos/${selectedGrupo.id}`, payload);
      showSuccess("Jugador removido del grupo");
      toast.success("Jugador removido", `${user.nombre} ya no pertenece a "${selectedGrupo.nombre}".`);
      await fetchData(selectedGrupo.id);
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err) || "Error al remover jugador";
      setError(msg);
      toast.error(msg);
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

  const selectedGrupoMembers = useMemo(() => {
    if (!selectedGrupo || !selectedGrupo.miembroIds) return [];
    return selectedGrupo.miembroIds
      .map(id => usuarios.find(u => u.id === id))
      .filter((u): u is Usuario => u !== undefined)
      .filter(u => 
        !searchMemberQuery || 
        u.nombre.toLowerCase().includes(searchMemberQuery.toLowerCase()) || 
        u.email.toLowerCase().includes(searchMemberQuery.toLowerCase())
      );
  }, [selectedGrupo, usuarios, searchMemberQuery]);

  if (!loading && !hasPermission("crear_grupos") && !hasPermission("editar_grupos")) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-xs">No tienes permiso para ver esta sección.</p>
      </div>
    );
  }

  return (
    <div className="page-shell space-y-6 animate-fadeIn">
      {loading ? (
        <PageHeaderSkeleton showActions={isOrganizer} />
      ) : (
        <PageHeader
          iconKind={PageIconKind.GRUPOS}
          title="Gestión de Grupos"
          description="Crea listas reutilizables de jugadores para invitarlos en bloque a tus convocatorias."
          hintProps={{ maxWidth: 340 }}
          hint={
            <>
              Los <strong>grupos</strong> son listas reutilizables de jugadores (ej. &quot;Plantilla
              Sub-18&quot;, &quot;Amigos del barrio&quot;). Al crear una convocatoria con invitación tipo
              <em> Grupo</em>, todos sus miembros reciben la invitación automáticamente.
            </>
          }
          actions={
            isOrganizer ? (
              <Button
                onClick={openCreateDialog}
                className="gap-1.5 font-medium text-xs h-9 rounded-md shadow-none bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus size={14} />
                <span>Nuevo Grupo</span>
              </Button>
            ) : undefined
          }
        />
      )}

      {!loading && error && (
        <div className="notion-callout border-destructive/20 bg-destructive/5 text-destructive p-3 animate-fadeIn">
          <div className="notion-callout-icon">
            <X className="h-5 w-5" />
          </div>
          <div className="text-xs font-medium">{error}</div>
        </div>
      )}

      {!loading && success && (
        <div className="notion-callout tone-success p-3 animate-fadeIn">
          <div className="notion-callout-icon">
            <Check className="h-5 w-5" />
          </div>
          <div className="text-xs font-medium">{success}</div>
        </div>
      )}

      {loading ? (
        <MasterDetailSkeleton />
      ) : (
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-12 items-start">
        {/* Left Column: Groups list */}
        <div className="lg:col-span-5 border border-border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between select-none">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Grupos</span>
            <span className="text-[10px] font-semibold text-muted-foreground bg-muted border border-border/80 px-2 py-0.5 rounded-full">
              {grupos.length} registrados
            </span>
          </div>

          <div className="p-3 space-y-1.5">
            {grupos.length === 0 ? (
              <EmptyState
                icon={<Users size={28} />}
                title="Aún no hay grupos"
                description="Crea tu primer grupo para invitar a varios jugadores de una sola vez en tus convocatorias."
                action={
                  isOrganizer ? (
                    <Button onClick={openCreateDialog} className="h-8 text-xs">
                      <Plus size={12} className="mr-1" />Crear primer grupo
                    </Button>
                  ) : undefined
                }
                className="border-0 bg-transparent py-6"
              />
            ) : (
              grupos.map((grupo) => {
                const isSelected = selectedGrupo?.id === grupo.id;
                return (
                  <div
                    key={grupo.id}
                    onClick={() => setSelectedGrupo(grupo)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded border transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-accent/70 border-border/100"
                        : "hover:bg-muted/40 border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UsersRound size={18} className="shrink-0 text-muted-foreground" strokeWidth={1.75} />
                      <div className="min-w-0">
                        <span className={`text-sm font-semibold truncate block ${isSelected ? "text-foreground font-bold" : "text-muted-foreground"}`}>
                          {grupo.nombre}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">{grupo.miembroIds?.length || 0} Jugadores</span>
                      </div>
                    </div>
                    
                    {isOrganizer && (
                      <div className="flex gap-0.5 items-center shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Tooltip content="Editar nombre, descripción y miembros">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-6 w-6 rounded hover:bg-muted"
                            onClick={(e) => openEditDialog(e, grupo)}
                            aria-label={`Editar grupo ${grupo.nombre}`}
                          >
                            <Edit size={11} className="text-muted-foreground hover:text-foreground" />
                          </Button>
                        </Tooltip>
                        {canDeleteGrupo() && (
                          <Tooltip content="Eliminar grupo (las convocatorias quedarán sin grupo asignado)">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded hover:bg-destructive/10"
                              onClick={(e) => handleDeleteGrupo(e, grupo)}
                              aria-label={`Eliminar grupo ${grupo.nombre}`}
                            >
                              <Trash2 size={11} className="text-destructive" />
                            </Button>
                          </Tooltip>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Group Members */}
        <div className="lg:col-span-7 border border-border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between select-none">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider truncate max-w-[220px]">
              {selectedGrupo ? `Miembros · ${selectedGrupo.nombre}` : "Miembros del Grupo"}
            </span>
            {selectedGrupo && isOrganizer && (
              <Button size="sm" variant="outline" onClick={openGestionarMiembros} className="gap-1 font-medium h-7 text-xs border-border px-2.5 hover:bg-accent shadow-none">
                <Settings size={11} />
                <span>Gestionar</span>
              </Button>
            )}
          </div>

          <div className="p-4 space-y-4">
            {!selectedGrupo ? (
              <div className="text-center py-12 select-none">
                <p className="text-xs text-muted-foreground font-semibold">Selecciona un grupo del panel izquierdo</p>
              </div>
            ) : (
              <>
                {/* Description and Search */}
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground bg-muted/20 border border-border/60 p-3 rounded-lg leading-relaxed">
                    <span className="font-semibold text-foreground block mb-0.5">Descripción del Grupo</span>
                    {selectedGrupo.descripcion || "Sin descripción establecida."}
                  </div>
                  
                  {selectedGrupo.miembroIds && selectedGrupo.miembroIds.length > 0 && (
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-muted-foreground/50">
                        <Search size={12} />
                      </span>
                      <Input
                        placeholder="Buscar jugador por nombre o correo..."
                        value={searchMemberQuery}
                        onChange={(e) => setSearchMemberQuery(e.target.value)}
                        className="h-8 pl-7 text-[11px] border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border"
                      />
                    </div>
                  )}
                </div>

                <div className="max-h-[480px] overflow-y-auto pr-1">
                  {selectedGrupoMembers.length === 0 ? (
                    <div className="text-center py-12 select-none border border-dashed border-border rounded-lg bg-muted/[0.02]">
                      <p className="text-xs text-muted-foreground font-medium">
                        {searchMemberQuery ? "Sin resultados para la búsqueda" : "Este grupo no tiene jugadores asociados"}
                      </p>
                      {!searchMemberQuery && isOrganizer && (
                        <Button onClick={openGestionarMiembros} className="h-7 text-[10px] font-bold px-3 mt-3" variant="outline">
                          Agregar Jugadores
                        </Button>
                      )}
                    </div>
                  ) : (
                    <DataListShell>
                      <DataListHeader
                        columns={GRUPO_MEMBER_COLUMNS}
                        labels={{
                          jugador: "Jugador",
                          posiciones: "Posiciones",
                          acciones: "Acciones",
                        }}
                      />
                      <DataListBody>
                        {selectedGrupoMembers.map((user) => (
                          <DataListRow key={user.id} className="py-3">
                            <DataListCell label="Jugador" span={GRUPO_MEMBER_COLUMNS.jugador} priority="primary">
                              <PlayerIdentity
                                nombre={user.nombre}
                                username={user.username}
                                email={user.email}
                                variant="list"
                              />
                            </DataListCell>
                            <DataListCell label="Posiciones" span={GRUPO_MEMBER_COLUMNS.posiciones} priority="secondary">
                              <div className="flex flex-wrap gap-1">
                                {user.posiciones && user.posiciones.length > 0 ? (
                                  user.posiciones.map((pos) => (
                                    <Badge
                                      key={pos.posicionId}
                                      variant="outline"
                                      className="text-[9px] font-bold"
                                    >
                                      {pos.posicionNombre}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-[9px] text-muted-foreground italic">
                                    Sin posiciones
                                  </span>
                                )}
                              </div>
                            </DataListCell>
                            <DataListActions span={GRUPO_MEMBER_COLUMNS.acciones}>
                              {isOrganizer && (
                                <Tooltip content="Quitar este jugador del grupo">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveMember(user)}
                                    className="h-6 w-6 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                    aria-label="Quitar jugador del grupo"
                                  >
                                    <X size={13} />
                                  </Button>
                                </Tooltip>
                              )}
                            </DataListActions>
                          </DataListRow>
                        ))}
                      </DataListBody>
                    </DataListShell>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Creation / Edition Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-popover border border-border shadow-none rounded-lg max-w-md p-5 space-y-4">
          <form onSubmit={handleSaveGrupo}>
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-sm font-semibold tracking-tight">
              <span className="flex items-center gap-2">
                {selectedGrupo ? (
                  <>
                    <Settings size={14} /> Editar grupo
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> Crear nuevo grupo
                  </>
                )}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Configura los detalles del grupo y selecciona los miembros que formarán parte.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="nombre" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre del Grupo</Label>
                <Input
                  id="nombre"
                  placeholder="Ej. LEALES FC, Liga de los Lunes..."
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="descripcion" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descripción</Label>
                <Input
                  id="descripcion"
                  placeholder="Ej. Grupo de amigos para las convocatorias semanales de los lunes."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="space-y-2">
                <PresetChips
                  showIcon={false}
                  options={[
                    {
                      id: "all",
                      label: "Todos filtrados",
                      onClick: () =>
                        setSelectedUserIds((prev) => [
                          ...new Set([...prev, ...filteredUsers.map((u) => u.id)]),
                        ]),
                    },
                    {
                      id: "dorsal",
                      label: "Con dorsal",
                      onClick: () =>
                        setSelectedUserIds((prev) => [
                          ...new Set([
                            ...prev,
                            ...filteredUsers
                              .filter((u) => u.numeroCamiseta != null && u.numeroCamiseta > 0)
                              .map((u) => u.id),
                          ]),
                        ]),
                    },
                    {
                      id: "clear",
                      label: "Limpiar selección",
                      onClick: () => setSelectedUserIds([]),
                    },
                  ]}
                />
              </div>
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
                          isSelected ? "bg-primary/5 text-foreground font-semibold" : "hover:bg-secondary/30"
                        }`}
                      >
                        <PlayerIdentity
                          nombre={user.nombre}
                          username={user.username}
                          email={user.email}
                          variant="list"
                          className="flex-1 min-w-0"
                        />
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
              type="submit"
              disabled={saving || !nombre}
              className="h-8 text-xs font-semibold px-3 shadow-none bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving && <Spinner size="sm" className="mr-1.5" />}
              <span>{selectedGrupo ? "Guardar Cambios" : "Crear Grupo"}</span>
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
