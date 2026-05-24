import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const COL_SPAN: Record<number, string> = {
  1: "lg:col-span-1",
  2: "lg:col-span-2",
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  5: "lg:col-span-5",
  6: "lg:col-span-6",
  7: "lg:col-span-7",
  8: "lg:col-span-8",
  9: "lg:col-span-9",
  10: "lg:col-span-10",
  11: "lg:col-span-11",
  12: "lg:col-span-12",
};

/** Column spans for lg+ grid (must sum to 12). */
export type DataListColumns = Record<string, number>;

export type DataListCellPriority = "primary" | "secondary" | "detail";

function isDataListCell(
  child: React.ReactNode
): child is React.ReactElement<DataListCellProps> {
  return React.isValidElement(child) && child.type === DataListCell;
}

function isDataListActions(
  child: React.ReactNode
): child is React.ReactElement<DataListActionsProps> {
  return React.isValidElement(child) && child.type === DataListActions;
}

export function DataListShell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "border border-border rounded-lg bg-card overflow-hidden",
        className
      )}
    >
      <div className="lg:overflow-x-auto">
        <div className="lg:min-w-[720px]">{children}</div>
      </div>
    </div>
  );
}

export function DataListHeader({
  columns,
  labels,
  className,
}: {
  columns: DataListColumns;
  labels: Record<string, string>;
  className?: string;
}) {
  const keys = Object.keys(columns);
  return (
    <div
      className={cn(
        "hidden lg:grid grid-cols-12 gap-3 px-4 py-2 border-b border-border bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none",
        className
      )}
    >
      {keys.map((key, i) => (
        <div
          key={key}
          className={cn(
            COL_SPAN[columns[key]] ?? "lg:col-span-1",
            i === keys.length - 1 && "text-right"
          )}
        >
          {labels[key] ?? key}
        </div>
      ))}
    </div>
  );
}

export function DataListBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("divide-y divide-border/80", className)}>{children}</div>
  );
}

export function DataListSection({
  title,
  count,
  collapsible,
  collapsed,
  onToggleCollapse,
  children,
}: {
  title: string;
  count: number;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  children: React.ReactNode;
}) {
  const headerContent = (
    <>
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </span>
      <span className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground">
        {count}
        {collapsible &&
          (collapsed ? (
            <ChevronRight size={12} className="opacity-70" />
          ) : (
            <ChevronDown size={12} className="opacity-70" />
          ))}
      </span>
    </>
  );

  return (
    <div>
      {collapsible ? (
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border/60 bg-muted/25 text-left hover:bg-muted/40 transition-colors touch-target min-h-11"
          onClick={onToggleCollapse}
        >
          {headerContent}
        </button>
      ) : (
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border/60 bg-muted/25">
          {headerContent}
        </div>
      )}
      {!collapsed && children}
    </div>
  );
}

type DataListRowProps = {
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
};

export function DataListRow({ onClick, className, children }: DataListRowProps) {
  const items = React.Children.toArray(children);
  const primary: React.ReactNode[] = [];
  const secondary: React.ReactNode[] = [];
  const detail: React.ReactNode[] = [];
  let actions: React.ReactNode = null;

  items.forEach((child) => {
    if (isDataListActions(child)) {
      actions = child;
      return;
    }
    if (isDataListCell(child)) {
      const p = child.props.priority ?? "secondary";
      if (p === "primary") primary.push(child);
      else if (p === "detail") detail.push(child);
      else secondary.push(child);
      return;
    }
    secondary.push(child);
  });

  const rowProps = {
    role: onClick ? ("button" as const) : undefined,
    tabIndex: onClick ? 0 : undefined,
    onClick,
    onKeyDown: onClick
      ? (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }
      : undefined,
  };

  const interactive = onClick ? "cursor-pointer group" : "";

  return (
    <>
      <div
        {...rowProps}
        className={cn(
          "lg:hidden px-4 py-3.5 hover:bg-muted/40 transition-colors",
          interactive,
          className
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1.5">{primary}</div>
          {actions}
        </div>
        {secondary.length > 0 && (
          <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border/50 pt-2.5">
            {secondary}
          </div>
        )}
        {detail.length > 0 && (
          <div className="hidden sm:block mt-2 border-t border-border/50 pt-2 space-y-2">
            {detail}
          </div>
        )}
      </div>

      <div
        {...rowProps}
        className={cn(
          "hidden lg:grid lg:grid-cols-12 lg:gap-3 lg:items-center px-4 py-3.5 hover:bg-muted/40 transition-colors",
          interactive,
          className
        )}
      >
        {children}
      </div>
    </>
  );
}

type DataListCellProps = {
  label: string;
  span?: number;
  align?: "left" | "right";
  priority?: DataListCellPriority;
  className?: string;
  children: React.ReactNode;
};

export function DataListCell({
  label,
  span = 1,
  align = "left",
  priority = "secondary",
  className,
  children,
}: DataListCellProps) {
  const showLabel = priority !== "primary";

  return (
    <div
      data-priority={priority}
      className={cn(
        COL_SPAN[span] ?? "lg:col-span-1",
        align === "right" && "lg:text-right",
        priority === "detail" && "hidden sm:block lg:block",
        className
      )}
    >
      {showLabel && (
        <span className="lg:hidden text-[9px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
          {label}
        </span>
      )}
      {children}
    </div>
  );
}

type DataListActionsProps = {
  span?: number;
  className?: string;
  children: React.ReactNode;
};

export function DataListActions({
  span = 2,
  className,
  children,
}: DataListActionsProps) {
  return (
    <div
      className={cn(
        COL_SPAN[span] ?? "lg:col-span-2",
        "flex shrink-0 items-center justify-end gap-1 flex-wrap",
        className
      )}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <span className="sr-only lg:not-sr-only lg:hidden">Acciones</span>
      <div className="flex items-center gap-1 flex-wrap [&_button]:touch-target [&_button]:h-9 [&_button]:w-9 sm:[&_button]:h-8 sm:[&_button]:w-8">
        {children}
      </div>
    </div>
  );
}
