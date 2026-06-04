/** Comprueba un permiso (insensible a mayúsculas). */
export type HasPermissionFn = (permission: string) => boolean;

export function hasAnyPermission(hasPermission: HasPermissionFn, ...permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(p));
}

/** Autobalanceo / bandos (clave canónica y legacy). */
export function canDivideTeams(hasPermission: HasPermissionFn): boolean {
  return hasPermission("dividir_bandos") || hasPermission("dividir_equipos");
}

/** Crear, editar o dar de baja usuarios. */
export function canManageUsuarios(hasPermission: HasPermissionFn): boolean {
  return hasAnyPermission(
    hasPermission,
    "crear_usuarios",
    "editar_usuarios",
    "dar_baja_usuarios"
  );
}

/** Puede crear convocatorias o reglas recurrentes en el sistema. */
export function canCreateConvocatorias(hasPermission: HasPermissionFn): boolean {
  return hasPermission("crear_convocatorias");
}

/** Estados en los que la convocatoria puede borrarse físicamente. */
export function isConvocatoriaDeletableEstado(estado: string): boolean {
  return estado === "BORRADOR" || estado === "ABIERTA" || estado === "CANCELADA";
}

function isConvocatoriaOwner(
  conv: { creadoPorId?: number },
  userId?: number
): boolean {
  return conv.creadoPorId != null && userId != null && conv.creadoPorId === userId;
}

/** Publicar borrador: dueño o permisos de edición/creación. */
export function canPublishConvocatoria(
  conv: { estado: string; creadoPorId?: number },
  hasPermission: HasPermissionFn,
  userId?: number
): boolean {
  if (conv.estado !== "BORRADOR") {
    return false;
  }
  return (
    isConvocatoriaOwner(conv, userId) ||
    hasPermission("editar_convocatorias") ||
    hasPermission("crear_convocatorias")
  );
}

/** Cancelar convocatoria: solo ABIERTA y con permiso de cancelación. */
export function canCancelConvocatoria(
  conv: { estado: string; creadoPorId?: number },
  hasPermission: HasPermissionFn,
  userId?: number
): boolean {
  if (conv.estado !== "ABIERTA") {
    return false;
  }
  return hasPermission("cancelar_convocatorias");
}

/** Eliminar borrador/abierta/cancelada: requiere permiso específico. */
export function canDeleteConvocatoria(
  conv: { estado: string; creadoPorId?: number },
  hasPermission: HasPermissionFn,
  userId?: number
): boolean {
  if (!isConvocatoriaDeletableEstado(conv.estado)) {
    return false;
  }
  return hasPermission("eliminar_convocatorias");
}

/** Editar metadatos: BORRADOR o ABIERTA y con permiso de edición. */
export function canEditConvocatoria(
  conv: { estado: string; creadoPorId?: number },
  hasPermission: HasPermissionFn,
  userId?: number
): boolean {
  if (conv.estado !== "BORRADOR" && conv.estado !== "ABIERTA") {
    return false;
  }
  return hasPermission("editar_convocatorias");
}

function canManageRecurrenteByPermission(
  config: { creadoPorId?: number },
  hasPermission: HasPermissionFn,
  userId?: number
): boolean {
  const isOwner =
    config.creadoPorId != null && userId != null && config.creadoPorId === userId;
  return (
    isOwner ||
    hasPermission("editar_convocatorias") ||
    hasPermission("crear_convocatorias")
  );
}

/** Gestionar regla recurrente (editar, pausar): dueño o permisos de edición/creación. */
export function canManageRecurrente(
  config: { creadoPorId?: number },
  hasPermission: HasPermissionFn,
  userId?: number
): boolean {
  return canManageRecurrenteByPermission(config, hasPermission, userId);
}

/** Eliminar regla recurrente: dueño o permisos de edición/creación de convocatorias. */
export function canDeleteRecurrente(
  config: { creadoPorId?: number },
  hasPermission: HasPermissionFn,
  userId?: number
): boolean {
  return canManageRecurrenteByPermission(config, hasPermission, userId);
}

/** Puede gestionar convocatorias ajenas (editar, cancelar, eliminar). */
export function canManageConvocatoriasGlobally(hasPermission: HasPermissionFn): boolean {
  return hasAnyPermission(
    hasPermission,
    "editar_convocatorias",
    "cancelar_convocatorias",
    "eliminar_convocatorias"
  );
}

export interface ConvocatoriaCapabilities {
  isOwner: boolean;
  /** Abrir, cancelar, editar metadatos, eliminar borrador */
  canManageConvocatoria: boolean;
  canPublish: boolean;
  canCancel: boolean;
  canDelete: boolean;
  canEdit: boolean;
  /** Autobalanceo, crear/editar bandos, mover jugadores */
  canManageLineup: boolean;
  /** Confirmar o editar asistencia de cualquier jugador */
  canManageAllAttendance: boolean;
  canInviteGuests: boolean;
  canRespondSelf: boolean;
  showAdminPanel: boolean;
  showMatchmakingTools: boolean;
  canAssignPlayersToTeams: boolean;
}

export function getConvocatoriaCapabilities(
  hasPermission: HasPermissionFn,
  convocatoria: { creadoPorId?: number; estado?: string } | null | undefined,
  userId: number | undefined
): ConvocatoriaCapabilities {
  const isOwner =
    convocatoria != null && isConvocatoriaOwner(convocatoria, userId);

  const canEdit = hasPermission("editar_convocatorias");
  const canCancelPerm = hasPermission("cancelar_convocatorias");
  const canDeletePerm = hasPermission("eliminar_convocatorias");
  const canDivide = canDivideTeams(hasPermission);

  const canManageConvocatoria =
    canEdit || canCancelPerm || canDeletePerm;
  const convWithEstado =
    convocatoria?.estado != null
      ? (convocatoria as { creadoPorId?: number; estado: string })
      : null;
  const canPublish = convWithEstado
    ? canPublishConvocatoria(convWithEstado, hasPermission, userId)
    : false;
  const canCancel = convWithEstado
    ? canCancelConvocatoria(convWithEstado, hasPermission, userId)
    : false;
  const canDelete = convWithEstado
    ? canDeleteConvocatoria(convWithEstado, hasPermission, userId)
    : false;
  const canEditConv = convWithEstado
    ? canEditConvocatoria(convWithEstado, hasPermission, userId)
    : false;
  const isOpenForLineup = convocatoria?.estado === "ABIERTA";
  const canManageLineup = canDivide && canManageConvocatoria && isOpenForLineup;
  const canManageAllAttendance = canEdit || isOwner;
  const canInviteGuests = hasPermission("invitar_externos");
  const canRespondSelf = hasPermission("responder_asistencia");

  return {
    isOwner,
    canManageConvocatoria,
    canPublish,
    canCancel,
    canDelete,
    canEdit: canEditConv,
    canManageLineup,
    canManageAllAttendance,
    canInviteGuests,
    canRespondSelf,
    showAdminPanel: canManageConvocatoria,
    showMatchmakingTools: canManageLineup,
    canAssignPlayersToTeams: canManageLineup,
  };
}

/** Lista visible según permisos (borradores/canceladas solo para quien puede gestionarlas). */
export function filterConvocatoriasForUser<T extends { estado: string; creadoPorId?: number }>(
  convocatorias: T[],
  hasPermission: HasPermissionFn,
  userId?: number
): T[] {
  if (canManageConvocatoriasGlobally(hasPermission)) {
    return convocatorias;
  }
  return convocatorias.filter((c) => {
    if (c.estado === "CANCELADA") return false;
    if (c.estado === "BORRADOR") {
      return userId != null && c.creadoPorId === userId;
    }
    return true;
  });
}

/** ¿Puede gestionar la asistencia de este registro (propio invitado o staff)? */
export function canManageAsistencia(
  caps: ConvocatoriaCapabilities,
  asistencia: { invitadoPorId?: number | null },
  userId: number | undefined
): boolean {
  if (caps.canManageAllAttendance) return true;
  return (
    caps.canInviteGuests &&
    userId != null &&
    asistencia.invitadoPorId != null &&
    asistencia.invitadoPorId === userId
  );
}
