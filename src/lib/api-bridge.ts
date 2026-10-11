/**
 * Backend API Bridge for BrainBloom.
 * Provides a clean interface for connecting an external backend (e.g. FastAPI, Node, Cloudflare Worker)
 * or external AI APIs (like Google Gemini) while guaranteeing full offline functionality by default.
 */

export type AiProviderConfig = {
  provider: "local" | "gemini" | "custom_backend";
  apiKey?: string;
  backendUrl?: string;
  model?: string;
};

const STORAGE_KEY = "brainbloom:ai_config:v1";

export function getAiConfig(): AiProviderConfig {
  if (typeof window === "undefined") {
    return { provider: "local" };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Fall back to default
  }

  return { provider: "local" };
}

export function saveAiConfig(config: AiProviderConfig): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }
}

export type ConnectionStatus = {
  isConfigured: boolean;
  providerName: string;
  description: string;
  privacyNotice: string;
};

export function getConnectionStatus(): ConnectionStatus {
  const cfg = getAiConfig();

  if (cfg.provider === "gemini" && cfg.apiKey) {
    return {
      isConfigured: true,
      providerName: "Google Gemini AI (External)",
      description: "Direct connection configured using your private API key.",
      privacyNotice: "Material text will be sent to Google API for processing.",
    };
  }

  if (cfg.provider === "custom_backend" && cfg.backendUrl) {
    return {
      isConfigured: true,
      providerName: "Custom Study Backend",
      description: `Connected to endpoint: ${cfg.backendUrl}`,
      privacyNotice: "Material text will be processed by your designated backend server.",
    };
  }

  return {
    isConfigured: false,
    providerName: "BrainBloom Local Smart Engine",
    description:
      "Running 100% client-side in your browser. Zero cost, no external API keys required.",
    privacyNotice: "All documents and text remain strictly private on this device.",
  };
}
