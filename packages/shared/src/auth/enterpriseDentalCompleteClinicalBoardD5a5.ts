/**
 * MEDUI.D5A.5 — Enterprise Dental Complete Clinical Board contracts.
 * Dental-specific clinical domains over enterprise Patient + Encounter.
 * No CDT fabrication; no auto periodontal diagnosis; Overview is a projection.
 */

export const D5A5_CERTIFICATION_ID = "MEDUI.D5A.5" as const;
/** Corrective authoring completion over D5A.5 (no new schema phase). */
export const D5A5A_CERTIFICATION_ID = "MEDUI.D5A.5A" as const;

export const D5A5_NOT_DOCUMENTED_FR = "Non documenté" as const;
export const D5A5_NOT_DOCUMENTED_EN = "Not documented" as const;

/** Encounter-scoped dental medical-history review acknowledgement (zero-schema). */
export const D5A5_DENTAL_HISTORY_REVIEW_KEY = "dentalHistoryReviewV1" as const;

/**
 * MEDUI.D5A.5A — forks forbidden for clinical-board completion.
 * Longitudinal history + consents remain enterprise authorities.
 */
export const D5A5A_FORBIDDEN_AUTHORITIES = [
  "DentalMedicalHistory",
  "DentalConsent",
  "DentalEncounter",
  "DentalMRN",
  "DentalPatient",
] as const;

export function assertNoForbiddenDentalClinicalBoardAuthorities(
  names: readonly string[]
): { ok: true } | { ok: false; forbidden: string[] } {
  const hit = names.filter((n) =>
    (D5A5A_FORBIDDEN_AUTHORITIES as readonly string[]).includes(n)
  );
  if (hit.length > 0) return { ok: false, forbidden: hit };
  return { ok: true };
}

/** Six-site periodontal layout (facial/buccal + lingual/palatal). */
export const D5A5_PERIODONTAL_SITES = ["MB", "B", "DB", "ML", "L", "DL"] as const;
export type D5a5PeriodontalSite = (typeof D5A5_PERIODONTAL_SITES)[number];

export function isD5a5PeriodontalSite(value: string | null | undefined): value is D5a5PeriodontalSite {
  return (D5A5_PERIODONTAL_SITES as readonly string[]).includes(String(value ?? "").trim().toUpperCase());
}

export const D5A5_PERIODONTAL_STATUS = [
  "NOT_ASSESSED",
  "HEALTH",
  "GINGIVITIS",
  "PERIODONTITIS",
  "OTHER",
] as const;
export type D5a5PeriodontalStatus = (typeof D5A5_PERIODONTAL_STATUS)[number];

export const D5A5_PERIODONTITIS_STAGES = ["I", "II", "III", "IV", "NOT_DETERMINED"] as const;
export const D5A5_PERIODONTITIS_GRADES = ["A", "B", "C", "NOT_DETERMINED"] as const;
export const D5A5_PERIODONTAL_EXTENT = [
  "LOCALIZED",
  "GENERALIZED",
  "MOLAR_INCISOR",
  "NOT_DETERMINED",
] as const;
export const D5A5_PERI_IMPLANT_STATUS = [
  "NOT_APPLICABLE",
  "HEALTH",
  "MUCOSITIS",
  "PERI_IMPLANTITIS",
  "OTHER",
] as const;

export const D5A5_TREATMENT_PLAN_ITEM_STATUSES = [
  "PROPOSED",
  "ACCEPTED",
  "DECLINED",
  "DEFERRED",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
export type D5a5TreatmentPlanItemStatus = (typeof D5A5_TREATMENT_PLAN_ITEM_STATUSES)[number];

export const D5A5_TREATMENT_PLAN_PHASES = [
  "URGENT",
  "DISEASE_CONTROL",
  "RESTORATIVE",
  "PERIODONTAL",
  "ENDODONTIC",
  "SURGICAL",
  "PROSTHODONTIC",
  "ORTHODONTIC",
  "MAINTENANCE",
] as const;
export type D5a5TreatmentPlanPhase = (typeof D5A5_TREATMENT_PLAN_PHASES)[number];

export const D5A5_TREATMENT_ACCEPTANCE = [
  "NOT_DISCUSSED",
  "ACCEPTED",
  "PARTIAL",
  "REFUSED",
  "DEFERRED",
] as const;

export const D5A5_PROCEDURE_STATUSES = [
  "DOCUMENTED",
  "AMENDED",
  "VOIDED",
] as const;

/** Overview encounter-record sections (projection order). */
export const D5A5_OVERVIEW_SECTIONS = [
  "patientIdentity",
  "encounterMeta",
  "careTeam",
  "reasonForVisit",
  "alertsHistory",
  "dentalEvaluation",
  "odontogramFindings",
  "periodontalExam",
  "diagnoses",
  "imagingOrdersResults",
  "treatmentPlan",
  "treatmentAcceptance",
  "procedures",
  "prescriptions",
  "notes",
  "documents",
  "followUp",
  "signatures",
  "addenda",
  "lifecycle",
] as const;
export type D5a5OverviewSection = (typeof D5A5_OVERVIEW_SECTIONS)[number];

export type D5a5PeriodontalSiteInput = {
  toothCode: string;
  site: string;
  probingDepthMm?: number | null;
  gingivalMarginMm?: number | null;
  clinicalAttachmentLevelMm?: number | null;
  bleedingOnProbing?: boolean;
  plaque?: boolean;
  suppuration?: boolean;
  mobilityGrade?: number | null;
  furcationGrade?: number | null;
  missingTooth?: boolean;
  implantSite?: boolean;
  notes?: string | null;
};

export type D5a5PeriodontalSummary = {
  siteCount: number;
  bleedingPercent: number | null;
  plaquePercent: number | null;
  deepestProbingDepthMm: number | null;
  sitesAtOrAboveThreshold: number;
  thresholdMm: number;
  mobilityFlaggedToothCount: number;
  furcationFlaggedToothCount: number;
};

/**
 * Read-only periodontal summaries. Never assigns disease stage/grade.
 */
export function summarizePeriodontalSites(
  sites: readonly D5a5PeriodontalSiteInput[],
  thresholdMm = 4
): D5a5PeriodontalSummary {
  const measurable = sites.filter((s) => !s.missingTooth);
  const withPd = measurable.filter(
    (s) => typeof s.probingDepthMm === "number" && Number.isFinite(s.probingDepthMm)
  );
  const bopDenom = measurable.filter((s) => s.bleedingOnProbing != null).length;
  const plaqueDenom = measurable.filter((s) => s.plaque != null).length;
  const bopCount = measurable.filter((s) => s.bleedingOnProbing === true).length;
  const plaqueCount = measurable.filter((s) => s.plaque === true).length;
  const deepest =
    withPd.length === 0
      ? null
      : Math.max(...withPd.map((s) => Number(s.probingDepthMm)));
  const sitesAtOrAbove = withPd.filter((s) => Number(s.probingDepthMm) >= thresholdMm).length;

  const mobilityTeeth = new Set(
    measurable
      .filter((s) => typeof s.mobilityGrade === "number" && Number(s.mobilityGrade) > 0)
      .map((s) => s.toothCode)
  );
  const furcationTeeth = new Set(
    measurable
      .filter((s) => typeof s.furcationGrade === "number" && Number(s.furcationGrade) > 0)
      .map((s) => s.toothCode)
  );

  return {
    siteCount: measurable.length,
    bleedingPercent: bopDenom === 0 ? null : Math.round((bopCount / bopDenom) * 1000) / 10,
    plaquePercent: plaqueDenom === 0 ? null : Math.round((plaqueCount / plaqueDenom) * 1000) / 10,
    deepestProbingDepthMm: deepest,
    sitesAtOrAboveThreshold: sitesAtOrAbove,
    thresholdMm,
    mobilityFlaggedToothCount: mobilityTeeth.size,
    furcationFlaggedToothCount: furcationTeeth.size,
  };
}

export function isD5a5TreatmentPlanItemStatus(
  value: string | null | undefined
): value is D5a5TreatmentPlanItemStatus {
  return (D5A5_TREATMENT_PLAN_ITEM_STATUSES as readonly string[]).includes(
    String(value ?? "").trim().toUpperCase()
  );
}

export function isD5a5TreatmentPlanPhase(
  value: string | null | undefined
): value is D5a5TreatmentPlanPhase {
  return (D5A5_TREATMENT_PLAN_PHASES as readonly string[]).includes(
    String(value ?? "").trim().toUpperCase()
  );
}

export function validateProbingDepthMm(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 20) {
    throw new Error("INVALID_PROBING_DEPTH");
  }
  return Math.round(n * 10) / 10;
}

export function deriveClinicalAttachmentLevelMm(input: {
  probingDepthMm?: number | null;
  gingivalMarginMm?: number | null;
}): number | null {
  if (
    typeof input.probingDepthMm !== "number" ||
    typeof input.gingivalMarginMm !== "number" ||
    !Number.isFinite(input.probingDepthMm) ||
    !Number.isFinite(input.gingivalMarginMm)
  ) {
    return null;
  }
  // Recession-positive gingival margin convention: CAL ≈ PD + recession.
  return Math.round((input.probingDepthMm + input.gingivalMarginMm) * 10) / 10;
}

/** Bulk tooth-finding payload: one authoritative finding per toothCode. */
export type D5a5BulkToothFindingInput = {
  toothCodes: string[];
  scope?: string;
  surfaces?: string[];
  findingType: string;
  clinicalState?: string;
  notes?: string | null;
};

export function normalizeBulkToothCodes(codes: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of codes) {
    const c = String(raw ?? "")
      .trim()
      .toUpperCase();
    if (!c || seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}
