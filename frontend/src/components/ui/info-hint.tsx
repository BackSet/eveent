import { Info, HelpCircle } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface InfoHintProps {
  /** Texto que se muestra en el tooltip. Acepta JSX para resaltar palabras clave. */
  children: ReactNode;
  /** Variante visual del ícono. */
  variant?: "info" | "help";
  /** Tamaño del ícono en pixeles. */
  size?: number;
  /** Posición del tooltip respecto al ícono. */
  side?: "top" | "bottom" | "left" | "right";
  /** Ancho máximo del tooltip en pixeles. */
  maxWidth?: number;
  /** Ancho mínimo del tooltip en pixeles. */
  minWidth?: number;
  className?: string;
}

/**
 * Ícono pequeño con tooltip que explica conceptos complejos al usuario.
 * Úsalo junto a labels o títulos donde el concepto puede no ser obvio
 * (ej. "Matchmaking", "Bando", "Comodín", "Excedente").
 */
export function InfoHint({
  children,
  variant = "info",
  size = 12,
  side = "top",
  maxWidth = 300,
  minWidth = 200,
  className,
}: InfoHintProps) {
  const Icon = variant === "help" ? HelpCircle : Info;

  return (
    <Tooltip content={children} side={side} maxWidth={maxWidth} minWidth={minWidth}>
      <button
        type="button"
        tabIndex={0}
        aria-label="Más información"
        className={cn(
          "inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-help align-middle",
          className
        )}
      >
        <Icon size={size} strokeWidth={2} />
      </button>
    </Tooltip>
  );
}
