import { useState } from "react";
import api from "@/services/api";
import { getApiErrorMessage } from "@/lib/constants";
import { toLocalISOString } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
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
import { Spinner } from "@/components/ui/spinner";
import { PresetChips } from "@/components/ui/preset-chips";
import { FieldError } from "@/components/ui/field-error";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { Ban } from "lucide-react";

const DURATION_OPTIONS = [
  { id: "24h", label: "24 h" },
  { id: "3d", label: "3 días" },
  { id: "1w", label: "1 semana" },
  { id: "1m", label: "1 mes" },
  { id: "custom", label: "Personalizado" },
];

const REASON_PRESETS = [
  {
    id: "inasistencia",
    label: "Inasistencia",
    text: "Inasistencia por faltar a una convocatoria a la que confirmó asistencia.",
  },
  { id: "conducta", label: "Conducta", text: "Conducta inapropiada durante convocatorias." },
  { id: "lesion", label: "Lesión admin.", text: "Lesión administrativa — reposo temporal." },
  { id: "otro", label: "Otro", text: "" },
];

function computeEndDate(duration: string, customDate: string): Date | null {
  const now = new Date();
  if (duration === "24h") return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (duration === "3d") return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  if (duration === "1w") return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (duration === "1m") return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (duration === "custom" && customDate) {
    const d = new Date(customDate);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

interface SuspensionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number | null;
  userName: string;
  onSuccess?: () => void;
}

export function SuspensionDialog({
  open,
  onOpenChange,
  userId,
  userName,
  onSuccess,
}: SuspensionDialogProps) {
  const confirm = useConfirm();
  const toast = useToast();
  const [duration, setDuration] = useState("24h");
  const [customDate, setCustomDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setDuration("24h");
    setCustomDate("");
    setReason("");
    setError("");
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    if (!reason.trim()) {
      setError("El motivo de la suspensión es obligatorio.");
      return;
    }
    if (duration === "custom" && !customDate) {
      setError("Selecciona la fecha de finalización.");
      return;
    }

    const fechaFin = computeEndDate(duration, customDate);
    if (!fechaFin) {
      setError("No se pudo calcular la fecha de fin.");
      return;
    }
    if (fechaFin.getTime() <= Date.now()) {
      setError("La fecha de finalización debe ser en el futuro.");
      return;
    }

    const ok = await confirm({
      title: "Confirmar suspensión",
      description: `¿Suspender a ${userName} hasta ${fechaFin.toLocaleString()}? No podrá inscribirse ni confirmar asistencia.`,
      confirmLabel: "Sí, suspender",
      variant: "danger",
    });
    if (!ok) return;

    setSubmitting(true);
    setError("");
    try {
      await api.post(`/api/usuarios/${userId}/suspender`, {
        fechaFin: toLocalISOString(fechaFin),
        motivo: reason.trim(),
      });
      toast.warning(
        "Jugador suspendido",
        `${userName} no podrá inscribirse hasta ${fechaFin.toLocaleString()}.`
      );
      handleClose(false);
      onSuccess?.();
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err) || "Error al suspender al usuario";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-1.5">
              <Ban size={16} />
              Suspender jugador
            </DialogTitle>
            <DialogDescription>
              Suspender a <strong>{userName}</strong>. No podrá inscribirse ni confirmar asistencia
              durante el periodo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Duración</Label>
              <PresetChips
                options={DURATION_OPTIONS.map((o) => ({
                  id: o.id,
                  label: o.label,
                  onClick: () => {
                    setDuration(o.id);
                    setError("");
                  },
                }))}
                activeId={duration}
              />
            </div>

            {duration === "custom" && (
              <div className="space-y-1.5">
                <Label htmlFor="suspension-end">Fin de suspensión</Label>
                <Input
                  id="suspension-end"
                  type="datetime-local"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Motivo rápido</Label>
              <PresetChips
                showIcon={false}
                options={REASON_PRESETS.map((p) => ({
                  id: p.id,
                  label: p.label,
                  onClick: () => {
                    if (p.text) setReason(p.text);
                    setError("");
                  },
                }))}
              />
              <Label htmlFor="suspension-reason">Motivo (obligatorio)</Label>
              <textarea
                id="suspension-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Detalle del motivo..."
                className="w-full text-xs p-2 rounded-md border border-border bg-background min-h-[72px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-invalid={!!error && !reason.trim()}
              />
              <FieldError message={error} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={
                submitting ||
                !reason.trim() ||
                (duration === "custom" && !customDate)
              }
            >
              {submitting ? <Spinner size="sm" /> : "Suspender"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
