import { cn } from "@/lib/utils";

interface FieldErrorProps {
  id?: string;
  message?: string | null;
  className?: string;
}

export function FieldError({ id, message, className }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className={cn("text-[11px] text-destructive font-medium mt-1", className)}>
      {message}
    </p>
  );
}
