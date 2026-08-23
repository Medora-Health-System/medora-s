import { z } from "zod";

export const INPATIENT_NURSING_ASSESSMENT_V1_KEY = "inpatientNursingAssessmentV1" as const;
export const INPATIENT_NURSING_ASSESSMENT_INVALID_CARE_SETTING =
  "INPATIENT_NURSING_ASSESSMENT_INVALID_CARE_SETTING" as const;

const text = (max: number) => z.string().trim().max(max);
const codedText = z.object({ code: text(80), note: text(1000).optional() }).strict();

/**
 * Client-authored clinical content only.
 * Identity + server audit time (`authoredAt`) remain server-owned.
 * Optional `clinicalDocumentedAt` is the clinician-selected clinical effective time (INP.1B.6).
 */
export const inpatientNursingAssessmentSaveSchema = z.object({
  status: z.enum(["DRAFT", "SAVED", "SIGNED", "FINAL"]),
  assessmentType: z.enum(["INITIAL", "SHIFT", "REASSESSMENT", "FOCUSED"]).optional(),
  /**
   * Clinician-selected clinical documentation / effective time (ISO-8601).
   * Distinct from server `authoredAt` and `EncounterClinicalEvent.createdAt`.
   */
  clinicalDocumentedAt: z.string().trim().min(1).max(40).optional(),
  /** Structured bedside findings: stable clinical codes only, never translations. */
  structuredFindings: z.record(z.string().max(80), z.union([text(1000), z.number(), z.boolean(), z.array(text(80)).max(30)])).optional(),
  sectionStatus: z.record(z.string().max(80), z.enum(["WNL", "ABNORMAL"])).optional(),
  significantConcerns: z.array(text(80)).max(20).optional(),
  generalAppearance: codedText.optional(),
  mentalStatus: codedText.optional(),
  orientation: z.array(text(80)).max(12).optional(),
  speech: codedText.optional(),
  pain: z.object({ score: z.number().int().min(0).max(10), location: text(200).optional(), intervention: text(1000).optional() }).strict().optional(),
  airway: codedText.optional(),
  respiratory: codedText.optional(),
  cardiac: codedText.optional(),
  skinWounds: codedText.optional(),
  fallRisk: z.object({ level: z.enum(["LOW", "MODERATE", "HIGH"]), score: z.number().min(0).optional() }).strict().optional(),
  mobility: codedText.optional(),
  ivAccess: z.array(codedText).max(20).optional(),
  linesDrainsDevices: z.array(codedText).max(40).optional(),
  neurologic: codedText.optional(),
  giAbdomen: codedText.optional(),
  gu: codedText.optional(),
  musculoskeletal: codedText.optional(),
  safety: codedText.optional(),
  narrative: text(8000).optional(),
  /** Owner correction of a specific prior session — never mutates that session. */
  correctionOfSessionId: z.string().trim().min(1).max(80).optional(),
  /** Required when correctionOfSessionId is set. */
  correctionReason: z.string().trim().min(1).max(500).optional(),
}).strict();

export type InpatientNursingAssessmentSave = z.infer<typeof inpatientNursingAssessmentSaveSchema>;
export type InpatientNursingAssessmentV1 = InpatientNursingAssessmentSave & {
  version: 1;
  sessionId: string;
  /** Server audit / save attribution time — never client-supplied. */
  authoredAt: string;
  authorUserId: string;
  authorDisplayName: string;
  authorRole: "RN" | "PROVIDER" | "ADMIN";
};

export const INPATIENT_CLINICAL_DOCUMENTED_AT_INVALID =
  "INPATIENT_CLINICAL_DOCUMENTED_AT_INVALID" as const;

/** Max future skew and late-entry window for clinician-selected clinical time. */
export const INPATIENT_CLINICAL_TIME_MAX_FUTURE_MS = 24 * 60 * 60 * 1000;
export const INPATIENT_CLINICAL_TIME_MAX_PAST_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Normalize/validate clinician-selected clinical time without touching server audit stamps.
 * Returns ISO string, or null when omitted (caller may default display to now).
 */
export function normalizeInpatientClinicalDocumentedAt(
  raw: string | null | undefined,
  nowMs: number = Date.now(),
): { ok: true; value: string | null } | { ok: false; code: typeof INPATIENT_CLINICAL_DOCUMENTED_AT_INVALID } {
  if (raw == null || !String(raw).trim()) return { ok: true, value: null };
  const ms = Date.parse(String(raw).trim());
  if (!Number.isFinite(ms)) return { ok: false, code: INPATIENT_CLINICAL_DOCUMENTED_AT_INVALID };
  if (ms > nowMs + INPATIENT_CLINICAL_TIME_MAX_FUTURE_MS) {
    return { ok: false, code: INPATIENT_CLINICAL_DOCUMENTED_AT_INVALID };
  }
  if (ms < nowMs - INPATIENT_CLINICAL_TIME_MAX_PAST_MS) {
    return { ok: false, code: INPATIENT_CLINICAL_DOCUMENTED_AT_INVALID };
  }
  return { ok: true, value: new Date(ms).toISOString() };
}

/** Column / legal-record clinical time prefers clinician selection over server audit. */
export function resolveInpatientNursingClinicalOccurredAt(
  assessment: Pick<InpatientNursingAssessmentV1, "authoredAt" | "clinicalDocumentedAt">,
): string {
  const clinical = assessment.clinicalDocumentedAt?.trim();
  return clinical || assessment.authoredAt;
}

export type InpatientNursingAssessmentOverview = {
  status: InpatientNursingAssessmentV1["status"];
  /** Clinical effective / column time. */
  lastAssessmentAt: string;
  /** Server audit save time (distinct when late-charted). */
  serverAuthoredAt: string;
  rn: { userId: string; displayName: string; role: string };
  painScore: number | null;
  painLocation: string | null;
  fallRisk: "LOW" | "MODERATE" | "HIGH" | null;
  mentalStatus: string | null;
  orientation: string | null;
  respiratoryStatus: string | null;
  cardiovascularConcern: boolean;
  giGuConcern: boolean;
  skinWoundConcern: boolean;
  respiratoryConcern: boolean;
  mobility: string | null;
  deviceLineConcern: boolean;
  safetyConcern: boolean;
  nutritionStatus: string | null;
  narrativeExcerpt: string | null;
  assessmentType: "INITIAL" | "SHIFT" | "REASSESSMENT" | "FOCUSED" | null;
  significantConcerns: string[];
};

export function projectInpatientNursingAssessmentOverview(
  value: InpatientNursingAssessmentV1,
): InpatientNursingAssessmentOverview {
  const sf = value.structuredFindings ?? {};
  const concern = (code?: string | null) =>
    Boolean(code && !["NORMAL", "NONE", "INTACT", "PATENT", "WNL", "CLEAR", "ROOM_AIR"].includes(String(code).toUpperCase()));
  const str = (key: string) => {
    const v = sf[key];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  const narrative = value.narrative?.trim() || null;
  return {
    status: value.status,
    lastAssessmentAt: resolveInpatientNursingClinicalOccurredAt(value),
    serverAuthoredAt: value.authoredAt,
    rn: { userId: value.authorUserId, displayName: value.authorDisplayName, role: value.authorRole },
    painScore: value.pain?.score ?? (typeof sf.painScore === "number" ? sf.painScore : null),
    painLocation: value.pain?.location ?? str("painLocation"),
    fallRisk: value.fallRisk?.level ?? null,
    mentalStatus: value.mentalStatus?.code ?? str("levelOfConsciousness"),
    orientation: str("orientationQuick") ?? (value.orientation?.length ? value.orientation.join(",") : null),
    respiratoryStatus: str("respiratoryEffort") ?? value.respiratory?.code ?? null,
    cardiovascularConcern: concern(str("rhythm")) || concern(value.cardiac?.code) || concern(str("peripheralPulses")),
    giGuConcern: concern(str("abdomen")) || concern(str("voiding")) || concern(value.giAbdomen?.code) || concern(value.gu?.code),
    skinWoundConcern: concern(value.skinWounds?.code) || concern(str("pressureInjuryConcern")) || concern(str("skin")),
    respiratoryConcern: concern(value.respiratory?.code) || concern(value.airway?.code) || concern(str("airway")),
    mobility: value.mobility?.code ?? str("mobility"),
    deviceLineConcern: (value.linesDrainsDevices?.length ?? 0) > 0 || (value.ivAccess?.length ?? 0) > 0 || Boolean(str("linesDrainsDevices")),
    safetyConcern: concern(str("safetyPrecautions")) || concern(value.safety?.code) || concern(str("fallRisk")),
    nutritionStatus: str("nutritionHydration") ?? null,
    narrativeExcerpt: narrative ? narrative.slice(0, 240) : null,
    assessmentType: value.assessmentType ?? null,
    significantConcerns: value.significantConcerns ?? [],
  };
}

/** One immutable typed adapter is consumed by Summary, chart and print/export; none owns a copy. */
export type InpatientNursingAssessmentClinicalRecord = {
  schemaId: typeof INPATIENT_NURSING_ASSESSMENT_V1_KEY;
  encounterId: string;
  patientId: string;
  facilityId: string;
  /** Clinical effective time for legal-record display. */
  occurredAt: string;
  /** Server audit provenance. */
  serverAuthoredAt: string;
  assessment: InpatientNursingAssessmentV1;
};

export function adaptInpatientNursingAssessmentToClinicalRecord(input: {
  encounterId: string; patientId: string; facilityId: string; assessment: InpatientNursingAssessmentV1;
}): InpatientNursingAssessmentClinicalRecord {
  return {
    schemaId: INPATIENT_NURSING_ASSESSMENT_V1_KEY,
    ...input,
    occurredAt: resolveInpatientNursingClinicalOccurredAt(input.assessment),
    serverAuthoredAt: input.assessment.authoredAt,
  };
}

export const projectInpatientSummaryAssessment = adaptInpatientNursingAssessmentToClinicalRecord;
export const projectPatientChartInpatientAssessment = adaptInpatientNursingAssessmentToClinicalRecord;
export const projectPrintExportInpatientAssessment = adaptInpatientNursingAssessmentToClinicalRecord;

export const patientHistorySectionSchema = z.discriminatedUnion("section", [
  z.object({ section: z.literal("medicalHistory"), value: z.object({ pastMedicalHistory: text(8000) }).strict() }).strict(),
  z.object({ section: z.literal("surgicalHistory"), value: z.object({ pastSurgicalHistory: text(8000) }).strict() }).strict(),
  z.object({ section: z.literal("homeMedications"), value: z.object({ medicationsSummary: text(8000), medicationSummarySelections: z.array(text(200)).max(100).optional() }).strict() }).strict(),
  z.object({ section: z.literal("tobacco"), value: z.object({ smokingStatus: text(1000) }).strict() }).strict(),
  z.object({ section: z.literal("alcohol"), value: z.object({ alcoholUse: text(1000) }).strict() }).strict(),
  z.object({ section: z.literal("substances"), value: z.object({ marijuanaUse: text(1000).optional(), stimulantUse: text(1000).optional(), opioidHeroinUse: text(1000).optional() }).strict() }).strict(),
  z.object({ section: z.literal("socialHistory"), value: z.object({ historySocialComments: text(8000), socialHistorySelections: z.array(text(200)).max(100).optional() }).strict() }).strict(),
]);
export type PatientHistorySectionUpdate = z.infer<typeof patientHistorySectionSchema>;
