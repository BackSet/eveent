import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { User, Mail, ShieldAlert, Sparkles, UserCheck, ShieldCheck } from "lucide-react";

export default function PerfilPage() {
  const { user, login } = useAuth();
  const [formData, setFormData] = useState({
    nombre: user?.nombre || "",
    email: user?.email || "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { data } = await api.put("/api/usuarios/me", formData);
      const updatedUser = { ...user, ...data };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      login(data.email, "");
      setSuccess("Perfil actualizado correctamente");
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al actualizar perfil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl animate-fadeIn">
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary uppercase tracking-wider mb-2">
          <User size={12} />
          Configuración Personal
        </div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Mi Perfil</h1>
        <p className="text-muted-foreground text-sm font-medium mt-0.5">
          Actualiza tu información de cuenta y revisa tus roles asignados
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Avatar Card */}
        <Card className="md:col-span-1 h-fit border border-border shadow-md overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary to-purple-500" />
          <CardContent className="pt-8 flex flex-col items-center text-center space-y-4">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center font-black text-3xl text-white shadow-xl animate-float">
              {user?.nombre?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h3 className="font-extrabold text-foreground text-lg leading-tight">{user?.nombre}</h3>
              <p className="text-xs font-medium text-muted-foreground mt-1">{user?.email}</p>
            </div>
            
            <div className="w-full pt-4 border-t border-border/50 space-y-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Roles Asignados</span>
              <div className="flex flex-wrap justify-center gap-1.5">
                {user?.roles?.map((role) => (
                  <Badge 
                    key={role} 
                    variant="outline"
                    className="bg-primary/5 text-primary border-primary/20 font-bold px-2 py-0.5 rounded-lg text-[9px] uppercase"
                  >
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details Form Card */}
        <Card className="md:col-span-2 border border-border shadow-md">
          <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-bold text-foreground">Información de Usuario</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            {error && (
              <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 animate-pulse-slow">
                <ShieldAlert size={18} className="mt-0.5 shrink-0" />
                <p className="font-medium">{error}</p>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 text-green-600 text-sm bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 animate-pulse-slow">
                <UserCheck size={18} className="mt-0.5 shrink-0" />
                <p className="font-semibold">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="nombre" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Nombre Completo
                </Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground/60">
                    <User size={16} />
                  </span>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Dirección de Correo
                </Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground/60">
                    <Mail size={16} />
                  </span>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={saving} className="glow-btn gap-2 font-bold rounded-xl px-6">
                  {saving ? <Spinner /> : "Guardar Cambios"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Security notice card */}
      <Card className="border border-border shadow-md bg-gradient-to-r from-muted/20 to-primary/5">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="font-extrabold text-foreground text-sm">Cambio de Contraseña Protegido</h4>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                Para cambiar tu credenciales de acceso, debes contactar directamente al Administrador General.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}