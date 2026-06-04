import { cn } from "@/lib/utils";
import { UserRoundPlus } from "lucide-react";

export type PlayerIdentityVariant = "compact" | "lineup" | "card" | "list" | "profile" | "chip";

export interface PlayerIdentityProps {
  nombre?: string | null;
  username?: string | null;
  nombreExterno?: string | null;
  invitadoPorNombre?: string | null;
  /** Correo u otro detalle terciario (listas de miembros) */
  email?: string | null;
  variant?: PlayerIdentityVariant;
  /** @deprecated Usa variant="compact" */
  size?: "sm" | "md";
  /** @deprecated Usa variant="profile" */
  layout?: "inline" | "stacked";
  className?: string;
}

interface ResolvedIdentity {
  username?: string;
  guestLabel?: string;
  fullName?: string;
  invitedBy?: string;
  fallbackLabel: string;
}

function resolveIdentity(props: PlayerIdentityProps): ResolvedIdentity {
  const { nombre, username, nombreExterno, invitadoPorNombre } = props;
  const cleanUsername = username?.trim().replace(/^@/, "");
  const cleanNombre = nombre?.trim();
  const cleanExterno = nombreExterno?.trim();
  const cleanInvitador = invitadoPorNombre?.trim();

  if (cleanUsername) {
    const fullName =
      cleanNombre && cleanNombre.toLowerCase() !== cleanUsername.toLowerCase()
        ? cleanNombre
        : cleanExterno && cleanExterno !== cleanUsername
          ? cleanExterno
          : undefined;

    return {
      username: cleanUsername,
      fullName,
      invitedBy: cleanInvitador || undefined,
      fallbackLabel: cleanNombre || cleanExterno || cleanUsername,
    };
  }

  if (cleanExterno) {
    return {
      guestLabel: cleanExterno,
      fullName:
        cleanNombre && cleanNombre.toLowerCase() !== cleanExterno.toLowerCase()
          ? cleanNombre
          : undefined,
      invitedBy: cleanInvitador || undefined,
      fallbackLabel: cleanExterno,
    };
  }

  if (cleanNombre) {
    return {
      fullName: cleanNombre,
      invitedBy: cleanInvitador || undefined,
      fallbackLabel: cleanNombre,
    };
  }

  return { fallbackLabel: "Sin identificar" };
}

function resolveVariant(props: PlayerIdentityProps): PlayerIdentityVariant {
  if (props.variant) return props.variant;
  if (props.layout === "stacked") return "profile";
  if (props.size === "md") return "lineup";
  return "compact";
}

/** Etiqueta compacta para chips y resúmenes */
export function PlayerIdentityChip({
  nombre,
  username,
  nombreExterno,
  invitadoPorNombre,
  className,
}: Omit<PlayerIdentityProps, "variant" | "size" | "layout" | "email">) {
  const data = resolveIdentity({
    nombre,
    username,
    nombreExterno,
    invitadoPorNombre,
  });

  return (
    <span
      className={cn("player-identity-chip", className)}
      title={[data.username && `@${data.username}`, data.fullName, data.invitedBy && `Invitado por ${data.invitedBy}`]
        .filter(Boolean)
        .join(" · ")}
    >
      <span className="player-identity-chip-main">
        {data.username ? (
          <span className="player-identity-chip-user">@{data.username}</span>
        ) : data.guestLabel ? (
          <span className="player-identity-chip-guest">{data.guestLabel}</span>
        ) : (
          <span className="player-identity-chip-user">{data.fallbackLabel}</span>
        )}
        {data.fullName && (
          <span className="player-identity-chip-name">{data.fullName}</span>
        )}
      </span>
      {data.invitedBy && (
        <span className="player-identity-chip-invited">· Inv. {data.invitedBy}</span>
      )}
    </span>
  );
}

/**
 * Identidad de jugador: @username destacado, nombre completo y “invitado por” legibles.
 */
export function PlayerIdentity({
  nombre,
  username,
  nombreExterno,
  invitadoPorNombre,
  email,
  variant: variantProp,
  size,
  layout,
  className,
}: PlayerIdentityProps) {
  const variant = resolveVariant({
    nombre,
    username,
    nombreExterno,
    invitadoPorNombre,
    variant: variantProp,
    size,
    layout,
  });
  const data = resolveIdentity({ nombre, username, nombreExterno, invitadoPorNombre });

  return (
    <div
      className={cn("player-identity", `player-identity--${variant}`, className)}
    >
      <div className="player-identity-head">
        {data.username ? (
          <span className="player-identity-username" title={`@${data.username}`}>
            @{data.username}
          </span>
        ) : data.guestLabel ? (
          <>
            <span className="player-identity-guest-badge">Invitado</span>
            <span className="player-identity-guest-name" title={data.guestLabel}>
              {data.guestLabel}
            </span>
          </>
        ) : (
          <span className="player-identity-username player-identity-username--solo" title={data.fallbackLabel}>
            {data.fallbackLabel}
          </span>
        )}
      </div>

      {data.fullName && (
        <p className="player-identity-fullname" title={data.fullName}>
          {data.fullName}
        </p>
      )}

      {data.invitedBy && (
        <p className="player-identity-invited" title={`Invitado por ${data.invitedBy}`}>
          <UserRoundPlus className="player-identity-invited-icon" aria-hidden />
          <span>
            Invitado por <strong>{data.invitedBy}</strong>
          </span>
        </p>
      )}

      {email && (variant === "list" || variant === "compact" || variant === "profile") && (
        <p className="player-identity-email" title={email}>
          {email}
        </p>
      )}
    </div>
  );
}
