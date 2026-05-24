import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  combineDateAndTime,
  formatDateTimeLocal,
  getMinTimeForDate,
  getMinimumEventDate,
  getSuggestedDefaultDateTime,
  splitDateTimeLocal,
  toLocalDateValue,
  toLocalTimeValue,
  validateIndividualEventDateTime,
  MIN_EVENT_LEAD_MINUTES,
} from "@/lib/convocatoriaSchedule";
import { Calendar, Clock, Sparkles, AlertTriangle } from "lucide-react";
import { useMemo } from "react";

interface EventDateTimePickerProps {
  value: string;
  onChange: (fechaHora: string) => void;
}

export function EventDateTimePicker({ value, onChange }: EventDateTimePickerProps) {
  const now = useMemo(() => new Date(), []);
  const today = toLocalDateValue(now);
  const { date, time } = splitDateTimeLocal(value);
  const minTime = getMinTimeForDate(date, now);
  const validationError = validateIndividualEventDateTime(value, now);
  const isValid = !validationError && Boolean(value);
  const summary = formatDateTimeLocal(value);

  const applyPreset = (target: Date) => {
    const d = toLocalDateValue(target);
    const t = toLocalTimeValue(target);
    onChange(combineDateAndTime(d, t));
  };

  const presets = [
    {
      label: `+${MIN_EVENT_LEAD_MINUTES} min`,
      action: () => applyPreset(getMinimumEventDate(now)),
    },
    {
      label: "+2 h",
      action: () => applyPreset(new Date(now.getTime() + 2 * 60 * 60 * 1000)),
    },
    {
      label: "Hoy 20:00",
      action: () => {
        const t = combineDateAndTime(today, "20:00");
        onChange(clampIfNeeded(t));
      },
    },
    {
      label: "Mañana 20:00",
      action: () => {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        onChange(combineDateAndTime(toLocalDateValue(tomorrow), "20:00"));
      },
    },
  ];

  function clampIfNeeded(fechaHora: string): string {
    const err = validateIndividualEventDateTime(fechaHora, now);
    if (err) {
      return getSuggestedDefaultDateTime(now).fechaHora;
    }
    return fechaHora;
  }

  const handleDateChange = (newDate: string) => {
    if (!newDate) return;
    const next = combineDateAndTime(newDate, time || "20:00");
    onChange(clampIfNeeded(next));
  };

  const handleTimeChange = (newTime: string) => {
    const next = combineDateAndTime(date || today, newTime);
    onChange(clampIfNeeded(next));
  };

  return (
    <div
      className={`rounded-lg border p-4 space-y-4 transition-colors ${
        isValid ? "border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success)/0.06)]" : "border-border bg-muted/20"
      }`}
    >
      <div className="flex items-start gap-2">
        <Calendar className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="space-y-0.5 min-w-0">
          <p className="text-xs font-semibold text-foreground">Cuándo es el evento</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Solo fechas de hoy en adelante. El evento debe ser al menos{" "}
            {MIN_EVENT_LEAD_MINUTES} minutos después de ahora.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="event-date" className="text-xs font-medium text-muted-foreground">
            Fecha
          </Label>
          <Input
            id="event-date"
            type="date"
            min={today}
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="event-time" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Clock size={12} /> Hora del evento
          </Label>
          <Input
            id="event-time"
            type="time"
            min={minTime}
            value={time}
            onChange={(e) => handleTimeChange(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <Button
            key={p.label}
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-[10px] font-semibold px-2.5"
            onClick={p.action}
          >
            <Sparkles size={10} className="mr-1 opacity-70" />
            {p.label}
          </Button>
        ))}
      </div>

      {validationError ? (
        <p className="text-[11px] text-destructive font-medium leading-snug flex items-center gap-1">
          <AlertTriangle size={12} className="shrink-0" />
          {validationError}
        </p>
      ) : summary ? (
        <p className="text-[11px] text-tone-success font-medium leading-snug capitalize">
          ✓ Programado para {summary}
        </p>
      ) : null}
    </div>
  );
}
