/**
 * MEDUI.D4C.3 — Ambulatory registration, appointment, and walk-in contracts.
 * Durable visit origin + enterprise Appointment status/time semantics.
 * Does not invent ClinicPatient / ClinicAppointment / ClinicEncounter engines.
 */

import { z } from "zod";

export const ENCOUNTER_VISIT_ORIGINS = [
  "SCHEDULED",
  "WALK_IN",
  "FOLLOW_UP",
  "REFERRAL",
  "TRANSFER_IN",
  "OTHER",
] as const;
export type EncounterVisitOrigin = (typeof ENCOUNTER_VISIT_ORIGINS)[number];

export const APPOINTMENT_STATUSES = [
  "SCHEDULED",
  "CONFIRMED",
  "ARRIVED",
  "CHECKED_IN",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/** Statuses eligible for physical/operational arrival (not yet checked in). */
export const APPOINTMENT_ARRIVABLE_STATUSES = ["SCHEDULED", "CONFIRMED"] as const;

/** Statuses eligible for administrative check-in → encounter creation. */
export const APPOINTMENT_CHECK_IN_ELIGIBLE_STATUSES = [
  "SCHEDULED",
  "CONFIRMED",
  "ARRIVED",
] as const;

export const REGISTRATION_COMPLETENESS_STATUSES = [
  "COMPLETE",
  "INCOMPLETE",
  "NOT_REQUIRED",
  "NEEDS_REVIEW",
] as const;
export type RegistrationCompletenessStatus =
  (typeof REGISTRATION_COMPLETENESS_STATUSES)[number];

export const REGISTRATION_COMPLETENESS_SECTION_IDS = [
  "IDENTITY",
  "CONTACT",
  "EMERGENCY_CONTACT",
  "INSURANCE",
  "VISIT_CONTEXT",
] as const;
export type RegistrationCompletenessSectionId =
  (typeof REGISTRATION_COMPLETENESS_SECTION_IDS)[number];

export type RegistrationCompletenessSection = {
  id: RegistrationCompletenessSectionId;
  status: RegistrationCompletenessStatus;
  missingKeys: string[];
  critical: boolean;
};

export type RegistrationCompletenessProjection = {
  overallStatus: RegistrationCompletenessStatus;
  sections: RegistrationCompletenessSection[];
  blocksClinicalCare: boolean;
};

export function isEncounterVisitOrigin(raw: unknown): raw is EncounterVisitOrigin {
  return (
    typeof raw === "string" &&
    (ENCOUNTER_VISIT_ORIGINS as readonly string[]).includes(raw.trim().toUpperCase())
  );
}

export function normalizeEncounterVisitOrigin(
  raw: unknown
): EncounterVisitOrigin | null {
  if (raw == null || raw === "") return null;
  const u = String(raw).trim().toUpperCase();
  return isEncounterVisitOrigin(u) ? (u as EncounterVisitOrigin) : null;
}

export function isAppointmentStatus(raw: unknown): raw is AppointmentStatus {
  return (
    typeof raw === "string" &&
    (APPOINTMENT_STATUSES as readonly string[]).includes(raw.trim().toUpperCase())
  );
}

export function canMarkAppointmentArrived(status: string | null | undefined): boolean {
  const u = String(status ?? "")
    .trim()
    .toUpperCase();
  return (APPOINTMENT_ARRIVABLE_STATUSES as readonly string[]).includes(u);
}

export function canCheckInAppointment(status: string | null | undefined): boolean {
  const u = String(status ?? "")
    .trim()
    .toUpperCase();
  return (APPOINTMENT_CHECK_IN_ELIGIBLE_STATUSES as readonly string[]).includes(u);
}

/**
 * Display label token for trackboard visit origin.
 * Null/unknown → LEGACY (never invent Scheduled/Walk-In).
 */
export function clinicCareVisitOriginDisplayToken(
  visitOrigin: string | null | undefined
): "SCHEDULED" | "WALK_IN" | "FOLLOW_UP" | "REFERRAL" | "TRANSFER_IN" | "OTHER" | "LEGACY" {
  const n = normalizeEncounterVisitOrigin(visitOrigin);
  return n ?? "LEGACY";
}

export function projectRegistrationCompleteness(input: {
  patient: {
    firstName?: string | null;
    lastName?: string | null;
    dob?: string | Date | null;
    phone?: string | null;
    sexAtBirth?: string | null;
    sex?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
  };
  hasPrimaryInsurance?: boolean;
  /** Haiti / non-US facilities: insurance not required for completeness. */
  insuranceRequired?: boolean;
  visitOrigin?: string | null;
  hasAppointmentLink?: boolean;
}): RegistrationCompletenessProjection {
  const insuranceRequired = input.insuranceRequired === true;
  const sections: RegistrationCompletenessSection[] = [];

  const identityMissing: string[] = [];
  if (!(input.patient.firstName ?? "").toString().trim()) identityMissing.push("firstName");
  if (!(input.patient.lastName ?? "").toString().trim()) identityMissing.push("lastName");
  if (!input.patient.dob) identityMissing.push("dob");
  const sex =
    (input.patient.sexAtBirth ?? "").toString().trim() ||
    (input.patient.sex ?? "").toString().trim();
  if (!sex) identityMissing.push("sex");
  sections.push({
    id: "IDENTITY",
    status: identityMissing.length === 0 ? "COMPLETE" : "INCOMPLETE",
    missingKeys: identityMissing,
    critical: true,
  });

  const contactMissing: string[] = [];
  if (!(input.patient.phone ?? "").toString().trim()) contactMissing.push("phone");
  sections.push({
    id: "CONTACT",
    status: contactMissing.length === 0 ? "COMPLETE" : "INCOMPLETE",
    missingKeys: contactMissing,
    critical: false,
  });

  const ecMissing: string[] = [];
  if (!(input.patient.emergencyContactName ?? "").toString().trim()) {
    ecMissing.push("emergencyContactName");
  }
  if (!(input.patient.emergencyContactPhone ?? "").toString().trim()) {
    ecMissing.push("emergencyContactPhone");
  }
  sections.push({
    id: "EMERGENCY_CONTACT",
    status: ecMissing.length === 0 ? "COMPLETE" : "INCOMPLETE",
    missingKeys: ecMissing,
    critical: false,
  });

  if (!insuranceRequired) {
    sections.push({
      id: "INSURANCE",
      status: "NOT_REQUIRED",
      missingKeys: [],
      critical: false,
    });
  } else {
    sections.push({
      id: "INSURANCE",
      status: input.hasPrimaryInsurance ? "COMPLETE" : "INCOMPLETE",
      missingKeys: input.hasPrimaryInsurance ? [] : ["primaryCoverage"],
      critical: false,
    });
  }

  const visitMissing: string[] = [];
  const origin = normalizeEncounterVisitOrigin(input.visitOrigin);
  if (!origin) visitMissing.push("visitOrigin");
  if (origin === "SCHEDULED" && !input.hasAppointmentLink) {
    visitMissing.push("appointmentLink");
  }
  sections.push({
    id: "VISIT_CONTEXT",
    status: visitMissing.length === 0 ? "COMPLETE" : origin ? "NEEDS_REVIEW" : "INCOMPLETE",
    missingKeys: visitMissing,
    critical: false,
  });

  const hasCriticalIncomplete = sections.some((s) => s.critical && s.status === "INCOMPLETE");
  const hasAnyIncomplete = sections.some(
    (s) => s.status === "INCOMPLETE" || s.status === "NEEDS_REVIEW"
  );
  const overallStatus: RegistrationCompletenessStatus = hasCriticalIncomplete
    ? "INCOMPLETE"
    : hasAnyIncomplete
      ? "NEEDS_REVIEW"
      : "COMPLETE";

  return {
    overallStatus,
    sections,
    /** Noncritical administrative gaps do not block clinical care in D4C.3. */
    blocksClinicalCare: hasCriticalIncomplete,
  };
}

const emptyStrToUndefined = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : v;

export const appointmentCreateDtoSchema = z.object({
  patientId: z.string().uuid(),
  scheduledStartAt: z.coerce.date(),
  scheduledEndAt: z.preprocess(emptyStrToUndefined, z.coerce.date().optional()),
  providerId: z.preprocess(emptyStrToUndefined, z.string().uuid().optional()),
  departmentId: z.preprocess(emptyStrToUndefined, z.string().uuid().optional()),
  reason: z.preprocess(emptyStrToUndefined, z.string().max(4000).optional()),
  /** When true, creates a follow-up-style appointment (still AppointmentStatus SCHEDULED). */
  isFollowUp: z.boolean().optional(),
  encounterType: z.enum(["OUTPATIENT", "URGENT_CARE"]).optional(),
});
export type AppointmentCreateDto = z.infer<typeof appointmentCreateDtoSchema>;

export const ambulatoryWalkInCreateDtoSchema = z.object({
  patientId: z.string().uuid(),
  encounterType: z.enum(["OUTPATIENT", "URGENT_CARE"]).default("OUTPATIENT"),
  visitReason: z.preprocess(emptyStrToUndefined, z.string().max(4000).optional()),
  chiefComplaint: z.preprocess(emptyStrToUndefined, z.string().max(4000).optional()),
  roomLabel: z.preprocess(emptyStrToUndefined, z.string().max(64).optional()),
  providerId: z.preprocess(emptyStrToUndefined, z.string().uuid().optional()),
  physicianAssignedUserId: z.preprocess(emptyStrToUndefined, z.string().uuid().optional()),
});
export type AmbulatoryWalkInCreateDto = z.infer<typeof ambulatoryWalkInCreateDtoSchema>;

export const appointmentCheckInDtoSchema = z.object({
  encounterType: z.enum(["OUTPATIENT", "URGENT_CARE"]).optional(),
  visitReason: z.preprocess(emptyStrToUndefined, z.string().max(4000).optional()),
  roomLabel: z.preprocess(emptyStrToUndefined, z.string().max(64).optional()),
});
export type AppointmentCheckInDto = z.infer<typeof appointmentCheckInDtoSchema>;
