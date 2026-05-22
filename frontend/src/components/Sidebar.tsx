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
  const navigate = useNavigate();
  const { hasPermission, user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const filteredItems = useMemo(() => menuItems.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  }), [hasPermission]);

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card border rounded-lg shadow-sm hover:bg-muted transition"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-card border-r transform transition-transform duration-200 lg:transform-none",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="px-5 py-5 border-b">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground">
                <Trophy className="h-4 w-4" />
              </div>
              <span className="font-black text-lg tracking-tight text-primary">Event</span>
            </div>
          </div>

          <div className="px-5 py-3.5 border-b">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center font-bold text-sm text-primary-foreground">
                {user?.nombre?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate">{user?.nombre}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            <p className="px-3 mb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Menú
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
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t">
            <button
              onClick={() => { logout(); navigate("/login"); }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full"
            >
              <LogOut size={16} />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>
    </>
  );
});
