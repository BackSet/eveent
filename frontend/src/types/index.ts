export interface Usuario {
  id: number;
  nombre: string;
  email: string;
}

export interface RolesSistema {
  id: number;
  nombre: string;
}

export interface PermisosSistema {
  id: number;
  clave: string;
  descripcion: string;
}

export interface Deporte {
  id: number;
  nombre: string;
}

export interface PosicionesDeporte {
  id: number;
  deporteId: number;
  nombre: string;
  abreviatura: string;
}

export enum EstadoConvocatoria {
  BORRADOR = 'BORRADOR',
  ABIERTA = 'ABIERTA',
  CERRADA = 'CERRADA',
  CANCELADA = 'CANCELADA',
}

export interface Convocatoria {
  id: number;
  titulo: string;
  descripcion: string;
  deporte: Deporte;
  fechaHora: string;
  lugar: string;
  estado: EstadoConvocatoria;
}

export interface EquiposConvocatoria {
  id: number;
  convocatoriaId: number;
  nombre: string;
  color: string;
}

export enum EstadoAsistencia {
  ASISTIRE = 'ASISTIRE',
  NO_ASISTIRE = 'NO_ASISTIRE',
  PENDIENTE = 'PENDIENTE',
  LISTA_ESPERA = 'LISTA_ESPERA',
}

export interface Asistencia {
  id: number;
  convocatoriaId: number;
  usuarioId: number | null;
  nombreExterno: string | null;
  invitadoPorId: number | null;
  estado: EstadoAsistencia;
  posicionId: number | null;
  equipoId: number | null;
  fechaRespuesta: string;
}

export interface AuthState {
  token: string | null;
  email: string | null;
  nombre: string | null;
  roles: string[];
}
