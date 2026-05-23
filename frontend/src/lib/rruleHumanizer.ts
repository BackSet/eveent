const DAY_NAMES: Record<string, string> = {
  MO: "lunes",
  TU: "martes",
  WE: "miércoles",
  TH: "jueves",
  FR: "viernes",
  SA: "sábados",
  SU: "domingos",
};

const FREQ_NAMES: Record<string, string> = {
  DAILY: "Diariamente",
  WEEKLY: "Semanalmente",
  MONTHLY: "Mensualmente",
  YEARLY: "Anualmente",
};

export function humanizeRRule(rruleStr: string): string {
  if (!rruleStr) return "Regla no definida";

  try {
    const parts = rruleStr.split(";");
    const rruleObj: Record<string, string> = {};
    
    parts.forEach((p) => {
      const [k, v] = p.split("=");
      if (k && v) {
        rruleObj[k.toUpperCase()] = v.toUpperCase();
      }
    });

    const freq = rruleObj["FREQ"];
    let result = FREQ_NAMES[freq] || freq;

    if (rruleObj["INTERVAL"] && parseInt(rruleObj["INTERVAL"], 10) > 1) {
      const interval = rruleObj["INTERVAL"];
      if (freq === "DAILY") result = `Cada ${interval} días`;
      else if (freq === "WEEKLY") result = `Cada ${interval} semanas`;
      else if (freq === "MONTHLY") result = `Cada ${interval} meses`;
      else if (freq === "YEARLY") result = `Cada ${interval} años`;
    }

    if (rruleObj["BYDAY"]) {
      const days = rruleObj["BYDAY"].split(",").map((d) => DAY_NAMES[d] || d);
      if (days.length > 0) {
        const lastDay = days.pop();
        const daysStr = days.length > 0 ? `${days.join(", ")} y ${lastDay}` : lastDay;
        result += ` los ${daysStr}`;
      }
    }

    if (rruleObj["BYMONTHDAY"]) {
      result += ` el día ${rruleObj["BYMONTHDAY"]} del mes`;
    }

    return result;
  } catch (e) {
    return rruleStr; // Fallback al original si falla el parseo
  }
}
