export const ROLE_CODES = [
  "ADMIN",
  "MEDORA_SUPER_ADMIN",
  "PROVIDER",
  "RN",
  "FRONT_DESK",
  "LAB",
  "RADIOLOGY",
  "PHARMACY",
  "BILLING",
] as const;

export type RoleCode = (typeof ROLE_CODES)[number];

/** S22 — platform-only operational APIs and UI (not facility administrators). */
export const PLATFORM_OPERATOR_ROLE_CODE = "MEDORA_SUPER_ADMIN" as const;

export function isPlatformOperatorRoleCode(role: string | undefined | null): boolean {
  return String(role ?? "").trim() === PLATFORM_OPERATOR_ROLE_CODE;
}

