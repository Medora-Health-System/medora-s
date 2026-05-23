import { z } from "zod";
import { LACERATION_ANESTHESIA_VALUES } from "./encounterProcedureLaceration.js";

const emptyStrToUndefined = (v: unknown) => (v === "" ? undefined : v);
const performedAtOpt = z.preprocess(emptyStrToUndefined, z.string().trim().max(48).optional());
const complicationsOpt = z.preprocess(emptyStrToUndefined, z.string().trim().max(2000).optional());
const notesOpt = z.preprocess(emptyStrToUndefined, z.string().trim().max(4000).optional());
const shortTextOpt = z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional());
const mediumTextOpt = z.preprocess(emptyStrToUndefined, z.string().trim().max(500).optional());

/** Shared across advanced ED procedures (medico-legal / billing-support documentation). */
export const PROCEDURE_LATERALITY_VALUES = ["LEFT", "RIGHT", "OTHER"] as const;
export const PROCEDURE_URGENCY_VALUES = ["EMERGENT", "NON_EMERGENT"] as const;
export const PROCEDURE_CONSENT_VALUES = [
  "OBTAINED",
  "NOT_OBTAINED",
  "IMPLIED_EMERGENCY",
  "NOT_REQUIRED",
  "OTHER",
] as const;

const lateralityEnum = z.enum(PROCEDURE_LATERALITY_VALUES);
const urgencyEnum = z.enum(PROCEDURE_URGENCY_VALUES);
const consentEnum = z.enum(PROCEDURE_CONSENT_VALUES);
const anesthesiaEnum = z.enum(LACERATION_ANESTHESIA_VALUES);

const neuroEnum = z.enum(["INTACT", "ALTERED", "NOT_ASSESSED", "OTHER"] as const);

function requireOther(val: { [k: string]: unknown }, field: string, otherField: string, ctx: z.RefinementCtx) {
  if (val[field] === "OTHER" && !String(val[otherField] ?? "").trim()) {
    ctx.addIssue({ code: "custom", path: [otherField], message: "required" });
  }
}

/** --- Chest tube --- */
export const CHEST_TUBE_INDICATION_VALUES = [
  "PNEUMOTHORAX",
  "HEMOTHORAX",
  "PLEURAL_EFFUSION",
  "TRAUMA",
  "OTHER",
] as const;
export const CHEST_TUBE_TECHNIQUE_VALUES = ["SELDINGER", "OPEN", "FINGER_THORACOSTOMY", "OTHER"] as const;
export const CHEST_TUBE_CONFIRMATION_VALUES = ["CXR", "ULTRASOUND", "CLINICAL_IMPROVEMENT", "OTHER"] as const;
export const CHEST_TUBE_DRAINAGE_TYPE_VALUES = [
  "AIR",
  "BLOODY",
  "SEROUS",
  "PURULENT",
  "MIXED",
  "NONE",
  "OTHER",
] as const;
export const CHEST_TUBE_TUBE_SIZE_VALUES = ["FR_28", "FR_32", "FR_36", "FR_40", "OTHER"] as const;
export const CHEST_TUBE_INSERTION_SITE_VALUES = ["ANTERIOR_AXILLARY", "MID_AXILLARY", "OTHER"] as const;
export const CHEST_TUBE_OUTPUT_ESTIMATE_VALUES = ["NONE", "MINIMAL", "MODERATE", "LARGE", "OTHER"] as const;
export const CHEST_TUBE_POST_STATUS_VALUES = ["STABLE", "IMPROVED", "UNSTABLE", "OTHER"] as const;

export const chestTubeProcedureDocumentDtoSchema = z
  .object({
    procedureType: z.literal("CHEST_TUBE"),
    performedAt: performedAtOpt,
    side: lateralityEnum,
    sideOther: shortTextOpt,
    indication: z.enum(CHEST_TUBE_INDICATION_VALUES),
    indicationOther: shortTextOpt,
    urgency: urgencyEnum,
    consent: consentEnum,
    consentOther: shortTextOpt,
    sterilePrep: z.boolean(),
    anesthesia: anesthesiaEnum,
    anesthesiaOther: shortTextOpt,
    tubeSize: z.enum(CHEST_TUBE_TUBE_SIZE_VALUES),
    tubeSizeOther: shortTextOpt,
    insertionSite: z.enum(CHEST_TUBE_INSERTION_SITE_VALUES),
    insertionSiteOther: shortTextOpt,
    technique: z.enum(CHEST_TUBE_TECHNIQUE_VALUES),
    techniqueOther: shortTextOpt,
    confirmationMethod: z.enum(CHEST_TUBE_CONFIRMATION_VALUES),
    confirmationMethodOther: shortTextOpt,
    drainageType: z.enum(CHEST_TUBE_DRAINAGE_TYPE_VALUES),
    drainageTypeOther: shortTextOpt,
    estimatedOutput: z.enum(CHEST_TUBE_OUTPUT_ESTIMATE_VALUES),
    estimatedOutputOther: shortTextOpt,
    postProcedureStatus: z.enum(CHEST_TUBE_POST_STATUS_VALUES),
    postProcedureStatusOther: shortTextOpt,
    toleratedWell: z.boolean(),
    followUpImagingOrdered: z.boolean(),
    complications: complicationsOpt,
    notes: notesOpt,
  })
  .superRefine((val, ctx) => {
    requireOther(val, "side", "sideOther", ctx);
    requireOther(val, "indication", "indicationOther", ctx);
    requireOther(val, "consent", "consentOther", ctx);
    requireOther(val, "anesthesia", "anesthesiaOther", ctx);
    requireOther(val, "tubeSize", "tubeSizeOther", ctx);
    requireOther(val, "insertionSite", "insertionSiteOther", ctx);
    requireOther(val, "technique", "techniqueOther", ctx);
    requireOther(val, "confirmationMethod", "confirmationMethodOther", ctx);
    requireOther(val, "drainageType", "drainageTypeOther", ctx);
    requireOther(val, "estimatedOutput", "estimatedOutputOther", ctx);
    requireOther(val, "postProcedureStatus", "postProcedureStatusOther", ctx);
  });

/** --- Intubation --- */
export const INTUBATION_INDICATION_VALUES = [
  "RESPIRATORY_FAILURE",
  "AIRWAY_PROTECTION",
  "CARDIAC_ARREST",
  "TRAUMA",
  "ALTERED_MENTAL_STATUS",
  "OTHER",
] as const;
export const INTUBATION_APPROACH_VALUES = ["EMERGENT", "RSI", "OTHER"] as const;
export const INTUBATION_AIRWAY_ASSESSMENT_VALUES = [
  "FAVORABLE",
  "DIFFICULT_ANTICIPATED",
  "DIFFICULT",
  "NOT_DOCUMENTED",
  "OTHER",
] as const;
export const INTUBATION_BLADE_DEVICE_VALUES = ["MAC_3", "MAC_4", "MILLER", "VIDEO", "OTHER"] as const;
export const INTUBATION_TUBE_SIZE_VALUES = ["6_0", "6_5", "7_0", "7_5", "8_0", "OTHER"] as const;
export const INTUBATION_ATTEMPTS_VALUES = ["1", "2", "3", "GT_3"] as const;
export const INTUBATION_CONFIRMATION_VALUES = ["ETCO2", "BILATERAL_BREATH_SOUNDS", "CXR", "FOGGING", "OTHER"] as const;
export const INTUBATION_POST_STATUS_VALUES = ["STABLE", "REQUIRES_ADJUSTMENT", "COMPLICATION", "OTHER"] as const;

export const intubationProcedureDocumentDtoSchema = z
  .object({
    procedureType: z.literal("INTUBATION"),
    performedAt: performedAtOpt,
    indication: z.enum(INTUBATION_INDICATION_VALUES),
    indicationOther: shortTextOpt,
    approach: z.enum(INTUBATION_APPROACH_VALUES),
    approachOther: shortTextOpt,
    preoxygenation: z.boolean(),
    airwayAssessment: z.enum(INTUBATION_AIRWAY_ASSESSMENT_VALUES),
    airwayAssessmentOther: shortTextOpt,
    medicationsUsed: mediumTextOpt,
    bladeDevice: z.enum(INTUBATION_BLADE_DEVICE_VALUES),
    bladeDeviceOther: shortTextOpt,
    tubeSize: z.enum(INTUBATION_TUBE_SIZE_VALUES),
    tubeSizeOther: shortTextOpt,
    attempts: z.enum(INTUBATION_ATTEMPTS_VALUES),
    successfulAttemptNumber: z.enum(INTUBATION_ATTEMPTS_VALUES),
    confirmationMethod: z.enum(INTUBATION_CONFIRMATION_VALUES),
    confirmationMethodOther: shortTextOpt,
    postIntubationStatus: z.enum(INTUBATION_POST_STATUS_VALUES),
    postIntubationStatusOther: shortTextOpt,
    ventilatorInitiated: z.boolean(),
    complications: complicationsOpt,
    notes: notesOpt,
  })
  .superRefine((val, ctx) => {
    requireOther(val, "indication", "indicationOther", ctx);
    requireOther(val, "approach", "approachOther", ctx);
    requireOther(val, "airwayAssessment", "airwayAssessmentOther", ctx);
    requireOther(val, "bladeDevice", "bladeDeviceOther", ctx);
    requireOther(val, "tubeSize", "tubeSizeOther", ctx);
    requireOther(val, "confirmationMethod", "confirmationMethodOther", ctx);
    requireOther(val, "postIntubationStatus", "postIntubationStatusOther", ctx);
  });

/** --- Central line --- */
export const CENTRAL_LINE_TYPE_VALUES = ["TRIPLE_LUMEN", "DOUBLE_LUMEN", "SINGLE_LUMEN", "OTHER"] as const;
export const CENTRAL_LINE_SITE_VALUES = ["INTERNAL_JUGULAR", "SUBCLAVIAN", "FEMORAL", "OTHER"] as const;
export const CENTRAL_LINE_INDICATION_VALUES = ["ACCESS", "MEDICATIONS", "TPN", "HEMODYNAMICS", "OTHER"] as const;
export const CENTRAL_LINE_CONFIRMATION_VALUES = ["ASPIRATION", "CXR", "ULTRASOUND", "TRANSDUCER", "OTHER"] as const;
export const CENTRAL_LINE_POST_STATUS_VALUES = ["STABLE", "COMPLICATION", "OTHER"] as const;
export const CENTRAL_LINE_ATTEMPTS_VALUES = ["1", "2", "3", "GT_3"] as const;

export const centralLineProcedureDocumentDtoSchema = z
  .object({
    procedureType: z.literal("CENTRAL_LINE"),
    performedAt: performedAtOpt,
    lineType: z.enum(CENTRAL_LINE_TYPE_VALUES),
    lineTypeOther: shortTextOpt,
    site: z.enum(CENTRAL_LINE_SITE_VALUES),
    siteOther: shortTextOpt,
    indication: z.enum(CENTRAL_LINE_INDICATION_VALUES),
    indicationOther: shortTextOpt,
    ultrasoundGuidance: z.boolean(),
    sterileTechnique: z.boolean(),
    attempts: z.enum(CENTRAL_LINE_ATTEMPTS_VALUES),
    successfulPlacement: z.boolean(),
    confirmation: z.enum(CENTRAL_LINE_CONFIRMATION_VALUES),
    confirmationOther: shortTextOpt,
    postProcedureStatus: z.enum(CENTRAL_LINE_POST_STATUS_VALUES),
    postProcedureStatusOther: shortTextOpt,
    complications: complicationsOpt,
    notes: notesOpt,
  })
  .superRefine((val, ctx) => {
    requireOther(val, "lineType", "lineTypeOther", ctx);
    requireOther(val, "site", "siteOther", ctx);
    requireOther(val, "indication", "indicationOther", ctx);
    requireOther(val, "confirmation", "confirmationOther", ctx);
    requireOther(val, "postProcedureStatus", "postProcedureStatusOther", ctx);
  });

/** --- Procedural sedation --- */
export const SEDATION_INDICATION_VALUES = [
  "FRACTURE_REDUCTION",
  "ABSCESS",
  "LACERATION",
  "IMAGING",
  "OTHER",
] as const;
export const ASA_CLASS_VALUES = ["ASA_1", "ASA_2", "ASA_3", "ASA_4", "ASA_5", "NOT_DOCUMENTED"] as const;
export const MALLAMPATI_VALUES = ["I", "II", "III", "IV", "NOT_DOCUMENTED"] as const;
export const FASTING_STATUS_VALUES = ["NPO", "LAST_ORAL_RECENT", "UNKNOWN", "NOT_APPLICABLE"] as const;
export const SEDATION_MONITORING_VALUES = [
  "PULSE_OX",
  "ECG",
  "BP",
  "CAPNOGRAPHY",
  "CONTINUOUS_RN",
  "OTHER",
] as const;
export const SEDATION_RECOVERY_STATUS_VALUES = ["RECOVERED", "IN_RECOVERY", "COMPLICATION", "OTHER"] as const;

export const proceduralSedationProcedureDocumentDtoSchema = z
  .object({
    procedureType: z.literal("PROCEDURAL_SEDATION"),
    performedAt: performedAtOpt,
    sedationEndAt: z.preprocess(emptyStrToUndefined, z.string().trim().max(48).optional()),
    indication: z.enum(SEDATION_INDICATION_VALUES),
    indicationOther: shortTextOpt,
    consent: consentEnum,
    consentOther: shortTextOpt,
    asaClass: z.enum(ASA_CLASS_VALUES),
    mallampati: z.enum(MALLAMPATI_VALUES),
    fastingStatus: z.enum(FASTING_STATUS_VALUES),
    medicationsUsed: mediumTextOpt,
    monitoringUsed: z.enum(SEDATION_MONITORING_VALUES),
    monitoringUsedOther: shortTextOpt,
    continuousMonitoring: z.boolean(),
    recoveryStatus: z.enum(SEDATION_RECOVERY_STATUS_VALUES),
    recoveryStatusOther: shortTextOpt,
    complications: complicationsOpt,
    notes: notesOpt,
  })
  .superRefine((val, ctx) => {
    requireOther(val, "indication", "indicationOther", ctx);
    requireOther(val, "consent", "consentOther", ctx);
    requireOther(val, "monitoringUsed", "monitoringUsedOther", ctx);
    requireOther(val, "recoveryStatus", "recoveryStatusOther", ctx);
  });

/** --- Reduction --- */
export const REDUCTION_BODY_PART_VALUES = [
  "SHOULDER",
  "ELBOW",
  "WRIST",
  "HIP",
  "KNEE",
  "ANKLE",
  "FINGER",
  "OTHER",
] as const;
export const REDUCTION_INJURY_TYPE_VALUES = ["DISLOCATION", "FRACTURE_DISLOCATION", "NURSEMAID_ELBOW", "OTHER"] as const;
export const REDUCTION_TECHNIQUE_VALUES = [
  "CLOSED",
  "TRACTION_COUNTERTRACTION",
  "SINGLE_PROVIDER",
  "OTHER",
] as const;
export const REDUCTION_SUCCESS_VALUES = ["SUCCESSFUL", "PARTIAL", "UNSUCCESSFUL"] as const;

export const reductionProcedureDocumentDtoSchema = z
  .object({
    procedureType: z.literal("REDUCTION"),
    performedAt: performedAtOpt,
    bodyPart: z.enum(REDUCTION_BODY_PART_VALUES),
    bodyPartOther: shortTextOpt,
    injuryType: z.enum(REDUCTION_INJURY_TYPE_VALUES),
    injuryTypeOther: shortTextOpt,
    neurovascularBefore: neuroEnum,
    neurovascularBeforeOther: shortTextOpt,
    anesthesia: anesthesiaEnum,
    anesthesiaOther: shortTextOpt,
    reductionTechnique: z.enum(REDUCTION_TECHNIQUE_VALUES),
    reductionTechniqueOther: shortTextOpt,
    reductionSuccess: z.enum(REDUCTION_SUCCESS_VALUES),
    postReductionImaging: z.boolean(),
    neurovascularAfter: neuroEnum,
    neurovascularAfterOther: shortTextOpt,
    splintApplied: z.boolean(),
    complications: complicationsOpt,
    notes: notesOpt,
  })
  .superRefine((val, ctx) => {
    requireOther(val, "bodyPart", "bodyPartOther", ctx);
    requireOther(val, "injuryType", "injuryTypeOther", ctx);
    requireOther(val, "neurovascularBefore", "neurovascularBeforeOther", ctx);
    requireOther(val, "anesthesia", "anesthesiaOther", ctx);
    requireOther(val, "reductionTechnique", "reductionTechniqueOther", ctx);
    requireOther(val, "neurovascularAfter", "neurovascularAfterOther", ctx);
  });

/** --- Thoracentesis / paracentesis --- */
export const FLUID_PROCEDURE_TYPE_VALUES = ["THORACENTESIS", "PARACENTESIS"] as const;
export const FLUID_PROCEDURE_INDICATION_VALUES = ["DYSPNEA", "EFFUSION", "ASCITES", "DIAGNOSTIC", "OTHER"] as const;
export const FLUID_PROCEDURE_SITE_VALUES = ["RIGHT", "LEFT", "MIDLINE", "RLQ", "LLQ", "OTHER"] as const;
export const FLUID_AMOUNT_REMOVED_VALUES = ["LT_100ML", "ML_100_500", "ML_500_1000", "GT_1000ML", "OTHER"] as const;
export const FLUID_APPEARANCE_VALUES = ["CLEAR", "SEROUS", "CLOUDY", "BLOODY", "OTHER"] as const;

export const thoracentesisParacentesisProcedureDocumentDtoSchema = z
  .object({
    procedureType: z.literal("THORACENTESIS_PARACENTESIS"),
    performedAt: performedAtOpt,
    fluidProcedureType: z.enum(FLUID_PROCEDURE_TYPE_VALUES),
    indication: z.enum(FLUID_PROCEDURE_INDICATION_VALUES),
    indicationOther: shortTextOpt,
    site: z.enum(FLUID_PROCEDURE_SITE_VALUES),
    siteOther: shortTextOpt,
    ultrasoundGuidance: z.boolean(),
    sterilePrep: z.boolean(),
    anesthetic: anesthesiaEnum,
    anestheticOther: shortTextOpt,
    amountRemoved: z.enum(FLUID_AMOUNT_REMOVED_VALUES),
    amountRemovedOther: shortTextOpt,
    fluidAppearance: z.enum(FLUID_APPEARANCE_VALUES),
    fluidAppearanceOther: shortTextOpt,
    specimenSent: z.boolean(),
    toleratedWell: z.boolean(),
    complications: complicationsOpt,
    notes: notesOpt,
  })
  .superRefine((val, ctx) => {
    requireOther(val, "indication", "indicationOther", ctx);
    requireOther(val, "site", "siteOther", ctx);
    requireOther(val, "anesthetic", "anestheticOther", ctx);
    requireOther(val, "amountRemoved", "amountRemovedOther", ctx);
    requireOther(val, "fluidAppearance", "fluidAppearanceOther", ctx);
  });

/** --- Pelvic exam --- */
export const PELVIC_EXAM_INDICATION_VALUES = [
  "PREGNANCY_EVAL",
  "BLEEDING",
  "PAIN",
  "DISCHARGE",
  "TRAUMA",
  "OTHER",
] as const;
export const PELVIC_FINDINGS_SUMMARY_VALUES = ["NORMAL", "ABNORMAL", "DEFERRED", "NOT_DOCUMENTED"] as const;
export const PELVIC_SPECIMEN_VALUES = ["NONE", "GC_CT", "WET_MOUNT", "PREGNANCY", "OTHER"] as const;

export const pelvicExamProcedureDocumentDtoSchema = z
  .object({
    procedureType: z.literal("PELVIC_EXAM"),
    performedAt: performedAtOpt,
    chaperonePresent: z.boolean(),
    indication: z.enum(PELVIC_EXAM_INDICATION_VALUES),
    indicationOther: shortTextOpt,
    externalExamFindings: z.enum(PELVIC_FINDINGS_SUMMARY_VALUES),
    externalExamFindingsOther: shortTextOpt,
    speculumExamFindings: z.enum(PELVIC_FINDINGS_SUMMARY_VALUES),
    speculumExamFindingsOther: shortTextOpt,
    bimanualFindings: z.enum(PELVIC_FINDINGS_SUMMARY_VALUES),
    bimanualFindingsOther: shortTextOpt,
    dischargePresent: z.boolean(),
    cervicalMotionTenderness: z.boolean(),
    adnexalTenderness: z.boolean(),
    specimensCollected: z.enum(PELVIC_SPECIMEN_VALUES),
    specimensCollectedOther: shortTextOpt,
    complications: complicationsOpt,
    notes: notesOpt,
  })
  .superRefine((val, ctx) => {
    requireOther(val, "indication", "indicationOther", ctx);
    requireOther(val, "externalExamFindings", "externalExamFindingsOther", ctx);
    requireOther(val, "speculumExamFindings", "speculumExamFindingsOther", ctx);
    requireOther(val, "bimanualFindings", "bimanualFindingsOther", ctx);
    requireOther(val, "specimensCollected", "specimensCollectedOther", ctx);
  });

/** --- Lumbar puncture --- */
export const LP_INDICATION_VALUES = ["MENINGITIS", "SAH", "IDIOPATHIC_ICP", "OTHER"] as const;
export const LP_LEVEL_VALUES = ["L2_L3", "L3_L4", "L4_L5", "OTHER"] as const;
export const LP_POSITION_VALUES = ["LATERAL", "SITTING", "OTHER"] as const;
export const LP_OPENING_PRESSURE_VALUES = ["NORMAL", "ELEVATED", "LOW", "NOT_MEASURED", "OTHER"] as const;
export const LP_CSF_APPEARANCE_VALUES = ["CLEAR", "CLOUDY", "BLOODY", "XANTHOCHROMIC", "OTHER"] as const;
export const LP_TUBES_COLLECTED_VALUES = ["1", "2", "3", "4", "GT_4"] as const;

export const lumbarPunctureProcedureDocumentDtoSchema = z
  .object({
    procedureType: z.literal("LUMBAR_PUNCTURE"),
    performedAt: performedAtOpt,
    indication: z.enum(LP_INDICATION_VALUES),
    indicationOther: shortTextOpt,
    consent: consentEnum,
    consentOther: shortTextOpt,
    level: z.enum(LP_LEVEL_VALUES),
    levelOther: shortTextOpt,
    position: z.enum(LP_POSITION_VALUES),
    positionOther: shortTextOpt,
    openingPressure: z.enum(LP_OPENING_PRESSURE_VALUES),
    openingPressureOther: shortTextOpt,
    csfAppearance: z.enum(LP_CSF_APPEARANCE_VALUES),
    csfAppearanceOther: shortTextOpt,
    tubesCollected: z.enum(LP_TUBES_COLLECTED_VALUES),
    toleratedWell: z.boolean(),
    complications: complicationsOpt,
    notes: notesOpt,
  })
  .superRefine((val, ctx) => {
    requireOther(val, "indication", "indicationOther", ctx);
    requireOther(val, "consent", "consentOther", ctx);
    requireOther(val, "level", "levelOther", ctx);
    requireOther(val, "position", "positionOther", ctx);
    requireOther(val, "openingPressure", "openingPressureOther", ctx);
    requireOther(val, "csfAppearance", "csfAppearanceOther", ctx);
  });

export {
  ADVANCED_DOCUMENTED_PROCEDURE_TYPES,
  type AdvancedDocumentedProcedureType,
} from "./encounterProcedureTypes.js";
