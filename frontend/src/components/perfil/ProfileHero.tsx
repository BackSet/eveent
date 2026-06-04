import { Badge } from "@/components/ui/badge";
import { Hash, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

function initialsFromName(nombre?: string | null): string {
  if (!nombre?.trim()) return "?";
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

type ProfileHeroProps = {
  nombre?: string | null;
  username?: string | null;
  email?: string | null;
  numeroCamiseta?: string | null;
  roles?: string[];
  className?: string;
};

export function ProfileHero({
  nombre,
  username,
  email,
  numeroCamiseta,
  roles = [],
  className,
}: ProfileHeroProps) {
  const cleanUsername = username?.trim().replace(/^@/, "");
  const dorsal = numeroCamiseta?.trim();

  return (
    <section
      className={cn(
        "relative rounded-xl border border-border bg-card overflow-hidden shadow-sm shadow-black/5",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/15 to-transparent pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row gap-5 sm:items-center px-5 sm:px-6 py-5">
        <div
          className="flex h-16 w-16 sm:h-18 sm:w-18 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-xl font-bold text-primary shadow-inner"
          aria-hidden
        >
          {initialsFromName(nombre)}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="space-y-0.5 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
              {nombre || "Usuario"}
            </h2>
            {cleanUsername && (
              <p className="text-xs font-semibold text-muted-foreground truncate">
                @{cleanUsername}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {email && (
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <Mail size={12} className="shrink-0" aria-hidden />
                <span className="truncate font-medium text-foreground/90">{email}</span>
              </span>
            )}
            {dorsal && (
              <span className="inline-flex items-center gap-1.5">
                <Hash size={12} className="shrink-0 text-primary" aria-hidden />
                <span className="font-semibold tabular-nums text-foreground">{dorsal}</span>
                <span className="text-[10px] uppercase tracking-wider">Dorsal</span>
              </span>
            )}
          </div>
        </div>

        {roles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:max-w-[240px] sm:justify-end">
            {roles.map((role) => (
              <Badge
                key={role}
                variant="outline"
                className="text-[9px] uppercase px-2 py-0.5 font-semibold tracking-wide bg-background/80 border-border"
              >
                {role}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
