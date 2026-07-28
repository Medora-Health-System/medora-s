/**
 * MEDUI.D4C.2A.1 — detect Prisma schema drift (migration not deployed).
 * Must not be swallowed as an empty trackboard / appointment list.
 */

export function isPrismaSchemaMissError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  if (code === "P2021" || code === "P2022") return true;
  const message = String((err as { message?: string }).message ?? "");
  return (
    /visitOrigin/i.test(message) ||
    /does not exist/i.test(message) ||
    /Appointment/i.test(message) && /P2021|relation|table/i.test(message)
  );
}

export const CLINIC_CARE_SCHEMA_MISS_MESSAGE =
  "Clinic Care schema not deployed (missing Appointment and/or Encounter.visitOrigin). Run prisma migrate deploy for 20261028120000_enterprise_appointment_visit_origin_d4c3.";
