import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Trophy,
  Calendar,
  Users,
  User,
  LogOut,
  Menu,
  X,
  Shield,
  Key,
  Search,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo, memo } from "react";

const generalItems = [
  { icon: LayoutDashboard, label: "Inicio", path: "/dashboard", emoji: "🏠" },
  { icon: User, label: "Mi Perfil", path: "/perfil", emoji: "👤" },
  { icon: Users, label: "Mis Convocatorias", path: "/mis-asistencias", emoji: "✅" },
  { icon: Users, label: "Mis Grupos", path: "/mis-grupos", permission: "ver_grupos", emoji: "👥" },
];

const convocatoriaItems = [
  { icon: Calendar, label: "Explorar Convocatorias", path: "/convocatorias", emoji: "📅" },
];

// Configuración para el Organizador del Evento
const configItems = [
  { icon: Trophy, label: "Disciplinas y Posiciones", path: "/deportes", permission: "gestionar_deportes", emoji: "⚽" },
  { icon: Users, label: "Grupos de Jugadores", path: "/grupos", permission: "crear_convocatoria", emoji: "📂" },
];

// Administración para el Administrador del Sistema
const adminItems = [
  { icon: User, label: "Usuarios del Sistema", path: "/usuarios", permission: "gestionar_usuarios", emoji: "👥" },
  { icon: Shield, label: "Roles y Privilegios", path: "/roles", permission: "gestionar_roles", emoji: "🛡️" },
  { icon: Key, label: "Permisos del Sistema", path: "/permisos", permission: "ver_permisos", emoji: "🔑" },
];

export const Sidebar = memo(function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission, user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const filteredGeneralItems = useMemo(() => generalItems.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  }), [hasPermission]);

  const filteredConfigItems = useMemo(() => configItems.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  }), [hasPermission]);

  const filteredAdminItems = useMemo(() => adminItems.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  }), [hasPermission]);

  const sidebarBg = "bg-muted/40 dark:bg-card/45 border-r border-border backdrop-blur-md";

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
          "fixed lg:static inset-y-0 left-0 z-40 w-60 transform transition-transform duration-200 lg:transform-none flex flex-col h-full",
          sidebarBg,
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Workspace Selector */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between p-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer group">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex items-center justify-center h-5.5 w-5.5 rounded bg-primary text-primary-foreground font-black text-xs shrink-0 shadow-sm">
                E
              </div>
              <div className="overflow-hidden text-left">
                <p className="text-xs font-semibold text-muted-foreground/80 leading-none">Espacio de Trabajo</p>
                <p className="text-sm font-bold truncate text-foreground leading-tight mt-0.5">Event Premium</p>
              </div>
            </div>
            <ChevronDown size={14} className="text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
          </div>
        </div>

        {/* User Card */}
        <div className="px-4 py-2 flex items-center gap-2 border-b border-border bg-muted/50 text-xs">
          <div className="h-4.5 w-4.5 rounded-full bg-primary flex items-center justify-center font-bold text-[9px] text-primary-foreground shrink-0">
            {user?.nombre?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="font-semibold text-muted-foreground truncate">{user?.email}</span>
        </div>

        {/* Quick Search */}
        <div className="px-3 pt-3">
          <div 
            onClick={() => navigate("/dashboard")}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search size={14} />
              <span>Búsqueda rápida</span>
            </div>
            <kbd className="text-[9px] font-sans bg-muted border rounded px-1.5 py-0.5 text-muted-foreground/75 shadow-xs">Ctrl+P</kbd>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-2 space-y-4 overflow-y-auto text-[13px] font-medium">
          {/* General Section */}
          <div className="space-y-0.5">
            <p className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
              Mi Espacio
            </p>
            {filteredGeneralItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors",
                    isActive
                      ? "bg-secondary text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm leading-none shrink-0">{item.emoji}</span>
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Convocatorias Section */}
          <div className="space-y-0.5">
            <p className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
              Encuentros
            </p>
            {convocatoriaItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors",
                    isActive
                      ? "bg-secondary text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm leading-none shrink-0">{item.emoji}</span>
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Configuración de Evento (Organizador) */}
          {filteredConfigItems.length > 0 && (
            <div className="space-y-0.5">
              <p className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                Configuración de Eventos
              </p>
              {filteredConfigItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors",
                      isActive
                        ? "bg-secondary text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm leading-none shrink-0">{item.emoji}</span>
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Administración de Sistema (Administrador) */}
          {filteredAdminItems.length > 0 && (
            <div className="space-y-0.5">
              <p className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                Administración General
              </p>
              {filteredAdminItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors",
                      isActive
                        ? "bg-secondary text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm leading-none shrink-0">{item.emoji}</span>
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* Footer actions */}
        <div className="p-2 border-t border-border bg-muted/20">
          <button
            onClick={() => { logout(); navigate("/login"); }}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] text-muted-foreground hover:bg-destructive/5 hover:text-destructive transition-colors w-full text-left font-medium"
          >
            <LogOut size={14} className="shrink-0" />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
});
