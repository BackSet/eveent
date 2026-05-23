import { useState, useEffect, useCallback } from "react";
import api from "@/services/api";
import { getApiErrorMessage } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Users, Search, Shirt, Shield, MapPin, Calendar } from "lucide-react";
import { formatDateTime } from "@/lib/formatDate";

interface PosicionDto {
  posicionId: number;
  posicionNombre: string;
  posicionAbreviatura: string;
  deporteId: number;
  deporteNombre: string;
  prioridad: number;
}

interface GrupoMiembro {
  id: number;
  nombre: string;
  email: string;
  numeroCamiseta?: number;
  posiciones: PosicionDto[];
}

interface Grupo {
  id: number;
  nombre: string;
  descripcion: string;
  creadoPorId: number;
  creadoPorNombre: string;
  fechaCreacion: string;
  miembroIds: number[];
  miembroNombres: string[];
  miembros?: GrupoMiembro[];
}

export default function MisGruposPage() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMemberQuery, setSearchMemberQuery] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get("/api/grupos");
      setGrupos(res.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || "Error al cargar tus grupos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter groups
  const filteredGrupos = grupos.filter(
    (g) =>
      g.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.descripcion && g.descripcion.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn pb-12 px-4 sm:px-6">
      {/* Cover / Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5 pt-2 gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20 shrink-0 shadow-xs">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Mis Grupos</h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              Consulta las agrupaciones a las que perteneces, tus compañeros y sus roles tácticos.
            </p>
          </div>
        </div>

        {/* Search Input for Groups */}
        <div className="relative w-full sm:w-72 shrink-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border rounded-md"
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-destructive/20 bg-destructive/5 text-destructive rounded-lg shadow-none">
          <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-9 w-9" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredGrupos.map((grupo) => (
            <Card key={grupo.id} className="border border-border/80 bg-card rounded-xl overflow-hidden shadow-none flex flex-col justify-between hover:border-muted-foreground/35 transition-colors">
              <div>
                <CardHeader className="pb-3 border-b border-border/50 bg-secondary/5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-sm font-bold text-foreground tracking-tight leading-tight">
                        {grupo.nombre}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground/90 font-medium line-clamp-2 leading-relaxed">
                        {grupo.descripcion || "Sin descripción disponible"}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="px-2 py-0.5 text-[9px] font-bold tracking-wider shrink-0 bg-primary/10 text-primary border border-primary/20 rounded shadow-none uppercase">
                      {grupo.miembros?.length || 0} MIEMBROS
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-muted-foreground/80 font-semibold border-b border-border/30 pb-3">
                    <div className="flex items-center gap-1">
                      <Shield size={11} className="text-primary/70" />
                      <span>Creado por: <span className="text-foreground">{grupo.creadoPorNombre}</span></span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={11} className="text-primary/70" />
                      <span>Desde: <span className="text-foreground">{formatDateTime(grupo.fechaCreacion)}</span></span>
                    </div>
                  </div>

                  {/* Members Directory */}
                  <div className="space-y-2.5">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Integrantes del Equipo</h4>
                    
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {(!grupo.miembros || grupo.miembros.length === 0) ? (
                        <p className="text-xs text-muted-foreground italic py-3 text-center">No hay miembros registrados.</p>
                      ) : (
                        grupo.miembros.map((miembro) => (
                          <div
                            key={miembro.id}
                            className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-secondary/5 hover:bg-secondary/15 hover:border-border transition-colors gap-3"
                          >
                            {/* Avatar and Name */}
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center font-bold text-xs text-primary border border-primary/15 shrink-0 select-none shadow-2xs">
                                {miembro.nombre.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-bold text-foreground truncate leading-none">
                                    {miembro.nombre}
                                  </span>
                                  {miembro.numeroCamiseta !== undefined && miembro.numeroCamiseta !== null && (
                                    <Badge variant="outline" className="h-4.5 px-1 py-0 text-[8px] font-mono font-bold leading-none bg-background text-foreground/80 border-border rounded flex items-center gap-0.5 shadow-3xs">
                                      <Shirt size={8} className="text-muted-foreground" />
                                      <span>{miembro.numeroCamiseta}</span>
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-[9px] text-muted-foreground truncate block mt-0.5 font-medium leading-none">
                                  {miembro.email}
                                </span>
                              </div>
                            </div>

                            {/* Preferred Positions */}
                            <div className="flex flex-wrap justify-end gap-1 max-w-[150px] shrink-0">
                              {miembro.posiciones && miembro.posiciones.length > 0 ? (
                                miembro.posiciones.map((pos) => (
                                  <Badge
                                    key={pos.posicionId}
                                    variant="outline"
                                    className="px-1.5 py-0 text-[8px] font-extrabold uppercase tracking-wide bg-background border-border text-foreground/90 rounded-sm shadow-3xs"
                                  >
                                    {pos.posicionAbreviatura || pos.posicionNombre}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-[8px] text-muted-foreground italic font-medium">Sin posiciones</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}

          {filteredGrupos.length === 0 && !loading && (
            <div className="col-span-full border border-dashed border-border rounded-xl p-12 text-center bg-card">
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-xs font-bold text-foreground">Sin Grupos Encontrados</h3>
              <p className="text-[11px] text-muted-foreground mt-1">
                {searchQuery ? "Prueba ajustando los términos de tu búsqueda." : "No perteneces a ningún grupo en el sistema."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
