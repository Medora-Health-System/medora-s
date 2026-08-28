/**
 * MEDUI.D4C.7 — Public Health, Pharmacy, ambulatory discharge instructions,
 * and final clinical-summary integration for Clinic Care.
 *
 * Reuse enterprise authorities only. No ClinicPharmacy / ClinicMedication /
 * ClinicPrescription / ClinicMAR / ClinicVaccination / ClinicDiseaseReport /
 * ClinicDischarge / ClinicDischargeInstruction / ClinicSummary.
 *
 * Jurisdiction = Facility.country (+ config) — never UI locale.
 * Discharge narrative = typed care-setting context — never hard-code a clinic
 * name globally and never hard-code "Emergency Department" into Clinic text.
 */

import { isHaitiPublicHealthJurisdiction } from "./facilityClinicCareProfileD4c1.js";
import {
  isAmbulatoryExternalPrescriptionItem,
  isAmbulatoryOnsiteMarMedicationItem,
  isExternalPharmacyDispenseIntent,
  isOnsiteAdministerMedicationIntent,
} from "./clinicCareHaitiAmbulatoryOrdersMedicationsResultsD4c5b3.js";

export const CLINIC_CARE_PUBLIC_HEALTH_PHARMACY_DISCHARGE_CERTIFICATION_ID =
  "MEDUI.D4C.7" as const;

/** Forbidden Clinic* duplicate authorities for this certification. */
export const D4C7_FORBIDDEN_CLINIC_AUTHORITY_NAMES = [
  "ClinicPharmacy",
  "ClinicMedication",
  "ClinicPrescription",
  "ClinicMAR",
  "ClinicVaccination",
  "ClinicDiseaseReport",
  "ClinicDischarge",
  "ClinicDischargeInstruction",
  "ClinicSummary",
  "ClinicDiagnosisInstruction",
] as const;

export type D4c7ForbiddenClinicAuthorityName =
  (typeof D4C7_FORBIDDEN_CLINIC_AUTHORITY_NAMES)[number];

/** Typed care settings for discharge instruction language (not string-replace). */
export const D4C7_DISCHARGE_INSTRUCTION_CARE_SETTINGS = [
  "ED",
  "CLINIC",
  "URGENT_CARE",
  "INPATIENT",
] as const;
export type DischargeInstructionCareSetting =
  (typeof D4C7_DISCHARGE_INSTRUCTION_CARE_SETTINGS)[number];

export type DischargeInstructionLocale = "en" | "fr";

/**
 * Care-setting context for diagnosis-driven discharge narratives.
 * facilityDisplayName is required for CLINIC / URGENT_CARE (never invent a name).
 */
export type DischargeInstructionCareSettingContext = {
  careSetting: DischargeInstructionCareSetting;
  /** Facility.displayName / public name — used only when careSetting is not ED. */
  facilityDisplayName: string;
  locale: DischargeInstructionLocale;
  /** Facility.country — jurisdiction only; never UI language. */
  jurisdictionCountry?: string | null;
};

/** Clinic ambulatory checkout / sortie states (not ED Disposition labels). */
export const CLINIC_AMBULATORY_CHECKOUT_STATES = [
  "HOME",
  "CLINIC_FOLLOW_UP",
  "REFERRAL",
  "TRANSFER_ED",
  "AMA",
  "OTHER",
] as const;
export type ClinicAmbulatoryCheckoutState =
  (typeof CLINIC_AMBULATORY_CHECKOUT_STATES)[number];

export const CLINIC_AMBULATORY_CHECKOUT_I18N_KEYS = {
  HOME: "clinicCareD4c7.checkout.home",
  CLINIC_FOLLOW_UP: "clinicCareD4c7.checkout.clinicFollowUp",
  REFERRAL: "clinicCareD4c7.checkout.referral",
  TRANSFER_ED: "clinicCareD4c7.checkout.transferEd",
  AMA: "clinicCareD4c7.checkout.ama",
  OTHER: "clinicCareD4c7.checkout.other",
} as const satisfies Record<ClinicAmbulatoryCheckoutState, string>;

/** Canonical pharmacy verification states (Prisma PharmacyVerificationStatus). */
export const D4C7_PHARMACY_VERIFICATION_STATES = [
  "NOT_REQUIRED",
  "PENDING",
  "VERIFIED",
  "REJECTED",
  "OVERRIDDEN",
] as const;
export type D4c7PharmacyVerificationState =
  (typeof D4C7_PHARMACY_VERIFICATION_STATES)[number];

export const D4C7_PHARMACY_VERIFICATION_I18N_KEYS = {
  NOT_REQUIRED: "clinicCareD4c7.pharmacy.verification.notRequired",
  PENDING: "clinicCareD4c7.pharmacy.verification.pending",
  VERIFIED: "clinicCareD4c7.pharmacy.verification.verified",
  REJECTED: "clinicCareD4c7.pharmacy.verification.rejected",
  OVERRIDDEN: "clinicCareD4c7.pharmacy.verification.overridden",
} as const satisfies Record<D4c7PharmacyVerificationState, string>;

export function ambulatoryPharmacyVerificationLabelKey(
  status: string | null | undefined
): string {
  const key = (status ?? "NOT_REQUIRED").toUpperCase();
  if (key in D4C7_PHARMACY_VERIFICATION_I18N_KEYS) {
    return D4C7_PHARMACY_VERIFICATION_I18N_KEYS[key as D4c7PharmacyVerificationState];
  }
  return D4C7_PHARMACY_VERIFICATION_I18N_KEYS.PENDING;
}

/** Encounter types treated as ambulatory for pharmacy queue filtering. */
export const D4C7_AMBULATORY_PHARMACY_ENCOUNTER_TYPES = [
  "OUTPATIENT",
  "URGENT_CARE",
  "CLINIC",
  "AMBULATORY",
] as const;

export function isAmbulatoryPharmacyQueueEncounterType(
  encounterType: string | null | undefined
): boolean {
  if (!encounterType) return false;
  const t = encounterType.trim().toUpperCase();
  return (D4C7_AMBULATORY_PHARMACY_ENCOUNTER_TYPES as readonly string[]).includes(t);
}

export type D4c7AmbulatoryPharmacyQueueFilter = {
  facilityId: string;
  ambulatoryOnly?: boolean;
  patientId?: string | null;
  providerUserId?: string | null;
  /** ISO date (yyyy-mm-dd) — filter by order createdAt day when set. */
  onDate?: string | null;
  verificationState?: D4c7PharmacyVerificationState | "ANY" | null;
  /** ADMINISTER_CHART | PHARMACY_DISPENSE | ANY */
  fulfillmentIntent?: "ADMINISTER_CHART" | "PHARMACY_DISPENSE" | "ANY" | null;
};

export type D4c7PharmacyQueueOrderLike = {
  facilityId?: string | null;
  createdAt?: string | Date | null;
  orderedByUserId?: string | null;
  encounter?: {
    type?: string | null;
    patientId?: string | null;
    patient?: { id?: string | null } | null;
  } | null;
  items?: Array<{
    medicationFulfillmentIntent?: string | null;
    pharmacyVerificationStatus?: string | null;
    pharmacyVerification?: { status?: string | null } | null;
  }> | null;
};

function orderCreatedOnDate(
  createdAt: string | Date | null | undefined,
  onDate: string
): boolean {
  if (!createdAt) return false;
  const iso = typeof createdAt === "string" ? createdAt : createdAt.toISOString();
  return iso.slice(0, 10) === onDate.slice(0, 10);
}

function itemVerificationStatus(item: {
  pharmacyVerificationStatus?: string | null;
  pharmacyVerification?: { status?: string | null } | null;
}): string {
  return (
    item.pharmacyVerification?.status ??
    item.pharmacyVerificationStatus ??
    "NOT_REQUIRED"
  ).toUpperCase();
}

/**
 * Filter enterprise pharmacy queue rows for ambulatory Clinic Care presentation.
 * Does not invent a ClinicPharmacy engine — presentation filter only.
 */
export function filterAmbulatoryPharmacyQueueOrders<T extends D4c7PharmacyQueueOrderLike>(
  orders: T[],
  filter: D4c7AmbulatoryPharmacyQueueFilter
): T[] {
  const intent = filter.fulfillmentIntent ?? "ANY";
  const verification = filter.verificationState ?? "ANY";
  return orders.filter((order) => {
    if (filter.facilityId && order.facilityId && order.facilityId !== filter.facilityId) {
      return false;
    }
    if (filter.ambulatoryOnly === true) {
      if (!isAmbulatoryPharmacyQueueEncounterType(order.encounter?.type ?? null)) {
        return false;
      }
    }
    const patientId =
      order.encounter?.patientId ?? order.encounter?.patient?.id ?? null;
    if (filter.patientId && patientId && patientId !== filter.patientId) return false;
    if (filter.providerUserId && order.orderedByUserId && order.orderedByUserId !== filter.providerUserId) {
      return false;
    }
    if (filter.onDate && !orderCreatedOnDate(order.createdAt, filter.onDate)) return false;

    const items = order.items ?? [];
    if (items.length === 0) return intent === "ANY" && verification === "ANY";

    const intentOk =
      intent === "ANY" ||
      items.some((item) => {
        if (intent === "PHARMACY_DISPENSE") {
          return isExternalPharmacyDispenseIntent(item.medicationFulfillmentIntent);
        }
        return isOnsiteAdministerMedicationIntent(item.medicationFulfillmentIntent);
      });
    if (!intentOk) return false;

    if (verification !== "ANY") {
      const verOk = items.some(
        (item) => itemVerificationStatus(item) === verification
      );
      if (!verOk) return false;
    }
    return true;
  });
}

export function classifyAmbulatoryMedicationFulfillmentForDischarge(item: {
  catalogItemType?: string | null;
  medicationFulfillmentIntent?: string | null;
}): "EXTERNAL_RX" | "ONSITE_MAR" | "OTHER" {
  if (isAmbulatoryExternalPrescriptionItem(item)) return "EXTERNAL_RX";
  if (isAmbulatoryOnsiteMarMedicationItem(item)) return "ONSITE_MAR";
  return "OTHER";
}

/** Public Health jurisdiction resolution — Facility.country only. */
export type D4c7PublicHealthJurisdictionPathway =
  | { pathway: "MSPP_HAITI"; country: string; canSubmitOfficial: true }
  | { pathway: "CONFIGURED_US"; country: string; canSubmitOfficial: true }
  | {
      pathway: "UNSUPPORTED_DRAFT_ONLY";
      country: string | null;
      canSubmitOfficial: false;
      reason: "CONFIG_REQUIRED";
    };

export function resolveD4c7PublicHealthJurisdictionPathway(input: {
  facilityCountry?: string | null;
  /** Optional configured US pathway flag from facility care profile / module config. */
  usPathwayConfigured?: boolean;
}): D4c7PublicHealthJurisdictionPathway {
  const country = (input.facilityCountry ?? "").trim();
  if (isHaitiPublicHealthJurisdiction(country || null)) {
    return { pathway: "MSPP_HAITI", country: country || "HT", canSubmitOfficial: true };
  }
  const upper = country.toUpperCase();
  if ((upper === "US" || upper === "USA" || upper === "UNITED STATES") && input.usPathwayConfigured === true) {
    return { pathway: "CONFIGURED_US", country: country || "US", canSubmitOfficial: true };
  }
  return {
    pathway: "UNSUPPORTED_DRAFT_ONLY",
    country: country || null,
    canSubmitOfficial: false,
    reason: "CONFIG_REQUIRED",
  };
}

/**
 * Disease reporting: enterprise DiseaseCaseReport has SUSPECTED|CONFIRMED|RULED_OUT —
 * no clinical DRAFT/SUBMITTED enum without migration. Document the gap; never invent
 * ClinicDiseaseReport or silently mark unsupported jurisdictions as submitted.
 */
export const D4C7_DISEASE_REPORT_CLINICAL_DRAFT_LIFECYCLE_PERSISTENCE_GAP =
  "DiseaseCaseReport.status is SUSPECTED|CONFIRMED|RULED_OUT only; clinical DRAFT→submit→amend requires approved Prisma migration (not in D4C.7 scope)." as const;

export function maySubmitOfficialDiseaseReportForJurisdiction(
  pathway: D4c7PublicHealthJurisdictionPathway
): boolean {
  return pathway.canSubmitOfficial === true;
}

/** Role matrix — vaccinations (reuse VaccineAdministration). */
export const D4C7_VACCINATION_ROLE_MATRIX = {
  record: ["RN", "PROVIDER", "ADMIN", "MSPP_VACCINATIONS"] as const,
  viewChart: ["RN", "PROVIDER", "ADMIN"] as const,
  viewPublicHealthWorkspace: ["RN", "PROVIDER", "ADMIN", "MSPP_VACCINATIONS", "MSPP_ADMIN"] as const,
} as const;

export function canRecordVaccineAdministration(roles: string[]): boolean {
  return roles.some((r) =>
    (D4C7_VACCINATION_ROLE_MATRIX.record as readonly string[]).includes(r)
  );
}

export function canViewPatientVaccinations(roles: string[]): boolean {
  return roles.some((r) =>
    (D4C7_VACCINATION_ROLE_MATRIX.viewChart as readonly string[]).includes(r)
  );
}

/** Enterprise PH nav paths — no Clinic-only duplicate engines. */
export const D4C7_PUBLIC_HEALTH_NAV = {
  summary: "/app/public-health/summary",
  vaccinations: "/app/public-health/vaccinations",
  diseaseReports: "/app/public-health/disease-reports",
} as const;

export function buildClinicCarePublicHealthDeepLink(input: {
  target: keyof typeof D4C7_PUBLIC_HEALTH_NAV;
  encounterId?: string | null;
  patientId?: string | null;
}): string {
  const base = D4C7_PUBLIC_HEALTH_NAV[input.target];
  const params = new URLSearchParams();
  if (input.encounterId) params.set("encounterId", input.encounterId);
  if (input.patientId) params.set("patientId", input.patientId);
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

/** Typed visit-framing phrases for discharge narratives. */
export type DischargeVisitFramingPhrases = {
  /** e.g. "in the Emergency Department" / "at Clinique X" */
  evaluatedLocation: string;
  /** e.g. "after an emergency visit" / "after this clinic visit" */
  afterVisit: string;
  /** Universal return suffix (care-setting aware). */
  returnImmediatelySuffix: string;
  /** Label key for left-facility datetime field. */
  leftFacilityLabelKey: string;
  /** Short care-setting noun for summaries. */
  careSettingNoun: string;
};

function requireFacilityDisplayName(ctx: DischargeInstructionCareSettingContext): string {
  const name = ctx.facilityDisplayName.trim();
  if (!name) {
    return ctx.locale === "fr" ? "cet établissement" : "this facility";
  }
  return name;
}

/**
 * Resolve typed visit framing for discharge instructions.
 * ED keeps emergency-department language. CLINIC uses facility display name.
 * Never hard-codes a specific clinic name globally.
 */
export function resolveDischargeVisitFramingPhrases(
  ctx: DischargeInstructionCareSettingContext
): DischargeVisitFramingPhrases {
  const facility = requireFacilityDisplayName(ctx);
  if (ctx.careSetting === "ED") {
    if (ctx.locale === "fr") {
      return {
        evaluatedLocation: "aux urgences",
        afterVisit: "après une visite aux urgences",
        returnImmediatelySuffix:
          "Retournez aux urgences immédiatement si les symptômes s'aggravent, si de nouveaux signes inquiétants apparaissent ou si vous ne vous sentez pas en sécurité à domicile.",
        leftFacilityLabelKey: "providerDischargeDocumentation19Y.patientLeftEd",
        careSettingNoun: "urgences",
      };
    }
    return {
      evaluatedLocation: "in the Emergency Department",
      afterVisit: "after an emergency visit",
      returnImmediatelySuffix:
        "Return to the emergency department immediately if symptoms worsen, new concerning symptoms develop, or you feel unsafe at home.",
      leftFacilityLabelKey: "providerDischargeDocumentation19Y.patientLeftEd",
      careSettingNoun: "Emergency Department",
    };
  }

  // CLINIC, URGENT_CARE, or INPATIENT — facility-aware, never "Emergency Department"
  if (ctx.careSetting === "INPATIENT") {
    if (ctx.locale === "fr") {
      return {
        evaluatedLocation: `à ${facility}`,
        afterVisit: "après cette hospitalisation",
        returnImmediatelySuffix: `Reconsultez immédiatement ${facility} ou les urgences si les symptômes s'aggravent, si de nouveaux signes inquiétants apparaissent ou si vous ne vous sentez pas en sécurité à domicile.`,
        leftFacilityLabelKey: "inpatientProviderDischargeInpDis1b.patientLeftHospital",
        careSettingNoun: facility,
      };
    }
    return {
      evaluatedLocation: `at ${facility}`,
      afterVisit: "after this hospitalization",
      returnImmediatelySuffix: `Return to ${facility} or seek emergency care immediately if symptoms worsen, new concerning symptoms develop, or you feel unsafe at home.`,
      leftFacilityLabelKey: "inpatientProviderDischargeInpDis1b.patientLeftHospital",
      careSettingNoun: facility,
    };
  }

  if (ctx.locale === "fr") {
    return {
      evaluatedLocation: `à ${facility}`,
      afterVisit: "après cette consultation",
      returnImmediatelySuffix: `Reconsultez immédiatement ${facility} ou les urgences si les symptômes s'aggravent, si de nouveaux signes inquiétants apparaissent ou si vous ne vous sentez pas en sécurité à domicile.`,
      leftFacilityLabelKey: "clinicCareD4c7.discharge.patientLeftClinic",
      careSettingNoun: facility,
    };
  }
  return {
    evaluatedLocation: `at ${facility}`,
    afterVisit: "after this clinic visit",
    returnImmediatelySuffix: `Return to ${facility} or seek emergency care immediately if symptoms worsen, new concerning symptoms develop, or you feel unsafe at home.`,
    leftFacilityLabelKey: "clinicCareD4c7.discharge.patientLeftClinic",
    careSettingNoun: facility,
  };
}

/**
 * Adapt a single narrative string using typed care-setting phrases.
 * Pattern-driven (known ED framing → typed Clinic framing), not a blind global
 * replace of every "Emergency Department" substring in arbitrary text.
 */
export function adaptDischargeNarrativeForCareSetting(
  text: string,
  ctx: DischargeInstructionCareSettingContext
): string {
  if (!text.trim() || ctx.careSetting === "ED") return text;
  const phrases = resolveDischargeVisitFramingPhrases(ctx);
  let out = text;

  if (ctx.locale === "en") {
    out = out
      .replace(/\bin the [Ee]mergency [Dd]epartment\b/g, phrases.evaluatedLocation)
      .replace(/\bin the [Ee]mergency [Rr]oom\b/g, phrases.evaluatedLocation)
      .replace(/\bafter an emergency visit\b/gi, phrases.afterVisit)
      .replace(/\bduring this emergency visit\b/gi, "during this clinic visit")
      .replace(/\bReturn to the emergency department immediately\b/gi, () => {
        // Use full typed suffix start when the template only had the ED opener
        const m = phrases.returnImmediatelySuffix.match(/^Return to .+? immediately/);
        return m?.[0] ?? `Return to ${requireFacilityDisplayName(ctx)} or seek emergency care immediately`;
      })
      .replace(/\breturn to the [Ee]mergency [Dd]epartment\b/g, `return to ${requireFacilityDisplayName(ctx)} or seek emergency care`)
      .replace(/\bleft the [Ee]mergency [Dd]epartment\b/g, `left ${requireFacilityDisplayName(ctx)}`);
  } else {
    out = out
      .replace(/\bpris en charge aux urgences\b/gi, `pris en charge ${phrases.evaluatedLocation}`)
      .replace(/\baprès une visite aux urgences\b/gi, phrases.afterVisit)
      .replace(/\bpendant cette visite aux urgences\b/gi, "pendant cette consultation")
      .replace(/\bRetournez aux urgences immédiatement\b/gi, () => {
        const m = phrases.returnImmediatelySuffix.match(/^Reconsultez immédiatement .+?(?: ou les urgences)?(?=\s+si)/i);
        if (m) return m[0].trim();
        return `Reconsultez immédiatement ${requireFacilityDisplayName(ctx)} ou les urgences`;
      })
      .replace(/\bReconsultez aux urgences\b/gi, `Reconsultez ${requireFacilityDisplayName(ctx)} ou les urgences`)
      .replace(/\bservice d'urgence\b/gi, requireFacilityDisplayName(ctx))
      // Generic last — after specific multi-word ED phrases
      .replace(/\baux urgences\b/gi, phrases.evaluatedLocation);
  }

  return out;
}

export function adaptDischargeSuggestedTextBodyForCareSetting<
  T extends {
    description: string;
    diagnosisInstructions: string;
    medicationTreatment: string;
    returnPrecautions: string;
    returnWorkSchool?: string;
    caregiverInstructions?: string;
    treatment?: string;
  },
>(body: T, ctx: DischargeInstructionCareSettingContext): T {
  if (ctx.careSetting === "ED") return body;
  const adapt = (s: string) => adaptDischargeNarrativeForCareSetting(s, ctx);
  return {
    ...body,
    description: adapt(body.description),
    diagnosisInstructions: adapt(body.diagnosisInstructions),
    medicationTreatment: adapt(body.medicationTreatment),
    returnPrecautions: adapt(body.returnPrecautions),
    ...(body.returnWorkSchool ? { returnWorkSchool: adapt(body.returnWorkSchool) } : {}),
    ...(body.caregiverInstructions ?
      { caregiverInstructions: adapt(body.caregiverInstructions) }
    : {}),
    ...(body.treatment ? { treatment: adapt(body.treatment) } : {}),
  };
}

/**
 * Haiti French discharge must not silently include English instruction bodies.
 * Content gap → leave empty / block apply; never fabricate or swap to English.
 */
export function shouldBlockEnglishDischargeContentForFrenchLocale(input: {
  uiLocale: DischargeInstructionLocale;
  contentLocale: DischargeInstructionLocale | null | undefined;
  jurisdictionCountry?: string | null;
}): boolean {
  if (input.uiLocale !== "fr") return false;
  if (input.contentLocale === "fr") return false;
  if (input.contentLocale === "en") {
    return isHaitiPublicHealthJurisdiction(input.jurisdictionCountry ?? null);
  }
  // Missing French content for Haiti French UI
  return isHaitiPublicHealthJurisdiction(input.jurisdictionCountry ?? null);
}

export function clinicDischargePrintBlockedReason(input: {
  hasSignedFinal: boolean;
  hasInstructionContent: boolean;
  containsEdOnlyWording: boolean;
  careSetting: DischargeInstructionCareSetting;
}): string | null {
  if (!input.hasInstructionContent) return "clinicCareD4c7.print.blockedEmpty";
  if (!input.hasSignedFinal) return "clinicCareD4c7.print.blockedUnsigned";
  if (input.careSetting !== "ED" && input.containsEdOnlyWording) {
    return "clinicCareD4c7.print.blockedEdWording";
  }
  return null;
}

export function dischargeNarrativeContainsEdOnlyWording(
  text: string,
  careSetting: DischargeInstructionCareSetting
): boolean {
  if (careSetting === "ED") return false;
  const blob = text.toLowerCase();
  return (
    blob.includes("emergency department") ||
    blob.includes("emergency room") ||
    blob.includes("emergency visit") ||
    blob.includes("aux urgences") ||
    blob.includes("visite aux urgences") ||
    blob.includes("service d'urgence")
  );
}

/** Shared discharge workflow mount contract for Clinic Suivi/sortie. */
export const D4C7_CLINIC_DISCHARGE_WORKFLOW_REQUIREMENTS = [
  "ProviderDischargeDocumentationSection",
  "diagnosisAutoProjection",
  "applyRefreshSuggestion",
  "careSettingAwareLanguage",
  "facilityDisplayName",
  "printSignedFinalOnly",
  "EmergencyVisitSummaryPanel",
] as const;

export function assertNoForbiddenClinicAuthorityName(name: string): boolean {
  return !(D4C7_FORBIDDEN_CLINIC_AUTHORITY_NAMES as readonly string[]).includes(name);
}
