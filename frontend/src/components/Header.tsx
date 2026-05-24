import { memo, useMemo } from "react";
import { Moon, Sun, Laptop, ChevronRight } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";

export const Header = memo(function Header() {
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const breadcrumbs = useMemo(() => {
    const path = location.pathname;
    const segments = [{ label: "🏆 Event Workspace", path: "/dashboard" }];

    if (path.startsWith("/dashboard")) {
      segments.push({ label: "Workspace Dashboard", path: "/dashboard" });
    } else if (path.startsWith("/deportes")) {
      segments.push({ label: "Disciplinas Deportivas", path: "/deportes" });
    } else if (path.startsWith("/convocatorias")) {
      segments.push({ label: "Convocatorias y Eventos", path: "/convocatorias" });
      if (path.includes("/new")) {
        segments.push({ label: "Nueva Convocatoria", path: path });
      } else if (path.match(/\/convocatorias\/\d+/)) {
        segments.push({ label: "Detalle de Convocatoria", path: path });
      }
    } else if (path.startsWith("/mis-asistencias")) {
      segments.push({ label: "Mis Asistencias", path: "/mis-asistencias" });
    } else if (path.startsWith("/perfil")) {
      segments.push({ label: "Mi Perfil Personal", path: "/perfil" });
    } else if (path.startsWith("/usuarios")) {
      segments.push({ label: "Control de Usuarios", path: "/usuarios" });
    } else if (path.startsWith("/grupos")) {
      segments.push({ label: "Gestión de Grupos", path: "/grupos" });
    } else if (path.startsWith("/roles")) {
      segments.push({ label: "Roles del Sistema", path: "/roles" });
    } else if (path.startsWith("/permisos")) {
      segments.push({ label: "Matriz de Permisos", path: "/permisos" });
    }

    return segments;
  }, [location.pathname]);

  return (
    <header className="border-b border-[#ededeb] dark:border-[#2e2e2e] bg-background/80 backdrop-blur-md sticky top-0 z-30 h-11.5 flex items-center px-4.5 sm:px-6 justify-between select-none">
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

      {/* Notion actions: Share, Favorite, Theme Switch */}
      <div className="flex items-center gap-1 shrink-0">


        <Button
          variant="ghost"
          size="icon"
          onClick={cycleTheme}
          className="h-7.5 w-7.5 rounded-md hover:bg-muted transition-colors"
          title={`Tema: ${theme === "light" ? "Claro" : theme === "dark" ? "Oscuro" : "Sistema"}`}
        >
          {theme === "light" && <Sun size={13} className="text-amber-500 hover:text-amber-600" />}
          {theme === "dark" && <Moon size={13} className="text-muted-foreground hover:text-foreground" />}
          {theme === "system" && <Laptop size={13} className="text-blue-500 hover:text-blue-600" />}
        </Button>
      </div>
    </header>
  );
});
