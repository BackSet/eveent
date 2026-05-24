import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/services/api";
import { getApiErrorMessage } from "@/lib/constants";
import type { AutoAceptacionConfig, AutoAceptacionModo } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { PresetChips } from "@/components/ui/preset-chips";
import { InfoHint } from "@/components/ui/info-hint";
import { EventDateTimePicker } from "@/components/convocatoria/EventDateTimePicker";
import { useToast } from "@/components/ui/toast";
import { CalendarClock, ShieldAlert, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type ModoUi = AutoAceptacionModo | "OFF";

const MODO_HINTS: Record<ModoUi, string> = {
  OFF: "No se confirmará ninguna convocatoria de forma automática.",
  HOY: "Solo partidos cuyo día coincida con hoy (según la hora del servidor).",
  DIA: "Confirma automáticamente los partidos que empiecen en el día que elijas.",
  DESDE_FECHA_HORA:
    "A partir de la fecha y hora indicada, las convocatorias en tu ventana se confirmarán solas.",
};

function toDateTimeLocal(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateLocal(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toApiDateTime(local: string): string | undefined {
  if (!local?.trim()) return undefined;
  if (local.length === 10) return `${local}T00:00:00`;
  return local.length === 16 ? `${local}:00` : local;
}

type AutoAceptacionCardProps = {
  className?: string;
};

export function AutoAceptacionCard({ className }: AutoAceptacionCardProps) {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const loadErrorToastShownRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AutoAceptacionConfig | null>(null);
  const [modoUi, setModoUi] = useState<ModoUi>("OFF");
  const [diaLocal, setDiaLocal] = useState("");
  const [desdeLocal, setDesdeLocal] = useState("");

  const isSuspended =
    user?.fechaFinSuspension && new Date(user.fechaFinSuspension) > new Date();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<AutoAceptacionConfig>("/api/usuarios/me/auto-aceptacion");
      setConfig(data);
      const modo = (data.modo as ModoUi) || "OFF";
      setModoUi(modo === "OFF" ? "OFF" : modo);
      setDiaLocal(toDateLocal(data.referencia));
      setDesdeLocal(toDateTimeLocal(data.referencia));
    } catch (err) {
      console.error(err);
      if (!loadErrorToastShownRef.current) {
        loadErrorToastShownRef.current = true;
        toastRef.current.error(
          getApiErrorMessage(err) || "No se pudo cargar la disponibilidad automática"
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (aplicarPendientes: boolean) => {
    setSaving(true);
    try {
      let referencia: string | undefined;
      if (modoUi === "DIA") {
        referencia = toApiDateTime(diaLocal);
        if (!referencia) {
          toast.error("Selecciona el día en el que quieres confirmar automáticamente.");
          setSaving(false);
          return;
        }
      } else if (modoUi === "DESDE_FECHA_HORA") {
        referencia = toApiDateTime(desdeLocal);
        if (!referencia) {
          toast.error("Indica desde qué fecha y hora aplicas la disponibilidad.");
          setSaving(false);
          return;
        }
      }

      const { data } = await api.put<AutoAceptacionConfig>("/api/usuarios/me/auto-aceptacion", {
        modo: modoUi,
        referencia: referencia ?? null,
        aplicarPendientes: aplicarPendientes,
      });
      setConfig(data);
      updateUser({
        autoAceptacionActiva: data.activa,
        autoAceptacionResumen: data.resumen,
        autoAceptacionModo: data.modo,
      });
      if (aplicarPendientes && (data.pendientesAplicados ?? 0) > 0) {
        toast.success(
          "Invitaciones confirmadas",
          `Se confirmaron ${data.pendientesAplicados ?? 0} convocatoria(s) pendientes.`
        );
      } else {
        toast.success("Disponibilidad guardada", data.resumen);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err) || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const chipOptions = [
    { id: "OFF", label: "Desactivado", onClick: () => setModoUi("OFF") },
    { id: "HOY", label: "Hoy", onClick: () => setModoUi("HOY") },
    { id: "DIA", label: "Elegir día", onClick: () => setModoUi("DIA") },
    {
      id: "DESDE_FECHA_HORA",
      label: "Desde fecha y hora",
      onClick: () => setModoUi("DESDE_FECHA_HORA"),
    },
  ];

  const pendientes = config?.pendientesAplicables ?? 0;
  const showPicker = modoUi === "DIA" || modoUi === "DESDE_FECHA_HORA";

  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-card overflow-hidden",
        className
      )}
      aria-labelledby="auto-aceptacion-heading"
    >
      <div className="flex flex-col gap-3 border-b border-border/70 bg-secondary/20 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1 min-w-0">
          <h3
            id="auto-aceptacion-heading"
            className="text-sm font-semibold tracking-tight flex items-center gap-2 flex-wrap"
          >
            <Zap size={15} className="text-primary shrink-0" aria-hidden />
            <span>Disponibilidad automática</span>
            <InfoHint side="right" maxWidth={340}>
              Confirma automáticamente convocatorias <strong>invitadas</strong> o en las que te
              inscribes si el partido cae en tu ventana. Respeta cupo (puede ser lista de espera).
              Usa la hora del servidor.
            </InfoHint>
          </h3>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Define cuándo quieres que el sistema responda &quot;Asistiré&quot; por ti en convocatorias
            invitadas.
          </p>
        </div>
        {loading ? (
          <Spinner size="sm" className="shrink-0" />
        ) : (
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 self-start text-[10px] font-semibold uppercase tracking-wider",
              config?.activa &&
                "bg-success-muted text-success border-success/30"
            )}
          >
            {config?.activa ? "Activa" : "Desactivada"}
          </Badge>
        )}
      </div>

      <div className="p-5">
        {isSuspended && (
          <div className="notion-callout tone-warning p-3 mb-5">
            <div className="notion-callout-icon">
              <ShieldAlert size={14} />
            </div>
            <div className="text-xs">
              Estás suspendido: la disponibilidad automática no tendrá efecto hasta que finalice la
              suspensión.
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-12 min-h-[10rem]">
            <div className="lg:col-span-7 flex items-center justify-center rounded-lg border border-dashed border-border bg-secondary/10">
              <Spinner />
            </div>
            <div className="hidden lg:block lg:col-span-5 rounded-lg border border-dashed border-border bg-secondary/5" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12 lg:gap-8 lg:items-start">
            <div className="lg:col-span-7 space-y-4 min-w-0">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Modo
                </span>
                <PresetChips
                  options={chipOptions}
                  activeId={modoUi}
                  showIcon={false}
                  className="sm:flex-wrap"
                />
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed rounded-md border border-border/60 bg-secondary/10 px-3 py-2.5">
                {MODO_HINTS[modoUi]}
              </p>

              {showPicker && (
                <div className="rounded-lg border border-border bg-secondary/10 p-4 space-y-3">
                  {modoUi === "DIA" && (
                    <div className="space-y-1.5 max-w-sm">
                      <Label
                        htmlFor="auto-aceptacion-dia"
                        className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"
                      >
                        <CalendarClock size={12} aria-hidden />
                        Día del evento
                      </Label>
                      <Input
                        id="auto-aceptacion-dia"
                        type="date"
                        value={diaLocal}
                        onChange={(e) => setDiaLocal(e.target.value)}
                        className="h-9 text-xs w-full"
                      />
                    </div>
                  )}
                  {modoUi === "DESDE_FECHA_HORA" && (
                    <div className="min-w-0">
                      <EventDateTimePicker value={desdeLocal} onChange={setDesdeLocal} />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="lg:col-span-5 flex flex-col gap-4 lg:border-l lg:border-border/60 lg:pl-8 min-w-0">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Estado guardado
                </span>
                <div
                  className={cn(
                    "rounded-lg border px-3 py-3 text-xs leading-relaxed",
                    config?.activa
                      ? "border-success/25 bg-success-muted/50 text-foreground"
                      : "border-border bg-secondary/10 text-muted-foreground"
                  )}
                >
                  {config?.activa && config.resumen ? (
                    config.resumen
                  ) : (
                    <span>
                      La disponibilidad automática está desactivada. Elige un modo y pulsa
                      Guardar para activarla.
                    </span>
                  )}
                </div>
              </div>

              {pendientes > 0 && modoUi !== "OFF" && (
                <p className="text-xs text-muted-foreground">
                  Tienes{" "}
                  <strong className="text-foreground font-semibold">{pendientes}</strong>{" "}
                  convocatoria{pendientes !== 1 ? "s" : ""} pendiente
                  {pendientes !== 1 ? "s" : ""} que encajan con esta configuración.
                </p>
              )}

              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap lg:flex-col lg:items-stretch">
                <Button
                  type="button"
                  disabled={saving}
                  onClick={() => save(false)}
                  className="h-9 text-xs font-semibold shadow-none w-full sm:w-auto lg:w-full"
                >
                  {saving ? <Spinner size="sm" /> : "Guardar"}
                </Button>
                {pendientes > 0 && modoUi !== "OFF" && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() => save(true)}
                    className="h-9 text-xs font-medium border-border shadow-none w-full sm:w-auto lg:w-full"
                  >
                    Aplicar a {pendientes} pendiente{pendientes !== 1 ? "s" : ""}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
