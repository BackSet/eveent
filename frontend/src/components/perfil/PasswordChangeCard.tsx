import { useState } from "react";
import { Lock } from "lucide-react";
import api from "@/services/api";
import { getApiErrorMessage } from "@/lib/constants";
import { validatePassword, validatePasswordMatch } from "@/lib/formValidation";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { PasswordInput } from "@/components/ui/password-input";
import { ProfileSectionCard } from "@/components/perfil/ProfileSectionCard";

/**
 * Tarjeta de cambio de contraseña. Gestiona su propio estado (formulario, errores,
 * guardado) ya que es independiente del resto del perfil: sólo llama a
 * POST /api/usuarios/me/password.
 */
export function PasswordChangeCard() {
  const toast = useToast();
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const passErr = validatePassword(passwordForm.newPassword);
    const matchErr = validatePasswordMatch(passwordForm.newPassword, passwordForm.confirmPassword);
    if (!passwordForm.currentPassword) {
      setPasswordError("La contraseña actual es obligatoria.");
      return;
    }
    if (passErr || matchErr) {
      setPasswordError(passErr || matchErr || "");
      return;
    }
    setSavingPassword(true);
    setPasswordError("");
    setPasswordSuccess("");
    try {
      await api.post("/api/usuarios/me/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordSuccess("Contraseña actualizada correctamente.");
      toast.success("Contraseña actualizada", "Usa la nueva contraseña en tu próximo inicio de sesión.");
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err) || "Error al cambiar la contraseña";
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <ProfileSectionCard
      title="Seguridad"
      description="Actualiza tu contraseña de acceso al workspace."
      icon={Lock}
    >
      {passwordError && (
        <div className="notion-callout border-destructive/20 bg-destructive/5 text-destructive p-3 mb-4 text-xs font-medium">
          {passwordError}
        </div>
      )}
      {passwordSuccess && (
        <div className="notion-callout tone-success p-3 mb-4 text-xs font-medium">
          {passwordSuccess}
        </div>
      )}
      <form onSubmit={handleSubmitPassword} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="currentPassword" className="text-xs font-semibold text-muted-foreground">
            Contraseña actual
          </Label>
          <PasswordInput
            id="currentPassword"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            autoComplete="current-password"
            className="h-9 text-xs"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="newPassword" className="text-xs font-semibold text-muted-foreground">
            Nueva contraseña
          </Label>
          <PasswordInput
            id="newPassword"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            autoComplete="new-password"
            minLength={6}
            className="h-9 text-xs"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-xs font-semibold text-muted-foreground">
            Confirmar nueva
          </Label>
          <PasswordInput
            id="confirmPassword"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            autoComplete="new-password"
            className="h-9 text-xs"
            required
          />
        </div>
        <div className="flex justify-end pt-1 border-t border-border/60">
          <Button type="submit" disabled={savingPassword} className="mt-4 h-9 px-5 text-xs font-semibold shadow-none">
            {savingPassword ? <Spinner size="sm" /> : "Actualizar contraseña"}
          </Button>
        </div>
      </form>
    </ProfileSectionCard>
  );
}
