export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  username?: string;
  numeroCamiseta?: number;
  roles?: string[];
  permissions?: string[];
  activo?: boolean;
  fechaCreacion?: string;
}

export interface RolesSistema {
  id: number;
  nombre: string;
}

export interface PermisosSistema {
  id: number;
  clave: string;
  descripcion: string;
  modulo?: string;
}

export interface Deporte {
  id: number;
  nombre: string;
  esPorEquipos?: boolean;
  minJugadoresPorBando?: number;
  maxJugadoresPorBando?: number;
}

export interface PosicionesDeporte {
  id: number;
  deporteId: number;
  nombre: string;
  abreviatura: string;
  categoriaLinea?: string;
}

export enum EstadoConvocatoria {
  BORRADOR = "BORRADOR",
  ABIERTA = "ABIERTA",
  EN_PROGRESO = "EN_PROGRESO",
  FINALIZADA = "FINALIZADA",
  CANCELADA = "CANCELADA",
}

export interface Convocatoria {
  id: number;
  titulo: string;
  descripcion?: string;
  deporteId?: number;
  deporteNombre?: string;
  lugar?: string;
  estado: EstadoConvocatoria;
  creadoPorId?: number;
  creadoPorNombre?: string;
  cupoMaximo?: number;
  categoria?: string;
  fechaCreacion?: string;
  fechaAperturaInscripcion?: string;
  fechaLimiteInscripcion?: string;
  fechaHora?: string;
  fechaHoraFin?: string;
  duracionEstimadaMinutos?: number;
  configuracionRecurrenteId?: number;
  manejoExcedente?: string;
}

export interface BandoConvocatoria {
  id: number;
  convocatoriaId: number;
  nombre: string;
  color?: string;
}

export enum EstadoAsistencia {
  ASISTIRE = "ASISTIRE",
  NO_ASISTIRE = "NO_ASISTIRE",
  PENDIENTE = "PENDIENTE",
  LISTA_ESPERA = "LISTA_ESPERA",
}

export interface Asistencia {
  id: number;
  convocatoriaId: number;
  convocatoriaTitulo?: string;
  usuarioId: number | null;
  usuarioNombre?: string | null;
  nombreExterno: string | null;
  invitadoPorId: number | null;
  invitadoPorNombre?: string | null;
  estado: EstadoAsistencia;
  posicionPreferidaId: number | null;
  posicionPreferidaNombre?: string | null;
  posicionAsignadaId?: number | null;
  posicionAsignadaNombre?: string | null;
  bandoId: number | null;
  bandoNombre?: string | null;
  numeroCamiseta?: number | null;
  fechaRespuesta: string;
}

export interface AuthState {
  token: string | null;
  email: string | null;
  nombre: string | null;
  roles: string[];
}

export interface Grupo {
  id: number;
  nombre: string;
  descripcion: string;
  creadoPorId: number;
  creadoPorNombre: string;
  miembroIds: number[];
  miembroNombres: string[];
  fechaCreacion: string;
}

export interface HorarioDia {
  horaApertura: string;
  horaEvento: string;
  duracionMinutos: number;
}

export interface ConfiguracionRecurrente {
  id: number;
  titulo: string;
  descripcion?: string;
  deporteId: number;
  deporteNombre?: string;
  lugar?: string;
  cupoMaximo: number;
  categoria?: string;
  rruleExpression: string;
  horariosPorDia: Record<string, HorarioDia>;
  grupoDestinoId?: number | null;
  grupoDestinoNombre?: string | null;
  activo: boolean;
  fechaCreacion: string;
}

export interface UsuarioPosicionDto {
  posicionId: number;
  posicionNombre: string;
  deporteId: number;
  deporteNombre: string;
  prioridad: number;
}
