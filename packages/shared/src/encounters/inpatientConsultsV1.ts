/**
 * D3E — Internal specialty consult requests (shared consult engine shell).
 */

export const INPATIENT_CONSULT_SPECIALTIES = [
  "INTERNAL_MEDICINE",
  "SURGERY",
  "CARDIOLOGY",
  "NEUROLOGY",
  "PULMONOLOGY",
  "ORTHOPEDICS",
  "INFECTIOUS_DISEASE",
  "GI",
  "NEPHROLOGY",
  "OTHER",
] as const;

export type InpatientConsultSpecialty = (typeof INPATIENT_CONSULT_SPECIALTIES)[number];

export const INPATIENT_CONSULT_STATUSES = [
  "REQUESTED",
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export type InpatientConsultStatus = (typeof INPATIENT_CONSULT_STATUSES)[number];

export type InpatientConsultRequestV1 = {
  consultId: string;
  encounterId: string;
  specialty: InpatientConsultSpecialty;
  status: InpatientConsultStatus;
  reason: string;
  requestedAt: string;
  completedAt: string | null;
};

export function inpatientConsultIsOpen(
  c: Pick<InpatientConsultRequestV1, "status">
): boolean {
  const s = c.status;
  return s === "REQUESTED" || s === "ACCEPTED" || s === "IN_PROGRESS";
}
