/**
 * Normalize API auth/MFA failures for browser clients.
 * Prefer stable machine codes in `message`; never emit hardcoded French/English prose here.
 */

export type AuthBffErrorJson = {
  errorCode: string;
  /** Legacy field — same as errorCode when machine-shaped; omit when redundant. */
  message?: string;
};

function rawMessage(errBody: Record<string, unknown>): string {
  const ec = errBody.errorCode;
  if (typeof ec === "string" && ec.trim()) return ec.trim();
  const m = errBody.message;
  const e = errBody.error;
  if (typeof m === "string" && m.trim()) return m.trim();
  if (typeof e === "string" && e.trim()) return e.trim();
  return "";
}

const CODE_RE = /^[A-Z][A-Z0-9_]*$/;

export function authBffErrorJson(
  status: number,
  errBody: Record<string, unknown>,
  opts: { fallback401: string; fallbackOther: string }
): AuthBffErrorJson {
  const raw = rawMessage(errBody);
  if (CODE_RE.test(raw)) {
    return { errorCode: raw, message: raw };
  }
  if (status === 401) return { errorCode: opts.fallback401 };
  if (status === 429) return { errorCode: "RATE_LIMITED" };
  if (status === 400) return { errorCode: "INVALID_REQUEST_BODY" };
  return { errorCode: opts.fallbackOther };
}
