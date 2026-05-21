import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "@/services/api";
import { formatDateTime } from "@/lib/formatDate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Calendar, MapPin } from "lucide-react";

interface Asistencia {
  id: number;
  convocatoriaId: number;
  convocatoriaTitulo: string;
  estado: string;
  posicionNombre: string | null;
  equipoNombre: string | null;
  fechaRespuesta: string;
}

const estadoColors: Record<string, "default" | "secondary" | "destructive" | "success" | "warning" | "info"> = {
  ASISTIRE: "success",
  NO_ASISTIRE: "destructive",
  PENDIENTE: "warning",
  LISTA_ESPERA: "info",
};

export default function MisAsistenciasPage() {
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAsistencias = useCallback(async () => {
    try {
      const { data } = await api.get("/api/asistencias/mis-asistencias");
      setAsistencias(data);
    } catch (err) {
      console.error("Error al cargar asistencias", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAsistencias();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mis Asistencias</h1>
        <p className="text-muted-foreground">
          Historial de tus respuestas a convocatorias
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {asistencias.map((asis) => (
            <Link key={asis.id} to={`/convocatorias/${asis.convocatoriaId}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">
                      {asis.convocatoriaTitulo}
                    </CardTitle>
                    <Badge variant={estadoColors[asis.estado] || "default"}>
                      {asis.estado}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {asis.posicionNombre && (
                    <p className="text-muted-foreground">
                      Posición: {asis.posicionNombre}
                    </p>
                  )}
                  {asis.equipoNombre && (
                    <p className="text-muted-foreground">
                      Equipo: {asis.equipoNombre}
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    Respondido el{" "}
                      {formatDateTime(asis.fechaRespuesta)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
          {asistencias.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">
                  No has respondido a ninguna convocatoria
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}