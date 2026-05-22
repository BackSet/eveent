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
    <div className="space-y-6 max-w-4xl animate-fadeIn pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Actualiza tu información y prioriza tus posiciones favoritas
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 h-fit">
          <CardContent className="pt-6 flex flex-col items-center text-center space-y-3">
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center font-bold text-2xl text-primary-foreground">
                {user?.nombre?.charAt(0).toUpperCase() || 'U'}
              </div>
              {user?.numeroCamiseta !== undefined && user?.numeroCamiseta !== null && (
                <div className="absolute -bottom-1.5 -right-1.5 bg-muted text-foreground rounded-full h-6 w-6 flex items-center justify-center font-bold text-xs border">
                  #{user.numeroCamiseta}
                </div>
              )}
            </div>
            
            <div>
              <h3 className="font-bold text-foreground">{user?.nombre}</h3>
              {user?.username && (
                <p className="text-xs text-primary font-medium">@{user.username}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
            </div>
            
            <div className="w-full pt-3 border-t space-y-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Roles</span>
              <div className="flex flex-wrap justify-center gap-1">
                {user?.roles?.map((role) => (
                  <Badge 
                    key={role} 
                    variant="outline"
                    className="text-[9px] uppercase px-1.5 py-0"
                  >
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/5 border border-destructive/15 rounded-lg px-3 py-2">
                <ShieldAlert size={15} className="shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 text-green-600 text-sm bg-green-500/5 border border-green-500/15 rounded-lg px-3 py-2">
                <UserCheck size={15} className="shrink-0" />
                <p className="text-sm">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmitProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="nombre" className="text-xs font-medium text-muted-foreground">Nombre</Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/50">
                      <User size={14} />
                    </span>
                    <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} required className="pl-9" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Correo</Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/50">
                      <Mail size={14} />
                    </span>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="pl-9" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs font-medium text-muted-foreground">Apodo / Username</Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/50 font-semibold text-xs">@</span>
                    <Input id="username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} placeholder="e.g. cr7_goleador" className="pl-9" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="numeroCamiseta" className="text-xs font-medium text-muted-foreground">Dorsal</Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/50">
                      <Hash size={14} />
                    </span>
                    <Input id="numeroCamiseta" type="number" min="1" max="99" value={formData.numeroCamiseta} onChange={(e) => setFormData({ ...formData, numeroCamiseta: e.target.value })} placeholder="e.g. 10" className="pl-9" />
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={saving} className="gap-2 font-semibold rounded-lg px-5">
                {saving ? <Spinner /> : "Guardar Cambios"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Position Priority */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Posiciones Deportivas</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Busca y agrega posiciones, luego ordénalas por prioridad
              </p>
            </div>
            {prioritizedPositions.length > 0 && (
              <Badge variant="outline" className="text-xs font-medium px-2 py-0.5">
                {prioritizedPositions.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {positionsError && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/5 border border-destructive/15 rounded-lg px-3 py-2">
              <ShieldAlert size={15} className="shrink-0" />
              <p className="text-sm">{positionsError}</p>
            </div>
          )}
          {positionsSuccess && (
            <div className="flex items-center gap-2 text-green-600 text-sm bg-green-500/5 border border-green-500/15 rounded-lg px-3 py-2">
              <UserCheck size={15} className="shrink-0" />
              <p className="text-sm">{positionsSuccess}</p>
            </div>
          )}

          {loadingSports ? (
            <div className="flex items-center justify-center py-8"><Spinner /></div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-1.5">
                {deportes.map((d) => {
                  const count = userPosiciones.filter(up => up.deporteId === d.id).length;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleSportChange(d.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                        selectedDeporteId === d.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {d.nombre}
                      {count > 0 && (
                        <span className={`text-[10px] font-bold ${selectedDeporteId === d.id ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {/* Available Positions */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-medium text-muted-foreground">Disponibles</Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/50">
                      <Search size={14} />
                    </span>
                    <Input
                      placeholder="Buscar posición..."
                      value={positionSearch}
                      onChange={(e) => setPositionSearch(e.target.value)}
                      className="pl-9 text-sm"
                    />
                  </div>

                  {loadingPositions ? (
                    <div className="flex items-center justify-center py-6"><Spinner size="sm" /></div>
                  ) : filteredPositions.length === 0 ? (
                    <div className="text-center py-8 border border-dashed rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        {posiciones.length === 0 ? "Sin posiciones registradas" : "Sin resultados"}
                      </p>
                    </div>
                  ) : (
                    <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                      {filteredPositions.map((pos) => {
                        const isAdded = isPositionAdded(pos.id);
                        return (
                          <div
                            key={pos.id}
                            className={`flex items-center justify-between px-3 py-2.5 transition-colors ${
                              isAdded ? "bg-primary/[0.03]" : "hover:bg-muted/50"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                                isAdded
                                  ? "bg-primary/10 border-primary/15 text-primary"
                                  : "bg-muted border-border text-muted-foreground"
                              }`}>
                                {pos.abreviatura || pos.nombre.slice(0, 3).toUpperCase()}
                              </span>
                              <span className={`text-sm font-medium truncate ${isAdded ? "text-primary" : ""}`}>
                                {pos.nombre}
                              </span>
                            </div>
                            <Button
                              size="icon"
                              variant={isAdded ? "ghost" : "outline"}
                              disabled={isAdded}
                              onClick={() => handleAddPosition(pos.id)}
                              className={`shrink-0 h-7 w-7 rounded-md ${
                                isAdded
                                  ? "text-primary"
                                  : "hover:bg-primary/10 hover:text-primary hover:border-primary/20"
                              }`}
                            >
                              {isAdded ? <Check size={13} /> : <Plus size={13} />}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Priority List */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <ArrowUpDown size={12} />
                      Tu Prioridad
                    </Label>
                    {prioritizedPositions.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">1ª = máxima</span>
                    )}
                  </div>

                  {prioritizedPositions.length === 0 ? (
                    <div className="text-center py-10 border border-dashed rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        Agrega posiciones desde el panel izquierdo
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 border rounded-lg p-1.5 min-h-[100px]">
                      {prioritizedPositions.map((up, index) => {
                        const isFirst = index === 0;
                        const isLast = index === prioritizedPositions.length - 1;

                        return (
                          <div
                            key={up.posicionId}
                            className="flex items-center gap-2.5 px-2.5 py-2 rounded-md border border-border/50 bg-card hover:border-primary/20 transition-colors"
                          >
                            <span className="h-6 w-6 rounded flex items-center justify-center font-bold text-xs shrink-0 bg-primary text-primary-foreground">
                              {index + 1}
                            </span>

                            <span className="text-sm font-medium flex-1 min-w-0 truncate">{up.posicionNombre}</span>

                            <div className="flex items-center gap-0.5 shrink-0">
                              <Button size="icon" variant="ghost" disabled={isFirst} onClick={() => handleMoveUp(index)} className="h-6 w-6 rounded hover:bg-muted disabled:opacity-20">
                                <ChevronUp size={13} />
                              </Button>
                              <Button size="icon" variant="ghost" disabled={isLast} onClick={() => handleMoveDown(index)} className="h-6 w-6 rounded hover:bg-muted disabled:opacity-20">
                                <ChevronDown size={13} />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => handleRemovePosition(up.posicionId)} className="h-6 w-6 rounded hover:bg-destructive/10 hover:text-destructive">
                                <X size={12} />
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
                <div className="pt-3 border-t flex justify-end">
                  <Button
                    onClick={handleSavePositions}
                    disabled={savingPositions}
                    className="gap-2 font-semibold rounded-lg px-5"
                  >
                    {savingPositions ? <Spinner /> : "Guardar Prioridades"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
