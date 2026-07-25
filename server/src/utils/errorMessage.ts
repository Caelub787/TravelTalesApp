// Surfaces the real underlying error (auth/model/rate-limit errors, Wikipedia API failures,
// etc.) to the client instead of a generic string — without this, a failure is a black box:
// the app just says "Failed to X" every time with no way to tell why.
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return `${fallback}: ${err.message}`;
  return fallback;
}

function isAiQuotaError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("rate_limit_exceeded") ||
    message.includes("status 429") ||
    message.includes('"code":429')
  );
}

// Rate-limit errors come back as a raw JSON blob from the provider — lead with a plain-
// English explanation, but keep the technical detail attached so a *specific* limit (RPM
// vs TPM vs daily) is still visible instead of hiding it behind a friendly-but-useless string.
export function describeAiError(err: unknown, fallback: string): string {
  if (isAiQuotaError(err)) {
    const detail = err instanceof Error ? err.message : String(err);
    return `The free AI tier is rate-limited right now. Wait a bit and try again, or switch to Wiki Facts mode in Settings — it works without any AI quota. (${detail})`;
  }
  return errorMessage(err, fallback);
}
