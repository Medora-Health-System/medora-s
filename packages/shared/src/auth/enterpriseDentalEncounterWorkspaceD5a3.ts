/**
 * MEDUI.D5A.3 — Enterprise Dental Encounter Workspace contract.
 * Care-setting projection over enterprise Encounter — not a second EMR.
 */

import { isEnterpriseEncounterClosed } from "./enterpriseClosedEncounterViewerD4c8a.js";
import {
  D5A1_FORBIDDEN_AUTHORITIES,
  isForbiddenDentalAuthorityName,
} from "./enterpriseDentalOrthodonticsArchitectureD5a1.js";
import { D5A2_DENTAL_APP_ROOT } from "./enterpriseDentalServiceLineNavigationD5a2.js";

export const D5A3_CERTIFICATION_ID = "MEDUI.D5A.3" as const;

export const D5A3_DENTAL_SERVICE_LINE_TAG = "dentalServiceLineV1" as const;

export const D5A3_DENTAL_WORKSPACE_SECTIONS = [
  "overview",
  "history",
  "assessment",
  "odontogram",
  "periodontal",
  "diagnoses",
  "treatmentPlan",
  "procedures",
  "imaging",
  "prescriptions",
  "clinicalNotes",
  "consents",
  "followUp",
  "summary",
] as const;

export type D5a3DentalWorkspaceSection = (typeof D5A3_DENTAL_WORKSPACE_SECTIONS)[number];

/**
 * Active dental workspace sections.
 * Odontogram activated in MEDUI.D5A.4 (was placeholder in D5A.3).
 */
export const D5A3_ACTIVE_DENTAL_SECTIONS: readonly D5a3DentalWorkspaceSection[] = [
  "overview",
  "history",
  "assessment",
  "odontogram",
  "diagnoses",
  "imaging",
  "prescriptions",
  "clinicalNotes",
  "consents",
  "followUp",
  "summary",
] as const;

export const D5A3_PLACEHOLDER_DENTAL_SECTIONS = [
  "periodontal",
  "treatmentPlan",
  "procedures",
] as const;

export const D5A3_PLACEHOLDER_MILESTONE: Record<
  (typeof D5A3_PLACEHOLDER_DENTAL_SECTIONS)[number],
  string
> = {
  periodontal: "MEDUI.D5A.6",
  treatmentPlan: "MEDUI.D5A.5",
  procedures: "MEDUI.D5A.5",
};

export function isD5a3DentalWorkspaceSection(
  value: string | null | undefined
): value is D5a3DentalWorkspaceSection {
  const v = String(value ?? "").trim();
  return (D5A3_DENTAL_WORKSPACE_SECTIONS as readonly string[]).includes(v);
}

export function parseD5a3DentalWorkspaceSection(
  value: string | null | undefined
): D5a3DentalWorkspaceSection {
  return isD5a3DentalWorkspaceSection(value) ? value : "overview";
}

export function isD5a3DentalSectionActive(section: D5a3DentalWorkspaceSection): boolean {
  return (D5A3_ACTIVE_DENTAL_SECTIONS as readonly string[]).includes(section);
}

export function enterpriseDentalEncounterWorkspacePath(
  encounterId: string,
  section?: D5a3DentalWorkspaceSection | null
): string {
  const id = encodeURIComponent(String(encounterId ?? "").trim());
  const base = `${D5A2_DENTAL_APP_ROOT}/encounters/${id}`;
  const sec = section && isD5a3DentalWorkspaceSection(section) ? section : null;
  if (!sec || sec === "overview") return base;
  return `${base}?section=${encodeURIComponent(sec)}`;
}

export function buildDentalServiceLineTag(input?: {
  specialty?: string | null;
}): Record<string, unknown> {
  const specialty = String(input?.specialty ?? "GENERAL_DENTISTRY")
    .trim()
    .toUpperCase() || "GENERAL_DENTISTRY";
  return {
    careSetting: "DENTAL",
    serviceLine: "DENTAL",
    specialty,
    certificationId: D5A3_CERTIFICATION_ID,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Detect Dental care-setting projection from existing encounter JSON (zero-schema). */
export function isDentalEncounterProjection(input: {
  type?: string | null;
  careSetting?: string | null;
  nursingAssessment?: unknown;
  admissionSummaryJson?: unknown;
}): boolean {
  const careHint = String(input.careSetting ?? "").trim().toUpperCase();
  if (careHint === "DENTAL" || careHint.includes("DENTAL")) return true;
  if (String(input.type ?? "").trim().toUpperCase() === "DENTAL") return true;

  const nursing = asRecord(input.nursingAssessment);
  const tag = nursing ? asRecord(nursing[D5A3_DENTAL_SERVICE_LINE_TAG]) : null;
  if (tag) {
    const cs = String(tag.careSetting ?? tag.serviceLine ?? "").trim().toUpperCase();
    if (cs === "DENTAL" || cs.includes("DENTAL")) return true;
  }

  const admission = asRecord(input.admissionSummaryJson);
  if (admission) {
    const cs = String(admission.careSetting ?? admission.serviceLine ?? "").trim().toUpperCase();
    if (cs === "DENTAL" || cs.includes("DENTAL")) return true;
  }
  return false;
}

/** Merge dentalServiceLineV1 into nursingAssessment without wiping other keys. */
export function mergeDentalServiceLineIntoNursingAssessment(
  nursingAssessment: unknown,
  tag: Record<string, unknown> = buildDentalServiceLineTag()
): Record<string, unknown> {
  const base = asRecord(nursingAssessment) ?? {};
  return {
    ...base,
    [D5A3_DENTAL_SERVICE_LINE_TAG]: {
      ...(asRecord(base[D5A3_DENTAL_SERVICE_LINE_TAG]) ?? {}),
      ...tag,
    },
  };
}

export function resolveDentalEncounterWorkspaceHref(input: {
  id: string;
  status?: string | null;
  type?: string | null;
  careSetting?: string | null;
  nursingAssessment?: unknown;
  admissionSummaryJson?: unknown;
}): string | null {
  if (!isDentalEncounterProjection(input)) return null;
  if (isEnterpriseEncounterClosed(input.status)) {
    return `/app/encounters/${encodeURIComponent(input.id)}`;
  }
  return enterpriseDentalEncounterWorkspacePath(input.id);
}

export function assertNoDentalDuplicateEnginesInSource(source: string): boolean {
  for (const name of D5A1_FORBIDDEN_AUTHORITIES) {
    if (source.includes(name)) return false;
  }
  return true;
}

export { D5A1_FORBIDDEN_AUTHORITIES, isForbiddenDentalAuthorityName };
