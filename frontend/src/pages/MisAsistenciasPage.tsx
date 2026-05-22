import { Link } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { formatDateTime } from "@/lib/formatDate";
import { ESTADO_COLORS, ESTADO_LABELS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Calendar, ArrowRight } from "lucide-react";
import type { Asistencia } from "@/types";

export default function MisAsistenciasPage() {
  const { data: asistencias, loading } = useApi<Asistencia[]>("/api/asistencias/mis-asistencias");

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn pb-12 px-4 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mis Asistencias</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Historial de respuestas a convocatorias
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(asistencias || []).map((asis) => (
            <Link key={asis.id} to={`/convocatorias/${asis.convocatoriaId}`}>
              <Card className="h-full flex flex-col justify-between hover:border-primary/30 transition-colors group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <Badge variant={ESTADO_COLORS[asis.estado] || "default"} className="font-semibold text-[10px] px-2 py-0">
                      {ESTADO_LABELS[asis.estado] || asis.estado}
                    </Badge>
                    {asis.posicionPreferidaNombre && (
                      <Badge variant="outline" className="font-medium text-[9px] px-1.5 py-0 uppercase">
                        {asis.posicionPreferidaNombre}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-sm font-semibold group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                    {asis.convocatoriaTitulo}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-2 pt-0">
                  {asis.bandoNombre && (
                    <p className="text-xs text-muted-foreground">
                      Bando <span className="font-semibold text-foreground">{asis.bandoNombre}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar size={12} />
                    <span>{formatDateTime(asis.fechaRespuesta)}</span>
                  </div>
                </CardContent>

                <div className="px-6 pb-3 pt-1 flex items-center justify-end border-t text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
                  <span className="inline-flex items-center gap-0.5">
                    Ver <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Card>
            </Link>
          ))}

          {(asistencias || []).length === 0 && !loading && (
            <div className="col-span-full text-center py-16 border border-dashed rounded-lg">
              <p className="text-sm text-muted-foreground">Sin asistencias registradas</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
