// Surfaces the real underlying error (Gemini auth/model/rate-limit errors, Wikipedia API
// failures, etc.) to the client instead of a generic string — without this, a failure is a
// black box: the app just says "Failed to X" every time with no way to tell why.
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return `${fallback}: ${err.message}`;
  return fallback;
}
