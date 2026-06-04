import { memo, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Moon, Sun, Laptop, ChevronRight, Trophy } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { getBreadcrumbIcon } from "@/lib/iconography";
import { NavIcon } from "@/components/ui/page-icon";

type CrumbSegment = { label: string; path: string; icon?: typeof Trophy | null };

export const Header = memo(function Header() {
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const breadcrumbs = useMemo((): CrumbSegment[] => {
    const path = location.pathname;
    const segments: CrumbSegment[] = [
      { label: "Event", path: "/dashboard", icon: Trophy },
    ];

    const push = (label: string, segmentPath: string) => {
      segments.push({ label, path: segmentPath, icon: getBreadcrumbIcon(segmentPath) });
    };

    if (path.startsWith("/dashboard")) {
      push("Inicio", "/dashboard");
    } else if (path.startsWith("/deportes")) {
      push("Disciplinas", "/deportes");
    } else if (path.startsWith("/convocatorias")) {
      push("Convocatorias", "/convocatorias");
      if (path.includes("/recurrentes/new")) {
        push("Nueva regla", path);
      } else if (path.match(/\/convocatorias\/recurrentes\/\d+\/edit/)) {
        push("Editar regla", path);
      } else if (path.includes("/new")) {
        push("Nueva convocatoria", path);
      } else if (path.match(/\/convocatorias\/\d+\/edit/)) {
        push("Editar", path);
      } else if (path.match(/\/convocatorias\/\d+/)) {
        push("Detalle", path);
      }
    } else if (path.startsWith("/mis-asistencias")) {
      push("Mis asistencias", "/mis-asistencias");
    } else if (path.startsWith("/mis-grupos")) {
      push("Mis grupos", "/mis-grupos");
    } else if (path.startsWith("/perfil")) {
      push("Mi perfil", "/perfil");
    } else if (path.startsWith("/usuarios")) {
      push("Usuarios", "/usuarios");
    } else if (path.startsWith("/grupos")) {
      push("Grupos", "/grupos");
    } else if (path.startsWith("/roles")) {
      push("Roles", "/roles");
    } else if (path.startsWith("/permisos")) {
      push("Permisos", "/permisos");
    }

    return segments;
  }, [location.pathname]);

  type RenderCrumb = CrumbSegment | null;

  const mobileCrumbs = useMemo((): RenderCrumb[] => {
    if (breadcrumbs.length <= 2) return breadcrumbs;
    return [breadcrumbs[0], null, breadcrumbs[breadcrumbs.length - 1]];
  }, [breadcrumbs]);

  const renderCrumbs = (crumbs: RenderCrumb[]) =>
    crumbs.map((seg, idx) => {
      if (seg === null) {
        return (
          <div key="ellipsis" className="flex items-center gap-1.5 shrink-0">
            <ChevronRight size={12} className="text-muted-foreground/60 shrink-0" />
            <span className="text-muted-foreground">…</span>
          </div>
        );
      }
      const isLast = idx === crumbs.length - 1;
      const Icon = seg.icon;
      return (
        <div key={seg.path + idx} className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          {idx > 0 && (
            <ChevronRight size={12} className="text-muted-foreground/60 shrink-0" />
          )}
          {isLast ? (
            <span className="text-foreground font-semibold truncate flex items-center gap-1.5">
              {Icon && <NavIcon icon={Icon} active size={14} className="text-foreground" />}
              {seg.label}
            </span>
          ) : (
            <Link
              to={seg.path}
              className="text-muted-foreground hover:text-foreground transition-colors truncate flex items-center gap-1.5"
            >
              {Icon && <NavIcon icon={Icon} size={14} />}
              {seg.label}
            </Link>
          )}
        </div>
      );
    });

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30 min-h-11 flex items-center px-3 sm:px-6 justify-between gap-2 select-none">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px] font-medium overflow-hidden pl-10 sm:pl-8 lg:pl-0">
        <span className="lg:hidden flex items-center gap-1.5 min-w-0 overflow-hidden">
          {renderCrumbs(mobileCrumbs)}
        </span>
        <span className="hidden lg:flex items-center gap-1.5 min-w-0 overflow-hidden">
          {renderCrumbs(breadcrumbs)}
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={cycleTheme}
          className="touch-target h-9 w-9 sm:h-7.5 sm:w-7.5 rounded-md interactive-hover transition-colors"
          title={`Tema: ${theme === "light" ? "Claro" : theme === "dark" ? "Oscuro" : "Sistema"}`}
        >
          {theme === "light" && <Sun size={13} className="text-warning" />}
          {theme === "dark" && <Moon size={13} className="text-muted-foreground hover:text-foreground" />}
          {theme === "system" && <Laptop size={13} className="text-info" />}
        </Button>
      </div>
    </header>
  );
});
