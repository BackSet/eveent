import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import api from "@/services/api";
import { getApiErrorMessage } from "@/lib/constants";
import { Mail, Lock, User, ArrowRight, ShieldAlert, ArrowLeft, Hash, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { InlineListSkeleton } from "@/components/ui/page-skeletons";
import { PageHeaderIcon } from "@/components/ui/page-icon";
import { getPageIcon, PageIconKind } from "@/lib/iconography";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { PresetChips } from "@/components/ui/preset-chips";
import { validateEmail, validatePassword, validateDorsal } from "@/lib/formValidation";

interface Deporte {
  id: number;
  nombre: string;
}

interface Posicion {
  id: number;
  nombre: string;
  abreviatura: string;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");

  // Step 2 Fields
  const [username, setUsername] = useState("");
  const [numeroCamiseta, setNumeroCamiseta] = useState("");
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [selectedDeporteId, setSelectedDeporteId] = useState<number | null>(null);
  const [posiciones, setPosiciones] = useState<Posicion[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<{ id: number; nombre: string; deporteNombre: string }[]>([]);
  const [loadingSports, setLoadingSports] = useState(false);
  const [loadingPositions, setLoadingPositions] = useState(false);

  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Load sports when starting registration
  useEffect(() => {
    if (!isRegister) {
      setStep(1);
      setUsername("");
      setNumeroCamiseta("");
      setSelectedDeporteId(null);
      setSelectedPositions([]);
      return;
    }

    const loadSports = async () => {
      setLoadingSports(true);
      try {
        const res = await api.get<Deporte[]>("/api/deportes");
        setDeportes(res.data);
        if (res.data.length > 0) {
          setSelectedDeporteId(res.data[0].id);
        }
      } catch (err) {
        console.error("Error al cargar deportes", err);
      } finally {
        setLoadingSports(false);
      }
    };
    loadSports();
  }, [isRegister]);

  // Load positions when selecting a sport
  useEffect(() => {
    if (selectedDeporteId === null) {
      setPosiciones([]);
      return;
    }

    const loadPositions = async () => {
      setLoadingPositions(true);
      try {
        const res = await api.get<Posicion[]>(`/api/deportes/${selectedDeporteId}/posiciones`);
        setPosiciones(res.data);
      } catch (err) {
        console.error("Error al cargar posiciones", err);
      } finally {
        setLoadingPositions(false);
      }
    };
    loadPositions();
  }, [selectedDeporteId]);

  const handleTogglePosition = (posId: number, posNombre: string, depNombre: string) => {
    setSelectedPositions((prev) =>
      prev.some((p) => p.id === posId)
        ? prev.filter((p) => p.id !== posId)
        : [...prev, { id: posId, nombre: posNombre, deporteNombre: depNombre }]
    );
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    try {
      if (isRegister) {
        if (step === 1) {
          if (!nombre.trim() || !email.trim() || !password.trim()) {
            setError("Completa tu nombre, correo y contraseña para continuar.");
            return;
          }
          const emailErr = validateEmail(email);
          const passErr = validatePassword(password);
          if (emailErr || passErr) {
            setError(emailErr || passErr || "");
            return;
          }
          setStep(2);
        } else {
          if (!username.trim() || !numeroCamiseta.trim()) {
            setError("Elige un nombre de usuario y un dorsal para terminar tu ficha de jugador.");
            return;
          }
          const dorsalErr = validateDorsal(numeroCamiseta);
          if (dorsalErr) {
            setError(dorsalErr);
            return;
          }
          const numCamiseta = parseInt(numeroCamiseta, 10);

          const posicionIds = selectedPositions.map((p) => p.id);
          await register(nombre, email, password, username, numCamiseta, posicionIds);
          toast.success("¡Cuenta creada!", `Bienvenido a Event, ${nombre.split(" ")[0]}.`);
        }
      } else {
        await login(email, password);
        toast.success("Sesión iniciada", "Bienvenido de vuelta.");
      }
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err) || "No pudimos verificar tus credenciales. Revisa el correo/usuario y la contraseña.";
      setError(msg);
      toast.error(isRegister ? "No se pudo registrar" : "No se pudo iniciar sesión", msg);
    }
  }

  const activeSport = deportes.find((d) => d.id === selectedDeporteId);

  const handleBackToStep1 = async () => {
    const hasStep2Data =
      username.trim() ||
      numeroCamiseta.trim() ||
      selectedPositions.length > 0;
    if (hasStep2Data) {
      const ok = await confirm({
        title: "Volver al paso anterior",
        description: "Perderás los datos del paso 2 (usuario, dorsal y posiciones). ¿Continuar?",
        confirmLabel: "Sí, volver",
        variant: "warning",
      });
      if (!ok) return;
    }
    setStep(1);
    setError("");
  };

  const handleNextSport = () => {
    if (deportes.length === 0) return;
    const idx = deportes.findIndex((d) => d.id === selectedDeporteId);
    const next = deportes[(idx + 1) % deportes.length];
    setSelectedDeporteId(next.id);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:px-6 bg-background">
      <div className="w-full max-w-[390px] space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <PageHeaderIcon icon={getPageIcon(PageIconKind.LOGIN)} className="mb-1 h-14 w-14" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Event</h1>
          <p className="text-xs text-muted-foreground max-w-[280px]">
            Workspace de gestión y coordinación de eventos deportivos.
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-card rounded-lg border border-border p-6 space-y-4 shadow-none">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              {isRegister
                ? `Registrarse: Paso ${step} de 2`
                : "Iniciar sesión"}
            </h2>
            {isRegister && (
              <div className="flex gap-1.5 items-center">
                <span className={`h-1.5 w-6 rounded-full transition-all duration-300 ${step === 1 ? "bg-primary" : "bg-muted"}`} />
                <span className={`h-1.5 w-6 rounded-full transition-all duration-300 ${step === 2 ? "bg-primary" : "bg-muted"}`} />
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* STEP 1: Simple Registration fields */}
            {(!isRegister || step === 1) && (
              <>
                {isRegister && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Nombre Completo
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/50">
                        <User size={13} />
                      </span>
                      <Input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        required
                        className="pl-9 h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border"
                        placeholder="Tu nombre completo"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    {isRegister ? "Correo Electrónico" : "Correo o Usuario"}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/50">
                      {isRegister ? <Mail size={13} /> : <User size={13} />}
                    </span>
                    <Input
                      type={isRegister ? "email" : "text"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-9 h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border"
                      placeholder={isRegister ? "correo@ejemplo.com" : "correo@ejemplo.com o tu_usuario"}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Contraseña
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/50">
                      <Lock size={13} />
                    </span>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-9 h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </>
            )}

            {/* STEP 2: Player Details & Sports Selection */}
            {isRegister && step === 2 && (
              <div className="space-y-3.5 animate-fadeIn">
                <div className="grid grid-cols-2 gap-3">
                  {/* Username (Mandatory) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Nombre de Usuario *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/50 font-bold text-xs">@</span>
                      <Input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="pl-8 h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border"
                        placeholder="messi10"
                      />
                    </div>
                  </div>

                  {/* Shirt Number (Mandatory) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Nº Camiseta *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/50">
                        <Hash size={13} />
                      </span>
                      <Input
                        type="number"
                        min="1"
                        max="99"
                        value={numeroCamiseta}
                        onChange={(e) => setNumeroCamiseta(e.target.value)}
                        required
                        className="pl-9 h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border"
                        placeholder="10"
                      />
                    </div>
                  </div>
                  <PresetChips
                    showIcon={false}
                    options={[
                      {
                        id: "random",
                        label: "Dorsal aleatorio",
                        onClick: () => setNumeroCamiseta(String(Math.floor(Math.random() * 99) + 1)),
                      },
                    ]}
                  />
                </div>

                {/* Optional Sport Selection */}
                <div className="space-y-2 border-t border-border/60 pt-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Deporte & Posición (Opcional)
                    </label>
                    {deportes.length > 1 && (
                      <PresetChips
                        showIcon={false}
                        options={[
                          { id: "next", label: "Siguiente deporte", onClick: handleNextSport },
                        ]}
                      />
                    )}
                  </div>

                  <p className="text-[10px] text-muted-foreground/80 leading-relaxed bg-secondary/10 p-2 rounded border border-border/40 text-[9px]">
                    💡 <strong>Prioridades tácticas:</strong> El orden de selección define la prioridad. La <strong>1ª posición</strong> que marques será tu posición principal (⭐), las siguientes serán alternativas.
                  </p>

                  {loadingSports ? (
                    <InlineListSkeleton rows={3} />
                  ) : (
                    <div className="space-y-2">
                      <select
                        value={selectedDeporteId || ""}
                        onChange={(e) => setSelectedDeporteId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full text-xs p-2 rounded-md border border-border bg-background text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">-- Seleccionar Deporte --</option>
                        {deportes.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.nombre}
                          </option>
                        ))}
                      </select>

                      {/* Display positions grid if sport is selected */}
                      {selectedDeporteId && activeSport && (
                        <div className="space-y-1.5 animate-fadeIn">
                          <span className="text-[9px] text-muted-foreground font-semibold uppercase block">Posiciones en {activeSport.nombre}:</span>
                          {loadingPositions ? (
                            <InlineListSkeleton rows={4} />
                          ) : posiciones.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground italic text-center py-2">Sin posiciones disponibles.</p>
                          ) : (
                            <div className="grid grid-cols-2 gap-1.5 max-h-[120px] overflow-y-auto border border-border/80 p-2 rounded bg-secondary/15">
                              {[...posiciones].sort((a, b) => a.nombre.localeCompare(b.nombre)).map((pos) => {
                                const isSelected = selectedPositions.some((p) => p.id === pos.id);
                                return (
                                  <button
                                    key={pos.id}
                                    type="button"
                                    onClick={() => handleTogglePosition(pos.id, pos.nombre, activeSport.nombre)}
                                    className={`flex items-center justify-between px-2 py-1 h-7 rounded border text-[9px] font-semibold transition-colors truncate gap-1 ${
                                      isSelected
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-background text-foreground border-border hover:bg-secondary/40"
                                    }`}
                                  >
                                    <span className="truncate">{pos.nombre}</span>
                                    {isSelected && <Check size={8} className="shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Positions Summary */}
                {selectedPositions.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Tus Posiciones Seleccionadas ({selectedPositions.length})
                    </label>
                    <div className="flex flex-wrap gap-1 max-h-[85px] overflow-y-auto border border-border/60 p-2 rounded bg-secondary/5">
                      {selectedPositions.map((pos) => {
                        const sportPositions = selectedPositions.filter(p => p.deporteNombre === pos.deporteNombre);
                        const sportIndex = sportPositions.findIndex(p => p.id === pos.id);
                        const isPrimary = sportIndex === 0;
                        return (
                          <Badge
                            key={pos.id}
                            variant="outline"
                            className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-sm shadow-3xs flex items-center gap-0.5 select-none ${
                              isPrimary
                                ? "bg-primary/10 border-primary/30 text-foreground font-bold"
                                : "bg-background border-border text-foreground"
                            }`}
                          >
                            <span className="truncate">
                              {isPrimary ? "⭐ 1ª: " : `${sportIndex + 1}ª: `}
                              {pos.nombre} ({pos.deporteNombre})
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedPositions((prev) => prev.filter((p) => p.id !== pos.id))}
                              className="text-muted-foreground hover:text-destructive shrink-0 cursor-pointer ml-0.5"
                            >
                              <X size={8} />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="notion-callout border-destructive/20 bg-destructive/5 text-destructive p-3 rounded">
                <div className="notion-callout-icon">
                  <ShieldAlert size={14} className="shrink-0" />
                </div>
                <div className="text-[11px] font-medium leading-normal">{error}</div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-1.5">
              {isRegister && step === 2 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackToStep1}
                  className="flex-1 h-9 font-semibold text-xs rounded border-border shadow-none hover:bg-secondary gap-1.5"
                >
                  <ArrowLeft size={13} />
                  <span>Volver</span>
                </Button>
              )}

              <Button
                type="submit"
                className="flex-1 h-9 font-semibold text-xs rounded shadow-none bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
              >
                <span>
                  {!isRegister
                    ? "Continuar"
                    : step === 1
                    ? "Siguiente"
                    : "Completar Registro"}
                </span>
                {(!isRegister || step === 1) && <ArrowRight size={13} />}
              </Button>
            </div>
          </form>
        </div>

        {/* Toggle Mode Footer */}
        <p className="text-center text-xs text-muted-foreground">
          {isRegister ? "¿Ya tienes una cuenta?" : "¿No tienes cuenta?"}{" "}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
            className="text-foreground hover:underline font-bold transition cursor-pointer"
          >
            {isRegister ? "Inicia sesión" : "Regístrate"}
          </button>
        </p>
      </div>
    </div>
  );
}
