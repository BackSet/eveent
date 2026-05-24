import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import api from "@/services/api";
import { getApiErrorMessage } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { InlineListSkeleton } from "@/components/ui/page-skeletons";
import { DeporteIcon } from "@/components/ui/page-icon";
import { PageHeader } from "@/components/ui/page-header";
import { PageIconKind } from "@/lib/iconography";
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
  ListOrdered,
  Lock,
  UserCircle2,
} from "lucide-react";
import { Deporte, PosicionesDeporte, UsuarioPosicionDto } from "@/types";
import { useToast } from "@/components/ui/toast";
import { InfoHint } from "@/components/ui/info-hint";
import { FieldError } from "@/components/ui/field-error";
import { AutoAceptacionCard } from "@/components/perfil/AutoAceptacionCard";
import { ProfileSectionCard } from "@/components/perfil/ProfileSectionCard";
import { ProfileHero } from "@/components/perfil/ProfileHero";
import { PresetChips } from "@/components/ui/preset-chips";
import {
  validateDorsal,
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateRequiredTrim,
} from "@/lib/formValidation";

export default function PerfilPage() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  
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
  const [dorsalError, setDorsalError] = useState<string | null>(null);
  const savedPositionsRef = useRef<string>("");

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const positionsDirty =
    savedPositionsRef.current !== "" &&
    JSON.stringify(userPosiciones) !== savedPositionsRef.current;

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
        savedPositionsRef.current = JSON.stringify(userPositionsRes.data);

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
    const nameErr = validateRequiredTrim(formData.nombre, "El nombre");
    const emailErr = validateEmail(formData.email);
    const dorsalErr = formData.numeroCamiseta ? validateDorsal(formData.numeroCamiseta) : null;
    if (nameErr || emailErr || dorsalErr) {
      setDorsalError(dorsalErr);
      setError(nameErr || emailErr || dorsalErr || "");
      return;
    }
    setDorsalError(null);
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
      toast.success("Perfil actualizado", "Tus datos personales se guardaron correctamente.");
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err) || "Error al actualizar perfil";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const prioritizedPositions = userPosiciones
    .filter(up => up.deporteId === selectedDeporteId)
    .sort((a, b) => a.prioridad - b.prioridad);

  const otherSportsPositions = userPosiciones.filter(up => up.deporteId !== selectedDeporteId);

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

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const passErr = validatePassword(passwordForm.newPassword);
    const matchErr = validatePasswordMatch(passwordForm.newPassword, passwordForm.confirmPassword);
    if (!passwordForm.currentPassword) {
      setPasswordError("La contraseña actual es obligatoria.");
      return;
    }
    if (passErr || matchErr) {
      setPasswordError(passErr || matchErr || "");
      return;
    }
    setSavingPassword(true);
    setPasswordError("");
    setPasswordSuccess("");
    try {
      await api.post("/api/usuarios/me/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordSuccess("Contraseña actualizada correctamente.");
      toast.success("Contraseña actualizada", "Usa la nueva contraseña en tu próximo inicio de sesión.");
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err) || "Error al cambiar la contraseña";
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSelectAllVisible = () => {
    if (!selectedDeporteId) return;
    const activeSport = deportes.find((d) => d.id === selectedDeporteId);
    if (!activeSport) return;
    setUserPosiciones((prev) => {
      const others = prev.filter((up) => up.deporteId !== selectedDeporteId);
      const existing = prev.filter((up) => up.deporteId === selectedDeporteId);
      const toAdd = filteredPositions.filter((p) => !existing.some((e) => e.posicionId === p.id));
      const newItems = toAdd.map((p, idx) => ({
        posicionId: p.id,
        posicionNombre: p.nombre,
        deporteId: selectedDeporteId,
        deporteNombre: activeSport.nombre,
        prioridad: existing.length + idx + 1,
      }));
      return [...others, ...existing, ...newItems];
    });
  };

  const handleClearCurrentSport = () => {
    if (!selectedDeporteId) return;
    setUserPosiciones((prev) => prev.filter((up) => up.deporteId !== selectedDeporteId));
  };

  const handleSavePositions = async () => {
    setSavingPositions(true);
    setPositionsSuccess("");
    setPositionsError("");
    try {
      const { data } = await api.put<UsuarioPosicionDto[]>("/api/usuarios/me/posiciones", userPosiciones);
      setUserPosiciones(data);
      savedPositionsRef.current = JSON.stringify(data);
      setPositionsSuccess("Prioridades actualizadas");
      toast.success(
        "Posiciones guardadas",
        "El autobalanceo de equipos tendrá en cuenta estas preferencias."
      );
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err) || "Error al guardar prioridades";
      setPositionsError(msg);
      toast.error(msg);
    } finally {
      setSavingPositions(false);
    }
  };

  return (
    <div className="page-shell max-w-6xl mx-auto space-y-6 animate-fadeIn">
      <PageHeader
        iconKind={PageIconKind.PERFIL}
        title="Ajustes de Perfil"
        description="Tu cuenta, disponibilidad automática y preferencias tácticas en un solo lugar."
      />

      <ProfileHero
        nombre={user?.nombre}
        username={user?.username}
        email={user?.email}
        numeroCamiseta={formData.numeroCamiseta || undefined}
        roles={user?.roles}
      />

      <AutoAceptacionCard />

      <div className="grid gap-6 lg:grid-cols-2 items-start">
          <ProfileSectionCard
            title="Información personal"
            description="Datos visibles en convocatorias y alineaciones."
            icon={UserCircle2}
          >
            {error && (
              <div className="notion-callout border-destructive/20 bg-destructive/5 text-destructive p-3 mb-4">
                <div className="notion-callout-icon">
                  <ShieldAlert size={16} className="shrink-0" />
                </div>
                <div className="text-xs font-medium">{error}</div>
              </div>
            )}
            {success && (
              <div className="notion-callout tone-success p-3 mb-4">
                <div className="notion-callout-icon">
                  <UserCheck size={16} className="shrink-0" />
                </div>
                <div className="text-xs font-medium">{success}</div>
              </div>
            )}

            <form onSubmit={handleSubmitProfile} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
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
                      className="pl-9 h-9 text-xs border-border bg-background shadow-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">Correo electrónico</Label>
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
                      className="pl-9 h-9 text-xs border-border bg-background shadow-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs font-semibold text-muted-foreground">Usuario</Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/50 font-semibold text-xs">@</span>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="ej. messi10"
                      className="pl-9 h-9 text-xs border-border bg-background shadow-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="numeroCamiseta" className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <span>Dorsal / camiseta</span>
                    <InfoHint side="right" maxWidth={260}>
                      Número que prefieres usar en tu camiseta. Aparece junto a tu nombre en las
                      alineaciones para que el equipo te identifique rápido.
                    </InfoHint>
                  </Label>
                  <div className="relative max-w-[140px]">
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
                      className="pl-9 h-9 text-xs border-border bg-background shadow-none"
                      aria-invalid={!!dorsalError}
                    />
                  </div>
                  <FieldError message={dorsalError} />
                </div>
              </div>

              <div className="flex justify-end pt-1 border-t border-border/60">
                <Button
                  type="submit"
                  disabled={saving}
                  className="mt-4 h-9 px-5 font-semibold text-xs shadow-none"
                >
                  {saving ? <Spinner size="sm" /> : "Guardar cambios"}
                </Button>
              </div>
            </form>
          </ProfileSectionCard>

          <ProfileSectionCard
            title="Seguridad"
            description="Actualiza tu contraseña de acceso al workspace."
            icon={Lock}
          >
            {passwordError && (
              <div className="notion-callout border-destructive/20 bg-destructive/5 text-destructive p-3 mb-4 text-xs font-medium">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="notion-callout tone-success p-3 mb-4 text-xs font-medium">
                {passwordSuccess}
              </div>
            )}
            <form onSubmit={handleSubmitPassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword" className="text-xs font-semibold text-muted-foreground">
                  Contraseña actual
                </Label>
                <PasswordInput
                  id="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  autoComplete="current-password"
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-xs font-semibold text-muted-foreground">
                  Nueva contraseña
                </Label>
                <PasswordInput
                  id="newPassword"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  autoComplete="new-password"
                  minLength={6}
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold text-muted-foreground">
                  Confirmar nueva
                </Label>
                <PasswordInput
                  id="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  autoComplete="new-password"
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="flex justify-end pt-1 border-t border-border/60">
                <Button type="submit" disabled={savingPassword} className="mt-4 h-9 px-5 text-xs font-semibold shadow-none">
                  {savingPassword ? <Spinner size="sm" /> : "Actualizar contraseña"}
                </Button>
              </div>
            </form>
          </ProfileSectionCard>
      </div>

      <ProfileSectionCard
        title="Posiciones preferidas"
        description="Indica en qué posiciones puedes jugar y en qué orden las prefieres por deporte."
        icon={ListOrdered}
        hint={
          <InfoHint side="right" maxWidth={320}>
            El sistema usa estas posiciones (y su prioridad) para formar equipos balanceados
            automáticamente. <strong>Prioridad 1</strong> es tu posición favorita.
          </InfoHint>
        }
        actions={
          <>
            {positionsDirty && (
              <Badge variant="warning" className="text-[10px] font-bold">
                Sin guardar
              </Badge>
            )}
            {prioritizedPositions.length > 0 && (
              <Badge variant="outline" className="text-[10px] font-bold border-border bg-secondary/30">
                {prioritizedPositions.length} en este deporte
              </Badge>
            )}
          </>
        }
        contentClassName="space-y-4"
      >
          {positionsError && (
            <div className="notion-callout border-destructive/20 bg-destructive/5 text-destructive p-3">
              <div className="notion-callout-icon">
                <ShieldAlert size={15} />
              </div>
              <div className="text-xs font-medium">{positionsError}</div>
            </div>
          )}
          {positionsSuccess && (
            <div className="notion-callout tone-success p-3">
              <div className="notion-callout-icon">
                <UserCheck size={15} />
              </div>
              <div className="text-xs font-medium">{positionsSuccess}</div>
            </div>
          )}

          {loadingSports ? (
            <InlineListSkeleton rows={5} />
          ) : (
            <div className="space-y-4">
              {/* Deportes Tab Bar (Notion Style) */}
              <div className="flex flex-wrap gap-1.5 p-1 rounded-lg border border-border bg-secondary/10">
                {deportes.map((d) => {
                  const count = userPosiciones.filter(up => up.deporteId === d.id).length;
                  const active = selectedDeporteId === d.id;
                  
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleSportChange(d.id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                        active
                          ? "bg-card text-foreground border border-border shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-card/60"
                      }`}
                    >
                      <DeporteIcon nombre={d.nombre} size={14} />
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

              <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
                <div className="space-y-3 flex flex-col min-h-[300px]">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Disponibles</Label>
                    <PresetChips
                      showIcon={false}
                      options={[
                        { id: "all", label: "Todas visibles", onClick: handleSelectAllVisible },
                        { id: "clear", label: "Limpiar deporte", onClick: handleClearCurrentSport },
                      ]}
                    />
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
                    <InlineListSkeleton rows={6} />
                  ) : filteredPositions.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-border rounded-lg bg-secondary/10">
                      <p className="text-xs text-muted-foreground">
                        {posiciones.length === 0 ? "Sin posiciones en este deporte" : "No se encontraron posiciones"}
                      </p>
                    </div>
                  ) : (
                    <div className="border border-border rounded-lg bg-background/50 divide-y divide-border flex-1 min-h-[200px] max-h-[320px] overflow-y-auto">
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

                <div className="space-y-3 flex flex-col min-h-[300px] lg:border-l lg:border-border/60 lg:pl-6">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Tu prioridad
                    </Label>
                    {prioritizedPositions.length > 0 && (
                      <span className="text-[10px] text-muted-foreground font-semibold">1ª = Mayor importancia</span>
                    )}
                  </div>

                  {prioritizedPositions.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-border rounded-lg bg-secondary/10 flex flex-col items-center justify-center space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">No has seleccionado posiciones en este deporte</p>
                      <p className="text-[11px] text-muted-foreground/75">Usa el panel de la izquierda para agregar.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 border border-border bg-secondary/10 rounded-lg p-1.5 flex-1 min-h-[200px] max-h-[320px] overflow-y-auto">
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
                                type="button"
                                disabled={isFirst} 
                                onClick={() => handleMoveUp(index)} 
                                className="h-5.5 w-5.5 rounded hover:bg-secondary disabled:opacity-25"
                              >
                                <ChevronUp size={12} />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                type="button"
                                disabled={isLast} 
                                onClick={() => handleMoveDown(index)} 
                                className="h-5.5 w-5.5 rounded hover:bg-secondary disabled:opacity-25"
                              >
                                <ChevronDown size={12} />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                type="button"
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

                  {/* Summary of selections in other sports */}
                  {otherSportsPositions.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-border/60 space-y-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block select-none">
                        Seleccionadas en otros deportes
                      </span>
                      <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                        {Object.entries(
                          otherSportsPositions.reduce((acc: any, up) => {
                            if (!acc[up.deporteNombre]) {
                              acc[up.deporteNombre] = [];
                            }
                            acc[up.deporteNombre].push(up);
                            return acc;
                          }, {})
                        ).map(([depNombre, positions]: [string, any]) => (
                          <div key={depNombre} className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-lg border border-border bg-secondary/5">
                            <span className="text-[9px] font-extrabold uppercase bg-primary/10 text-primary px-1.5 py-0.2 rounded shrink-0 select-none">
                              {depNombre}
                            </span>
                            <div className="flex flex-wrap gap-1 flex-1">
                              {positions.map((up: any) => (
                                <Badge key={up.posicionId} variant="outline" className="text-[8px] font-semibold bg-background border-border text-foreground px-1 py-0.2 rounded-sm shadow-3xs">
                                  {up.posicionNombre}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {userPosiciones.length > 0 && (
                <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-[11px] text-muted-foreground">
                    Los cambios en prioridad afectan al autobalanceo de equipos en nuevas convocatorias.
                  </p>
                  <Button
                    onClick={handleSavePositions}
                    disabled={savingPositions}
                    className="h-9 px-5 font-semibold text-xs shadow-none shrink-0"
                  >
                    {savingPositions ? <Spinner size="sm" /> : "Guardar prioridades"}
                  </Button>
                </div>
              )}
            </div>
          )}
      </ProfileSectionCard>
    </div>
  );
}
