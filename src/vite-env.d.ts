/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_UXF_BUILD?: string;
  readonly VITE_MIXPANEL_TOKEN?: string;
  readonly VITE_AGENT_API_URL?: string;
  readonly VITE_AGGREGATOR_URL?: string;
  readonly VITE_PUSH_RELAY_NAMETAG?: string;
  readonly VITE_PUSH_RELAY_VAPID_PUBLIC_KEY?: string;
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
