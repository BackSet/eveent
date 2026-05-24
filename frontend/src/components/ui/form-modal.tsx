import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface FormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel?: string;
  cancelLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  className?: string;
  submitVariant?: "default" | "destructive";
}

export function FormModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  submitLabel = "Guardar",
  cancelLabel = "Cancelar",
  disabled = false,
  loading = false,
  error,
  className,
  submitVariant = "default",
}: FormModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("w-[calc(100vw-2rem)] max-w-[min(100%,28rem)] sm:max-w-md", className)}>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          {error && (
            <Alert variant="destructive" className="mt-3">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <div className="py-4 space-y-4">{children}</div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              variant={submitVariant}
              disabled={disabled || loading}
            >
              {loading ? <Spinner size="sm" /> : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
