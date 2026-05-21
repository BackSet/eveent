const LOCALE = "es-ES"

export function formatDateTime(date: string | Date | null): string {
  if (!date) return "--"
  return new Date(date).toLocaleString(LOCALE, { dateStyle: "medium", timeStyle: "short", hour12: false })
}

export function formatDate(date: string | Date | null): string {
  if (!date) return "--"
  return new Date(date).toLocaleDateString(LOCALE, { dateStyle: "medium" })
}

export function formatTime(date: string | Date | null): string {
  if (!date) return "--:--"
  return new Date(date).toLocaleTimeString(LOCALE, { timeStyle: "short", hour12: false })
}

export function formatTimeOnly(timeStr: string | null | undefined): string {
  if (!timeStr) return "--:--"
  return timeStr.slice(0, 5)
}
