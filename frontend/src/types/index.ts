export type AutoAceptacionModo = "OFF" | "HOY" | "DIA" | "DESDE_FECHA_HORA";

export interface AutoAceptacionConfig {
  modo: AutoAceptacionModo | string;
  referencia?: string | null;
  activa: boolean;
  resumen: string;
  pendientesAplicables: number;
  pendientesAplicados?: number;
}

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
  posiciones?: UsuarioPosicionDto[];
  autoAceptacionModo?: string;
  autoAceptacionResumen?: string;
  autoAceptacionActiva?: boolean;
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

export type TipoInvitacion = "ABIERTA" | "GRUPO" | "MANUAL";

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
  deporteEsPorEquipos?: boolean;
  tipoInvitacion?: TipoInvitacion;
  grupoId?: number | null;
  grupoNombre?: string | null;
  puedeVer?: boolean;
  puedeInscribirse?: boolean;
  /** BORRADOR con fecha de evento ya pasada */
  fechaEventoPasada?: boolean;
  /** Si el borrador puede publicarse (PUT /abrir) */
  puedePublicarse?: boolean;
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
  convocatoriaFechaHora?: string;
  convocatoriaFechaHoraFin?: string;
  convocatoriaEstado?: string;
  convocatoriaLugar?: string;
  convocatoriaDeporteNombre?: string;
  usuarioId: number | null;
  usuarioNombre?: string | null;
  usuarioUsername?: string | null;
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
  posicionesPreferidasIds?: number[];
  posicionesPreferidasNombres?: string[];
  autoAceptada?: boolean;
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
  grupoDestinoNombre?: string;
  activo: boolean;
  creadoPorId?: number;
  fechaCreacion?: string;
}

export interface UsuarioPosicionDto {
  posicionId: number;
  posicionNombre: string;
  posicionAbreviatura?: string;
  deporteId: number;
  deporteNombre: string;
  prioridad: number;
}
