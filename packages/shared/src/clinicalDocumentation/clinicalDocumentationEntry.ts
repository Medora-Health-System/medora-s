import { z } from "zod";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";
import {
  CLINICAL_DOCUMENTATION_CATEGORIES,
  type ClinicalDocumentationCategory,
} from "./clinicalDocumentationTypes.js";
import {
  summarizeObservationDocumentationPayload,
  validatePayloadForCard,
  EDOC_BASIC_STRUCTURED_CARD_ID,
  EDOC3_OBSERVATION_DOCUMENTATION_CARD_IDS,
} from "./observationDocumentationPayloads.js";
import {
  EDOC4_STROKE_DOCUMENTATION_CARD_IDS,
  summarizeStrokeDocumentationPayload,
} from "./strokeDocumentationPayloads.js";
import {
  EDOC5_INTAKE_OUTPUT_CARD_IDS,
  summarizeIntakeOutputDocumentationPayload,
} from "./intakeOutputDocumentationPayloads.js";
import {
  EDOC6_RESTRAINT_DOCUMENTATION_CARD_IDS,
  summarizeRestraintDocumentationPayload,
} from "./restraintDocumentationPayloads.js";
import {
  EDOC7_BLOOD_PRODUCT_DOCUMENTATION_CARD_IDS,
  finalizeBloodProductPayloadAfterWitness,
  formatClinicalDocumentationSignerSummaryLines,
  summarizeBloodProductDocumentationPayload,
} from "./bloodProductDocumentationPayloads.js";
import {
  EDOC8_HIGH_ALERT_INFUSION_DOCUMENTATION_CARD_IDS,
  finalizeHighAlertInfusionPayloadAfterWitness,
  summarizeHighAlertInfusionDocumentationPayload,
} from "./highAlertInfusionDocumentationPayloads.js";
import {
  EDOC9_BELONGINGS_VALUABLES_DOCUMENTATION_CARD_IDS,
  summarizeBelongingsValuablesDocumentationPayload,
} from "./belongingsValuablesDocumentationPayloads.js";
import {
  EDOC10_PROCEDURAL_SEDATION_DOCUMENTATION_CARD_IDS,
  summarizeProceduralSedationDocumentationPayload,
} from "./proceduralSedationDocumentationPayloads.js";
import {
  EDOC11_STROKE_NEURO_REASSESSMENT_CARD_IDS,
  summarizeStrokeNeuroReassessmentPayload,
} from "./strokeNeuroReassessmentDocumentationPayloads.js";
import {
  EDOC12_RESPIRATORY_DOCUMENTATION_CARD_IDS,
  summarizeRespiratoryDocumentationPayload,
} from "./respiratoryDocumentationPayloads.js";
import {
  EDOC13_PAIN_DOCUMENTATION_CARD_IDS,
  summarizePainDocumentationPayload,
} from "./painDocumentationPayloads.js";
import {
  EDOC14_NEUROLOGICAL_DOCUMENTATION_CARD_IDS,
  summarizeNeurologicalDocumentationPayload,
} from "./neurologicalDocumentationPayloads.js";
import {
  EDOC14_FALL_RISK_SAFETY_DOCUMENTATION_CARD_IDS,
  summarizeFallRiskSafetyDocumentationPayload,
} from "./fallRiskSafetyDocumentationPayloads.js";
import {
  EDOC15_CARDIAC_MONITORING_DOCUMENTATION_CARD_IDS,
  summarizeCardiacMonitoringDocumentationPayload,
} from "./cardiacMonitoringDocumentationPayloads.js";
import {
  EDOC16_BEHAVIORAL_HEALTH_SAFETY_DOCUMENTATION_CARD_IDS,
  summarizeBehavioralHealthSafetyDocumentationPayload,
} from "./behavioralHealthSafetyDocumentationPayloads.js";
import {
  EDOC17_DEVICE_LINE_TUBE_DRAIN_MONITORING_CARD_IDS,
  summarizeDeviceLineTubeDrainMonitoringPayload,
} from "./deviceLineTubeDrainMonitoringDocumentationPayloads.js";
import {
  EDOC18_SEPSIS_MONITORING_DOCUMENTATION_CARD_IDS,
  summarizeSepsisMonitoringDocumentationPayload,
} from "./sepsisMonitoringDocumentationPayloads.js";
import {
  EDOC19_NURSING_ADMISSION_CARE_PLAN_DOCUMENTATION_CARD_IDS,
  summarizeNursingAdmissionCarePlanPayload,
} from "./nursingAdmissionCarePlanDocumentationPayloads.js";
import {
  EDOC20_SKIN_WOUND_PRESSURE_INJURY_DOCUMENTATION_CARD_IDS,
  summarizeSkinWoundPressureInjuryPayload,
} from "./skinWoundPressureInjuryDocumentationPayloads.js";
import {
  EDOC21_DIALYSIS_RENAL_FLUID_MANAGEMENT_DOCUMENTATION_CARD_IDS,
  summarizeDialysisRenalFluidPayload,
} from "./dialysisRenalFluidManagementDocumentationPayloads.js";
import {
  EDOC22_PATIENT_EDUCATION_DISCHARGE_TEACHING_DOCUMENTATION_CARD_IDS,
  summarizePatientEducationDischargePayload,
} from "./patientEducationDischargeTeachingDocumentationPayloads.js";
import {
  resolveClinicalDocumentationWitnessStatus,
  type ClinicalDocumentationWitnessStatus,
} from "./clinicalDocumentationWitnessGovernance.js";
import {
  type ClinicalDocumentationPayloadSummaryLine,
  type ClinicalDocumentationSummaryEntry,
  type ClinicalDocumentationSummaryLocale,
} from "./clinicalDocumentationSummaryLocale.js";

export * from "./clinicalDocumentationSummaryLocale.js";

export {
  EDOC_BASIC_STRUCTURED_CARD_ID,
  edocBasicStructuredPayloadSchema,
} from "./observationDocumentationPayloads.js";
export * from "./observationDocumentationPayloads.js";
export * from "./strokeDocumentationPayloads.js";
export * from "./intakeOutputDocumentationPayloads.js";
export * from "./clinicalDocumentationFieldOptions.js";
export * from "./restraintDocumentationPayloads.js";
export * from "./bloodProductDocumentationPayloads.js";
export * from "./highAlertInfusionDocumentationPayloads.js";
export * from "./belongingsValuablesDocumentationPayloads.js";
export * from "./proceduralSedationDocumentationPayloads.js";
export * from "./strokeNeuroReassessmentDocumentationPayloads.js";
export * from "./respiratoryDocumentationPayloads.js";
export * from "./painDocumentationPayloads.js";
export * from "./neurologicalDocumentationPayloads.js";
export * from "./fallRiskSafetyDocumentationPayloads.js";
export * from "./cardiacMonitoringDocumentationPayloads.js";
export * from "./behavioralHealthSafetyDocumentationPayloads.js";
export * from "./deviceLineTubeDrainMonitoringDocumentationPayloads.js";
export * from "./sepsisMonitoringDocumentationPayloads.js";
export * from "./nursingAdmissionCarePlanDocumentationPayloads.js";
export * from "./skinWoundPressureInjuryDocumentationPayloads.js";
export * from "./dialysisRenalFluidManagementDocumentationPayloads.js";
export * from "./patientEducationDischargeTeachingDocumentationPayloads.js";
export * from "./clinicalDocumentationCatalog.js";

/** Max serialized payload size (bytes, UTF-8 approximated by string length). */
export const CLINICAL_DOCUMENTATION_PAYLOAD_MAX_BYTES = 16_384;

export const clinicalDocumentationEntryCreateDtoSchema = z.object({
  category: z.enum(CLINICAL_DOCUMENTATION_CATEGORIES),
  cardId: z.string().trim().min(1).max(120),
  payloadJson: z.record(z.unknown()),
});

export type ClinicalDocumentationEntryCreateDto = z.infer<
  typeof clinicalDocumentationEntryCreateDtoSchema
>;

export const clinicalDocumentationEntryCreateWithWitnessDtoSchema =
  clinicalDocumentationEntryCreateDtoSchema.extend({
    witnessUserId: z.string().trim().min(1).max(120),
  });

export type ClinicalDocumentationEntryCreateWithWitnessDto = z.infer<
  typeof clinicalDocumentationEntryCreateWithWitnessDtoSchema
>;

export type ClinicalDocumentationEntryResponse = {
  id: string;
  encounterId: string;
  category: ClinicalDocumentationCategory;
  cardId: string;
  cardTitleEn: string;
  cardTitleFr: string;
  authorUserId: string;
  authorDisplayName: string;
  authorRoleTitle: string;
  createdAt: string;
  payloadJson: Record<string, unknown>;
  voidedAt: string | null;
  requiresWitnessSignature: boolean;
  witnessStatus: ClinicalDocumentationWitnessStatus;
  witnessedAt: string | null;
  witnessedByUserId: string | null;
  witnessDisplayName: string | null;
  witnessRoleTitle: string | null;
};

export const FORBIDDEN_CLINICAL_DOCUMENTATION_AUDIT_KEYS = [
  "payloadJson",
  "payload",
  "freeText",
  "notes",
  "noteBody",
  "clinicalNarrative",
  "patientName",
  "firstName",
  "lastName",
  "mrn",
  "chiefComplaint",
  "diagnosisText",
  "clinicalNote",
  "hpi",
  "mdm",
  "ros",
  "body",
] as const;

export const ALLOWED_CLINICAL_DOCUMENTATION_AUDIT_KEYS = [
  "encounterId",
  "patientId",
  "entryId",
  "category",
  "cardId",
  "authorUserId",
  "authorRole",
  "payloadKeyCount",
  "witnessUserId",
  "witnessRole",
] as const;

export type ClinicalDocumentationAuditMetadata = {
  encounterId: string;
  patientId: string;
  entryId: string;
  category: string;
  cardId: string;
  authorUserId: string;
  authorRole: string;
  payloadKeyCount: number;
};

export function buildClinicalDocumentationAuditMetadata(
  input: ClinicalDocumentationAuditMetadata
): ClinicalDocumentationAuditMetadata {
  return { ...input };
}

export type ClinicalDocumentationWitnessAuditMetadata = {
  encounterId: string;
  patientId: string;
  entryId: string;
  category: string;
  cardId: string;
  authorUserId: string;
  authorRole: string;
  witnessUserId: string;
  witnessRole: string;
};

export function buildClinicalDocumentationWitnessAuditMetadata(
  input: ClinicalDocumentationWitnessAuditMetadata
): ClinicalDocumentationWitnessAuditMetadata {
  return { ...input };
}

/** Unified payload finalization after witness (EDOC.8B — blood product, high-alert verification). */
export function finalizeClinicalDocumentationPayloadAfterWitness(
  cardId: string,
  payload: Record<string, unknown>
): Record<string, unknown> {
  let result = finalizeBloodProductPayloadAfterWitness(cardId, payload);
  result = finalizeHighAlertInfusionPayloadAfterWitness(cardId, result);
  return result;
}

export function assertClinicalDocumentationAuditMetadataSafe(
  meta: Record<string, unknown>
): void {
  for (const forbidden of FORBIDDEN_CLINICAL_DOCUMENTATION_AUDIT_KEYS) {
    if (forbidden in meta) {
      throw new Error(`Forbidden clinical documentation audit key: ${forbidden}`);
    }
  }
  for (const key of Object.keys(meta)) {
    if (!(ALLOWED_CLINICAL_DOCUMENTATION_AUDIT_KEYS as readonly string[]).includes(key)) {
      throw new Error(`Unexpected clinical documentation audit key: ${key}`);
    }
  }
}

export function validatePayloadForAvailableCard(
  cardId: string,
  payload: Record<string, unknown>
): { ok: true } | { ok: false; message: string } {
  const result = validatePayloadForCard(cardId, payload);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  return { ok: true };
}

export function assertClinicalDocumentationEntryCreateAllowed(
  dto: ClinicalDocumentationEntryCreateDto
): void {
  const card = getClinicalDocumentationCardById(dto.cardId);
  if (!card) {
    throw new Error("Unknown clinical documentation card");
  }
  if (card.category !== dto.category) {
    throw new Error("Category does not match card");
  }
  if (card.implementationStatus !== "AVAILABLE") {
    throw new Error("Clinical documentation card is not available for save");
  }
  if (!dto.payloadJson || typeof dto.payloadJson !== "object" || Array.isArray(dto.payloadJson)) {
    throw new Error("payloadJson must be an object");
  }
  const serialized = JSON.stringify(dto.payloadJson);
  if (serialized.length > CLINICAL_DOCUMENTATION_PAYLOAD_MAX_BYTES) {
    throw new Error("payloadJson exceeds maximum size");
  }
  const payloadCheck = validatePayloadForAvailableCard(dto.cardId, dto.payloadJson);
  if (!payloadCheck.ok) {
    throw new Error(payloadCheck.message);
  }
}

export function resolveClinicalDocumentationEntryTitles(cardId: string): {
  cardTitleEn: string;
  cardTitleFr: string;
} {
  const card = getClinicalDocumentationCardById(cardId);
  return {
    cardTitleEn: card?.titleEn ?? cardId,
    cardTitleFr: card?.titleFr ?? cardId,
  };
}

/** Key/value summary for legal chart and UI (locale-aware). */
export function summarizeClinicalDocumentationPayload(
  cardId: string,
  payload: Record<string, unknown>,
  locale: ClinicalDocumentationSummaryLocale
): ClinicalDocumentationPayloadSummaryLine[] {
  if (
    (EDOC3_OBSERVATION_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId) ||
    cardId === EDOC_BASIC_STRUCTURED_CARD_ID
  ) {
    const observationLines = summarizeObservationDocumentationPayload(cardId, payload, locale);
    if (observationLines.length > 0) return observationLines;
  }
  if ((EDOC4_STROKE_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId)) {
    const strokeLines = summarizeStrokeDocumentationPayload(cardId, payload, locale);
    if (strokeLines.length > 0) return strokeLines;
  }
  if ((EDOC5_INTAKE_OUTPUT_CARD_IDS as readonly string[]).includes(cardId)) {
    const ioLines = summarizeIntakeOutputDocumentationPayload(cardId, payload, locale);
    if (ioLines.length > 0) return ioLines;
  }
  if ((EDOC6_RESTRAINT_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId)) {
    const restraintLines = summarizeRestraintDocumentationPayload(cardId, payload, locale);
    if (restraintLines.length > 0) return restraintLines;
  }
  if ((EDOC7_BLOOD_PRODUCT_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId)) {
    const bloodLines = summarizeBloodProductDocumentationPayload(cardId, payload, locale);
    if (bloodLines.length > 0) return bloodLines;
  }
  if ((EDOC8_HIGH_ALERT_INFUSION_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId)) {
    const infusionLines = summarizeHighAlertInfusionDocumentationPayload(cardId, payload, locale);
    if (infusionLines.length > 0) return infusionLines;
  }
  if ((EDOC9_BELONGINGS_VALUABLES_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId)) {
    const belongingsLines = summarizeBelongingsValuablesDocumentationPayload(cardId, payload, locale);
    if (belongingsLines.length > 0) return belongingsLines;
  }
  if ((EDOC10_PROCEDURAL_SEDATION_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId)) {
    const sedationLines = summarizeProceduralSedationDocumentationPayload(cardId, payload, locale);
    if (sedationLines.length > 0) return sedationLines;
  }
  if ((EDOC11_STROKE_NEURO_REASSESSMENT_CARD_IDS as readonly string[]).includes(cardId)) {
    const strokeNeuroLines = summarizeStrokeNeuroReassessmentPayload(cardId, payload, locale);
    if (strokeNeuroLines.length > 0) return strokeNeuroLines;
  }
  if ((EDOC12_RESPIRATORY_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId)) {
    const respiratoryLines = summarizeRespiratoryDocumentationPayload(cardId, payload, locale);
    if (respiratoryLines.length > 0) return respiratoryLines;
  }
  if ((EDOC13_PAIN_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId)) {
    const painLines = summarizePainDocumentationPayload(cardId, payload, locale);
    if (painLines.length > 0) return painLines;
  }
  if ((EDOC14_NEUROLOGICAL_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId)) {
    const neuroLines = summarizeNeurologicalDocumentationPayload(cardId, payload, locale);
    if (neuroLines.length > 0) return neuroLines;
  }
  if ((EDOC14_FALL_RISK_SAFETY_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId)) {
    const fallLines = summarizeFallRiskSafetyDocumentationPayload(cardId, payload, locale);
    if (fallLines.length > 0) return fallLines;
  }
  if ((EDOC15_CARDIAC_MONITORING_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId)) {
    const cardiacLines = summarizeCardiacMonitoringDocumentationPayload(cardId, payload, locale);
    if (cardiacLines.length > 0) return cardiacLines;
  }
  if ((EDOC16_BEHAVIORAL_HEALTH_SAFETY_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId)) {
    const behavioralLines = summarizeBehavioralHealthSafetyDocumentationPayload(cardId, payload, locale);
    if (behavioralLines.length > 0) return behavioralLines;
  }
  if ((EDOC17_DEVICE_LINE_TUBE_DRAIN_MONITORING_CARD_IDS as readonly string[]).includes(cardId)) {
    const deviceLines = summarizeDeviceLineTubeDrainMonitoringPayload(cardId, payload, locale);
    if (deviceLines.length > 0) return deviceLines;
  }
  if ((EDOC18_SEPSIS_MONITORING_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId)) {
    const sepsisLines = summarizeSepsisMonitoringDocumentationPayload(cardId, payload, locale);
    if (sepsisLines.length > 0) return sepsisLines;
  }
  if ((EDOC19_NURSING_ADMISSION_CARE_PLAN_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId)) {
    const nursingLines = summarizeNursingAdmissionCarePlanPayload(cardId, payload, locale);
    if (nursingLines.length > 0) return nursingLines;
  }
  if ((EDOC20_SKIN_WOUND_PRESSURE_INJURY_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId)) {
    const skinWoundLines = summarizeSkinWoundPressureInjuryPayload(cardId, payload, locale);
    if (skinWoundLines.length > 0) return skinWoundLines;
  }
  if (
    (EDOC21_DIALYSIS_RENAL_FLUID_MANAGEMENT_DOCUMENTATION_CARD_IDS as readonly string[]).includes(
      cardId
    )
  ) {
    const renalLines = summarizeDialysisRenalFluidPayload(cardId, payload, locale);
    if (renalLines.length > 0) return renalLines;
  }
  if (
    (EDOC22_PATIENT_EDUCATION_DISCHARGE_TEACHING_DOCUMENTATION_CARD_IDS as readonly string[]).includes(
      cardId
    )
  ) {
    const educationLines = summarizePatientEducationDischargePayload(cardId, payload, locale);
    if (educationLines.length > 0) return educationLines;
  }
  if (cardId === EDOC_BASIC_STRUCTURED_CARD_ID && Array.isArray(payload.items)) {
    const lines: ClinicalDocumentationPayloadSummaryLine[] = [];
    for (const item of payload.items) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const row = item as Record<string, unknown>;
        const key = String(row.key ?? "").trim();
        const value = String(row.value ?? "").trim();
        if (key && value) lines.push({ key, value });
      }
    }
    return lines;
  }
  return [];
}

export function summarizeClinicalDocumentationPayloadBilingual(
  cardId: string,
  payload: Record<string, unknown>
): {
  payloadSummaryEn: ClinicalDocumentationPayloadSummaryLine[];
  payloadSummaryFr: ClinicalDocumentationPayloadSummaryLine[];
} {
  return {
    payloadSummaryEn: summarizeClinicalDocumentationPayload(cardId, payload, "en"),
    payloadSummaryFr: summarizeClinicalDocumentationPayload(cardId, payload, "fr"),
  };
}

/**
 * Select localized summary lines for UI or chart export rendering.
 * English never falls back to French legacy fields. Regenerates from payloadJson when needed.
 */
export function selectClinicalDocumentationPayloadSummary(
  entry: ClinicalDocumentationSummaryEntry,
  locale: ClinicalDocumentationSummaryLocale
): ClinicalDocumentationPayloadSummaryLine[] {
  if (locale === "en") {
    if (entry.payloadSummaryEn && entry.payloadSummaryEn.length > 0) {
      return entry.payloadSummaryEn;
    }
    if (entry.cardId && entry.payloadJson) {
      return summarizeClinicalDocumentationPayload(entry.cardId, entry.payloadJson, "en");
    }
    return [];
  }
  if (entry.payloadSummaryFr && entry.payloadSummaryFr.length > 0) {
    return entry.payloadSummaryFr;
  }
  if (entry.cardId && entry.payloadJson) {
    return summarizeClinicalDocumentationPayload(entry.cardId, entry.payloadJson, "fr");
  }
  return entry.payloadSummary ?? entry.payloadSummaryEn ?? [];
}

export function mapClinicalDocumentationEntryResponse(input: {
  id: string;
  encounterId: string;
  category: string;
  cardId: string;
  authorUserId: string;
  authorDisplayNameSnapshot: string;
  authorRoleSnapshot: string;
  createdAt: Date | string;
  payloadJson: unknown;
  voidedAt?: Date | string | null;
  requiresWitnessSignature?: boolean;
  witnessedAt?: Date | string | null;
  witnessedByUserId?: string | null;
  witnessDisplayNameSnapshot?: string | null;
  witnessRoleSnapshot?: string | null;
}): ClinicalDocumentationEntryResponse {
  const titles = resolveClinicalDocumentationEntryTitles(input.cardId);
  const createdAt =
    input.createdAt instanceof Date ? input.createdAt.toISOString() : String(input.createdAt);
  const voidedAt =
    input.voidedAt == null
      ? null
      : input.voidedAt instanceof Date
        ? input.voidedAt.toISOString()
        : String(input.voidedAt);
  const witnessedAt =
    input.witnessedAt == null
      ? null
      : input.witnessedAt instanceof Date
        ? input.witnessedAt.toISOString()
        : String(input.witnessedAt);
  const requiresWitnessSignature = input.requiresWitnessSignature ?? false;
  return {
    id: input.id,
    encounterId: input.encounterId,
    category: input.category as ClinicalDocumentationCategory,
    cardId: input.cardId,
    cardTitleEn: titles.cardTitleEn,
    cardTitleFr: titles.cardTitleFr,
    authorUserId: input.authorUserId,
    authorDisplayName: input.authorDisplayNameSnapshot,
    authorRoleTitle: input.authorRoleSnapshot,
    createdAt,
    payloadJson:
      input.payloadJson && typeof input.payloadJson === "object" && !Array.isArray(input.payloadJson)
        ? (input.payloadJson as Record<string, unknown>)
        : {},
    voidedAt,
    requiresWitnessSignature,
    witnessStatus: resolveClinicalDocumentationWitnessStatus({
      requiresWitnessSignature,
      witnessedAt,
      voidedAt,
    }),
    witnessedAt,
    witnessedByUserId: input.witnessedByUserId ?? null,
    witnessDisplayName: input.witnessDisplayNameSnapshot ?? null,
    witnessRoleTitle: input.witnessRoleSnapshot ?? null,
  };
}

export type ClinicalDocumentationEntryLegalChartRow = ClinicalDocumentationEntryResponse & {
  /** @deprecated Prefer payloadSummaryEn / payloadSummaryFr; defaults to English (payloadSummaryEn). */
  payloadSummary: ClinicalDocumentationPayloadSummaryLine[];
  payloadSummaryEn: ClinicalDocumentationPayloadSummaryLine[];
  payloadSummaryFr: ClinicalDocumentationPayloadSummaryLine[];
};

export function mapClinicalDocumentationEntryForLegalChart(
  input: Parameters<typeof mapClinicalDocumentationEntryResponse>[0]
): ClinicalDocumentationEntryLegalChartRow {
  const base = mapClinicalDocumentationEntryResponse(input);
  const { payloadSummaryEn, payloadSummaryFr } = summarizeClinicalDocumentationPayloadBilingual(
    base.cardId,
    base.payloadJson
  );
  const includeSignerLines =
    base.requiresWitnessSignature ||
    (EDOC7_BLOOD_PRODUCT_DOCUMENTATION_CARD_IDS as readonly string[]).includes(base.cardId);
  const signerEn = includeSignerLines
    ? formatClinicalDocumentationSignerSummaryLines(
        {
          authorDisplayName: base.authorDisplayName,
          authorRoleTitle: base.authorRoleTitle,
          witnessedAt: base.witnessedAt,
          witnessDisplayName: base.witnessDisplayName,
          witnessRoleTitle: base.witnessRoleTitle,
        },
        "en"
      )
    : [];
  const signerFr = includeSignerLines
    ? formatClinicalDocumentationSignerSummaryLines(
        {
          authorDisplayName: base.authorDisplayName,
          authorRoleTitle: base.authorRoleTitle,
          witnessedAt: base.witnessedAt,
          witnessDisplayName: base.witnessDisplayName,
          witnessRoleTitle: base.witnessRoleTitle,
        },
        "fr"
      )
    : [];
  const mergedEn = [...signerEn, ...payloadSummaryEn];
  const mergedFr = [...signerFr, ...payloadSummaryFr];
  return {
    ...base,
    payloadSummaryEn: mergedEn,
    payloadSummaryFr: mergedFr,
    payloadSummary: mergedEn,
  };
}
