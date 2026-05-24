import { Helmet } from "react-helmet-async";
import { buildCanonicalUrl, buildPageTitle, seoDefaults } from "@/lib/seo";

interface SeoHeadProps {
  title?: string;
  description?: string;
  noindex?: boolean;
  canonicalPath?: string;
}

export function SeoHead({
  title,
  description = seoDefaults.description,
  noindex = false,
  canonicalPath = "/",
}: SeoHeadProps) {
  const pageTitle = buildPageTitle(title);
  const canonical = buildCanonicalUrl(canonicalPath);
  const robots = noindex ? "noindex, nofollow" : "index, follow";

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonical} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={seoDefaults.siteName} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={seoDefaults.imageUrl} />
      <meta property="og:locale" content="es_ES" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={seoDefaults.imageUrl} />
    </Helmet>
  );
}
