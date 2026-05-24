/** ISO local sin Z para el backend (YYYY-MM-DDTHH:mm:ss). */
export function toLocalISOString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** datetime-local value (YYYY-MM-DDTHH:mm). */
export function toDateTimeLocalValue(date: Date): string {
  return toLocalISOString(date).slice(0, 16);
}
