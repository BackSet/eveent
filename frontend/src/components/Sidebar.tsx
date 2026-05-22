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
  Settings,
  Search,
  ChevronDown,
  Sparkles,
  Plus,
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo, memo } from "react";

const generalItems = [
  { icon: LayoutDashboard, label: "Workspace Dashboard", path: "/dashboard", emoji: "🏠" },
  { icon: User, label: "Mi Perfil", path: "/perfil", emoji: "👤" },
  { icon: Users, label: "Mis Asistencias", path: "/mis-asistencias", emoji: "✅" },
];

const convocatoriaItems = [
  { icon: Calendar, label: "Partidos y Eventos", path: "/convocatorias", emoji: "📅" },
];

const adminItems = [
  { icon: Trophy, label: "Deportes", path: "/deportes", permission: "gestionar_deportes", emoji: "⚽" },
  { icon: Shield, label: "Usuarios", path: "/usuarios", permission: "gestionar_usuarios", emoji: "👥" },
  { icon: Users, label: "Grupos", path: "/grupos", permission: "gestionar_usuarios", emoji: "📂" },
  { icon: Settings, label: "Roles", path: "/roles", permission: "gestionar_roles", emoji: "🛡️" },
  { icon: Key, label: "Permisos", path: "/permisos", permission: "ver_permisos", emoji: "🔑" },
];

export const Sidebar = memo(function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission, user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const filteredAdminItems = useMemo(() => adminItems.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  }), [hasPermission]);

  const sidebarBg = "bg-[#f7f7f5] dark:bg-[#1f1f1f] border-r border-[#ededeb] dark:border-[#2e2e2e]";

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
        <div className="p-3 border-b border-[#ededeb] dark:border-[#2e2e2e]">
          <div className="flex items-center justify-between p-1.5 rounded-md hover:bg-[#efebee] dark:hover:bg-[#2c2c2c] transition-colors cursor-pointer group">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex items-center justify-center h-5.5 w-5.5 rounded bg-primary text-primary-foreground font-black text-xs shrink-0 shadow-sm">
                E
              </div>
              <div className="overflow-hidden text-left">
                <p className="text-xs font-semibold text-muted-foreground/80 leading-none">Workspace</p>
                <p className="text-sm font-bold truncate text-foreground leading-tight mt-0.5">Event Premium</p>
              </div>
            </div>
            <ChevronDown size={14} className="text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
          </div>
        </div>

        {/* User Card */}
        <div className="px-4 py-2 flex items-center gap-2 border-b border-[#ededeb] dark:border-[#2e2e2e]/50 bg-[#f1f1ef] dark:bg-[#1a1a1a] text-xs">
          <div className="h-4.5 w-4.5 rounded-full bg-primary flex items-center justify-center font-bold text-[9px] text-primary-foreground shrink-0">
            {user?.nombre?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="font-semibold text-muted-foreground truncate">{user?.email}</span>
        </div>

        {/* Quick Search */}
        <div className="px-3 pt-3">
          <div 
            onClick={() => navigate("/dashboard")}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-[13px] text-muted-foreground hover:bg-[#efebee] dark:hover:bg-[#2c2c2c] hover:text-foreground transition-colors cursor-pointer"
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
            {generalItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors",
                    isActive
                      ? "bg-[#efebee] dark:bg-[#2c2c2c] text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-[#efebee]/60 dark:hover:bg-[#2c2c2c]/60 hover:text-foreground"
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
              Eventos
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
                      ? "bg-[#efebee] dark:bg-[#2c2c2c] text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-[#efebee]/60 dark:hover:bg-[#2c2c2c]/60 hover:text-foreground"
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

          {/* Administration Section */}
          {filteredAdminItems.length > 0 && (
            <div className="space-y-0.5">
              <p className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                Administración
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
                        ? "bg-[#efebee] dark:bg-[#2c2c2c] text-foreground font-semibold"
                        : "text-muted-foreground hover:bg-[#efebee]/60 dark:hover:bg-[#2c2c2c]/60 hover:text-foreground"
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
        <div className="p-2 border-t border-[#ededeb] dark:border-[#2e2e2e] bg-[#f1f1ef]/30 dark:bg-[#1a1a1a]/30">
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
