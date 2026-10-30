import { GoogleGenAI } from "@google/genai";

/**
 * Universal Gemini API Key Resolver.
 * Enables the AI to work seamlessly across:
 * - Current AI Studio runtime environment
 * - Exported project codebases running locally or on external servers
 * - Projects imported into other apps (Vercel, Netlify, Render, Docker, Lovable, etc.)
 * - Requests bearing custom API keys in headers or payload
 */
export function resolveGeminiApiKey(
  customKey?: string,
  request?: Request,
): string | undefined {
  if (customKey && typeof customKey === "string" && customKey.trim().length > 10) {
    return customKey.trim();
  }

  // 1. Check custom HTTP headers passed by exported apps or different client hosts
  if (request) {
    try {
      const headerKey =
        request.headers.get("x-gemini-api-key") ||
        request.headers.get("x-api-key") ||
        request.headers.get("x-goog-api-key");
      if (headerKey && headerKey.trim().length > 10) {
        return headerKey.trim();
      }

      const auth = request.headers.get("authorization");
      if (auth && auth.startsWith("Bearer AIza")) {
        return auth.replace(/^Bearer\s+/i, "").trim();
      }
    } catch {
      // ignore header access errors
    }
  }

  // 2. Check all common environment variable names across hosting platforms
  const envCandidates = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GOOGLE_GENAI_API_KEY,
    process.env.VITE_GEMINI_API_KEY,
    process.env.VITE_GOOGLE_API_KEY,
    process.env.API_KEY,
  ];

  for (const envVal of envCandidates) {
    if (envVal && typeof envVal === "string" && envVal.trim().length > 10) {
      return envVal.trim();
    }
  }

  return undefined;
}

/**
 * Instantiate a GoogleGenAI client with the resolved key.
 * Always returns null instead of throwing if no key is configured.
 */
export function getGeminiClient(key?: string, req?: Request): GoogleGenAI | null {
  const resolved = resolveGeminiApiKey(key, req);
  if (!resolved) return null;

  try {
    return new GoogleGenAI({
      apiKey: resolved,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });
  } catch (err) {
    console.warn("[gemini-key] Failed to instantiate GoogleGenAI:", err);
    return null;
  }
}

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-gemini-api-key, x-api-key, x-goog-api-key, x-guest-id",
};
