import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import api from "@/services/api";
import { getApiErrorMessage } from "@/lib/constants";
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
  UserCheck, 
  Hash, 
  Search,
  ChevronUp,
  ChevronDown,
  X,
  Plus,
  Check,
  ArrowUpDown
} from "lucide-react";
import { Deporte, PosicionesDeporte, UsuarioPosicionDto } from "@/types";

export default function PerfilPage() {
  const { user, updateUser } = useAuth();
  
  const [formData, setFormData] = useState({
    nombre: user?.nombre || "",
    email: user?.email || "",
    username: user?.username || "",
    numeroCamiseta: user?.numeroCamiseta !== undefined && user?.numeroCamiseta !== null ? user?.numeroCamiseta.toString() : "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [selectedDeporteId, setSelectedDeporteId] = useState<number | null>(null);
  const [posiciones, setPosiciones] = useState<PosicionesDeporte[]>([]);
  const [userPosiciones, setUserPosiciones] = useState<UsuarioPosicionDto[]>([]);
  const [positionSearch, setPositionSearch] = useState("");
  const [loadingSports, setLoadingSports] = useState(false);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [positionsSuccess, setPositionsSuccess] = useState("");
  const [positionsError, setPositionsError] = useState("");
  const [savingPositions, setSavingPositions] = useState(false);

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
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || "Error al actualizar perfil");
    } finally {
      setSaving(false);
    }
  };

  const prioritizedPositions = userPosiciones
    .filter(up => up.deporteId === selectedDeporteId)
    .sort((a, b) => a.prioridad - b.prioridad);

  const filteredPositions = posiciones.filter(p =>
    !positionSearch ||
    p.nombre.toLowerCase().includes(positionSearch.toLowerCase()) ||
    (p.abreviatura || "").toLowerCase().includes(positionSearch.toLowerCase())
  );

  const isPositionAdded = (posId: number): boolean =>
    userPosiciones.some(up => up.posicionId === posId && up.deporteId === selectedDeporteId);

  const handleAddPosition = (posId: number) => {
    if (!selectedDeporteId) return;

    const activeSport = deportes.find(d => d.id === selectedDeporteId);
    const activePos = posiciones.find(p => p.id === posId);
    if (!activeSport || !activePos) return;

    setUserPosiciones(prev => {
      if (prev.some(up => up.posicionId === posId && up.deporteId === selectedDeporteId)) return prev;

      const sportPositions = prev.filter(up => up.deporteId === selectedDeporteId);
      const nextPriority = sportPositions.length + 1;

      const newAssignment: UsuarioPosicionDto = {
        posicionId: posId,
        posicionNombre: activePos.nombre,
        deporteId: selectedDeporteId,
        deporteNombre: activeSport.nombre,
        prioridad: nextPriority,
      };

      return [...prev, newAssignment];
    });
  };

  const handleRemovePosition = (posId: number) => {
    if (!selectedDeporteId) return;

    setUserPosiciones(prev => {
      const others = prev.filter(up => up.deporteId !== selectedDeporteId);
      let sportPositions = prev.filter(up => up.deporteId === selectedDeporteId && up.posicionId !== posId);

      sportPositions = sportPositions
        .sort((a, b) => a.prioridad - b.prioridad)
        .map((up, idx) => ({ ...up, prioridad: idx + 1 }));

      return [...others, ...sportPositions];
    });
  };

  const handleMoveUp = (index: number) => {
    if (!selectedDeporteId || index <= 0) return;

    setUserPosiciones(prev => {
      const others = prev.filter(up => up.deporteId !== selectedDeporteId);
      const sorted = prev
        .filter(up => up.deporteId === selectedDeporteId)
        .sort((a, b) => a.prioridad - b.prioridad);

      if (index >= sorted.length) return prev;

      const current = sorted[index];
      const above = sorted[index - 1];

      const updated = sorted.map((up, idx) => {
        if (idx === index) return { ...up, prioridad: above.prioridad };
        if (idx === index - 1) return { ...up, prioridad: current.prioridad };
        return up;
      });

      return [...others, ...updated];
    });
  };

  const handleMoveDown = (index: number) => {
    if (!selectedDeporteId) return;

    setUserPosiciones(prev => {
      const others = prev.filter(up => up.deporteId !== selectedDeporteId);
      const sorted = prev
        .filter(up => up.deporteId === selectedDeporteId)
        .sort((a, b) => a.prioridad - b.prioridad);

      if (index >= sorted.length - 1) return prev;

      const current = sorted[index];
      const below = sorted[index + 1];

      const updated = sorted.map((up, idx) => {
        if (idx === index) return { ...up, prioridad: below.prioridad };
        if (idx === index + 1) return { ...up, prioridad: current.prioridad };
        return up;
      });

      return [...others, ...updated];
    });
  };

  const handleSportChange = (deporteId: number) => {
    setSelectedDeporteId(deporteId);
    setPositionSearch("");
  };

  const handleSavePositions = async () => {
    setSavingPositions(true);
    setPositionsSuccess("");
    setPositionsError("");
    try {
      const { data } = await api.put<UsuarioPosicionDto[]>("/api/usuarios/me/posiciones", userPosiciones);
      setUserPosiciones(data);
      setPositionsSuccess("Prioridades actualizadas");
    } catch (err: unknown) {
      setPositionsError(getApiErrorMessage(err) || "Error al guardar prioridades");
    } finally {
      setSavingPositions(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl animate-fadeIn pb-12 -mx-4 md:-mx-8 -mt-6">
      {/* Cover Image */}
      <div className="notion-cover notion-cover-sports h-32 md:h-40">
        <div className="notion-page-icon-overlay select-none">👤</div>
      </div>

      <div className="px-4 md:px-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ajustes de Perfil</h1>
          <p className="text-muted-foreground text-xs mt-1">
            Administra tu cuenta personal, información de jugador y prioridades de posición.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Tarjeta de Workspace de Usuario */}
          <div className="md:col-span-1 rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="flex flex-col items-center text-center space-y-3 pt-2">
              <div className="relative">
                <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center font-bold text-2xl text-foreground border border-border">
                  {user?.nombre?.charAt(0).toUpperCase() || 'U'}
                </div>
                {user?.numeroCamiseta !== undefined && user?.numeroCamiseta !== null && (
                  <div className="absolute -bottom-1.5 -right-1.5 bg-background text-foreground rounded-full h-6 w-6 flex items-center justify-center font-bold text-xs border border-border">
                    #{user.numeroCamiseta}
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="font-semibold text-foreground text-sm">{user?.nombre}</h3>
                {user?.username && (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">@{user.username}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-border space-y-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Roles en el Workspace</span>
              <div className="flex flex-wrap gap-1">
                {user?.roles?.map((role) => (
                  <Badge 
                    key={role} 
                    variant="outline"
                    className="text-[9px] uppercase px-2 py-0.5 font-semibold tracking-wider bg-secondary/50 border-border text-foreground rounded shadow-none"
                  >
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Formulario de Información */}
          <div className="md:col-span-2 rounded-lg border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold tracking-tight">Información Personal</h3>
            
            {error && (
              <div className="notion-callout border-destructive/20 bg-destructive/5 text-destructive p-3">
                <div className="notion-callout-icon">
                  <ShieldAlert size={16} className="shrink-0" />
                </div>
                <div className="text-xs font-medium">{error}</div>
              </div>
            )}
            {success && (
              <div className="notion-callout border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 p-3">
                <div className="notion-callout-icon">
                  <UserCheck size={16} className="shrink-0" />
                </div>
                <div className="text-xs font-medium">{success}</div>
              </div>
            )}

            <form onSubmit={handleSubmitProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nombre" className="text-xs font-semibold text-muted-foreground">Nombre</Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/50">
                      <User size={13} />
                    </span>
                    <Input 
                      id="nombre" 
                      value={formData.nombre} 
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} 
                      required 
                      className="pl-9 h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">Correo Electrónico</Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/50">
                      <Mail size={13} />
                    </span>
                    <Input 
                      id="email" 
                      type="email" 
                      value={formData.email} 
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                      required 
                      className="pl-9 h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs font-semibold text-muted-foreground">Nombre de Usuario</Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/50 font-semibold text-xs">@</span>
                    <Input 
                      id="username" 
                      value={formData.username} 
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })} 
                      placeholder="ej. messi10" 
                      className="pl-9 h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="numeroCamiseta" className="text-xs font-semibold text-muted-foreground">Dorsal / Camiseta</Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/50">
                      <Hash size={13} />
                    </span>
                    <Input 
                      id="numeroCamiseta" 
                      type="number" 
                      min="1" 
                      max="99" 
                      value={formData.numeroCamiseta} 
                      onChange={(e) => setFormData({ ...formData, numeroCamiseta: e.target.value })} 
                      placeholder="ej. 10" 
                      className="pl-9 h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border" 
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button 
                  type="submit" 
                  disabled={saving} 
                  className="h-8 px-4 font-semibold text-xs rounded shadow-none bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {saving ? <Spinner size="sm" /> : "Guardar Cambios"}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Posiciones de Deportes */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight flex items-center gap-1.5">
                <span>🏃‍♂️ Posiciones Preferidas</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Selecciona tus posiciones habituales para cada deporte y define tu nivel de prioridad.
              </p>
            </div>
            {prioritizedPositions.length > 0 && (
              <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded shadow-none border-border bg-secondary/30">
                {prioritizedPositions.length} asignadas
              </Badge>
            )}
          </div>

          {positionsError && (
            <div className="notion-callout border-destructive/20 bg-destructive/5 text-destructive p-3">
              <div className="notion-callout-icon">
                <ShieldAlert size={15} />
              </div>
              <div className="text-xs font-medium">{positionsError}</div>
            </div>
          )}
          {positionsSuccess && (
            <div className="notion-callout border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 p-3">
              <div className="notion-callout-icon">
                <UserCheck size={15} />
              </div>
              <div className="text-xs font-medium">{positionsSuccess}</div>
            </div>
          )}

          {loadingSports ? (
            <div className="flex items-center justify-center py-8"><Spinner /></div>
          ) : (
            <div className="space-y-4">
              {/* Deportes Tab Bar (Notion Style) */}
              <div className="flex flex-wrap gap-1 border-b border-border pb-1.5">
                {deportes.map((d) => {
                  const count = userPosiciones.filter(up => up.deporteId === d.id).length;
                  const active = selectedDeporteId === d.id;
                  
                  const getSportEmojiName = (name: string) => {
                    const l = name.toLowerCase();
                    if (l.includes("futbol") || l.includes("fútbol") || l.includes("soccer")) return "⚽";
                    if (l.includes("basquet") || l.includes("básquet") || l.includes("basketball") || l.includes("baloncesto")) return "🏀";
                    if (l.includes("tenis") || l.includes("tennis")) return "🎾";
                    if (l.includes("voley") || l.includes("voleibol") || l.includes("volleyball")) return "🏐";
                    if (l.includes("running") || l.includes("correr")) return "🏃";
                    return "🏆";
                  };
                  
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleSportChange(d.id)}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 border ${
                        active
                          ? "bg-secondary text-foreground border-border"
                          : "bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/40"
                      }`}
                    >
                      <span>{getSportEmojiName(d.nombre)}</span>
                      <span>{d.nombre}</span>
                      {count > 0 && (
                        <span className={`text-[10px] px-1 bg-border rounded-full font-bold ${active ? "text-foreground" : "text-muted-foreground"}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Available Positions Panel */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Posiciones Disponibles</Label>
                  </div>
                  
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-2.5 text-muted-foreground/70" />
                    <input
                      type="text"
                      placeholder="Buscar posición..."
                      value={positionSearch}
                      onChange={(e) => setPositionSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 h-8 w-full rounded border border-border bg-background text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>

                  {loadingPositions ? (
                    <div className="flex items-center justify-center py-6"><Spinner size="sm" /></div>
                  ) : filteredPositions.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-border rounded-lg bg-secondary/10">
                      <p className="text-xs text-muted-foreground">
                        {posiciones.length === 0 ? "Sin posiciones en este deporte" : "No se encontraron posiciones"}
                      </p>
                    </div>
                  ) : (
                    <div className="border border-border rounded-lg bg-card divide-y divide-border max-h-[260px] overflow-y-auto">
                      {filteredPositions.map((pos) => {
                        const isAdded = isPositionAdded(pos.id);
                        return (
                          <div
                            key={pos.id}
                            className={`flex items-center justify-between px-3 py-2 transition-colors ${
                              isAdded ? "bg-secondary/30" : "hover:bg-secondary/20"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                                isAdded
                                  ? "bg-foreground/5 border-border text-foreground"
                                  : "bg-secondary border-border text-muted-foreground"
                              }`}>
                                {pos.abreviatura || pos.nombre.slice(0, 3).toUpperCase()}
                              </span>
                              <span className={`text-xs font-medium truncate ${isAdded ? "text-foreground font-semibold" : "text-foreground"}`}>
                                {pos.nombre}
                              </span>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              disabled={isAdded}
                              onClick={() => handleAddPosition(pos.id)}
                              className={`shrink-0 h-6 w-6 rounded border border-border hover:bg-secondary ${
                                isAdded ? "opacity-40" : ""
                              }`}
                            >
                              {isAdded ? <Check size={12} /> : <Plus size={12} />}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Priority Sorting Panel */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <span>Tu Prioridad</span>
                    </Label>
                    {prioritizedPositions.length > 0 && (
                      <span className="text-[10px] text-muted-foreground font-semibold">1ª = Mayor importancia</span>
                    )}
                  </div>

                  {prioritizedPositions.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-border rounded-lg bg-secondary/10 flex flex-col items-center justify-center space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">No has seleccionado posiciones</p>
                      <p className="text-[11px] text-muted-foreground/75">Usa el panel de la izquierda para agregar.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 border border-border bg-secondary/10 rounded-lg p-1.5 max-h-[308px] overflow-y-auto">
                      {prioritizedPositions.map((up, index) => {
                        const isFirst = index === 0;
                        const isLast = index === prioritizedPositions.length - 1;

                        return (
                          <div
                            key={up.posicionId}
                            className="flex items-center gap-2 px-2 py-1.5 rounded border border-border bg-card hover:bg-secondary/30 transition-colors"
                          >
                            <span className="h-5 w-5 rounded flex items-center justify-center font-bold text-[10px] shrink-0 bg-primary text-primary-foreground">
                              {index + 1}
                            </span>

                            <span className="text-xs font-semibold text-foreground flex-1 min-w-0 truncate">{up.posicionNombre}</span>

                            <div className="flex items-center gap-0.5 shrink-0">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                disabled={isFirst} 
                                onClick={() => handleMoveUp(index)} 
                                className="h-5.5 w-5.5 rounded hover:bg-secondary disabled:opacity-25"
                              >
                                <ChevronUp size={12} />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                disabled={isLast} 
                                onClick={() => handleMoveDown(index)} 
                                className="h-5.5 w-5.5 rounded hover:bg-secondary disabled:opacity-25"
                              >
                                <ChevronDown size={12} />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={() => handleRemovePosition(up.posicionId)} 
                                className="h-5.5 w-5.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              >
                                <X size={11} />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {prioritizedPositions.length > 0 && (
                <div className="pt-3 border-t border-border flex justify-end">
                  <Button
                    onClick={handleSavePositions}
                    disabled={savingPositions}
                    className="h-8 px-4 font-semibold text-xs rounded shadow-none bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {savingPositions ? <Spinner size="sm" /> : "Guardar Prioridades"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
