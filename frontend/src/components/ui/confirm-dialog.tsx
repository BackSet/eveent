import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ConfirmVariant = "danger" | "warning" | "info" | "default";

interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  icon?: ReactNode;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const handleClose = (result: boolean) => {
    if (pending) {
      pending.resolve(result);
      setPending(null);
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) handleClose(false);
        }}
      >
        <DialogContent className="bg-popover border border-border shadow-lg rounded-lg w-[calc(100vw-2rem)] max-w-[min(100%,26.25rem)] sm:max-w-md p-5 space-y-4">
          {pending && (
            <>
              <DialogHeader className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <VariantIcon variant={pending.variant || "default"} customIcon={pending.icon} />
                  <DialogTitle className="text-sm font-bold tracking-tight">
                    {pending.title}
                  </DialogTitle>
                </div>
                {pending.description && (
                  <DialogDescription className="text-xs text-muted-foreground leading-relaxed pl-9">
                    {pending.description}
                  </DialogDescription>
                )}
              </DialogHeader>

              <DialogFooter className="gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleClose(false)}
                  className="h-8 text-xs font-semibold px-3 border-border hover:bg-secondary shadow-none"
                >
                  {pending.cancelLabel ?? "Cancelar"}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleClose(true)}
                  className={cn(
                    "h-8 text-xs font-semibold px-3 shadow-none",
                    pending.variant === "danger"
                      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      : pending.variant === "warning"
                      ? "bg-warning text-white hover:bg-warning/90"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {pending.confirmLabel ?? "Confirmar"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

function VariantIcon({ variant, customIcon }: { variant: ConfirmVariant; customIcon?: ReactNode }) {
  if (customIcon) {
    return <div className="h-6.5 w-6.5 shrink-0 flex items-center justify-center rounded-md bg-secondary text-foreground">{customIcon}</div>;
  }

  switch (variant) {
    case "danger":
      return (
        <div className="h-6.5 w-6.5 shrink-0 flex items-center justify-center rounded-md bg-destructive/10 text-destructive">
          <AlertTriangle size={14} />
        </div>
      );
    case "warning":
      return (
        <div className="h-6.5 w-6.5 shrink-0 flex items-center justify-center rounded-md bg-[hsl(var(--warning-muted))] text-tone-warning">
          <AlertTriangle size={14} />
        </div>
      );
    case "info":
      return (
        <div className="h-6.5 w-6.5 shrink-0 flex items-center justify-center rounded-md bg-[hsl(var(--info-muted))] text-tone-info">
          <Info size={14} />
        </div>
      );
    default:
      return (
        <div className="h-6.5 w-6.5 shrink-0 flex items-center justify-center rounded-md bg-secondary text-foreground">
          <HelpCircle size={14} />
        </div>
      );
  }
}

export function useConfirm(): ConfirmContextType["confirm"] {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm debe usarse dentro de un <ConfirmDialogProvider>");
  }
  return ctx.confirm;
}
