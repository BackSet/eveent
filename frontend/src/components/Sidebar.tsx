import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  User,
  CalendarCheck,
  Compass,
  Trophy,
  Users,
  UserCog,
  ShieldCheck,
  Key,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo, memo } from "react";

const generalItems = [
  { icon: LayoutDashboard, label: "Inicio", path: "/dashboard", emoji: "🏠" },
  { icon: User, label: "Mi Perfil", path: "/perfil", emoji: "👤" },
  { icon: CalendarCheck, label: "Mis Partidos", path: "/mis-asistencias", emoji: "⚽" },
];

const convocatoriaItems = [
  { icon: Compass, label: "Explorar Partidos", path: "/convocatorias", emoji: "🧭" },
];

// Configuración para el Organizador del Evento
const configItems = [
  { icon: Trophy, label: "Disciplinas y Posiciones", path: "/deportes", permission: "gestionar_deportes", emoji: "🏆" },
  { icon: Users, label: "Grupos de Jugadores", path: "/grupos", permission: "gestionar_usuarios", emoji: "👥" },
];

// Administración para el Administrador del Sistema
const adminItems = [
  { icon: UserCog, label: "Usuarios del Sistema", path: "/usuarios", permission: "gestionar_usuarios", emoji: "🧑‍💻" },
  { icon: ShieldCheck, label: "Roles y Privilegios", path: "/roles", permission: "gestionar_roles", emoji: "🛡️" },
  { icon: Key, label: "Permisos del Sistema", path: "/permisos", permission: "ver_permisos", emoji: "🔑" },
];


export const Sidebar = memo(function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission, user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("sidebar_collapsed") === "true";
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  };

  const filteredConfigItems = useMemo(() => configItems.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  }), [hasPermission]);

  const filteredAdminItems = useMemo(() => adminItems.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  }), [hasPermission]);

  // Premium, highly integrated background and border styles
  const sidebarBg = "bg-sidebar border-sidebar-border backdrop-blur-md border-r";

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className="lg:hidden fixed top-3 left-3 z-50 p-1.5 bg-card border rounded-md shadow-sm hover:bg-muted transition"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={16} /> : <Menu size={16} />}
      </button>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-40 backdrop-blur-xs"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 flex flex-col h-full shrink-0 select-none group relative",
          "transition-all duration-200 ease-in-out", // Snappy Notion transition with color fade
          isCollapsed ? "w-[60px]" : "w-60",
          sidebarBg,
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Floating Border Toggle Button */}
        <button
          onClick={toggleCollapse}
          className={cn(
            "hidden lg:flex absolute top-14 -right-3 h-6 w-6 rounded-full border border-sidebar-border bg-background shadow-xs",
            "items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent",
            "opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer z-50 focus:outline-none"
          )}
          title={isCollapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
        >
          {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>

        {/* Workspace Selector */}
        <div className="p-3.5 border-b border-sidebar-border/60 flex items-center justify-center h-12 shrink-0">
          {isCollapsed ? (
            <div 
              className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground font-black text-sm shrink-0 shadow-xs cursor-pointer hover:scale-105 active:scale-95 transition-transform"
              onClick={toggleCollapse}
              title="Event - Click para expandir"
            >
              🏆
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="flex items-center justify-center h-7.5 w-7.5 rounded-lg bg-primary text-primary-foreground font-black text-xs shrink-0 shadow-xs">
                  🏆
                </div>
                <div className="overflow-hidden text-left">
                  <p className="text-[13.5px] font-bold truncate text-foreground leading-tight">Event</p>
                  <span className="text-[10px] text-muted-foreground/70 font-medium block mt-0.5">Workspace Deportivo</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Card */}
        {isCollapsed ? (
          <div className="py-3.5 border-b border-sidebar-border/60 flex justify-center items-center shrink-0">
            <div 
              className="h-9 w-9 rounded-full bg-linear-to-tr from-primary to-primary/80 flex items-center justify-center font-bold text-sm text-primary-foreground shrink-0 shadow-xs cursor-pointer hover:scale-105 active:scale-95 transition-all"
              title={`${user?.nombre || 'Usuario'}\n(${user?.email})`}
            >
              {user?.nombre?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        ) : (
          <div className="px-3 py-2.5 bg-sidebar-card/40 flex items-center gap-3 transition-colors hover:bg-sidebar-hover/70 rounded-lg mx-2.5 my-2.5 border border-sidebar-border/50 shrink-0">
            <div 
              className="h-8 w-8 rounded-full bg-linear-to-tr from-primary to-primary/80 flex items-center justify-center font-bold text-xs text-primary-foreground shrink-0 shadow-sm"
              title={user?.email}
            >
              {user?.nombre?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden text-left flex-1 min-w-0">
              <span className="text-xs font-semibold text-foreground truncate block leading-tight">
                {user?.nombre || "Usuario"}
              </span>
              <span className="text-[10px] text-muted-foreground truncate block mt-0.5 font-medium leading-none">
                {user?.email}
              </span>
            </div>
          </div>
        )}

        {/* Navigation list */}
        <nav className="flex-1 p-1.5 space-y-4 overflow-y-auto text-[13px] font-medium scrollbar-thin">
          {/* General Section */}
          <div className="space-y-0.5">
            {!isCollapsed ? (
              <p className="px-3.5 pt-3 pb-1 text-[10px] font-bold text-muted-foreground/50 tracking-wider uppercase select-none">
                Mi Espacio
              </p>
            ) : (
              <div className="w-8 h-[1px] bg-border/40 dark:bg-border/20 mx-auto my-3" />
            )}
            {generalItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center rounded-lg transition-all group",
                    isCollapsed ? "justify-center h-9 w-9 mx-auto p-0" : "justify-between px-3.5 py-2 mx-2",
                    isActive
                      ? "bg-accent/80 text-accent-foreground font-semibold border border-border/30 shadow-2xs"
                      : "text-muted-foreground hover:bg-sidebar-hover/70 hover:text-foreground"
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-2.5")}>
                    <Icon
                      size={15}
                      className={cn(
                        "shrink-0 transition-transform duration-150 group-hover:scale-110",
                        isActive ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    {!isCollapsed && <span className="text-[13px]">{item.label}</span>}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Partidos Section */}
          <div className="space-y-0.5">
            {isCollapsed ? (
              <div className="w-8 h-[1px] bg-border/40 dark:bg-border/20 mx-auto my-3" />
            ) : (
              <p className="px-3.5 pt-4 pb-1 text-[10px] font-bold text-muted-foreground/50 tracking-wider uppercase select-none">
                Encuentros
              </p>
            )}
            {convocatoriaItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center rounded-lg transition-all group",
                    isCollapsed ? "justify-center h-9 w-9 mx-auto p-0" : "justify-between px-3.5 py-2 mx-2",
                    isActive
                      ? "bg-accent/80 text-accent-foreground font-semibold border border-border/30 shadow-2xs"
                      : "text-muted-foreground hover:bg-sidebar-hover/70 hover:text-foreground"
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-2.5")}>
                    <Icon
                      size={15}
                      className={cn(
                        "shrink-0 transition-transform duration-150 group-hover:scale-110",
                        isActive ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    {!isCollapsed && <span className="text-[13px]">{item.label}</span>}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Configuración de Evento (Organizador) */}
          {filteredConfigItems.length > 0 && (
            <div className="space-y-0.5">
              {isCollapsed ? (
                <div className="w-8 h-[1px] bg-border/40 dark:bg-border/20 mx-auto my-3" />
              ) : (
                <p className="px-3.5 pt-4 pb-1 text-[10px] font-bold text-muted-foreground/50 tracking-wider uppercase select-none">
                  Configuración de Eventos
                </p>
              )}
              {filteredConfigItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center rounded-lg transition-all group",
                      isCollapsed ? "justify-center h-9 w-9 mx-auto p-0" : "justify-between px-3.5 py-2 mx-2",
                      isActive
                        ? "bg-accent/80 text-accent-foreground font-semibold border border-border/30 shadow-2xs"
                        : "text-muted-foreground hover:bg-sidebar-hover/70 hover:text-foreground"
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-2.5")}>
                      <Icon
                        size={15}
                        className={cn(
                          "shrink-0 transition-transform duration-150 group-hover:scale-110",
                          isActive ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground"
                        )}
                      />
                      {!isCollapsed && <span className="text-[13px]">{item.label}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Administración de Sistema (Administrador) */}
          {filteredAdminItems.length > 0 && (
            <div className="space-y-0.5">
              {isCollapsed ? (
                <div className="w-8 h-[1px] bg-border/40 dark:bg-border/20 mx-auto my-3" />
              ) : (
                <p className="px-3.5 pt-4 pb-1 text-[10px] font-bold text-muted-foreground/50 tracking-wider uppercase select-none">
                  Administración General
                </p>
              )}
              {filteredAdminItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center rounded-lg transition-all group",
                      isCollapsed ? "justify-center h-9 w-9 mx-auto p-0" : "justify-between px-3.5 py-2 mx-2",
                      isActive
                        ? "bg-accent/80 text-accent-foreground font-semibold border border-border/30 shadow-2xs"
                        : "text-muted-foreground hover:bg-sidebar-hover/70 hover:text-foreground"
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-2.5")}>
                      <Icon
                        size={15}
                        className={cn(
                          "shrink-0 transition-transform duration-150 group-hover:scale-110",
                          isActive ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground"
                        )}
                      />
                      {!isCollapsed && <span className="text-[13px]">{item.label}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* Footer actions */}
        <div className="p-2 border-t border-sidebar-border/60 bg-sidebar-card/30 flex flex-col justify-center h-13 shrink-0">
          <button
            onClick={() => { logout(); navigate("/login"); }}
            className={cn(
              "flex items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-150 font-semibold group",
              isCollapsed 
                ? "justify-center h-9 w-9 mx-auto p-0 hover:bg-destructive/15" 
                : "gap-2.5 px-3.5 py-2 mx-1 text-xs text-left"
            )}
            title="Cerrar Sesión"
          >
            <LogOut size={14} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
            {!isCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>
    </>
  );
});
