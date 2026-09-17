export const MFA_TRUST_COOKIE_NAME = "medora_mfa_trusted_24h";
export const MFA_TRUST_MAX_AGE_SECONDS = 24 * 60 * 60;

export function mfaTrustedDeviceCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MFA_TRUST_MAX_AGE_SECONDS,
  };
}

export function clearMfaTrustedDeviceCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}
