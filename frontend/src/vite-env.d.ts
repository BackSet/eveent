/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_APP_DESCRIPTION?: string;
  readonly VITE_GOOGLE_SITE_VERIFICATION?: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
