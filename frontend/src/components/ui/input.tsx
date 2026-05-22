import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9.5 w-full rounded-md border border-border bg-background/50 px-3 py-1.5 text-[13.5px] font-medium placeholder:text-muted-foreground/40 hover:bg-accent/15 focus:bg-background focus:border-primary/60 focus:ring-2 focus:ring-primary/10 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };