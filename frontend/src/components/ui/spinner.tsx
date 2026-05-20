import * as React from "react";
import { cn } from "@/lib/utils";

function Spinner({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent", className)}
      {...props}
    />
  );
}

export { Spinner };