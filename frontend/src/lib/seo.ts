const siteUrl = (import.meta.env.VITE_SITE_URL || "http://localhost:5173").replace(/\/$/, "");

export const seoDefaults = {
  siteName: import.meta.env.VITE_APP_NAME || "Event",
  description:
    import.meta.env.VITE_APP_DESCRIPTION ||
    "Gestiona convocatorias deportivas, confirma asistencias y organiza alineaciones en un solo lugar.",
  siteUrl,
  imageUrl: `${siteUrl}/og-image.png`,
} as const;

export function buildPageTitle(pageTitle?: string): string {
  if (!pageTitle?.trim()) return `${seoDefaults.siteName} - Gestión Deportiva`;
  return `${pageTitle.trim()} · ${seoDefaults.siteName}`;
}

export function buildCanonicalUrl(path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${seoDefaults.siteUrl}${normalized}`;
}
