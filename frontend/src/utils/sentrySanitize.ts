const REDACTED_REQUEST_HEADERS = new Set(['authorization', 'cookie']);

export function sanitizeSentryRequestHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (!REDACTED_REQUEST_HEADERS.has(key.toLowerCase())) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
