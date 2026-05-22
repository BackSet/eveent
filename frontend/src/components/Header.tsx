import { memo, useMemo } from "react";
import { Moon, Sun, ChevronRight } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";

export const Header = memo(function Header() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const breadcrumbs = useMemo(() => {
    const path = location.pathname;
    const segments = [{ label: "🏆 Event", path: "/dashboard" }];

    if (path.startsWith("/dashboard")) {
      segments.push({ label: "Inicio", path: "/dashboard" });
    } else if (path.startsWith("/deportes")) {
      segments.push({ label: "Disciplinas y Posiciones", path: "/deportes" });
    } else if (path.startsWith("/convocatorias")) {
      segments.push({ label: "Explorar Partidos", path: "/convocatorias" });
      if (path.includes("/new")) {
        segments.push({ label: "Nueva Convocatoria", path: path });
      } else if (path.match(/\/convocatorias\/\d+/)) {
        segments.push({ label: "Detalle de Convocatoria", path: path });
      }
    } else if (path.startsWith("/mis-asistencias")) {
      segments.push({ label: "Mis Partidos", path: "/mis-asistencias" });
    } else if (path.startsWith("/perfil")) {
      segments.push({ label: "Mi Perfil", path: "/perfil" });
    } else if (path.startsWith("/usuarios")) {
      segments.push({ label: "Usuarios del Sistema", path: "/usuarios" });
    } else if (path.startsWith("/grupos")) {
      segments.push({ label: "Grupos de Jugadores", path: "/grupos" });
    } else if (path.startsWith("/roles")) {
      segments.push({ label: "Roles y Privilegios", path: "/roles" });
    } else if (path.startsWith("/permisos")) {
      segments.push({ label: "Permisos del Sistema", path: "/permisos" });
    }

    return segments;
  }, [location.pathname]);

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30 h-11.5 flex items-center px-4.5 sm:px-6 justify-between select-none">
      {/* Breadcrumbs path */}
      <div className="flex items-center gap-1.5 text-[13px] font-medium overflow-hidden pl-8 lg:pl-0">
        {breadcrumbs.map((seg, idx) => (
          <div key={seg.path + idx} className="flex items-center gap-1.5 overflow-hidden">
            {idx > 0 && <ChevronRight size={12} className="text-muted-foreground/60 shrink-0" />}
            <span
              className={
                idx === breadcrumbs.length - 1
                  ? "text-foreground font-semibold truncate"
                  : "text-muted-foreground hover:text-foreground cursor-pointer transition-colors truncate"
              }
            >
              {seg.label}
            </span>
          </div>
        ))}
      </div>

      {/* Notion actions: Theme Switch */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-7.5 w-7.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          {theme === "light" ? (
            <Moon size={13} className="text-muted-foreground hover:text-foreground" />
          ) : (
            <Sun size={13} className="text-yellow-400 hover:text-yellow-300" />
          )}
        </Button>
      </div>
    </header>
  );
});
