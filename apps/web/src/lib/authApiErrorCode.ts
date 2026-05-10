/**
 * Stable auth/MFA error codes from the API or BFF (`message` / `errorCode`).
 * Map to `auth.errors.<code>` in i18n; never show raw backend French to EN users.
 */

const CODE_RE = /^[A-Z][A-Z0-9_]*$/;

export function isStableAuthErrorCode(value: unknown): value is string {
  return typeof value === "string" && CODE_RE.test(value.trim());
}

/** Prefer explicit `errorCode`, then machine-shaped `message`, then legacy `error` string. */
export function pickAuthErrorCodeFromResponse(data: {
  errorCode?: unknown;
  message?: unknown;
  error?: unknown;
}): string | null {
  if (isStableAuthErrorCode(data.errorCode)) return (data.errorCode as string).trim();
  if (isStableAuthErrorCode(data.message)) return (data.message as string).trim();
  if (isStableAuthErrorCode(data.error)) return (data.error as string).trim();
  return null;
}

/** Prefer `errorCode` (BFF), then machine-shaped `error` legacy string. */
export function pickAuthErrorCodeOrLegacyMessage(data: {
  errorCode?: unknown;
  error?: unknown;
  message?: unknown;
}): { code: string | null; legacyMessage: string | null } {
  const code = pickAuthErrorCodeFromResponse(data);
  if (code) return { code, legacyMessage: null };
  const legacy =
    typeof data.error === "string" && data.error.trim()
      ? data.error.trim()
      : typeof data.message === "string" && data.message.trim()
        ? data.message.trim()
        : null;
  return { code: null, legacyMessage: legacy };
}

/**
 * Resolve a user-visible string using i18n. If `code` is unknown, falls back to `fallbackKey`.
 */
export function messageForAuthErrorCode(
  t: (key: string) => string,
  code: string | null,
  fallbackKey: string
): string {
  if (!code) return t(fallbackKey);
  const key = `auth.errors.${code}`;
  const resolved = t(key);
  if (resolved !== key) return resolved;
  return t(fallbackKey);
}
