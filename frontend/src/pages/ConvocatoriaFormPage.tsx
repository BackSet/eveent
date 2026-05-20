import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft } from "lucide-react";

interface Convocatoria {
  titulo: string;
  descripcion: string;
  deporteId: number;
  fechaHora: string;
  lugar: string;
  estado: string;
  cupoMaximo: number;
  categoria: string;
  fechaLimiteInscripcion: string;
}

interface Deporte {
  id: number;
  nombre: string;
}

const ESTADOS = ["BORRADOR", "ABIERTA", "CERRADA", "CANCELADA"];

export default function ConvocatoriaFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState<Convocatoria>({
    titulo: "",
    descripcion: "",
    deporteId: 0,
    fechaHora: "",
    lugar: "",
    estado: "BORRADOR",
    cupoMaximo: 0,
    categoria: "",
    fechaLimiteInscripcion: "",
  });
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDeportes = async () => {
      try {
        const { data } = await api.get("/api/deportes");
        setDeportes(data);
        if (data.length > 0 && !isEditing) {
          setFormData((prev) => ({ ...prev, deporteId: data[0].id }));
        }
      } catch (err) {
        console.error("Error al cargar deportes", err);
      } finally {
        setLoading(false);
      }
    };

    if (isEditing) {
      const fetchConvocatoria = async () => {
        try {
          const { data } = await api.get(`/api/convocatorias/${id}`);
          const fechaFormateada = new Date(data.fechaHora)
            .toISOString()
            .slice(0, 16);
          setFormData({
            titulo: data.titulo,
            descripcion: data.descripcion || "",
            deporteId: data.deporteId,
            fechaHora: fechaFormateada,
            lugar: data.lugar || "",
            estado: data.estado,
            cupoMaximo: data.cupoMaximo || 0,
            categoria: data.categoria || "",
            fechaLimiteInscripcion: data.fechaLimiteInscripcion ? new Date(data.fechaLimiteInscripcion).toISOString().slice(0, 16) : "",
          });
        } catch (err: any) {
          setError(err.response?.data?.message || "Error al cargar convocatoria");
        } finally {
          setLoading(false);
        }
      };
      fetchConvocatoria();
    } else {
      fetchDeportes();
    }
  }, [id, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...formData,
        fechaHora: new Date(formData.fechaHora).toISOString(),
      };

      if (isEditing) {
        await api.put(`/api/convocatorias/${id}`, payload);
      } else {
        await api.post("/api/convocatorias", payload);
      }
      navigate("/convocatorias");
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al guardar convocatoria");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Button variant="ghost" onClick={() => navigate("/convocatorias")}>
        <ArrowLeft size={16} /> Volver
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing ? "Editar Convocatoria" : "Nueva Convocatoria"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) =>
                  setFormData({ ...formData, titulo: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deporte">Deporte</Label>
              <Select
                value={String(formData.deporteId)}
                onValueChange={(value) =>
                  setFormData({ ...formData, deporteId: Number(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar deporte" />
                </SelectTrigger>
                <SelectContent>
                  {deportes.map((dep) => (
                    <SelectItem key={dep.id} value={String(dep.id)}>
                      {dep.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaHora">Fecha y Hora</Label>
              <Input
                id="fechaHora"
                type="datetime-local"
                value={formData.fechaHora}
                onChange={(e) =>
                  setFormData({ ...formData, fechaHora: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lugar">Lugar</Label>
              <Input
                id="lugar"
                value={formData.lugar}
                onChange={(e) =>
                  setFormData({ ...formData, lugar: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select
                value={formData.estado}
                onValueChange={(value) =>
                  setFormData({ ...formData, estado: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((est) => (
                    <SelectItem key={est} value={est}>
                      {est}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cupoMaximo">Cupo Máximo</Label>
              <Input
                id="cupoMaximo"
                type="number"
                min="0"
                value={formData.cupoMaximo}
                onChange={(e) =>
                  setFormData({ ...formData, cupoMaximo: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria">Categoría</Label>
              <Input
                id="categoria"
                value={formData.categoria}
                onChange={(e) =>
                  setFormData({ ...formData, categoria: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaLimiteInscripcion">Límite de Inscripción</Label>
              <Input
                id="fechaLimiteInscripcion"
                type="datetime-local"
                value={formData.fechaLimiteInscripcion}
                onChange={(e) =>
                  setFormData({ ...formData, fechaLimiteInscripcion: e.target.value })
                }
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? <Spinner /> : isEditing ? "Actualizar" : "Crear"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/convocatorias")}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}