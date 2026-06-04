export const ESTADO_COLORS: Record<string, "default" | "secondary" | "destructive" | "success" | "warning" | "info"> = {
  ASISTIRE: "success",
  NO_ASISTIRE: "destructive",
  PENDIENTE: "warning",
  LISTA_ESPERA: "info",
};

export const CONVOCATORIA_ESTADO_COLORS: Record<string, "default" | "secondary" | "destructive" | "success" | "warning" | "info"> = {
  BORRADOR: "secondary",
  ABIERTA: "success",
  EN_PROGRESO: "info",
  FINALIZADA: "default",
  CANCELADA: "destructive",
};

export const ESTADO_LABELS: Record<string, string> = {
  ASISTIRE: "Asistiré",
  NO_ASISTIRE: "No Asistiré",
  PENDIENTE: "Pendiente",
  LISTA_ESPERA: "Lista de Espera",
  BORRADOR: "Borrador",
  ABIERTA: "Abierta",
  EN_PROGRESO: "En Progreso",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada",
};

export const TEAM_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

export function getTeamColorHex(colorName: string): string {
  const c = (colorName || "").toLowerCase();
  if (c === "azul" || c === "blue") return "#3b82f6";
  if (c === "rojo" || c === "red") return "#ef4444";
  if (c === "verde" || c === "green") return "#22c55e";
  if (c === "amarillo" || c === "yellow") return "#eab308";
  if (c === "naranja" || c === "orange") return "#f97316";
  if (c === "morado" || c === "purple" || c === "violeta") return "#8b5cf6";
  if (c === "rosa" || c === "pink") return "#ec4899";
  if (c === "celeste" || c === "cyan") return "#06b6d4";
  return colorName?.startsWith("#") ? colorName : "#64748b";
}

export function getApiErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "response" in err) {
    const resp = (err as { response?: { data?: { message?: string } } }).response;
    return resp?.data?.message || "Error desconocido";
  }
  return "Error desconocido";
}

export const RRULE_DAYS = [
  { value: "MO", label: "Lun" },
  { value: "TU", label: "Mar" },
  { value: "WE", label: "Mié" },
  { value: "TH", label: "Jue" },
  { value: "FR", label: "Vie" },
  { value: "SA", label: "Sáb" },
  { value: "SU", label: "Dom" },
];

export function parseRrule(rrule: string): { freq: string; byday: string[]; bymonthday: number | null; bysetpos: number | null } {
  const parts = rrule.split(";");
  let freq = "WEEKLY";
  let byday: string[] = [];
  let bymonthday: number | null = null;
  let bysetpos: number | null = null;
  for (const part of parts) {
    const [key, val] = part.split("=");
    if (key === "FREQ") freq = val;
    if (key === "BYDAY") byday = val.split(",");
    if (key === "BYMONTHDAY") bymonthday = parseInt(val);
    if (key === "BYSETPOS") bysetpos = parseInt(val);
  }
  return { freq, byday, bymonthday, bysetpos };
}

export function buildRrule(freq: string, byday: string[], bymonthday: number | null = null, bysetpos: number | null = null): string {
  let rrule = `FREQ=${freq}`;
  if (freq === "WEEKLY" && byday.length > 0) {
    rrule += `;BYDAY=${byday.join(",")}`;
  }
  if (freq === "MONTHLY") {
    if (bysetpos !== null && byday.length > 0) {
      rrule += `;BYDAY=${byday.join(",")};BYSETPOS=${bysetpos}`;
    } else if (bymonthday !== null) {
      rrule += `;BYMONTHDAY=${bymonthday}`;
    }
  }
  return rrule;
}

export const MONTHLY_OPTIONS = [
  { value: "bysetpos", label: "El N-ésimo día de la semana" },
  { value: "bymonthday", label: "El día X del mes" },
];

export const SETPOS_LABELS: Record<number, string> = {
  1: "Primer",
  2: "Segundo",
  3: "Tercer",
  4: "Cuarto",
  "-1": "Último",
};
