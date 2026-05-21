import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Mail, 
  ShieldAlert, 
  Sparkles, 
  UserCheck, 
  ShieldCheck, 
  Hash, 
  Star,
  Activity
} from "lucide-react";
import { Deporte, PosicionesDeporte, UsuarioPosicionDto } from "@/types";

export default function PerfilPage() {
  const { user, updateUser } = useAuth();
  
  // Profile Form States
  const [formData, setFormData] = useState({
    nombre: user?.nombre || "",
    email: user?.email || "",
    username: user?.username || "",
    numeroCamiseta: user?.numeroCamiseta !== undefined && user?.numeroCamiseta !== null ? user?.numeroCamiseta.toString() : "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  // Sports & Positions States
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [selectedDeporteId, setSelectedDeporteId] = useState<number | null>(null);
  const [posiciones, setPosiciones] = useState<PosicionesDeporte[]>([]);
  const [userPosiciones, setUserPosiciones] = useState<UsuarioPosicionDto[]>([]);
  const [loadingSports, setLoadingSports] = useState(false);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [positionsSuccess, setPositionsSuccess] = useState("");
  const [positionsError, setPositionsError] = useState("");
  const [savingPositions, setSavingPositions] = useState(false);

  // Fetch initial sports and user positions
  useEffect(() => {
    const fetchSportsAndUserPositions = async () => {
      setLoadingSports(true);
      try {
        const [sportsRes, userPositionsRes] = await Promise.all([
          api.get<Deporte[]>("/api/deportes"),
          api.get<UsuarioPosicionDto[]>("/api/usuarios/me/posiciones")
        ]);
        setDeportes(sportsRes.data);
        setUserPosiciones(userPositionsRes.data);
        
        if (sportsRes.data.length > 0) {
          setSelectedDeporteId(sportsRes.data[0].id);
        }
      } catch (err) {
        console.error("Error al cargar deportes o posiciones del usuario", err);
      } finally {
        setLoadingSports(false);
      }
    };
    fetchSportsAndUserPositions();
  }, []);

  // Fetch positions when selected sport changes
  useEffect(() => {
    if (selectedDeporteId === null) return;
    const fetchSportPositions = async () => {
      setLoadingPositions(true);
      try {
        const { data } = await api.get<PosicionesDeporte[]>(`/api/deportes/${selectedDeporteId}/posiciones`);
        setPosiciones(data);
      } catch (err) {
        console.error("Error al cargar posiciones del deporte", err);
      } finally {
        setLoadingPositions(false);
      }
    };
    fetchSportPositions();
  }, [selectedDeporteId]);

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        nombre: formData.nombre,
        email: formData.email,
        username: formData.username || null,
        numeroCamiseta: formData.numeroCamiseta ? parseInt(formData.numeroCamiseta, 10) : null,
      };
      const { data } = await api.put("/api/usuarios/me", payload);
      updateUser(data);
      setSuccess("Perfil actualizado correctamente");
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al actualizar perfil");
    } finally {
      setSaving(false);
    }
  };

  // Helper to get priority for a position
  const getPositionPriority = (posId: number): number => {
    const found = userPosiciones.find(up => up.posicionId === posId);
    return found ? found.prioridad : 0; // 0 means unassigned
  };

  // Handle position priority change with auto-unassigning logic to prevent duplicate priorities
  const handlePriorityChange = (posId: number, priority: number) => {
    if (!selectedDeporteId) return;

    setUserPosiciones(prev => {
      // 1. Remove this position if it was already in the list
      let filtered = prev.filter(up => up.posicionId !== posId);

      if (priority === 0) {
        return filtered;
      }

      // 2. Prevent duplicate priorities within the SAME sport
      // Find the sport name to construct the DTO
      const activeSport = deportes.find(d => d.id === selectedDeporteId);
      const activePos = posiciones.find(p => p.id === posId);
      if (!activeSport || !activePos) return prev;

      // Filter out any other position in the same sport that already has this priority
      filtered = filtered.filter(up => !(up.deporteId === selectedDeporteId && up.prioridad === priority));

      // 3. Add the new position assignment
      const newAssignment: UsuarioPosicionDto = {
        posicionId: posId,
        posicionNombre: activePos.nombre,
        deporteId: selectedDeporteId,
        deporteNombre: activeSport.nombre,
        prioridad: priority
      };

      return [...filtered, newAssignment];
    });
  };

  const handleSavePositions = async () => {
    setSavingPositions(true);
    setPositionsSuccess("");
    setPositionsError("");
    try {
      const { data } = await api.put<UsuarioPosicionDto[]>("/api/usuarios/me/posiciones", userPosiciones);
      setUserPosiciones(data);
      setPositionsSuccess("Prioridades de posición actualizadas correctamente");
    } catch (err: any) {
      setPositionsError(err.response?.data?.message || "Error al guardar prioridades");
    } finally {
      setSavingPositions(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl animate-fadeIn pb-12">
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary uppercase tracking-wider mb-2">
          <User size={12} />
          Configuración Personal
        </div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Mi Perfil</h1>
        <p className="text-muted-foreground text-sm font-medium mt-0.5">
          Actualiza tu información, dorsal, apodo de juego y prioriza tus posiciones favoritas
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Avatar Card */}
        <Card className="md:col-span-1 h-fit border border-border shadow-md overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary to-purple-500" />
          <CardContent className="pt-8 flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center font-black text-3xl text-white shadow-xl animate-float">
                {user?.nombre?.charAt(0).toUpperCase() || 'U'}
              </div>
              {user?.numeroCamiseta !== undefined && user?.numeroCamiseta !== null && (
                <div className="absolute -bottom-2 -right-2 bg-purple-600 text-white rounded-full h-8 w-8 flex items-center justify-center font-black text-sm border-2 border-background shadow-md">
                  #{user.numeroCamiseta}
                </div>
              )}
            </div>
            
            <div>
              <h3 className="font-extrabold text-foreground text-lg leading-tight">{user?.nombre}</h3>
              {user?.username && (
                <p className="text-xs font-bold text-primary mt-0.5">@{user.username}</p>
              )}
              <p className="text-xs font-medium text-muted-foreground mt-1">{user?.email}</p>
            </div>
            
            <div className="w-full pt-4 border-t border-border/50 space-y-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Roles Asignados</span>
              <div className="flex flex-wrap justify-center gap-1.5">
                {user?.roles?.map((role) => (
                  <Badge 
                    key={role} 
                    variant="outline"
                    className="bg-primary/5 text-primary border-primary/20 font-bold px-2 py-0.5 rounded-lg text-[9px] uppercase"
                  >
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details Form Card */}
        <Card className="md:col-span-2 border border-border shadow-md">
          <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-bold text-foreground">Información de Usuario</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            {error && (
              <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 animate-pulse-slow">
                <ShieldAlert size={18} className="mt-0.5 shrink-0" />
                <p className="font-medium">{error}</p>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 text-green-600 text-sm bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 animate-pulse-slow">
                <UserCheck size={18} className="mt-0.5 shrink-0" />
                <p className="font-semibold">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmitProfile} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Nombre Completo
                  </Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground/60">
                      <User size={16} />
                    </span>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) =>
                        setFormData({ ...formData, nombre: e.target.value })
                      }
                      required
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Dirección de Correo
                  </Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground/60">
                      <Mail size={16} />
                    </span>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Apodo / Username (Ficha de Matchmaking)
                  </Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground/60 font-bold text-sm">
                      @
                    </span>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      placeholder="e.g. cr7_goleador"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numeroCamiseta" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Número de Camiseta Preferido
                  </Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground/60">
                      <Hash size={16} />
                    </span>
                    <Input
                      id="numeroCamiseta"
                      type="number"
                      min="1"
                      max="99"
                      value={formData.numeroCamiseta}
                      onChange={(e) =>
                        setFormData({ ...formData, numeroCamiseta: e.target.value })
                      }
                      placeholder="e.g. 10"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={saving} className="glow-btn gap-2 font-bold rounded-xl px-6">
                  {saving ? <Spinner /> : "Guardar Cambios"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Position Priority Preferences Card */}
      <Card className="border border-border shadow-md overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-purple-500 to-indigo-500" />
        <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-500 animate-pulse" />
            <div>
              <CardTitle className="text-lg font-bold text-foreground">Mis Posiciones Deportivas</CardTitle>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                Prioriza tus posiciones preferidas de cada deporte para el balanceador automático
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {positionsError && (
            <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
              <ShieldAlert size={18} className="mt-0.5 shrink-0" />
              <p className="font-medium">{positionsError}</p>
            </div>
          )}
          {positionsSuccess && (
            <div className="flex items-start gap-2 text-green-600 text-sm bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
              <UserCheck size={18} className="mt-0.5 shrink-0" />
              <p className="font-semibold">{positionsSuccess}</p>
            </div>
          )}

          {loadingSports ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Sport Selector Tabs */}
              <div className="flex flex-wrap gap-2 pb-2 border-b border-border/40">
                {deportes.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDeporteId(d.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedDeporteId === d.id
                        ? "bg-purple-600 text-white shadow-md shadow-purple-600/20 scale-105"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                  >
                    {d.nombre}
                  </button>
                ))}
              </div>

              {/* Positions List */}
              {loadingPositions ? (
                <div className="flex items-center justify-center py-6">
                  <Spinner size="md" />
                </div>
              ) : (
                <div className="space-y-4">
                  {posiciones.length === 0 ? (
                    <p className="text-sm font-medium text-muted-foreground text-center py-4">
                      Este deporte no tiene posiciones registradas.
                    </p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {posiciones.map((pos) => {
                        const currentPrio = getPositionPriority(pos.id);

                        return (
                          <div 
                            key={pos.id} 
                            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                              currentPrio > 0 
                                ? "bg-purple-500/5 border-purple-500/30 shadow-sm"
                                : "bg-card border-border hover:border-border/80"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                                  {pos.nombre}
                                  {currentPrio > 0 && (
                                    <Badge className="bg-purple-600/10 text-purple-600 hover:bg-purple-600/20 border-purple-500/20 text-[9px] font-black uppercase">
                                      Opción {currentPrio}
                                    </Badge>
                                  )}
                                </h4>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 block">
                                  Siglas: {pos.abreviatura}
                                </span>
                              </div>
                              {currentPrio > 0 && (
                                <Star className="h-4 w-4 text-purple-500 fill-purple-500 animate-pulse" />
                              )}
                            </div>

                            {/* Priority Selection Pills */}
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => handlePriorityChange(pos.id, 0)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                  currentPrio === 0
                                    ? "bg-slate-500/15 text-slate-700 dark:text-slate-300 font-extrabold border border-slate-500/30"
                                    : "bg-muted text-muted-foreground/60 hover:bg-muted/80"
                                }`}
                              >
                                No Jugar
                              </button>
                              {[1, 2, 3].map((prio) => (
                                <button
                                  key={prio}
                                  type="button"
                                  onClick={() => handlePriorityChange(pos.id, prio)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                                    currentPrio === prio
                                      ? "bg-purple-600 text-white font-extrabold shadow-sm shadow-purple-600/10"
                                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                                  }`}
                                >
                                  {prio}ª Opción
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Save Positions Button */}
                  <div className="pt-4 border-t border-border/50 flex justify-end">
                    <Button
                      onClick={handleSavePositions}
                      disabled={savingPositions}
                      className="bg-purple-600 hover:bg-purple-700 text-white gap-2 font-bold rounded-xl px-6 shadow-md shadow-purple-600/10"
                    >
                      {savingPositions ? <Spinner /> : "Guardar Prioridades"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security notice card */}
      <Card className="border border-border shadow-md bg-gradient-to-r from-muted/20 to-primary/5">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="font-extrabold text-foreground text-sm">Cambio de Contraseña Protegido</h4>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                Para cambiar tus credenciales de acceso, debes contactar directamente al Administrador General.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}