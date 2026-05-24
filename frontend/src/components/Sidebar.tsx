import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Menu, X } from "lucide-react";
import {
  NAV_ADMIN,
  NAV_CONFIG,
  NAV_CONVOCATORIAS,
  NAV_GENERAL,
  type NavItemConfig,
} from "@/lib/iconography";
import { NavIcon } from "@/components/ui/page-icon";
import { cn } from "@/lib/utils";
import { PlayerIdentity } from "@/components/ui/player-identity";
import { useState, useMemo, memo } from "react";

function NavSection({
  title,
  items,
  locationPath,
  onNavigate,
}: {
  title: string;
  items: NavItemConfig[];
  locationPath: string;
  onNavigate: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-0.5">
      <p className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
        {title}
      </p>
      {items.map((item) => {
        const isActive =
          item.path === "/dashboard"
            ? locationPath === item.path
            : locationPath.startsWith(item.path);
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-colors",
              isActive
                ? "bg-secondary text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            )}
          >
            <NavIcon icon={Icon} active={isActive} size={16} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export const Sidebar = memo(function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission, user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const filterByPermission = (items: NavItemConfig[]) =>
    items.filter((item) => !item.permission || hasPermission(item.permission));

  const filteredGeneralItems = useMemo(
    () => filterByPermission(NAV_GENERAL),
    [hasPermission]
  );
  const filteredConfigItems = useMemo(() => filterByPermission(NAV_CONFIG), [hasPermission]);
  const filteredAdminItems = useMemo(() => filterByPermission(NAV_ADMIN), [hasPermission]);

  const closeMobile = () => setIsOpen(false);
  const sidebarBg = "bg-muted/40 dark:bg-card/45 border-r border-border backdrop-blur-md";

  return (
    <>
      <button
        className="lg:hidden fixed top-3 left-3 z-50 p-1.5 bg-card border rounded-md shadow-sm hover:bg-muted transition"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
      >
        {isOpen ? <X size={16} /> : <Menu size={16} />}
      </button>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-40 backdrop-blur-xs"
          onClick={closeMobile}
        />
      )}

      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-60 transform transition-transform duration-200 lg:transform-none flex flex-col h-full",
          sidebarBg,
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2.5 p-1.5 overflow-hidden">
            <div className="flex items-center justify-center h-5.5 w-5.5 rounded bg-primary text-primary-foreground font-black text-xs shrink-0 shadow-sm">
              E
            </div>
            <div className="overflow-hidden text-left">
              <p className="text-sm font-bold truncate text-foreground leading-tight">Event</p>
            </div>
          </div>
        </div>

        <div className="px-3 py-2 border-b border-border bg-muted/50">
          <PlayerIdentity
            nombre={user?.nombre}
            username={user?.username}
            variant="compact"
            className="min-w-0 w-full"
          />
        </div>

        <nav className="flex-1 p-2 space-y-4 overflow-y-auto text-[13px] font-medium">
          <NavSection
            title="Mi espacio"
            items={filteredGeneralItems}
            locationPath={location.pathname}
            onNavigate={closeMobile}
          />
          <NavSection
            title="Encuentros"
            items={NAV_CONVOCATORIAS}
            locationPath={location.pathname}
            onNavigate={closeMobile}
          />
          {filteredConfigItems.length > 0 && (
            <NavSection
              title="Configuración de eventos"
              items={filteredConfigItems}
              locationPath={location.pathname}
              onNavigate={closeMobile}
            />
          )}
          {filteredAdminItems.length > 0 && (
            <NavSection
              title="Administración general"
              items={filteredAdminItems}
              locationPath={location.pathname}
              onNavigate={closeMobile}
            />
          )}
        </nav>

        <div className="p-2 border-t border-border bg-muted/20">
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] text-muted-foreground hover:bg-destructive/5 hover:text-destructive transition-colors w-full text-left font-medium"
          >
            <LogOut size={14} className="shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
});
