/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUWAYOMI_AUTH_USER?: string;
  readonly VITE_SUWAYOMI_AUTH_PASS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
