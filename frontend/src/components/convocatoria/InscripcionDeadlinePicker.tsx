import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PresetChips } from "@/components/ui/preset-chips";
import { FieldError } from "@/components/ui/field-error";
import { validateInscripcionDeadline } from "@/lib/formValidation";
import { toDateTimeLocalValue } from "@/lib/dateUtils";
import { InfoHint } from "@/components/ui/info-hint";
import { Clock } from "lucide-react";

interface InscripcionDeadlinePickerProps {
  value: string;
  onChange: (value: string) => void;
  fechaEvento: string;
}

export function InscripcionDeadlinePicker({
  value,
  onChange,
  fechaEvento,
}: InscripcionDeadlinePickerProps) {
  const [enabled, setEnabled] = useState(Boolean(value));

  const validationError =
    enabled && fechaEvento ? validateInscripcionDeadline(value, fechaEvento) : null;

  const applyPreset = (offsetMs: number) => {
    if (!fechaEvento) return;
    const event = new Date(fechaEvento.length === 16 ? fechaEvento + ":00" : fechaEvento);
    if (Number.isNaN(event.getTime())) return;
    const limite = new Date(event.getTime() - offsetMs);
    onChange(toDateTimeLocalValue(limite));
    setEnabled(true);
  };

  const applySameDayNoon = () => {
    if (!fechaEvento) return;
    const datePart = fechaEvento.split("T")[0];
    onChange(`${datePart}T12:00`);
    setEnabled(true);
  };

  const toggle = (on: boolean) => {
    setEnabled(on);
    if (!on) onChange("");
  };

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary shrink-0" />
          <Label className="text-xs font-semibold">Cierre de inscripciones</Label>
          <InfoHint side="right" maxWidth={280}>
            Opcional. Si lo defines, nadie podrá confirmar asistencia después de esa fecha y hora.
            Debe ser anterior al inicio del evento.
          </InfoHint>
        </div>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => toggle(e.target.checked)}
            className="rounded border-border"
          />
          Activar
        </label>
      </div>

      {enabled && (
        <>
          <PresetChips
            options={[
              {
                id: "1h",
                label: "1 h antes del evento",
                onClick: () => applyPreset(60 * 60 * 1000),
              },
              {
                id: "24h",
                label: "24 h antes",
                onClick: () => applyPreset(24 * 60 * 60 * 1000),
              },
              {
                id: "noon",
                label: "Mismo día 12:00",
                onClick: applySameDayNoon,
              },
            ]}
          />
          <Input
            type="datetime-local"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={!!validationError}
          />
          <FieldError message={validationError} />
          {!validationError && value && (
            <p className="text-[10px] text-tone-success font-medium">
              ✓ Cierre programado
            </p>
          )}
        </>
      )}
    </div>
  );
}
