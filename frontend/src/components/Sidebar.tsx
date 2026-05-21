import { Link, useLocation } from "react-router-dom";
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
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo, memo } from "react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Trophy, label: "Deportes", path: "/deportes", permission: "gestionar_deportes" },
  { icon: Calendar, label: "Convocatorias", path: "/convocatorias" },
  { icon: Users, label: "Mis Asistencias", path: "/mis-asistencias" },
  { icon: User, label: "Mi Perfil", path: "/perfil" },
  { icon: Shield, label: "Usuarios", path: "/usuarios", permission: "gestionar_usuarios" },
  { icon: Users, label: "Grupos", path: "/grupos", permission: "gestionar_usuarios" },
  { icon: Settings, label: "Roles", path: "/roles", permission: "gestionar_roles" },
  { icon: Key, label: "Permisos", path: "/permisos", permission: "ver_permisos" },
];

export const Sidebar = memo(function Sidebar() {
  const location = useLocation();
  const { hasPermission, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const filteredItems = useMemo(() => menuItems.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  }), [hasPermission]);

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-card/85 backdrop-blur-md border rounded-xl shadow-lg hover:bg-accent transition"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={20} className="text-foreground" /> : <Menu size={20} className="text-foreground" />}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-68 bg-card/80 backdrop-blur-md border-r transform transition-all duration-300 ease-in-out lg:transform-none",
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo / Header */}
          <div className="p-6 border-b flex items-center gap-3">
            <div className="flex items-center justify-center p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-gradient font-black text-xl tracking-tight">Event</span>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mt-[-2px]">
                Gestión Deportiva
              </p>
            </div>
          </div>

          {/* User Preview */}
          <div className="px-6 py-4 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center font-bold text-white shadow-md">
                {user?.nombre?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate text-foreground">{user?.nombre}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <p className="px-3 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Menú Principal
            </p>
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.path === "/dashboard"
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 relative group overflow-hidden",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 glow-btn"
                      : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                  )}
                >
                  <Icon size={18} className={cn("transition-transform group-hover:scale-110", isActive ? "text-white" : "text-muted-foreground group-hover:text-primary")} />
                  {item.label}
                  {isActive && (
                    <span className="absolute right-0 top-1/4 bottom-1/4 w-1 rounded-l-full bg-white animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer - Log Out */}
          <div className="p-4 border-t bg-muted/10">
            <Link
              to="/login"
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-300 group"
            >
              <LogOut size={18} className="transition-transform group-hover:-translate-x-1" />
              Cerrar Sesión
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
});