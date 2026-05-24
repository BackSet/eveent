import { Skeleton, SkeletonPage } from "@/components/ui/skeleton";
import { DataListShell, DataListHeader, DataListBody, type DataListColumns } from "@/components/ui/data-list";
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

export function PageHeaderSkeleton({
  showActions = true,
  className,
}: {
  showActions?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4 pt-2 gap-4",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Skeleton className="h-11 w-11 rounded-lg shrink-0" />
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton className="h-7 w-56 max-w-full" />
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
      </div>
      {showActions && (
        <div className="flex gap-2 shrink-0">
          <Skeleton className="h-9 w-36" />
        </div>
      )}
    </div>
  );
}

/** @deprecated Use PageHeaderSkeleton */
export const PageCoverHeaderSkeleton = PageHeaderSkeleton;

function DataListRowSkeleton({ columns }: { columns: DataListColumns }) {
  const keys = Object.keys(columns);
  return (
    <div className="px-4 py-3 border-b border-border/50 last:border-0">
      <div className="hidden lg:grid grid-cols-12 gap-3 items-center">
        {keys.map((key) => (
          <Skeleton
            key={key}
            className={cn("h-4", COL_SPAN[columns[key]] ?? "lg:col-span-1")}
          />
        ))}
      </div>
      <div className="lg:hidden space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

export function DataListSkeleton({
  columns,
  labels,
  rowCount = 6,
  showHeader = true,
}: {
  columns: DataListColumns;
  labels: Record<string, string>;
  rowCount?: number;
  showHeader?: boolean;
}) {
  return (
    <DataListShell>
      {showHeader && <DataListHeader columns={columns} labels={labels} />}
      <DataListBody>
        {Array.from({ length: rowCount }).map((_, i) => (
          <DataListRowSkeleton key={i} columns={columns} />
        ))}
      </DataListBody>
    </DataListShell>
  );
}

export function MasterDetailSkeleton({
  leftTitleWidth = "w-40",
  rightRowCount = 5,
}: {
  leftTitleWidth?: string;
  rightRowCount?: number;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-5 border border-border rounded-lg bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <Skeleton className={cn("h-4", leftTitleWidth)} />
        </div>
        <div className="divide-y divide-border/80">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="lg:col-span-7 border border-border rounded-lg bg-card overflow-hidden min-h-[280px]">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex justify-between">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-7 w-24" />
        </div>
        <div className="divide-y divide-border/80">
          {Array.from({ length: rightRowCount }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <Skeleton className="h-3.5 flex-1 max-w-xs" />
              <Skeleton className="h-6 w-16 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ConvocatoriaDetailSkeleton() {
  return (
    <SkeletonPage label="Cargando convocatoria">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-2/3 max-w-md" />
            <Skeleton className="h-4 w-48" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 border-b border-border pb-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-full max-w-[120px]" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30">
              <Skeleton className="h-3 w-40" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="px-4 py-3 flex items-center gap-3 border-b border-border/50 last:border-0"
              >
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 flex-1 max-w-[200px]" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonPage>
  );
}

export function FormPageSkeleton({ fieldCount = 8 }: { fieldCount?: number }) {
  return (
    <SkeletonPage label="Cargando formulario">
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="border border-border rounded-lg bg-card p-6 space-y-5">
        {Array.from({ length: fieldCount }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <div className="flex justify-end gap-2 pt-4">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
    </SkeletonPage>
  );
}

export function CardGridSkeleton({
  count = 4,
  columns = 2,
}: {
  count?: number;
  columns?: 1 | 2 | 3;
}) {
  const gridClass =
    columns === 3
      ? "md:grid-cols-2 lg:grid-cols-3"
      : columns === 1
        ? "grid-cols-1"
        : "md:grid-cols-2";
  return (
    <div className={cn("grid gap-6", gridClass)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border border-border rounded-xl bg-card overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border/50 bg-muted/20 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
          <div className="p-4 space-y-3">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-7 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <SkeletonPage label="Cargando panel">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-border rounded-lg p-4 space-y-2 bg-card">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="border border-border rounded-lg p-4 bg-card space-y-3"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-2/3 max-w-xs" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-8 w-24 shrink-0" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-8 w-28" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}

export function SimplePageSkeleton() {
  return (
    <SkeletonPage className="min-h-[50vh]" label="Cargando página">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72 max-w-full" />
      <div className="border border-border rounded-lg p-6 space-y-4 bg-card">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </SkeletonPage>
  );
}

/** Skeleton compacto para listas inline (deportes, posiciones). */
export function InlineListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 py-2" aria-busy="true" aria-label="Cargando lista">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-1">
          <Skeleton className="h-4 w-4 rounded shrink-0" />
          <Skeleton className="h-4 flex-1 max-w-[200px]" />
        </div>
      ))}
    </div>
  );
}

/** Filas pequeñas para carga lazy en tarjetas (Dashboard asistencias). */
export function PermisosPageSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Cargando permisos">
      {Array.from({ length: 4 }).map((_, m) => (
        <div key={m} className="space-y-3">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="border border-border rounded-lg p-4 bg-card space-y-3"
              >
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-8 w-full mt-2" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RolesGridSkeleton() {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Cargando roles"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="border border-border rounded-lg p-5 bg-card space-y-4"
        >
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function InlineRowsSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="space-y-1.5 py-1" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full max-w-[180px]" />
      ))}
    </div>
  );
}
