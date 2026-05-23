import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RRULE_DAYS, parseRrule, buildRrule, MONTHLY_OPTIONS, SETPOS_LABELS } from "@/lib/constants";
import type { HorarioDia } from "@/types";

interface RRuleBuilderProps {
  value: string;
  horariosPorDia: Record<string, HorarioDia>;
  onRruleChange: (rrule: string) => void;
  onHorariosChange: (horarios: Record<string, HorarioDia>) => void;
}

const FREQ_OPTIONS = [
  { value: "DAILY", label: "Diario" },
  { value: "WEEKLY", label: "Semanal" },
  { value: "MONTHLY", label: "Mensual" },
];

const DEFAULT_HORARIO: HorarioDia = { horaApertura: "08:00", horaEvento: "20:00", duracionMinutos: 90 };

export function RRuleBuilder({ value, horariosPorDia, onRruleChange, onHorariosChange }: RRuleBuilderProps) {
  const parsed = parseRrule(value || "FREQ=WEEKLY");
  const [freq, setFreq] = useState(parsed.freq);
  const [byday, setByday] = useState<string[]>(parsed.byday);
  const [monthlyMode, setMonthlyMode] = useState<"bysetpos" | "bymonthday">(
    parsed.bysetpos !== null ? "bysetpos" : "bymonthday"
  );
  const [bysetpos, setBysetpos] = useState<number>(parsed.bysetpos ?? 1);
  const [bymonthday, setBymonthday] = useState<number>(parsed.bymonthday ?? 1);
  const [monthlyDay, setMonthlyDay] = useState<string>(parsed.byday.length > 0 ? parsed.byday[0] : "MO");

  useEffect(() => {
    const p = parseRrule(value || "FREQ=WEEKLY");
    setFreq(p.freq);
    setByday(p.byday);
    setBysetpos(p.bysetpos ?? 1);
    setBymonthday(p.bymonthday ?? 1);
    setMonthlyDay(p.byday.length > 0 ? p.byday[0] : "MO");
    setMonthlyMode(p.bysetpos !== null ? "bysetpos" : "bymonthday");
  }, [value]);

  const emitRrule = (newFreq: string, newByday: string[], newBymonthday: number | null, newBysetpos: number | null) => {
    onRruleChange(buildRrule(newFreq, newByday, newBymonthday, newBysetpos));
  };

  const handleFreqChange = (newFreq: string) => {
    setFreq(newFreq);
    const newByday = newFreq === "WEEKLY" ? byday : [];
    setByday(newByday);

    if (newFreq === "DAILY") {
      const days = RRULE_DAYS.map(d => d.value);
      const newHorarios = { ...horariosPorDia };
      for (const d of days) {
        if (!newHorarios[d]) newHorarios[d] = { ...DEFAULT_HORARIO };
      }
      onHorariosChange(newHorarios);
      emitRrule(newFreq, [], null, null);
    } else if (newFreq === "WEEKLY") {
      if (byday.length === 0) {
        const today = RRULE_DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1].value;
        setByday([today]);
        const newHorarios = { ...horariosPorDia };
        if (!newHorarios[today]) newHorarios[today] = { ...DEFAULT_HORARIO };
        onHorariosChange(newHorarios);
        emitRrule(newFreq, [today], null, null);
      } else {
        emitRrule(newFreq, byday, null, null);
      }
    } else if (newFreq === "MONTHLY") {
      const newHorarios = { ...horariosPorDia };
      if (!newHorarios["DEFAULT"]) newHorarios["DEFAULT"] = { ...DEFAULT_HORARIO };
      onHorariosChange(newHorarios);
      emitRrule(newFreq, [monthlyDay], bymonthday, monthlyMode === "bysetpos" ? bysetpos : null);
    }
  };

  const toggleDay = (day: string) => {
    const newByday = byday.includes(day) ? byday.filter(d => d !== day) : [...byday, day];
    setByday(newByday);

    const newHorarios = { ...horariosPorDia };
    if (!newByday.includes(day)) {
      delete newHorarios[day];
    } else if (!newHorarios[day]) {
      newHorarios[day] = { ...DEFAULT_HORARIO };
    }
    onHorariosChange(newHorarios);
    emitRrule(freq, newByday, null, null);
  };

  const updateHorario = (key: string, field: keyof HorarioDia, value: string | number) => {
    const newHorarios = { ...horariosPorDia };
    newHorarios[key] = { ...(newHorarios[key] || DEFAULT_HORARIO), [field]: value };
    onHorariosChange(newHorarios);
  };

  const handleMonthlyModeChange = (mode: "bysetpos" | "bymonthday") => {
    setMonthlyMode(mode);
    if (mode === "bysetpos") {
      emitRrule(freq, [monthlyDay], null, bysetpos);
    } else {
      emitRrule(freq, [], bymonthday, null);
    }
  };

  const getDaysForHorarios = (): string[] => {
    if (freq === "WEEKLY") return byday;
    if (freq === "DAILY") return RRULE_DAYS.map(d => d.value);
    return ["DEFAULT"];
  };

  const getDayLabel = (key: string): string => {
    if (key === "DEFAULT") return "Cada ocurrencia";
    return RRULE_DAYS.find(d => d.value === key)?.label ?? key;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Frecuencia</Label>
        <div className="flex gap-2">
          {FREQ_OPTIONS.map((opt) => (
            <button key={opt.value} type="button" onClick={() => handleFreqChange(opt.value)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${freq === opt.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:bg-muted"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {freq === "WEEKLY" && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Días</Label>
          <div className="flex gap-1.5">
            {RRULE_DAYS.map((day) => (
              <button key={day.value} type="button" onClick={() => toggleDay(day.value)}
                className={`w-9 h-9 rounded-lg border text-xs font-semibold transition-colors ${byday.includes(day.value) ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:bg-muted"}`}>
                {day.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {freq === "MONTHLY" && (
        <div className="space-y-3 border rounded-lg p-3">
          <Label className="text-xs font-medium text-muted-foreground">Patrón Mensual</Label>
          <div className="flex gap-2">
            {MONTHLY_OPTIONS.map((opt) => (
              <button key={opt.value} type="button" onClick={() => handleMonthlyModeChange(opt.value as "bysetpos" | "bymonthday")}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${monthlyMode === opt.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:bg-muted"}`}>
                {opt.label}
              </button>
            ))}
          </div>

          {monthlyMode === "bysetpos" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Posición</Label>
                <Select value={String(bysetpos)} onValueChange={(v) => { setBysetpos(Number(v)); emitRrule(freq, [monthlyDay], null, Number(v)); }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, -1].map(n => (
                      <SelectItem key={n} value={String(n)}>{SETPOS_LABELS[n]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Día de la semana</Label>
                <Select value={monthlyDay} onValueChange={(v) => { setMonthlyDay(v); emitRrule(freq, [v], null, bysetpos); }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RRULE_DAYS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {monthlyMode === "bymonthday" && (
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Día del mes</Label>
              <Input type="number" min={1} max={31} value={bymonthday} onChange={(e) => { const v = parseInt(e.target.value) || 1; setBymonthday(v); emitRrule(freq, [], v, null); }} className="h-8 w-20 text-xs" />
            </div>
          )}

          <p className="text-[10px] text-muted-foreground">
            {monthlyMode === "bysetpos"
              ? `Ej: ${SETPOS_LABELS[bysetpos]} ${RRULE_DAYS.find(d => d.value === monthlyDay)?.label ?? ""} de cada mes`
              : `Ej: Día ${bymonthday} de cada mes`}
          </p>
        </div>
      )}

      {getDaysForHorarios().length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Horarios por día</Label>
          {getDaysForHorarios().map((dayKey) => {
            const h = horariosPorDia[dayKey] || DEFAULT_HORARIO;
            const hasError = h.horaApertura && h.horaEvento && h.horaApertura >= h.horaEvento;
            return (
              <div key={dayKey} className="space-y-1 animate-fadeIn">
                <div className={`grid grid-cols-[auto_1fr_1fr_1fr] gap-2 items-center border rounded-lg p-2 transition-colors ${hasError ? 'border-destructive bg-destructive/[0.02]' : ''}`}>
                  <span className="text-xs font-semibold text-primary min-w-[2rem]">{getDayLabel(dayKey)}</span>
                  <div className="space-y-0.5">
                    <Label className="text-[9px] text-muted-foreground">Apertura</Label>
                    <Input type="time" value={h.horaApertura} onChange={(e) => updateHorario(dayKey, "horaApertura", e.target.value)} className="h-7 text-[11px] px-1.5" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[9px] text-muted-foreground">Evento</Label>
                    <Input type="time" value={h.horaEvento} onChange={(e) => updateHorario(dayKey, "horaEvento", e.target.value)} className="h-7 text-[11px] px-1.5" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[9px] text-muted-foreground">Duración (min)</Label>
                    <Input type="number" min={1} value={h.duracionMinutos} onChange={(e) => updateHorario(dayKey, "duracionMinutos", parseInt(e.target.value) || 60)} className="h-7 text-[11px] px-1.5 w-16" />
                  </div>
                </div>
                {hasError && (
                  <p className="text-[10px] text-destructive font-medium pl-1.5">
                    ⚠️ La hora de apertura debe ser estrictamente anterior a la hora del evento.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
