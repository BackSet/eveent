import { useState, useEffect, useCallback } from "react";
import api from "@/services/api";
import { getApiErrorMessage } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
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
import { Users, Search, Shirt, Shield, MapPin, Calendar, Ban, Unlock, Eye } from "lucide-react";
import { formatDateTime } from "@/lib/formatDate";
import { useAuth } from "@/hooks/useAuth";

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
  email: string;
  numeroCamiseta?: number;
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
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMemberQuery, setSearchMemberQuery] = useState("");

  // Suspension States
  const [suspensionDialogOpen, setSuspensionDialogOpen] = useState(false);
  const [selectedUsuarioForSuspension, setSelectedUsuarioForSuspension] = useState<GrupoMiembro | null>(null);
  const [suspensionDuration, setSuspensionDuration] = useState("24h");
  const [customDate, setCustomDate] = useState("");
  const [suspensionReason, setSuspensionReason] = useState("");
  const [submittingSuspension, setSubmittingSuspension] = useState(false);

  // Profile Dialog States
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const toLocalISOString = (date: Date) => {
    const pad = (num: number) => (num < 10 ? "0" : "") + num;
    return (
      date.getFullYear() +
      "-" +
      pad(date.getMonth() + 1) +
      "-" +
      pad(date.getDate()) +
      "T" +
      pad(date.getHours()) +
      ":" +
      pad(date.getMinutes()) +
      ":" +
      pad(date.getSeconds())
    );
  };

  const isSuspended = (miembro: GrupoMiembro) => {
    if (!miembro.fechaFinSuspension) return false;
    return new Date(miembro.fechaFinSuspension).getTime() > Date.now();
  };

  const handleLevantarSuspension = async (miembro: GrupoMiembro) => {
    if (!confirm(`¿Levantar la suspensión de ${miembro.nombre}?`)) return;
    setError("");
    try {
      await api.post(`/api/usuarios/${miembro.id}/levantar-suspension`);
      setError("");
      fetchData();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || "Error al levantar la suspensión");
    }
  };

  const handleSuspenderUser = async () => {
    if (!selectedUsuarioForSuspension) return;
    if (!suspensionReason.trim()) {
      setError("El motivo de la suspensión es obligatorio");
      return;
    }

    let fechaFin: Date | null = null;
    const now = new Date();
    if (suspensionDuration === "24h") {
      fechaFin = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (suspensionDuration === "3d") {
      fechaFin = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    } else if (suspensionDuration === "1w") {
      fechaFin = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (suspensionDuration === "1m") {
      fechaFin = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else if (suspensionDuration === "custom") {
      if (!customDate) {
        setError("Debe seleccionar una fecha personalizada");
        return;
      }
      fechaFin = new Date(customDate);
      if (fechaFin.getTime() <= now.getTime()) {
        setError("La fecha personalizada debe ser en el futuro");
        return;
      }
    }

    if (!fechaFin) return;

    setSubmittingSuspension(true);
    setError("");
    try {
      await api.post(`/api/usuarios/${selectedUsuarioForSuspension.id}/suspender`, {
        fechaFin: toLocalISOString(fechaFin),
        motivo: suspensionReason,
      });
      setSuspensionDialogOpen(false);
      setSelectedUsuarioForSuspension(null);
      setSuspensionReason("");
      setSuspensionDuration("24h");
      setCustomDate("");
      fetchData();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || "Error al suspender al usuario");
    } finally {
      setSubmittingSuspension(false);
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
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn pb-12 px-4 sm:px-6">
      {/* Cover / Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5 pt-2 gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20 shrink-0 shadow-xs">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Mis Grupos</h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              Consulta las agrupaciones a las que perteneces, tus compañeros y sus roles tácticos.
            </p>
          </div>
        </div>

        {/* Search Input for Groups */}
        <div className="relative w-full sm:w-72 shrink-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border rounded-md"
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-destructive/20 bg-destructive/5 text-destructive rounded-lg shadow-none">
          <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-9 w-9" />
        </div>
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
                            className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-secondary/5 hover:bg-secondary/15 hover:border-border transition-colors gap-3"
                          >
                            {/* Avatar and Name */}
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center font-bold text-xs text-primary border border-primary/15 shrink-0 select-none shadow-2xs">
                                {miembro.nombre.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[11px] font-bold text-foreground truncate leading-none">
                                    {miembro.nombre}
                                  </span>
                                  {miembro.numeroCamiseta !== undefined && miembro.numeroCamiseta !== null && (
                                    <Badge variant="outline" className="h-4.5 px-1 py-0 text-[8px] font-mono font-bold leading-none bg-background text-foreground/80 border-border rounded flex items-center gap-0.5 shadow-3xs">
                                      <Shirt size={8} className="text-muted-foreground" />
                                      <span>{miembro.numeroCamiseta}</span>
                                    </Badge>
                                  )}
                                  {isSuspended(miembro) && (
                                    <Badge 
                                      variant="outline" 
                                      className="text-[8px] px-1 py-0.2 rounded font-bold bg-destructive/10 border-destructive/20 text-destructive select-none"
                                      title={`Motivo: ${miembro.motivoSuspension}`}
                                    >
                                      Suspendido 🚫
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-[9px] text-muted-foreground truncate block mt-0.5 font-medium leading-none">
                                  {miembro.email}
                                </span>
                                {isSuspended(miembro) && (
                                  <span className="text-[8px] text-destructive/80 font-medium mt-0.5 block truncate max-w-[200px]" title={`Motivo: ${miembro.motivoSuspension}. Hasta: ${new Date(miembro.fechaFinSuspension!).toLocaleString()}`}>
                                    Hasta: {new Date(miembro.fechaFinSuspension!).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Preferred Positions & Actions */}
                            <div className="flex items-center gap-2.5 shrink-0">
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

                              <div className="flex items-center gap-1.5 border-l border-border/40 pl-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  type="button"
                                  onClick={() => openUserProfile(miembro.id)}
                                  className="h-6 w-6 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
                                  title="Ver Perfil Deportivo"
                                >
                                  <Eye size={12} />
                                </Button>

                                {hasPermission("suspender_jugadores") && miembro.id !== user?.id && (
                                  isSuspended(miembro) ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      type="button"
                                      onClick={() => handleLevantarSuspension(miembro)}
                                      className="h-6 w-6 rounded-md hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 animate-pulse"
                                      title="Levantar Suspensión"
                                    >
                                      <Unlock size={12} />
                                    </Button>
                                  ) : (
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
                                      title="Suspender Jugador"
                                    >
                                      <Ban size={12} />
                                    </Button>
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
            <div className="col-span-full border border-dashed border-border rounded-xl p-12 text-center bg-card">
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-xs font-bold text-foreground">Sin Grupos Encontrados</h3>
              <p className="text-[11px] text-muted-foreground mt-1">
                {searchQuery ? "Prueba ajustando los términos de tu búsqueda." : "No perteneces a ningún grupo en el sistema."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Suspension Dialog */}
      <Dialog open={suspensionDialogOpen} onOpenChange={setSuspensionDialogOpen}>
        <DialogContent className="bg-popover border border-border shadow-none rounded-lg max-w-sm p-5 space-y-4">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-sm font-semibold tracking-tight text-destructive flex items-center gap-1.5">
              <Ban size={16} />
              <span>Suspender Jugador</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Suspender a {selectedUsuarioForSuspension?.nombre}. Durante la suspensión, el jugador no podrá inscribirse ni confirmar asistencia en convocatorias.
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

          <div className="space-y-4 py-2">
            {/* Duration selectors */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Duración de la Suspensión</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "24h", label: "24 Horas" },
                  { value: "3d", label: "3 Días" },
                  { value: "1w", label: "1 Semana" },
                  { value: "1m", label: "1 Mes" },
                  { value: "custom", label: "Personalizado" },
                ].map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={suspensionDuration === opt.value ? "default" : "outline"}
                    onClick={() => {
                      setSuspensionDuration(opt.value);
                      setError("");
                    }}
                    className={`h-8 text-[10px] font-medium px-2 py-1 shadow-none border-border ${
                      suspensionDuration === opt.value
                        ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        : "hover:bg-secondary"
                    }`}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Date Picker */}
            {suspensionDuration === "custom" && (
              <div className="space-y-1.5 animate-fadeIn">
                <Label htmlFor="customDate" className="text-xs font-semibold text-muted-foreground">Fecha y Hora de Finalización</Label>
                <Input
                  id="customDate"
                  type="datetime-local"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border"
                />
              </div>
            )}

            {/* Reason */}
            <div className="space-y-1.5">
              <Label htmlFor="suspensionReason" className="text-xs font-semibold text-muted-foreground">Motivo de la Suspensión</Label>
              <textarea
                id="suspensionReason"
                rows={3}
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="Escriba el motivo detallado de la suspensión (obligatorio)..."
                className="w-full text-xs p-2 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-3 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSuspensionDialogOpen(false);
                setSelectedUsuarioForSuspension(null);
              }}
              className="h-8 text-xs font-semibold px-3 border-border hover:bg-secondary shadow-none"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSuspenderUser}
              disabled={submittingSuspension || !suspensionReason.trim() || (suspensionDuration === "custom" && !customDate)}
              className="h-8 text-xs font-semibold px-3 shadow-none bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submittingSuspension ? <Spinner size="sm" /> : "Suspender"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-secondary/15">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-extrabold text-sm uppercase">
                  {selectedProfile.nombre.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-foreground truncate">{selectedProfile.nombre}</span>
                    {selectedProfile.activo ? (
                      <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold uppercase text-[8px] py-0 px-1">Activo</Badge>
                    ) : (
                      <Badge variant="secondary" className="font-bold uppercase text-[8px] py-0 px-1">Inactivo</Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground block font-mono truncate">{selectedProfile.email}</span>
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
                            🏆 {deporteNombre}
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
