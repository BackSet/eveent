import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parsea JSON de forma segura. Devuelve `fallback` si el valor es nulo o está corrupto,
 * evitando que un localStorage dañado tire la app con una pantalla en blanco.
 */
export function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (value == null) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/**
 * Loguea errores sólo en desarrollo. En producción permanece en silencio para no
 * exponer detalles internos en las dev tools. Usar para errores ya manejados (toast, etc.).
 */
export function logError(message: string, error?: unknown): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error(message, error);
  }
}
