import { memo } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Header = memo(function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <header className="border-b bg-card sticky top-0 z-30">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground hidden sm:block">
            {user?.nombre || "Usuario"}
          </h2>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-lg h-8 w-8"
          >
            {theme === "light" ? (
              <Moon size={16} />
            ) : (
              <Sun size={16} className="text-yellow-400" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
});
