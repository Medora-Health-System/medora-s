import { z } from "zod";

export const INPATIENT_NURSING_ASSESSMENT_V1_KEY = "inpatientNursingAssessmentV1" as const;
export const INPATIENT_NURSING_ASSESSMENT_INVALID_CARE_SETTING =
  "INPATIENT_NURSING_ASSESSMENT_INVALID_CARE_SETTING" as const;

const text = (max: number) => z.string().trim().max(max);
const codedText = z.object({ code: text(80), note: text(1000).optional() }).strict();

/** Client-authored clinical content only. Identity and time are deliberately absent. */
export const inpatientNursingAssessmentSaveSchema = z.object({
  status: z.enum(["DRAFT", "SAVED", "SIGNED", "FINAL"]),
  assessmentType: z.enum(["INITIAL", "SHIFT", "REASSESSMENT", "FOCUSED"]).optional(),
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
}).strict();

export type InpatientNursingAssessmentSave = z.infer<typeof inpatientNursingAssessmentSaveSchema>;
export type InpatientNursingAssessmentV1 = InpatientNursingAssessmentSave & {
  version: 1;
  sessionId: string;
  authoredAt: string;
  authorUserId: string;
  authorDisplayName: string;
  authorRole: "RN" | "PROVIDER" | "ADMIN";
};

export type InpatientNursingAssessmentOverview = {
  status: InpatientNursingAssessmentV1["status"];
  lastAssessmentAt: string;
  rn: { userId: string; displayName: string; role: string };
  painScore: number | null;
  fallRisk: "LOW" | "MODERATE" | "HIGH" | null;
  mentalStatus: string | null;
  skinWoundConcern: boolean;
  respiratoryConcern: boolean;
  mobility: string | null;
  deviceLineConcern: boolean;
  assessmentType: "INITIAL" | "SHIFT" | "REASSESSMENT" | "FOCUSED" | null;
  significantConcerns: string[];
};

export function projectInpatientNursingAssessmentOverview(
  value: InpatientNursingAssessmentV1,
): InpatientNursingAssessmentOverview {
  const concern = (code?: string) => Boolean(code && !["NORMAL", "NONE", "INTACT", "PATENT"].includes(code.toUpperCase()));
  return {
    status: value.status,
    lastAssessmentAt: value.authoredAt,
    rn: { userId: value.authorUserId, displayName: value.authorDisplayName, role: value.authorRole },
    painScore: value.pain?.score ?? null,
    fallRisk: value.fallRisk?.level ?? null,
    mentalStatus: value.mentalStatus?.code ?? null,
    skinWoundConcern: concern(value.skinWounds?.code),
    respiratoryConcern: concern(value.respiratory?.code) || concern(value.airway?.code),
    mobility: value.mobility?.code ?? null,
    deviceLineConcern: (value.linesDrainsDevices?.length ?? 0) > 0 || (value.ivAccess?.length ?? 0) > 0,
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
  occurredAt: string;
  assessment: InpatientNursingAssessmentV1;
};

export function adaptInpatientNursingAssessmentToClinicalRecord(input: {
  encounterId: string; patientId: string; facilityId: string; assessment: InpatientNursingAssessmentV1;
}): InpatientNursingAssessmentClinicalRecord {
  return { schemaId: INPATIENT_NURSING_ASSESSMENT_V1_KEY, ...input, occurredAt: input.assessment.authoredAt };
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
