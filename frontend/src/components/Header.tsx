import { Moon, Sun, Bell, Sparkles } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <header className="border-b bg-card/45 backdrop-blur-md sticky top-0 z-30">
      <div className="flex items-center justify-between px-6 py-4.5">
        {/* Left Side: Welcoming & Role Badges */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-1.5">
              ¡Hola, {user?.nombre || "Usuario"}!
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            </h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {user?.roles?.map((role) => (
              <Badge 
                key={role} 
                variant="outline"
                className="bg-primary/5 text-primary border-primary/20 font-bold px-2.5 py-0.5 rounded-lg text-[10px] tracking-wider uppercase"
              >
                {role}
              </Badge>
            ))}
          </div>
        </div>

        {/* Right Side: Quick Actions & Theme Toggles */}
        <div className="flex items-center gap-2">
          {/* Notifications Button */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl relative hover:bg-primary/5 hover:text-primary transition"
          >
            <Bell size={18} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary animate-ping" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary" />
          </Button>

          {/* Theme Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-xl hover:bg-primary/5 hover:text-primary transition-all duration-300"
          >
            {theme === "light" ? (
              <Moon size={18} className="text-foreground" />
            ) : (
              <Sun size={18} className="text-yellow-400" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}