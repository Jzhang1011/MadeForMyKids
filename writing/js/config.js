/**
 * config.js - BuildForMyKids Writing Gym Configuration
 */
export const AI_CONFIG = {
  enabled: false, // Disabled by default per spec
  provider: "placeholder",
  apiKey: "YOUR_API_KEY_HERE",
  endpoint: "/api/ai/coach",
  model: "gpt-4o-mini",
  maxTokens: 350,
  timeoutMs: 8000
};

const INVALID_KEY_PATTERNS = [
  "",
  "YOUR_API_KEY_HERE",
  "PLACEHOLDER",
  "DEMO_KEY",
  "TEST_KEY",
  "null",
  "undefined"
];

/**
 * Single source of truth for AI activation.
 * Guarantees zero external network requests on invalid keys or disabled states.
 */
export function isAIAvailable() {
  if (!AI_CONFIG.enabled) return false;
  if (!AI_CONFIG.apiKey || typeof AI_CONFIG.apiKey !== "string") return false;
  
  const sanitized = AI_CONFIG.apiKey.trim().toUpperCase();
  if (INVALID_KEY_PATTERNS.includes(sanitized)) return false;
  if (!AI_CONFIG.endpoint || AI_CONFIG.endpoint.trim() === "") return false;

  return true;
}
