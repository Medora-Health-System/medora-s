/**
 * MEDUI.CP.1E — Canonical clinician attribution snapshot (typed concept).
 *
 * Persist as explicit Prisma columns (Medora convention); this type is the
 * shared contract for write-time capture and medical-record projection.
 * Does not replace authorUserId / actorUserId identity authority.
 */

import {
  canonicalizeWorkforceProfession,
  type WorkforceProfessionCode,
} from "../auth/enterpriseWorkforceProfessionD4c11.js";

/** Durable clinician-facing attribution frozen at documentation time. */
export type ClinicalAuthorSnapshot = {
  userId: string;
  displayName: string;
  /** Clinician-facing title (e.g. RN, MD, PT). Prefer over RoleCode chrome. */
  professionalTitle: string | null;
  /** Optional extra credentials string when distinct from professionalTitle. */
  credentials: string | null;
  /** ISO timestamp when documented (usually row createdAt). */
  documentedAt: string;
};

export type ClinicalAuthorSnapshotPersist = {
  displayNameSnapshot: string;
  professionalTitleSnapshot: string | null;
};

export type ClinicalAuthorIdentityInput = {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  /** Facility UserRole.professionCode values (active assignments). */
  professionCodes?: readonly (string | null | undefined)[];
  /** RoleCode / legacy role string fallback when profession is absent. */
  roleCode?: string | null;
  documentedAt?: Date | string | null;
};

const PROFESSION_TITLE: Partial<Record<WorkforceProfessionCode, string>> = {
  REGISTERED_NURSE: "RN",
  RN: "RN",
  NURSING: "RN",
  LICENSED_PRACTICAL_NURSE: "LPN",
  PATIENT_CARE_TECHNICIAN: "PCT",
  PHYSICIAN_MD: "MD",
  PHYSICIAN_DO: "DO",
  RESIDENT_PHYSICIAN: "MD",
  PHYSICIAN_ASSISTANT: "PA",
  NURSE_PRACTITIONER: "NP",
  MEDICINE: "MD",
  PROVIDER: "MD",
  PROVIDER_UNSPECIFIED: "MD",
  LEGACY_PROVIDER: "MD",
  PHYSICAL_THERAPIST: "PT",
  OCCUPATIONAL_THERAPIST: "OT",
  SPEECH_LANGUAGE_PATHOLOGIST: "SLP",
  RESPIRATORY_THERAPIST: "RT",
  PHARMACIST: "RPh",
  PHARMACY_TECHNICIAN: "CPhT",
  SOCIAL_WORKER: "SW",
  CASE_MANAGER: "CM",
  DIETITIAN: "RD",
  DENTIST: "DDS",
  DENTAL_HYGIENIST: "RDH",
  TECHNICIAN: "Tech",
};

const ROLE_TITLE: Record<string, string> = {
  RN: "RN",
  PROVIDER: "MD",
  PATIENT_CARE_TECH: "PCT",
  PHARMACY: "RPh",
};

export function clinicianFacingDisplayNameFromParts(
  firstName?: string | null,
  lastName?: string | null
): string | null {
  const joined = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ").trim();
  return joined || null;
}

export function clinicianProfessionalTitleFromProfession(
  professionCode?: string | null
): string | null {
  const canon = canonicalizeWorkforceProfession(professionCode ?? null);
  if (!canon) return null;
  return PROFESSION_TITLE[canon] ?? null;
}

export function clinicianProfessionalTitleFromRoleCode(roleCode?: string | null): string | null {
  if (!roleCode) return null;
  return ROLE_TITLE[String(roleCode).trim().toUpperCase()] ?? null;
}

/** Resolve clinician-facing title: profession first, then RoleCode fallback. */
export function resolveClinicianProfessionalTitle(input: {
  professionCodes?: readonly (string | null | undefined)[];
  roleCode?: string | null;
}): string | null {
  for (const code of input.professionCodes ?? []) {
    const title = clinicianProfessionalTitleFromProfession(code);
    if (title) return title;
  }
  return clinicianProfessionalTitleFromRoleCode(input.roleCode);
}

export function buildClinicalAuthorSnapshotPersist(
  input: ClinicalAuthorIdentityInput
): ClinicalAuthorSnapshotPersist {
  const displayName =
    clinicianFacingDisplayNameFromParts(input.firstName, input.lastName) ?? "—";
  const professionalTitle = resolveClinicianProfessionalTitle({
    professionCodes: input.professionCodes,
    roleCode: input.roleCode,
  });
  return {
    displayNameSnapshot: displayName,
    professionalTitleSnapshot: professionalTitle,
  };
}

export function buildClinicalAuthorSnapshot(
  input: ClinicalAuthorIdentityInput
): ClinicalAuthorSnapshot {
  const persist = buildClinicalAuthorSnapshotPersist(input);
  const at =
    input.documentedAt instanceof Date
      ? input.documentedAt.toISOString()
      : typeof input.documentedAt === "string" && input.documentedAt.trim()
        ? input.documentedAt.trim()
        : new Date().toISOString();
  return {
    userId: input.userId,
    displayName: persist.displayNameSnapshot,
    professionalTitle: persist.professionalTitleSnapshot,
    credentials: persist.professionalTitleSnapshot,
    documentedAt: at,
  };
}

/** Project persisted columns into medical-record clinician shape (no live User rewrite). */
export function projectClinicalAuthorFromSnapshots(input: {
  displayNameSnapshot?: string | null;
  professionalTitleSnapshot?: string | null;
  /** Legacy RoleCode snapshot — title fallback only; never invent a name. */
  roleSnapshot?: string | null;
}): {
  displayName: string | null;
  credentials: string | null;
  roleSnapshot: string | null;
  attributionUnavailable: boolean;
} {
  const name =
    typeof input.displayNameSnapshot === "string" && input.displayNameSnapshot.trim()
      ? input.displayNameSnapshot.trim()
      : null;
  const title =
    (typeof input.professionalTitleSnapshot === "string" &&
    input.professionalTitleSnapshot.trim()
      ? input.professionalTitleSnapshot.trim()
      : null) ??
    clinicianProfessionalTitleFromRoleCode(input.roleSnapshot);
  const roleSnapshot =
    typeof input.roleSnapshot === "string" && input.roleSnapshot.trim()
      ? input.roleSnapshot.trim()
      : null;
  if (!name) {
    return {
      displayName: null,
      credentials: null,
      roleSnapshot,
      attributionUnavailable: true,
    };
  }
  return {
    displayName: name,
    credentials: title,
    roleSnapshot,
    attributionUnavailable: false,
  };
}
