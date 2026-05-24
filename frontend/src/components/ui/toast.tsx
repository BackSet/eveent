import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, Info, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "warning" | "info";

interface Toast {
  id: number;
  message: string;
  title?: string;
  variant: ToastVariant;
  duration: number;
}

interface ShowToastOptions {
  title?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  show: (message: string, options?: ShowToastOptions) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, options: ShowToastOptions = {}) => {
      const id = ++toastCounter;
      const variant = options.variant || "info";
      const duration = options.duration ?? (variant === "error" ? 6000 : 4000);
      setToasts((prev) => [
        ...prev,
        { id, message, title: options.title, variant, duration },
      ]);
    },
    []
  );

  const success = useCallback((message: string, title?: string) => show(message, { variant: "success", title }), [show]);
  const error = useCallback((message: string, title?: string) => show(message, { variant: "error", title }), [show]);
  const warning = useCallback((message: string, title?: string) => show(message, { variant: "warning", title }), [show]);
  const info = useCallback((message: string, title?: string) => show(message, { variant: "info", title }), [show]);

  return (
    <ToastContext.Provider value={{ show, success, error, warning, info }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-[100] flex flex-col gap-2 max-w-none sm:max-w-[360px] w-auto sm:w-full pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

const variantStyles: Record<ToastVariant, { bg: string; border: string; icon: ReactNode; iconColor: string }> = {
  success: {
    bg: "bg-[hsl(var(--success-muted))]",
    border: "border-[hsl(var(--success)/0.3)]",
    icon: <CheckCircle2 size={16} />,
    iconColor: "text-tone-success",
  },
  error: {
    bg: "bg-destructive/10 dark:bg-destructive/15",
    border: "border-destructive/30",
    icon: <AlertCircle size={16} />,
    iconColor: "text-destructive",
  },
  warning: {
    bg: "bg-[hsl(var(--warning-muted))]",
    border: "border-[hsl(var(--warning)/0.3)]",
    icon: <AlertTriangle size={16} />,
    iconColor: "text-tone-warning",
  },
  info: {
    bg: "bg-[hsl(var(--info-muted))]",
    border: "border-[hsl(var(--info)/0.3)]",
    icon: <Info size={16} />,
    iconColor: "text-tone-info",
  },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const styles = variantStyles[toast.variant];
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-lg border shadow-lg p-3 backdrop-blur-md animate-fadeIn",
        styles.bg,
        styles.border
      )}
      style={{ animation: "toast-in 0.2s ease-out" }}
    >
      <div className={cn("shrink-0 mt-0.5", styles.iconColor)}>{styles.icon}</div>
      <div className="flex-1 min-w-0 space-y-0.5">
        {toast.title && (
          <p className="text-xs font-bold text-foreground leading-snug">{toast.title}</p>
        )}
        <p className="text-xs text-foreground/85 leading-relaxed break-words">{toast.message}</p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded interactive-hover"
        aria-label="Cerrar notificación"
      >
        <X size={13} />
      </button>
    </div>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast debe usarse dentro de un <ToastProvider>");
  }
  return ctx;
}
