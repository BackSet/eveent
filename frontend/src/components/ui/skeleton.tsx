import * as React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("skeleton", className)}
      aria-hidden
      {...props}
    />
  );
}

export function SkeletonPage({
  className,
  label = "Cargando contenido",
  children,
}: {
  className?: string;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("page-shell space-y-6", className)}
      aria-busy="true"
      aria-label={label}
    >
      {children}
    </div>
  );
}
