const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "El email es obligatorio.";
  if (!EMAIL_RE.test(trimmed)) return "Introduce un email válido.";
  return null;
}

export function validatePassword(password: string, minLength = 6): string | null {
  if (!password) return "La contraseña es obligatoria.";
  if (password.length < minLength) return `La contraseña debe tener al menos ${minLength} caracteres.`;
  return null;
}

export function validatePasswordMatch(password: string, confirm: string): string | null {
  if (password !== confirm) return "Las contraseñas no coinciden.";
  return null;
}

export function validateDorsal(dorsal: string | number): string | null {
  const n = typeof dorsal === "string" ? parseInt(dorsal, 10) : dorsal;
  if (Number.isNaN(n) || n < 1 || n > 99) return "El dorsal debe estar entre 1 y 99.";
  return null;
}

export function validateRequiredTrim(value: string, label: string): string | null {
  if (!value.trim()) return `${label} es obligatorio.`;
  return null;
}

export function validateMinMax(min: number, max: number): string | null {
  if (min > max) return "El mínimo de jugadores no puede ser mayor que el máximo.";
  if (min < 1) return "El mínimo debe ser al menos 1.";
  return null;
}

/**
 * fechaLimite y fechaEvento en formato datetime-local (YYYY-MM-DDTHH:mm) o ISO.
 */
export function validateInscripcionDeadline(
  fechaLimite: string,
  fechaEvento: string,
  now: Date = new Date()
): string | null {
  if (!fechaLimite) return null;

  const limite = new Date(fechaLimite.length === 16 ? fechaLimite + ":00" : fechaLimite);
  const evento = new Date(fechaEvento.length === 16 ? fechaEvento + ":00" : fechaEvento);

  if (Number.isNaN(limite.getTime())) return "Fecha límite de inscripción no válida.";
  if (Number.isNaN(evento.getTime())) return null;

  if (limite <= now) {
    return "El cierre de inscripciones debe ser en el futuro.";
  }
  if (limite >= evento) {
    return "El cierre de inscripciones debe ser anterior al inicio del evento.";
  }
  return null;
}
