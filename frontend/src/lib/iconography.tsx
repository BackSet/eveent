import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  UserCircle,
  ClipboardCheck,
  UsersRound,
  Megaphone,
  Medal,
  FolderKanban,
  UserCog,
  ShieldCheck,
  KeyRound,
  Trophy,
  Goal,
  Volleyball,
  ShoppingBasket,
  Footprints,
  SportShoe,
  CalendarDays,
  UserCheck,
  Settings2,
  Package,
  LogOut,
  type LucideProps,
} from "lucide-react";

/** Módulos de permisos (clave estable, sin emojis). */
export const PermissionModuleId = {
  CONVOCATORIAS: "convocatorias",
  GRUPOS: "grupos",
  DEPORTES: "deportes",
  USUARIOS: "usuarios",
  ROLES: "roles",
  OTROS: "otros",
} as const;

export type PermissionModuleId =
  (typeof PermissionModuleId)[keyof typeof PermissionModuleId];

export interface PermissionModuleMeta {
  id: PermissionModuleId;
  label: string;
  icon: LucideIcon;
}

export const PERMISSION_MODULES: Record<PermissionModuleId, PermissionModuleMeta> = {
  [PermissionModuleId.CONVOCATORIAS]: {
    id: PermissionModuleId.CONVOCATORIAS,
    label: "Convocatorias",
    icon: Megaphone,
  },
  [PermissionModuleId.GRUPOS]: {
    id: PermissionModuleId.GRUPOS,
    label: "Grupos de jugadores",
    icon: UsersRound,
  },
  [PermissionModuleId.DEPORTES]: {
    id: PermissionModuleId.DEPORTES,
    label: "Deportes y posiciones",
    icon: Medal,
  },
  [PermissionModuleId.USUARIOS]: {
    id: PermissionModuleId.USUARIOS,
    label: "Usuarios del sistema",
    icon: UserCog,
  },
  [PermissionModuleId.ROLES]: {
    id: PermissionModuleId.ROLES,
    label: "Roles y privilegios",
    icon: ShieldCheck,
  },
  [PermissionModuleId.OTROS]: {
    id: PermissionModuleId.OTROS,
    label: "Otros permisos",
    icon: Package,
  },
};

export function getPermissionModuleId(clave: string): PermissionModuleId {
  const c = clave.toLowerCase();
  if (
    c.includes("convocatoria") ||
    c === "responder_asistencia" ||
    c === "invitar_externos" ||
    c === "dividir_bandos" ||
    c === "dividir_equipos"
  ) {
    return PermissionModuleId.CONVOCATORIAS;
  }
  if (c.includes("grupo")) return PermissionModuleId.GRUPOS;
  if (c.includes("deporte") || c.includes("posicion")) return PermissionModuleId.DEPORTES;
  if (c.includes("usuario") || c === "suspender_jugadores") return PermissionModuleId.USUARIOS;
  if (c.includes("rol") || c.includes("permiso")) return PermissionModuleId.ROLES;
  return PermissionModuleId.OTROS;
}

export function getPermissionModule(clave: string): PermissionModuleMeta {
  return PERMISSION_MODULES[getPermissionModuleId(clave)];
}

/** Icono según nombre de deporte (listas, filas, tabs). */
export function getDeporteIcon(deporteNombre?: string | null): LucideIcon {
  const name = (deporteNombre ?? "").toLowerCase();
  if (
    name.includes("futbol") ||
    name.includes("fútbol") ||
    name.includes("soccer") ||
    name.includes("futsal")
  ) {
    return Goal;
  }
  if (
    name.includes("basquet") ||
    name.includes("básquet") ||
    name.includes("basketball") ||
    name.includes("baloncesto")
  ) {
    return ShoppingBasket;
  }
  if (name.includes("tenis") || name.includes("tennis") || name.includes("pádel") || name.includes("padel")) {
    return SportShoe;
  }
  if (name.includes("voley") || name.includes("voleibol") || name.includes("volleyball")) {
    return Volleyball;
  }
  if (name.includes("running") || name.includes("correr") || name.includes("atletismo")) {
    return Footprints;
  }
  return Trophy;
}

/** Navegación lateral y breadcrumbs. */
export interface NavItemConfig {
  path: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
  anyPermissions?: string[];
}

export const NAV_GENERAL: NavItemConfig[] = [
  { path: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { path: "/perfil", label: "Mi perfil", icon: UserCircle },
  { path: "/mis-asistencias", label: "Mis asistencias", icon: ClipboardCheck },
  {
    path: "/mis-grupos",
    label: "Mis grupos",
    icon: UsersRound,
    permission: "ver_grupos",
  },
];

export const NAV_CONVOCATORIAS: NavItemConfig[] = [
  { path: "/convocatorias", label: "Explorar convocatorias", icon: Megaphone },
];

export const NAV_CONFIG: NavItemConfig[] = [
  {
    path: "/deportes",
    label: "Disciplinas y posiciones",
    icon: Medal,
    permission: "gestionar_deportes",
  },
  {
    path: "/grupos",
    label: "Grupos de jugadores",
    icon: FolderKanban,
    permission: "crear_grupos",
  },
];

export const NAV_ADMIN: NavItemConfig[] = [
  {
    path: "/usuarios",
    label: "Usuarios del sistema",
    icon: UserCog,
    permission: "ver_usuarios",
  },
  {
    path: "/roles",
    label: "Roles y privilegios",
    icon: ShieldCheck,
    permission: "ver_roles",
  },
  {
    path: "/permisos",
    label: "Permisos del sistema",
    icon: KeyRound,
    anyPermissions: ["ver_permisos", "gestionar_roles"],
  },
];

/** Iconos de cabecera de página (cover). */
export const PageIconKind = {
  DASHBOARD: "dashboard",
  PERFIL: "perfil",
  CONVOCATORIAS: "convocatorias",
  CONVOCATORIA_DETALLE: "convocatoria-detalle",
  MIS_ASISTENCIAS: "mis-asistencias",
  DEPORTES: "deportes",
  GRUPOS: "grupos",
  USUARIOS: "usuarios",
  ROLES: "roles",
  PERMISOS: "permisos",
  LOGIN: "login",
} as const;

export type PageIconKind = (typeof PageIconKind)[keyof typeof PageIconKind];

const PAGE_ICON_MAP: Record<PageIconKind, LucideIcon> = {
  [PageIconKind.DASHBOARD]: LayoutDashboard,
  [PageIconKind.PERFIL]: UserCircle,
  [PageIconKind.CONVOCATORIAS]: Megaphone,
  [PageIconKind.CONVOCATORIA_DETALLE]: CalendarDays,
  [PageIconKind.MIS_ASISTENCIAS]: ClipboardCheck,
  [PageIconKind.DEPORTES]: Medal,
  [PageIconKind.GRUPOS]: FolderKanban,
  [PageIconKind.USUARIOS]: UserCog,
  [PageIconKind.ROLES]: ShieldCheck,
  [PageIconKind.PERMISOS]: KeyRound,
  [PageIconKind.LOGIN]: Trophy,
};

export function getPageIcon(kind: PageIconKind): LucideIcon {
  return PAGE_ICON_MAP[kind];
}

export function getBreadcrumbIcon(pathname: string): LucideIcon | null {
  if (pathname.startsWith("/dashboard")) return LayoutDashboard;
  if (pathname.startsWith("/perfil")) return UserCircle;
  if (pathname.startsWith("/mis-asistencias")) return ClipboardCheck;
  if (pathname.startsWith("/mis-grupos")) return UsersRound;
  if (pathname.startsWith("/convocatorias")) return Megaphone;
  if (pathname.startsWith("/deportes")) return Medal;
  if (pathname.startsWith("/grupos")) return FolderKanban;
  if (pathname.startsWith("/usuarios")) return UserCog;
  if (pathname.startsWith("/roles")) return ShieldCheck;
  if (pathname.startsWith("/permisos")) return KeyRound;
  return null;
}

export { LogOut, Settings2, UserCheck };

export type IconComponentProps = LucideProps & { icon: LucideIcon };
