import { useState, useEffect, useCallback } from "react";
import api from "@/services/api";
import { getApiErrorMessage } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { CardGridSkeleton } from "@/components/ui/page-skeletons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Search, Shirt, Shield, Calendar, Ban, Unlock, Eye } from "lucide-react";
import { DeporteIcon } from "@/components/ui/page-icon";
import { PageHeader } from "@/components/ui/page-header";
import { PageIconKind } from "@/lib/iconography";
import { formatDateTime } from "@/lib/formatDate";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { PlayerIdentity } from "@/components/ui/player-identity";
import { SuspensionDialog } from "@/components/usuarios/SuspensionDialog";

interface PosicionDto {
  posicionId: number;
  posicionNombre: string;
  posicionAbreviatura: string;
  deporteId: number;
  deporteNombre: string;
  prioridad: number;
}

interface GrupoMiembro {
  id: number;
  nombre: string;
  username?: string;
  email: string;
  posiciones: PosicionDto[];
  fechaFinSuspension?: string | null;
  motivoSuspension?: string | null;
}

interface Grupo {
  id: number;
  nombre: string;
  descripcion: string;
  creadoPorId: number;
  creadoPorNombre: string;
  fechaCreacion: string;
  miembroIds: number[];
  miembroNombres: string[];
  miembros?: GrupoMiembro[];
}

export default function MisGruposPage() {
  const { hasPermission, user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [suspensionDialogOpen, setSuspensionDialogOpen] = useState(false);
  const [selectedUsuarioForSuspension, setSelectedUsuarioForSuspension] = useState<GrupoMiembro | null>(null);

  // Profile Dialog States
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const isSuspended = (miembro: GrupoMiembro) => {
    if (!miembro.fechaFinSuspension) return false;
    return new Date(miembro.fechaFinSuspension).getTime() > Date.now();
  };

  const handleLevantarSuspension = async (miembro: GrupoMiembro) => {
    const ok = await confirm({
      title: "Levantar suspensión",
      description: `¿Quieres reactivar a ${miembro.nombre}? Volverá a poder inscribirse y confirmar asistencia en convocatorias inmediatamente.`,
      confirmLabel: "Sí, reactivar",
      cancelLabel: "Cancelar",
      variant: "info",
    });
    if (!ok) return;
    setError("");
    try {
      await api.post(`/api/usuarios/${miembro.id}/levantar-suspension`);
      toast.success("Suspensión levantada", `${miembro.nombre} vuelve a estar activo.`);
      fetchData();
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err) || "Error al levantar la suspensión";
      setError(msg);
      toast.error(msg);
    }
  };

  const openUserProfile = async (userId: number) => {
    setProfileLoading(true);
    setSelectedProfile(null);
    setProfileDialogOpen(true);
    setError("");
    try {
      const res = await api.get(`/api/usuarios/${userId}`);
      setSelectedProfile(res.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || "Error al cargar perfil de usuario");
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get("/api/grupos");
      setGrupos(res.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || "Error al cargar tus grupos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter groups
  const filteredGrupos = grupos.filter(
    (g) =>
      g.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.descripcion && g.descripcion.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="page-shell space-y-6 animate-fadeIn">
      <PageHeader
        iconKind={PageIconKind.GRUPOS}
        title="Mis Grupos"
        description="Consulta las agrupaciones a las que perteneces, tus compañeros y sus posiciones preferidas."
        hintProps={{ maxWidth: 300 }}
        hint={
          <>
            Los <strong>grupos</strong> son listas de jugadores reutilizables (ej. &quot;Equipo A&quot;,
            &quot;Amigos del barrio&quot;). Sirven para invitar a varios jugadores a una convocatoria con
            un solo clic.
          </>
        }
        actions={
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border rounded-md w-full"
            />
          </div>
        }
      />

      {error && (
        <Alert variant="destructive" className="border-destructive/20 bg-destructive/5 text-destructive rounded-lg shadow-none">
          <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <CardGridSkeleton count={4} columns={2} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredGrupos.map((grupo) => (
            <Card key={grupo.id} className="border border-border/80 bg-card rounded-xl overflow-hidden shadow-none flex flex-col justify-between hover:border-muted-foreground/35 transition-colors">
              <div>
                <CardHeader className="pb-3 border-b border-border/50 bg-secondary/5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-sm font-bold text-foreground tracking-tight leading-tight">
                        {grupo.nombre}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground/90 font-medium line-clamp-2 leading-relaxed">
                        {grupo.descripcion || "Sin descripción disponible"}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="px-2 py-0.5 text-[9px] font-bold tracking-wider shrink-0 bg-primary/10 text-primary border border-primary/20 rounded shadow-none uppercase">
                      {grupo.miembros?.length || 0} MIEMBROS
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-muted-foreground/80 font-semibold border-b border-border/30 pb-3">
                    <div className="flex items-center gap-1">
                      <Shield size={11} className="text-primary/70" />
                      <span>Creado por: <span className="text-foreground">{grupo.creadoPorNombre}</span></span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={11} className="text-primary/70" />
                      <span>Desde: <span className="text-foreground">{formatDateTime(grupo.fechaCreacion)}</span></span>
                    </div>
                  </div>

                  {/* Members Directory */}
                  <div className="space-y-2.5">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Integrantes del Equipo</h4>
                    
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {(!grupo.miembros || grupo.miembros.length === 0) ? (
                        <p className="text-xs text-muted-foreground italic py-3 text-center">No hay miembros registrados.</p>
                      ) : (
                        grupo.miembros.map((miembro) => (
                          <div
                            key={miembro.id}
                            className="flex flex-col gap-2 lg:grid lg:grid-cols-12 lg:gap-3 lg:items-center p-2.5 rounded-lg border border-border/60 bg-secondary/5 hover:bg-secondary/15 hover:border-border transition-colors"
                          >
                            <div className="lg:col-span-5 min-w-0 space-y-1 flex-1">
                              <span className="lg:hidden text-[9px] font-bold uppercase text-muted-foreground block mb-1">
                                Jugador
                              </span>
                              <PlayerIdentity
                                nombre={miembro.nombre}
                                username={miembro.username}
                                email={miembro.email}
                                variant="list"
                              />
                              {isSuspended(miembro) && (
                                <Tooltip
                                  content={
                                    <span>
                                      Hasta {new Date(miembro.fechaFinSuspension!).toLocaleString()}
                                      <br />
                                      {miembro.motivoSuspension}
                                    </span>
                                  }
                                  maxWidth={260}
                                >
                                  <Badge
                                    variant="outline"
                                    className="text-[8px] px-1 py-0.2 rounded font-bold bg-destructive/10 border-destructive/20 text-destructive w-fit cursor-help"
                                  >
                                    Suspendido
                                  </Badge>
                                </Tooltip>
                              )}
                            </div>

                            <div className="lg:col-span-4 flex items-center gap-2.5 shrink-0">
                              <span className="lg:hidden text-[9px] font-bold uppercase text-muted-foreground block mb-1 w-full">
                                Posiciones
                              </span>
                              <div className="hidden sm:flex flex-wrap justify-end gap-1 max-w-[120px]">
                                {miembro.posiciones && miembro.posiciones.length > 0 ? (
                                  miembro.posiciones.slice(0, 2).map((pos) => (
                                    <Badge
                                      key={pos.posicionId}
                                      variant="outline"
                                      className="px-1.5 py-0 text-[8px] font-extrabold uppercase tracking-wide bg-background border-border text-foreground/90 rounded-sm shadow-3xs"
                                    >
                                      {pos.posicionAbreviatura || pos.posicionNombre}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-[8px] text-muted-foreground italic font-medium">Sin posiciones</span>
                                )}
                              </div>
                            </div>

                            <div className="lg:col-span-3 flex items-center justify-end gap-1.5 lg:border-l lg:border-border/40 lg:pl-2">
                              <span className="lg:hidden text-[9px] font-bold uppercase text-muted-foreground block mb-1 w-full">
                                Acciones
                              </span>
                              <div className="flex items-center gap-1.5 ml-auto">
                                <Tooltip content="Ver perfil deportivo (posiciones y deportes)">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    type="button"
                                    onClick={() => openUserProfile(miembro.id)}
                                    className="h-6 w-6 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
                                    aria-label={`Ver perfil de ${miembro.nombre}`}
                                  >
                                    <Eye size={12} />
                                  </Button>
                                </Tooltip>

                                {hasPermission("suspender_jugadores") && miembro.id !== user?.id && (
                                  isSuspended(miembro) ? (
                                    <Tooltip content="Levantar la suspensión y reactivar al jugador">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        type="button"
                                        onClick={() => handleLevantarSuspension(miembro)}
                                        className="h-6 w-6 rounded-md hover:bg-[hsl(var(--success)/0.12)] text-tone-success animate-pulse"
                                        aria-label={`Levantar suspensión de ${miembro.nombre}`}
                                      >
                                        <Unlock size={12} />
                                      </Button>
                                    </Tooltip>
                                  ) : (
                                    <Tooltip content="Suspender al jugador (no podrá inscribirse durante el período definido)">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        type="button"
                                        onClick={() => {
                                          setSelectedUsuarioForSuspension(miembro);
                                          setSuspensionDialogOpen(true);
                                          setError("");
                                        }}
                                        className="h-6 w-6 rounded-md hover:bg-destructive/10 text-destructive"
                                        aria-label={`Suspender a ${miembro.nombre}`}
                                      >
                                        <Ban size={12} />
                                      </Button>
                                    </Tooltip>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}

          {filteredGrupos.length === 0 && !loading && (
            <div className="col-span-full">
              <EmptyState
                variant={searchQuery ? "search" : "default"}
                icon={<Users size={32} />}
                title={searchQuery ? "Sin resultados" : "Aún no perteneces a ningún grupo"}
                description={
                  searchQuery
                    ? `No encontramos grupos que coincidan con "${searchQuery}". Prueba con otro término.`
                    : "Cuando un administrador te añada a un grupo o crees uno propio, aparecerá aquí."
                }
                action={
                  searchQuery
                    ? <Button variant="outline" onClick={() => setSearchQuery("")} className="h-8 text-xs">Limpiar búsqueda</Button>
                    : undefined
                }
              />
            </div>
          )}
        </div>
      )}

      <SuspensionDialog
        open={suspensionDialogOpen}
        onOpenChange={(open) => {
          setSuspensionDialogOpen(open);
          if (!open) setSelectedUsuarioForSuspension(null);
        }}
        userId={selectedUsuarioForSuspension?.id ?? null}
        userName={selectedUsuarioForSuspension?.nombre ?? ""}
        onSuccess={fetchData}
      />

      {/* User Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="bg-popover border border-border shadow-none rounded-lg max-w-md p-5 space-y-4">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users size={16} className="text-primary" />
              <span>Perfil Deportivo</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Detalles del jugador, deportes activos y roles preferidos en la cancha.
            </DialogDescription>
          </DialogHeader>

          {profileLoading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2">
              <Spinner size="md" />
              <span className="text-xs text-muted-foreground">Cargando perfil táctico...</span>
            </div>
          ) : selectedProfile ? (
            <div className="space-y-4">
              {/* Profile Card Summary */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 p-3 rounded-lg border border-border/60 bg-secondary/15">
                <PlayerIdentity
                  nombre={selectedProfile.nombre}
                  username={selectedProfile.username}
                  email={selectedProfile.email}
                  variant="profile"
                  className="flex-1 min-w-0"
                />
                <div className="flex items-center gap-1.5 shrink-0 self-start">
                  {selectedProfile.activo ? (
                    <Badge variant="success" className="font-bold uppercase text-[8px] py-0 px-1">Activo</Badge>
                  ) : (
                    <Badge variant="secondary" className="font-bold uppercase text-[8px] py-0 px-1">Inactivo</Badge>
                  )}
                </div>
              </div>

              {/* Sports and Positions section */}
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Disciplinas y Posiciones</h4>
                
                <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
                  {(!selectedProfile.posiciones || selectedProfile.posiciones.length === 0) ? (
                    <div className="text-center py-6 border border-dashed border-border rounded-lg bg-secondary/5">
                      <p className="text-xs text-muted-foreground italic">Este jugador aún no tiene posiciones preferidas configuradas.</p>
                    </div>
                  ) : (
                    Object.entries(
                      selectedProfile.posiciones.reduce((acc: any, pos: any) => {
                        if (!acc[pos.deporteNombre]) {
                          acc[pos.deporteNombre] = [];
                        }
                        acc[pos.deporteNombre].push(pos);
                        return acc;
                      }, {})
                    ).map(([deporteNombre, posiciones]: [string, any]) => (
                      <div key={deporteNombre} className="p-3 rounded-lg border border-border/80 bg-background space-y-2 shadow-3xs">
                        <div className="flex items-center gap-1.5 border-b border-border/30 pb-1.5">
                          <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                            <span className="inline-flex items-center gap-1">
                              <DeporteIcon nombre={deporteNombre} size={14} />
                              {deporteNombre}
                            </span>
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {posiciones.map((pos: any) => (
                            <div key={pos.posicionId} className="flex items-center justify-between p-1.5 rounded border border-border/40 bg-secondary/5 gap-2">
                              <span className="text-[10px] font-bold text-foreground truncate">
                                {pos.posicionNombre} ({pos.posicionAbreviatura})
                              </span>
                              <Badge variant="outline" className={`text-[8px] font-extrabold uppercase shrink-0 py-0.2 rounded-sm ${
                                pos.prioridad === 1
                                  ? "bg-primary/10 text-primary border-primary/20"
                                  : "bg-muted text-muted-foreground"
                              }`}>
                                {pos.prioridad === 1 ? "Principal 🌟" : `Prioridad ${pos.prioridad}`}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-xs text-destructive">Error al cargar la información.</p>
            </div>
          )}

          <div className="border-t border-border pt-3 flex justify-end">
            <Button
              variant="outline"
              type="button"
              onClick={() => setProfileDialogOpen(false)}
              className="h-8 text-xs font-semibold px-4 border-border hover:bg-secondary shadow-none"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
