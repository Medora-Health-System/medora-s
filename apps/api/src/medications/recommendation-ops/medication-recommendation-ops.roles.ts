export const OPS_READ_ROLES = [
  "ADMIN",
  "MEDORA_SUPER_ADMIN",
  "MEDICATION_ADMIN",
  "MEDICATION_REVIEWER",
  "PHARMACY",
] as const;

export const OPS_WRITE_ROLES = [
  "ADMIN",
  "MEDORA_SUPER_ADMIN",
  "MEDICATION_ADMIN",
  "MEDICATION_REVIEWER",
] as const;

export const OPS_ADMIN_ROLES = [
  "ADMIN",
  "MEDORA_SUPER_ADMIN",
  "MEDICATION_ADMIN",
] as const;

export function isOpsAdmin(roles: string[]): boolean {
  return roles.some((r) =>
    (OPS_ADMIN_ROLES as readonly string[]).includes(r)
  );
}

export function isOpsWriter(roles: string[]): boolean {
  return roles.some((r) =>
    (OPS_WRITE_ROLES as readonly string[]).includes(r)
  );
}
