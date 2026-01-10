export const ROLE_CODES = [
  "ADMIN",
  "PROVIDER",
  "RN",
  "FRONT_DESK",
  "LAB",
  "RADIOLOGY",
  "PHARMACY"
] as const;

export type RoleCode = (typeof ROLE_CODES)[number];

