/**
 * D4A.2.5 — Durable inpatient encounter lifecycle + structured nursing admission forms.
 *
 * Additive on medSurgNursingAdmissionV1 (answers on sections). Zero schema migration.
 * Does not enable D3B/placement. Does not create a second documentation engine.
 */

import {
  INPATIENT_ADMISSION_CLINICAL_SECTIONS,
  type AdmissionSectionCompletionState,
  type InpatientAdmissionClinicalSection,
} from "./connectedInpatientAdmissionIntakeD4a0.js";
import type { MedSurgNursingAdmissionDocV1 } from "./medSurgNursingAdmissionD4a1.js";
import { nursingAdmissionStage6HandoffIsPending } from "./nursingAdmissionStage6ProjectionInp2b2d.js";

export const INPATIENT_LIFECYCLE_NURSING_ADMISSION_CERTIFICATION_ID =
  "MEDUI.INPATIENT_LIFECYCLE_NURSING_ADMISSION.D4A2_5" as const;

export const INPATIENT_LIFECYCLE_AUDIT_EVENTS = [
  "INPATIENT_ADMISSION_DETAILS_EDITED",
  "INPATIENT_BED_TRANSFERRED",
  "INPATIENT_ENCOUNTER_DISCHARGED",
  "INPATIENT_ADMISSION_CANCELLED",
  "INPATIENT_ENCOUNTER_VOIDED",
  "NURSING_ADMISSION_SECTION_DRAFT",
  "NURSING_ADMISSION_SECTION_COMPLETED",
  "NURSING_ADMISSION_SIGNED",
  "NURSING_ADMISSION_CORRECTION",
  "NURSING_ADMISSION_ADDENDUM",
] as const;

export type InpatientLifecycleAuditEvent = (typeof INPATIENT_LIFECYCLE_AUDIT_EVENTS)[number];

export const INPATIENT_CANCEL_REASON_CODES = [
  "DUPLICATE_ENCOUNTER",
  "PATIENT_NOT_ADMITTED",
  "WRONG_PATIENT",
  "WRONG_FACILITY",
  "ADMISSION_CANCELLED",
  "TRANSFERRED_ELSEWHERE",
  "CREATED_IN_ERROR",
  "OTHER",
] as const;

export type InpatientCancelReasonCode = (typeof INPATIENT_CANCEL_REASON_CODES)[number];

export const INPATIENT_LIFECYCLE_ERROR_CODES = [
  "NURSING_ADMISSION_STALE",
  "NURSING_ADMISSION_ALREADY_SIGNED",
  "ENCOUNTER_CLOSED",
  "ENCOUNTER_VOIDED",
  "ENCOUNTER_CANCELLED",
  "SECTION_VALIDATION_FAILED",
  "FACILITY_SCOPE_MISMATCH",
  "ROLE_NOT_AUTHORIZED",
  "BED_OCCUPIED",
  "VOID_BLOCKED_CLINICAL_ACTIVITY",
  "CANCEL_NOT_ALLOWED_AFTER_CARE",
] as const;

export type InpatientLifecycleErrorCode = (typeof INPATIENT_LIFECYCLE_ERROR_CODES)[number];

export type NursingFieldControlType =
  | "text"
  | "textarea"
  | "number"
  | "datetime"
  | "date"
  | "select"
  | "radio"
  | "checkbox"
  | "multiselect"
  | "yes_no_unknown"
  | "presentAbsentUnable";

export type NursingSectionFieldDef = {
  key: string;
  control: NursingFieldControlType;
  required?: boolean;
  optionsKey?: string;
  helpKey: string;
  /** Show when another field equals one of these values. */
  showWhen?: { field: string; values: string[] };
  /** When complete is requested, require this field if parent matches. */
  requiredWhen?: { field: string; values: string[] };
};

export type NursingSectionSchema = {
  sectionId: InpatientAdmissionClinicalSection;
  helpKey: string;
  fields: NursingSectionFieldDef[];
  /** Domains reused (longitudinal / EDOC / allergy / meds) — display/provenance only. */
  domainReuse?: string[];
};

/** Shared option catalogs referenced by optionsKey. */
export const NURSING_ADMISSION_OPTION_CATALOGS: Record<string, readonly string[]> = {
  yesNoUnknown: ["YES", "NO", "UNKNOWN"],
  presentAbsentUnable: ["PRESENT", "ABSENT", "UNABLE_TO_ASSESS"],
  normalAbnormal: ["NORMAL", "ABNORMAL", "UNABLE_TO_ASSESS"],
  modeOfArrival: [
    "AMBULATORY",
    "WHEELCHAIR",
    "STRETCHER",
    "EMS",
    "EMS_STRETCHER",
    "PRIVATE_VEHICLE",
    "AIR_TRANSPORT",
    "BED",
    "OTHER",
  ],
  admissionSource: [
    "EMERGENCY_DEPARTMENT",
    "DIRECT_ADMISSION",
    "OUTSIDE_HOSPITAL_TRANSFER",
    "SNF_TRANSFER",
    "LONG_TERM_CARE",
    "REHABILITATION_TRANSFER",
    "CLINIC",
    "PROCEDURAL_AREA",
    "OBSERVATION",
    "HOME",
    "OTHER",
  ],
  skinBaseline: [
    "INTACT",
    "PRESSURE_INJURY",
    "WOUND_PRESENT",
    "SURGICAL_INCISION",
    "BRUISING",
    "RASH",
    "MOISTURE_ASSOCIATED",
    "OTHER",
    "NOT_ASSESSED",
  ],
  reviewStatus: ["REVIEWED", "UNABLE_TO_REVIEW", "NOT_APPLICABLE"],
  livingSituation: [
    "LIVES_ALONE",
    "WITH_SPOUSE_PARTNER",
    "WITH_FAMILY",
    "WITH_CAREGIVER",
    "ASSISTED_LIVING",
    "SNF",
    "LONG_TERM_CARE",
    "GROUP_HOME",
    "HOMELESS",
    "FACILITY",
    "OTHER",
    "UNKNOWN",
  ],
  preAdmissionResidence: [
    "HOME",
    "HOME_WITH_SERVICES",
    "SNF",
    "ASSISTED_LIVING",
    "REHAB",
    "ANOTHER_HOSPITAL",
    "OTHER",
    "UNKNOWN",
  ],
  conditionOnArrival: ["STABLE", "GUARDED", "SERIOUS", "CRITICAL", "UNABLE_TO_DETERMINE"],
  generalAppearance: [
    "NO_ACUTE_DISTRESS",
    "MILD_DISTRESS",
    "MODERATE_DISTRESS",
    "SEVERE_DISTRESS",
    "CRITICALLY_ILL",
    "UNABLE_TO_ASSESS",
  ],
  orientation: ["PERSON", "PLACE", "TIME", "SITUATION"],
  verificationStatus: [
    "CONFIRMED",
    "UPDATED",
    "UNABLE_TO_VERIFY",
    "PATIENT_DENIES",
    "ENTERED_IN_ERROR",
  ],
  homeMedSource: [
    "PATIENT",
    "FAMILY_CAREGIVER",
    "MEDICATION_BOTTLE",
    "PHARMACY",
    "PRIOR_CHART",
    "OUTSIDE_RECORD",
    "FACILITY_LIST",
    "UNABLE_TO_VERIFY",
  ],
  homeMedStatus: [
    "CONFIRMED",
    "ADDED",
    "CORRECTED",
    "DISCONTINUED_BY_PATIENT",
    "NOT_TAKING",
    "UNABLE_TO_VERIFY",
  ],
  allergyType: ["MEDICATION", "FOOD", "ENVIRONMENTAL", "LATEX", "CONTRAST", "OTHER"],
  belongingsDisposition: [
    "KEPT_WITH_PATIENT",
    "SENT_HOME_WITH_FAMILY",
    "SECURED_BY_FACILITY",
    "TRANSFERRED_WITH_PATIENT",
    "NOT_PRESENT",
    "OTHER",
  ],
  assistanceLevel: [
    "INDEPENDENT",
    "SUPERVISION",
    "ONE_PERSON_ASSIST",
    "TWO_PERSON_ASSIST",
    "MECHANICAL_LIFT",
    "BEDBOUND",
    "UNABLE_TO_ASSESS",
  ],
  painScale: ["NUMERIC_0_10", "FACES", "FLACC", "PAINAD", "BEHAVIORAL_NONVERBAL", "OTHER"],
  concernTriad: ["NO_CONCERN", "CONCERN_PRESENT", "UNABLE_TO_ASSESS", "PATIENT_DECLINED"],
  learner: ["PATIENT", "FAMILY", "CAREGIVER", "LEGAL_GUARDIAN", "OTHER"],
  understanding: [
    "VERBALIZED",
    "DEMONSTRATED",
    "NEEDS_REINFORCEMENT",
    "UNABLE_TO_ASSESS",
    "DECLINED",
  ],
  providerHandoffStatus: [
    "NOT_STARTED",
    "PROVIDER_NOTIFIED",
    "ORDERS_PENDING",
    "ORDERS_RECEIVED",
    "HP_PENDING",
    "HP_COMPLETE",
    "ESCALATION_REQUIRED",
  ],
  handoffMethod: ["BEDSIDE", "PHONE", "WRITTEN", "ELECTRONIC", "OTHER"],
  fallPrecautions: [
    "BED_LOW_LOCKED",
    "CALL_LIGHT",
    "NONSKID_FOOTWEAR",
    "ALARM",
    "ASSIST_AMBULATION",
    "FREQUENT_ROUNDING",
    "SITTER",
    "SEIZURE_PRECAUTIONS",
    "ASPIRATION_PRECAUTIONS",
    "ELOPEMENT_PRECAUTIONS",
    "OTHER",
  ],
  deviceTypes: [
    "PERIPHERAL_IV",
    "MIDLINE",
    "PICC",
    "CENTRAL_VENOUS",
    "ARTERIAL_LINE",
    "URINARY_CATHETER",
    "EXTERNAL_URINARY",
    "NG_OG",
    "FEEDING_TUBE",
    "CHEST_TUBE",
    "SURGICAL_DRAIN",
    "OSTOMY",
    "TRACHEOSTOMY",
    "OXYGEN_DEVICE",
    "VENTILATOR",
    "CARDIAC_DEVICE",
    "DIALYSIS_ACCESS",
    "OTHER",
  ],
  dischargeDisposition: [
    "HOME",
    "HOME_WITH_SERVICES",
    "SNF",
    "ACUTE_REHAB",
    "ANOTHER_HOSPITAL",
    "AMA",
    "EXPIRED",
    "OTHER",
  ],
  behavior: [
    "CALM_COOPERATIVE",
    "ANXIOUS",
    "AGITATED",
    "RESTLESS",
    "WITHDRAWN",
    "CONFUSED",
    "COMBATIVE",
    "SEDATED",
    "UNABLE_TO_ASSESS",
    "OTHER",
  ],
  skinColorDetail: [
    "NORMAL",
    "PALE",
    "FLUSHED",
    "CYANOTIC",
    "JAUNDICED",
    "MOTTLED",
    "ASHEN",
    "UNABLE_TO_ASSESS",
    "OTHER",
  ],
  communicationAbility: [
    "WITHOUT_DIFFICULTY",
    "SPEECH_IMPAIRED",
    "LANGUAGE_BARRIER",
    "NONVERBAL",
    "USES_DEVICE",
    "COGNITIVE_BARRIER",
    "HEARING_BARRIER",
    "UNABLE_TO_ASSESS",
    "OTHER",
  ],
  skinTemperature: ["WARM", "COOL", "HOT", "UNABLE_TO_ASSESS"],
  skinMoisture: ["DRY", "NORMAL", "MOIST", "DIAPHORETIC", "CLAMMY", "UNABLE_TO_ASSESS"],
  skinTurgor: ["NORMAL", "DECREASED", "TENTING", "UNABLE_TO_ASSESS"],
  assistiveDevices: [
    "NONE",
    "CANE",
    "WALKER",
    "ROLLING_WALKER",
    "CRUTCHES",
    "WHEELCHAIR",
    "PROSTHESIS",
    "ORTHOSIS_BRACE",
    "MECHANICAL_LIFT",
    "OTHER",
  ],
  weightBearing: [
    "NONE",
    "WBAT",
    "PARTIAL_WEIGHT_BEARING",
    "TOE_TOUCH",
    "NON_WEIGHT_BEARING",
    "OTHER",
    "UNKNOWN",
  ],
  admissionPriority: ["ROUTINE", "URGENT", "EMERGENT", "OTHER"],
  preferredLanguage: ["fr", "en", "ht", "es", "OTHER"],
  hospitalService: ["MED_SURG", "ICU", "TELEMETRY", "SURGICAL", "OBSERVATION", "OTHER"],
  levelOfCare: ["ACUTE", "INTERMEDIATE", "ICU", "OBSERVATION", "OTHER"],
  appetite: ["GOOD", "FAIR", "POOR", "UNABLE_TO_ASSESS", "NOT_APPLICABLE"],
  currentDiet: ["REGULAR", "CARDIAC", "DIABETIC", "RENAL", "NPO", "CLEAR_LIQUIDS", "FULL_LIQUIDS", "OTHER"],
  bowelPattern: ["DAILY", "EVERY_OTHER_DAY", "CONSTIPATED_BASELINE", "VARIABLE", "OSTOMY", "UNKNOWN"],
  urinaryPattern: ["CONTINENT", "INCONTINENT", "URGENCY", "RETENTION", "CATHETER", "UNKNOWN"],
};

function f(
  key: string,
  control: NursingFieldControlType,
  helpKey: string,
  extra?: Partial<NursingSectionFieldDef>
): NursingSectionFieldDef {
  return { key, control, helpKey, ...extra };
}

/** All 20 nursing admission section schemas (structured controls + help keys). */
export const NURSING_ADMISSION_SECTION_SCHEMAS: Record<
  InpatientAdmissionClinicalSection,
  NursingSectionSchema
> = {
  OVERVIEW: {
    sectionId: "OVERVIEW",
    helpKey: "hospitalAdmissionD4a25.help.sections.OVERVIEW",
    domainReuse: ["ADMISSION_SUMMARY"],
    fields: [
      f("admissionSource", "select", "hospitalAdmissionD4a25.help.fields.admissionSource", {
        optionsKey: "admissionSource",
      }),
      f("arrivalAt", "datetime", "hospitalAdmissionD4a25.help.fields.arrivalAt", { required: true }),
      f("modeOfArrival", "select", "hospitalAdmissionD4a25.help.fields.modeOfArrival", {
        optionsKey: "modeOfArrival",
        required: true,
      }),
      f("accompaniedBy", "text", "hospitalAdmissionD4a25.help.fields.accompaniedBy"),
      f("sourceFacility", "text", "hospitalAdmissionD4a25.help.fields.sourceFacility"),
      f("referringProvider", "text", "hospitalAdmissionD4a25.help.fields.referringProvider"),
      f("reasonForAdmission", "textarea", "hospitalAdmissionD4a25.help.fields.reasonForAdmission", {
        required: true,
      }),
      f("primaryDiagnosis", "text", "hospitalAdmissionD4a25.help.fields.primaryDiagnosis", {
        required: true,
      }),
      f("secondaryDiagnoses", "textarea", "hospitalAdmissionD4a25.help.fields.secondaryDiagnoses"),
      f("service", "select", "hospitalAdmissionD4a25.help.fields.service", {
        optionsKey: "hospitalService",
      }),
      f("levelOfCare", "select", "hospitalAdmissionD4a25.help.fields.levelOfCare", {
        optionsKey: "levelOfCare",
      }),
      f("assignedUnit", "text", "hospitalAdmissionD4a25.help.fields.assignedUnit"),
      f("assignedBed", "text", "hospitalAdmissionD4a25.help.fields.assignedBed"),
      f("attendingProvider", "text", "hospitalAdmissionD4a25.help.fields.attendingProvider"),
      f("receivingNurse", "text", "hospitalAdmissionD4a25.help.fields.receivingNurse"),
      f("language", "select", "hospitalAdmissionD4a25.help.fields.language", {
        optionsKey: "preferredLanguage",
      }),
      f("interpreterNeeded", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.interpreterNeeded", {
        optionsKey: "yesNoUnknown",
      }),
      f("isolationStatus", "text", "hospitalAdmissionD4a25.help.fields.isolationStatus"),
      f("codeStatus", "text", "hospitalAdmissionD4a25.help.fields.codeStatus"),
      f("conditionOnArrival", "select", "hospitalAdmissionD4a25.help.fields.conditionOnArrival", {
        optionsKey: "conditionOnArrival",
        required: true,
      }),
      f("immediateConcerns", "textarea", "hospitalAdmissionD4a25.help.fields.immediateConcerns"),
      f("admissionPriority", "select", "hospitalAdmissionD4a25.help.fields.admissionPriority", {
        optionsKey: "admissionPriority",
      }),
      f("comments", "textarea", "hospitalAdmissionD4a25.help.fields.comments"),
    ],
  },
  IDENTITY_DEMOGRAPHICS: {
    sectionId: "IDENTITY_DEMOGRAPHICS",
    helpKey: "hospitalAdmissionD4a25.help.sections.IDENTITY_DEMOGRAPHICS",
    domainReuse: ["PATIENT_REGISTRATION"],
    fields: [
      f("twoIdentifiersVerified", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.twoIdentifiers", {
        optionsKey: "yesNoUnknown",
        required: true,
      }),
      f("wristbandPresent", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.wristbandPresent", {
        optionsKey: "yesNoUnknown",
        required: true,
      }),
      f("wristbandCorrect", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.wristbandCorrect", {
        optionsKey: "yesNoUnknown",
        required: true,
      }),
      f("allergyBandPresent", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.allergyBand", {
        optionsKey: "yesNoUnknown",
      }),
      f("fallRiskBandPresent", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.fallRiskBand", {
        optionsKey: "yesNoUnknown",
      }),
      f("patientConfirmsIdentity", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.patientConfirms", {
        optionsKey: "yesNoUnknown",
      }),
      f("discrepancyFound", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.discrepancyFound", {
        optionsKey: "yesNoUnknown",
      }),
      f("discrepancyDescription", "textarea", "hospitalAdmissionD4a25.help.fields.discrepancyDescription", {
        requiredWhen: { field: "discrepancyFound", values: ["YES"] },
        showWhen: { field: "discrepancyFound", values: ["YES"] },
      }),
      f("registrationCorrectionRequested", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.regCorrection", {
        optionsKey: "yesNoUnknown",
      }),
      f("comments", "textarea", "hospitalAdmissionD4a25.help.fields.comments"),
    ],
  },
  SOURCE_ENCOUNTER_SUMMARY: {
    sectionId: "SOURCE_ENCOUNTER_SUMMARY",
    helpKey: "hospitalAdmissionD4a25.help.sections.SOURCE_ENCOUNTER_SUMMARY",
    domainReuse: ["SOURCE_ENCOUNTER_READ"],
    fields: [
      f("sourceReportReceived", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.sourceReport", {
        optionsKey: "yesNoUnknown",
        required: true,
      }),
      f("handoffReceivedFrom", "text", "hospitalAdmissionD4a25.help.fields.handoffFrom"),
      f("handoffMethod", "select", "hospitalAdmissionD4a25.help.fields.handoffMethod", {
        optionsKey: "handoffMethod",
      }),
      f("handoffAt", "datetime", "hospitalAdmissionD4a25.help.fields.handoffAt"),
      f("discrepanciesNoted", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.discrepanciesNoted", {
        optionsKey: "yesNoUnknown",
      }),
      f("followUpRequired", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.followUpRequired", {
        optionsKey: "yesNoUnknown",
      }),
      f("comments", "textarea", "hospitalAdmissionD4a25.help.fields.comments"),
    ],
  },
  NURSING_ADMISSION_ASSESSMENT: {
    sectionId: "NURSING_ADMISSION_ASSESSMENT",
    helpKey: "hospitalAdmissionD4a25.help.sections.NURSING_ADMISSION_ASSESSMENT",
    domainReuse: ["EDOC_HEAD_TO_TOE"],
    fields: [
      f("generalAppearance", "select", "hospitalAdmissionD4a25.help.fields.generalAppearance", {
        optionsKey: "generalAppearance",
        required: true,
      }),
      f("levelOfConsciousness", "text", "hospitalAdmissionD4a25.help.fields.loc"),
      f("orientation", "multiselect", "hospitalAdmissionD4a25.help.fields.orientation", {
        optionsKey: "orientation",
      }),
      f("behavior", "select", "hospitalAdmissionD4a25.help.fields.behavior", {
        optionsKey: "behavior",
      }),
      f("distress", "select", "hospitalAdmissionD4a25.help.fields.distress", {
        optionsKey: "generalAppearance",
      }),
      f("respiratoryEffort", "select", "hospitalAdmissionD4a25.help.fields.respiratoryEffort", {
        optionsKey: "normalAbnormal",
      }),
      f("skinColor", "select", "hospitalAdmissionD4a25.help.fields.skinColor", {
        optionsKey: "skinColorDetail",
      }),
      f("communicationAbility", "select", "hospitalAdmissionD4a25.help.fields.communication", {
        optionsKey: "communicationAbility",
      }),
      f("immediateSafetyConcern", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.safetyConcern", {
        optionsKey: "yesNoUnknown",
        required: true,
      }),
      f("painPresent", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.painPresent", {
        optionsKey: "yesNoUnknown",
        required: true,
      }),
      f("nauseaVomiting", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.nausea", {
        optionsKey: "yesNoUnknown",
      }),
      f("dizziness", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.dizziness", {
        optionsKey: "yesNoUnknown",
      }),
      f("weakness", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.weakness", {
        optionsKey: "yesNoUnknown",
      }),
      f("shortnessOfBreath", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.sob", {
        optionsKey: "yesNoUnknown",
      }),
      f("chestDiscomfort", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.chest", {
        optionsKey: "yesNoUnknown",
      }),
      f("acuteNeuroConcern", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.neuro", {
        optionsKey: "yesNoUnknown",
      }),
      f("urgentProviderNotification", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.urgentNotify", {
        optionsKey: "yesNoUnknown",
      }),
      f("providerNotified", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.providerNotified", {
        optionsKey: "yesNoUnknown",
        showWhen: { field: "urgentProviderNotification", values: ["YES"] },
      }),
      f("notificationTime", "datetime", "hospitalAdmissionD4a25.help.fields.notificationTime", {
        showWhen: { field: "providerNotified", values: ["YES"] },
      }),
      f("providerResponse", "textarea", "hospitalAdmissionD4a25.help.fields.providerResponse"),
      f("comments", "textarea", "hospitalAdmissionD4a25.help.fields.comments"),
    ],
  },
  MEDICAL_HISTORY: {
    sectionId: "MEDICAL_HISTORY",
    helpKey: "hospitalAdmissionD4a25.help.sections.MEDICAL_HISTORY",
    domainReuse: ["PATIENT_CLINICAL_HISTORY_PROFILE"],
    fields: [
      f("historyReviewComplete", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.historyReview", {
        optionsKey: "yesNoUnknown",
        required: true,
      }),
      f("additionalHistory", "textarea", "hospitalAdmissionD4a25.help.fields.additionalHistory"),
      f("comments", "textarea", "hospitalAdmissionD4a25.help.fields.comments"),
    ],
  },
  SURGICAL_HISTORY: {
    sectionId: "SURGICAL_HISTORY",
    helpKey: "hospitalAdmissionD4a25.help.sections.SURGICAL_HISTORY",
    domainReuse: ["PATIENT_CLINICAL_HISTORY_PROFILE"],
    fields: [
      f("surgicalReviewComplete", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.surgicalReview", {
        optionsKey: "yesNoUnknown",
        required: true,
      }),
      f("patientDeniesPriorSurgery", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.deniesSurgery", {
        optionsKey: "yesNoUnknown",
      }),
      f("additionalProcedures", "textarea", "hospitalAdmissionD4a25.help.fields.additionalProcedures"),
      f("comments", "textarea", "hospitalAdmissionD4a25.help.fields.comments"),
    ],
  },
  HOME_MEDICATIONS: {
    sectionId: "HOME_MEDICATIONS",
    helpKey: "hospitalAdmissionD4a25.help.sections.HOME_MEDICATIONS",
    domainReuse: ["MEDICATION_INTELLIGENCE_HOME_MEDS"],
    fields: [
      f("reconComplete", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.medReconComplete", {
        optionsKey: "yesNoUnknown",
        required: true,
      }),
      f("primarySource", "select", "hospitalAdmissionD4a25.help.fields.medSource", {
        optionsKey: "homeMedSource",
      }),
      f("discrepancies", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.medDiscrepancy", {
        optionsKey: "yesNoUnknown",
      }),
      f("comments", "textarea", "hospitalAdmissionD4a25.help.fields.comments"),
    ],
  },
  ALLERGIES: {
    sectionId: "ALLERGIES",
    helpKey: "hospitalAdmissionD4a25.help.sections.ALLERGIES",
    domainReuse: ["ALLERGY_DOMAIN"],
    fields: [
      f("allergyReviewComplete", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.allergyReview", {
        optionsKey: "yesNoUnknown",
        required: true,
      }),
      f("nkaDocumented", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.nka", {
        optionsKey: "yesNoUnknown",
      }),
      f("comments", "textarea", "hospitalAdmissionD4a25.help.fields.comments"),
    ],
  },
  SOCIAL_HISTORY: {
    sectionId: "SOCIAL_HISTORY",
    helpKey: "hospitalAdmissionD4a25.help.sections.SOCIAL_HISTORY",
    domainReuse: ["PATIENT_CLINICAL_HISTORY_PROFILE"],
    fields: [
      f("livingSituation", "select", "hospitalAdmissionD4a25.help.fields.livingSituation", {
        optionsKey: "livingSituation",
      }),
      f("housingStability", "select", "hospitalAdmissionD4a25.help.fields.housing", {
        optionsKey: "concernTriad",
      }),
      f("tobaccoUse", "select", "hospitalAdmissionD4a25.help.fields.tobacco", {
        optionsKey: "concernTriad",
      }),
      f("vaping", "select", "hospitalAdmissionD4a25.help.fields.vaping", {
        optionsKey: "concernTriad",
      }),
      f("alcoholUse", "select", "hospitalAdmissionD4a25.help.fields.alcohol", {
        optionsKey: "concernTriad",
      }),
      f("recreationalDrugUse", "select", "hospitalAdmissionD4a25.help.fields.drugs", {
        optionsKey: "concernTriad",
      }),
      f("occupation", "text", "hospitalAdmissionD4a25.help.fields.occupation"),
      f("transportationAccess", "select", "hospitalAdmissionD4a25.help.fields.transport", {
        optionsKey: "concernTriad",
      }),
      f("foodInsecurity", "select", "hospitalAdmissionD4a25.help.fields.food", {
        optionsKey: "concernTriad",
      }),
      f("caregiverSupport", "text", "hospitalAdmissionD4a25.help.fields.caregiver"),
      f("advanceDirectiveKnown", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.advanceDirective", {
        optionsKey: "yesNoUnknown",
      }),
      f("spiritualNeeds", "textarea", "hospitalAdmissionD4a25.help.fields.spiritual"),
      f("safetyAtHome", "select", "hospitalAdmissionD4a25.help.fields.safetyHome", {
        optionsKey: "concernTriad",
      }),
      f("ipvConcern", "select", "hospitalAdmissionD4a25.help.fields.ipv", {
        optionsKey: "concernTriad",
      }),
      f("comments", "textarea", "hospitalAdmissionD4a25.help.fields.comments"),
    ],
  },
  BELONGINGS_VALUABLES: {
    sectionId: "BELONGINGS_VALUABLES",
    helpKey: "hospitalAdmissionD4a25.help.sections.BELONGINGS_VALUABLES",
    domainReuse: ["ADMISSION_BELONGINGS_ARRAY"],
    fields: [
      f("inventoryReviewed", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.belongingsReview", {
        optionsKey: "yesNoUnknown",
        required: true,
      }),
      f("valuablesPresent", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.valuablesPresent", {
        optionsKey: "yesNoUnknown",
      }),
      f("cashPresent", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.cashPresent", {
        optionsKey: "yesNoUnknown",
      }),
      f("witnessUserId", "text", "hospitalAdmissionD4a25.help.fields.witness", {
        showWhen: { field: "cashPresent", values: ["YES"] },
      }),
      f("comments", "textarea", "hospitalAdmissionD4a25.help.fields.comments"),
    ],
  },
  SKIN_WOUND: {
    sectionId: "SKIN_WOUND",
    helpKey: "hospitalAdmissionD4a25.help.sections.SKIN_WOUND",
    domainReuse: ["EDOC20_SKIN"],
    fields: [
      f("overallSkinCondition", "select", "hospitalAdmissionD4a25.help.fields.skinCondition", {
        optionsKey: "normalAbnormal",
        required: true,
      }),
      f("color", "select", "hospitalAdmissionD4a25.help.fields.skinColorDetail", {
        optionsKey: "skinColorDetail",
      }),
      f("temperature", "select", "hospitalAdmissionD4a25.help.fields.skinTemp", {
        optionsKey: "skinTemperature",
      }),
      f("moisture", "select", "hospitalAdmissionD4a25.help.fields.skinMoisture", {
        optionsKey: "skinMoisture",
      }),
      f("turgor", "select", "hospitalAdmissionD4a25.help.fields.turgor", {
        optionsKey: "skinTurgor",
      }),
      f("edema", "presentAbsentUnable", "hospitalAdmissionD4a25.help.fields.edema", {
        optionsKey: "presentAbsentUnable",
      }),
      f("bruising", "presentAbsentUnable", "hospitalAdmissionD4a25.help.fields.bruising", {
        optionsKey: "presentAbsentUnable",
      }),
      f("pressureInjury", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.pressureInjury", {
        optionsKey: "yesNoUnknown",
        required: true,
      }),
      f("pressureInjuryStage", "text", "hospitalAdmissionD4a25.help.fields.pressureStage", {
        showWhen: { field: "pressureInjury", values: ["YES"] },
        requiredWhen: { field: "pressureInjury", values: ["YES"] },
      }),
      f("openWound", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.openWound", {
        optionsKey: "yesNoUnknown",
      }),
      f("providerNotified", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.woundProviderNotify", {
        optionsKey: "yesNoUnknown",
      }),
      f("comments", "textarea", "hospitalAdmissionD4a25.help.fields.comments"),
    ],
  },
  LINES_DRAINS_DEVICES: {
    sectionId: "LINES_DRAINS_DEVICES",
    helpKey: "hospitalAdmissionD4a25.help.sections.LINES_DRAINS_DEVICES",
    domainReuse: ["EDOC_DEVICES"],
    fields: [
      f("devicesPresent", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.devicesPresent", {
        optionsKey: "yesNoUnknown",
        required: true,
      }),
      f("deviceTypes", "multiselect", "hospitalAdmissionD4a25.help.fields.deviceTypes", {
        optionsKey: "deviceTypes",
        showWhen: { field: "devicesPresent", values: ["YES"] },
      }),
      f("siteCondition", "select", "hospitalAdmissionD4a25.help.fields.deviceSite", {
        optionsKey: "normalAbnormal",
      }),
      f("comments", "textarea", "hospitalAdmissionD4a25.help.fields.comments"),
    ],
  },
  FALL_SAFETY: {
    sectionId: "FALL_SAFETY",
    helpKey: "hospitalAdmissionD4a25.help.sections.FALL_SAFETY",
    domainReuse: ["EDOC14_FALL_SAFETY"],
    fields: [
      f("fallPriorMonths", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.fallHistory", {
        optionsKey: "yesNoUnknown",
        required: true,
      }),
      f("gaitImpairment", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.gait", {
        optionsKey: "yesNoUnknown",
      }),
      f("assistiveDevice", "multiselect", "hospitalAdmissionD4a25.help.fields.assistiveDevice", {
        optionsKey: "assistiveDevices",
      }),
      f("dizziness", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.dizziness", {
        optionsKey: "yesNoUnknown",
      }),
      f("confusion", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.confusion", {
        optionsKey: "yesNoUnknown",
      }),
      f("sedatingMedication", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.sedatingMed", {
        optionsKey: "yesNoUnknown",
      }),
      f("elopementRisk", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.elopement", {
        optionsKey: "yesNoUnknown",
      }),
      f("suicideSelfHarmConcern", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.suicide", {
        optionsKey: "yesNoUnknown",
        required: true,
      }),
      f("aspirationRisk", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.aspiration", {
        optionsKey: "yesNoUnknown",
      }),
      f("fallRiskResult", "text", "hospitalAdmissionD4a25.help.fields.fallRiskResult"),
      f("precautionsInitiated", "multiselect", "hospitalAdmissionD4a25.help.fields.fallPrecautions", {
        optionsKey: "fallPrecautions",
      }),
      f("comments", "textarea", "hospitalAdmissionD4a25.help.fields.comments"),
    ],
  },
  PAIN: {
    sectionId: "PAIN",
    helpKey: "hospitalAdmissionD4a25.help.sections.PAIN",
    domainReuse: ["EDOC13_PAIN"],
    fields: [
      f("painPresent", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.painPresent", {
        optionsKey: "yesNoUnknown",
        required: true,
      }),
      f("painScale", "select", "hospitalAdmissionD4a25.help.fields.painScale", {
        optionsKey: "painScale",
        requiredWhen: { field: "painPresent", values: ["YES"] },
        showWhen: { field: "painPresent", values: ["YES"] },
      }),
      f("score", "number", "hospitalAdmissionD4a25.help.fields.painScore", {
        requiredWhen: { field: "painPresent", values: ["YES"] },
        showWhen: { field: "painPresent", values: ["YES"] },
      }),
      f("location", "text", "hospitalAdmissionD4a25.help.fields.painLocation", {
        requiredWhen: { field: "painPresent", values: ["YES"] },
        showWhen: { field: "painPresent", values: ["YES"] },
      }),
      f("quality", "text", "hospitalAdmissionD4a25.help.fields.painQuality", {
        showWhen: { field: "painPresent", values: ["YES"] },
      }),
      f("interventionProvided", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.painIntervention", {
        optionsKey: "yesNoUnknown",
        showWhen: { field: "painPresent", values: ["YES"] },
      }),
      f("unableToSelfReport", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.unableSelfReport", {
        optionsKey: "yesNoUnknown",
      }),
      f("comments", "textarea", "hospitalAdmissionD4a25.help.fields.comments"),
    ],
  },
  FUNCTIONAL_MOBILITY: {
    sectionId: "FUNCTIONAL_MOBILITY",
    helpKey: "hospitalAdmissionD4a25.help.sections.FUNCTIONAL_MOBILITY",
    domainReuse: ["EDOC_MSK"],
    fields: [
      f("baselineMobility", "select", "hospitalAdmissionD4a25.help.fields.baselineMobility", {
        optionsKey: "assistanceLevel",
        required: true,
      }),
      f("currentMobility", "select", "hospitalAdmissionD4a25.help.fields.currentMobility", {
        optionsKey: "assistanceLevel",
        required: true,
      }),
      f("transferAbility", "select", "hospitalAdmissionD4a25.help.fields.transfer", {
        optionsKey: "assistanceLevel",
      }),
      f("assistiveDevices", "multiselect", "hospitalAdmissionD4a25.help.fields.assistiveDevice", {
        optionsKey: "assistiveDevices",
      }),
      f("weightBearingRestriction", "select", "hospitalAdmissionD4a25.help.fields.weightBearing", {
        optionsKey: "weightBearing",
      }),
      f("ptNeed", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.ptNeed", {
        optionsKey: "yesNoUnknown",
      }),
      f("otNeed", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.otNeed", {
        optionsKey: "yesNoUnknown",
      }),
      f("comments", "textarea", "hospitalAdmissionD4a25.help.fields.comments"),
    ],
  },
  NUTRITION: {
    sectionId: "NUTRITION",
    helpKey: "hospitalAdmissionD4a25.help.sections.NUTRITION",
    domainReuse: ["EDOC_NUTRITION"],
    fields: [
      f("currentDiet", "select", "hospitalAdmissionD4a25.help.fields.diet", {
        optionsKey: "currentDiet",
      }),
      f("appetite", "select", "hospitalAdmissionD4a25.help.fields.appetite", {
        optionsKey: "appetite",
      }),
      f("unintendedWeightLoss", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.weightLoss", {
        optionsKey: "yesNoUnknown",
      }),
      f("swallowingDifficulty", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.swallowing", {
        optionsKey: "yesNoUnknown",
        required: true,
      }),
      f("npoStatus", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.npo", {
        optionsKey: "yesNoUnknown",
      }),
      f("lastOralIntakeAt", "datetime", "hospitalAdmissionD4a25.help.fields.lastOralIntake"),
      f("dietitianReferral", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.dietitian", {
        optionsKey: "yesNoUnknown",
      }),
      f("comments", "textarea", "hospitalAdmissionD4a25.help.fields.comments"),
    ],
  },
  ELIMINATION: {
    sectionId: "ELIMINATION",
    helpKey: "hospitalAdmissionD4a25.help.sections.ELIMINATION",
    domainReuse: ["EDOC_GU_GI"],
    fields: [
      f("usualBowelPattern", "select", "hospitalAdmissionD4a25.help.fields.bowelPattern", {
        optionsKey: "bowelPattern",
      }),
      f("lastBowelMovement", "datetime", "hospitalAdmissionD4a25.help.fields.lastBm"),
      f("constipation", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.constipation", {
        optionsKey: "yesNoUnknown",
      }),
      f("diarrhea", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.diarrhea", {
        optionsKey: "yesNoUnknown",
      }),
      f("urinaryPattern", "select", "hospitalAdmissionD4a25.help.fields.urinaryPattern", {
        optionsKey: "urinaryPattern",
      }),
      f("lastVoid", "datetime", "hospitalAdmissionD4a25.help.fields.lastVoid"),
      f("catheter", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.catheter", {
        optionsKey: "yesNoUnknown",
      }),
      f("ioMonitoringRequired", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.io", {
        optionsKey: "yesNoUnknown",
      }),
      f("comments", "textarea", "hospitalAdmissionD4a25.help.fields.comments"),
    ],
  },
  PSYCHOSOCIAL: {
    sectionId: "PSYCHOSOCIAL",
    helpKey: "hospitalAdmissionD4a25.help.sections.PSYCHOSOCIAL",
    domainReuse: ["EDOC16_BEHAVIORAL"],
    fields: [
      f("mood", "select", "hospitalAdmissionD4a25.help.fields.mood", {
        optionsKey: "concernTriad",
      }),
      f("anxiety", "select", "hospitalAdmissionD4a25.help.fields.anxiety", {
        optionsKey: "concernTriad",
      }),
      f("deliriumConcern", "select", "hospitalAdmissionD4a25.help.fields.delirium", {
        optionsKey: "concernTriad",
      }),
      f("suicideScreeningCompleted", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.suicideScreen", {
        optionsKey: "yesNoUnknown",
        required: true,
      }),
      f("socialWorkNeed", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.socialWork", {
        optionsKey: "yesNoUnknown",
      }),
      f("spiritualCareNeed", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.spiritualCare", {
        optionsKey: "yesNoUnknown",
      }),
      f("comments", "textarea", "hospitalAdmissionD4a25.help.fields.comments"),
    ],
  },
  EDUCATION_COMMUNICATION: {
    sectionId: "EDUCATION_COMMUNICATION",
    helpKey: "hospitalAdmissionD4a25.help.sections.EDUCATION_COMMUNICATION",
    domainReuse: ["EDOC22_PATIENT_EDUCATION"],
    fields: [
      f("preferredLanguage", "text", "hospitalAdmissionD4a25.help.fields.language"),
      f("interpreterUsed", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.interpreterUsed", {
        optionsKey: "yesNoUnknown",
      }),
      f("learningPreference", "text", "hospitalAdmissionD4a25.help.fields.learningPref"),
      f("readinessToLearn", "select", "hospitalAdmissionD4a25.help.fields.readiness", {
        optionsKey: "concernTriad",
      }),
      f("educationProvided", "textarea", "hospitalAdmissionD4a25.help.fields.educationProvided"),
      f("learner", "select", "hospitalAdmissionD4a25.help.fields.learner", {
        optionsKey: "learner",
      }),
      f("teachBack", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.teachBack", {
        optionsKey: "yesNoUnknown",
      }),
      f("understanding", "select", "hospitalAdmissionD4a25.help.fields.understanding", {
        optionsKey: "understanding",
      }),
      f("comments", "textarea", "hospitalAdmissionD4a25.help.fields.comments"),
    ],
  },
  PROVIDER_ADMISSION: {
    sectionId: "PROVIDER_ADMISSION",
    helpKey: "hospitalAdmissionD4a25.help.sections.PROVIDER_ADMISSION",
    domainReuse: ["PROVIDER_HANDOFF"],
    fields: [
      f("handoffStatus", "select", "hospitalAdmissionD4a25.help.fields.handoffStatus", {
        optionsKey: "providerHandoffStatus",
        required: true,
      }),
      f("providerNotifiedOfArrival", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.arrivalNotify", {
        optionsKey: "yesNoUnknown",
      }),
      f("notificationAt", "datetime", "hospitalAdmissionD4a25.help.fields.notificationTime"),
      f("admissionOrdersPresent", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.ordersPresent", {
        optionsKey: "yesNoUnknown",
      }),
      f("medReconStatus", "text", "hospitalAdmissionD4a25.help.fields.providerMedRecon"),
      f("codeStatusConfirmed", "yes_no_unknown", "hospitalAdmissionD4a25.help.fields.codeConfirmed", {
        optionsKey: "yesNoUnknown",
      }),
      f("unresolvedItems", "textarea", "hospitalAdmissionD4a25.help.fields.unresolved"),
      f("handoffNote", "textarea", "hospitalAdmissionD4a25.help.fields.handoffNote"),
    ],
  },
};

export function nursingSectionSchema(
  sectionId: InpatientAdmissionClinicalSection
): NursingSectionSchema {
  return NURSING_ADMISSION_SECTION_SCHEMAS[sectionId];
}

export function allNursingSectionSchemas(): NursingSectionSchema[] {
  return INPATIENT_ADMISSION_CLINICAL_SECTIONS.map((id) => NURSING_ADMISSION_SECTION_SCHEMAS[id]);
}

export type SectionAnswers = Record<string, unknown>;

export function fieldIsVisible(
  field: NursingSectionFieldDef,
  answers: SectionAnswers
): boolean {
  if (!field.showWhen) return true;
  const v = String(answers[field.showWhen.field] ?? "");
  return field.showWhen.values.includes(v);
}

export function validateSectionAnswersForCompletion(input: {
  sectionId: InpatientAdmissionClinicalSection;
  answers: SectionAnswers;
  completionState: AdmissionSectionCompletionState;
  unableReason?: string | null;
}): { ok: true } | { ok: false; code: "SECTION_VALIDATION_FAILED"; missing: string[] } {
  const { completionState } = input;
  if (completionState === "NOT_APPLICABLE") return { ok: true };
  if (completionState === "UNABLE_TO_COMPLETE") {
    if (!String(input.unableReason ?? "").trim()) {
      return { ok: false, code: "SECTION_VALIDATION_FAILED", missing: ["unableReason"] };
    }
    return { ok: true };
  }
  if (completionState !== "COMPLETE") return { ok: true };

  const schema = nursingSectionSchema(input.sectionId);
  const missing: string[] = [];
  for (const field of schema.fields) {
    if (!fieldIsVisible(field, input.answers)) continue;
    const need =
      field.required === true ||
      (field.requiredWhen != null &&
        field.requiredWhen.values.includes(String(input.answers[field.requiredWhen.field] ?? "")));
    if (!need) continue;
    const raw = input.answers[field.key];
    const empty =
      raw == null ||
      raw === "" ||
      (Array.isArray(raw) && raw.length === 0);
    if (empty) missing.push(field.key);
  }
  if (missing.length) {
    return { ok: false, code: "SECTION_VALIDATION_FAILED", missing };
  }
  return { ok: true };
}

const NON_MEANINGFUL_ANSWER_KEYS = new Set([
  "comments",
  "additionalHistory",
  "handoffNote",
  "discrepancyDescription",
  "followUpDetail",
]);

export function sectionHasMeaningfulAnswers(answers: SectionAnswers | null | undefined): boolean {
  if (!answers) return false;
  return Object.entries(answers).some(([key, raw]) => {
    if (NON_MEANINGFUL_ANSWER_KEYS.has(key)) return false;
    if (raw == null || raw === "") return false;
    if (Array.isArray(raw)) return raw.length > 0;
    if (typeof raw === "string") return raw.trim().length > 0;
    return true;
  });
}

/**
 * Derive subsection completion for save orchestration.
 * Visiting a section does not complete it. Save & Continue may promote to COMPLETE
 * when required fields are satisfied.
 */
export function deriveAdmissionSectionCompletion(input: {
  sectionId: InpatientAdmissionClinicalSection;
  answers: SectionAnswers;
  unableReason?: string | null;
  previousState: AdmissionSectionCompletionState;
  mode: "DRAFT" | "CONTINUE" | "EXPLICIT";
  explicitState?: AdmissionSectionCompletionState;
}): AdmissionSectionCompletionState {
  if (input.mode === "EXPLICIT" && input.explicitState) {
    const check = validateSectionAnswersForCompletion({
      sectionId: input.sectionId,
      answers: input.answers,
      completionState: input.explicitState,
      unableReason: input.unableReason,
    });
    if (check.ok) return input.explicitState;
    if (input.explicitState === "UNABLE_TO_COMPLETE") return "IN_PROGRESS";
    if (input.explicitState === "COMPLETE") {
      return sectionHasMeaningfulAnswers(input.answers) ? "IN_PROGRESS" : "NOT_STARTED";
    }
    return input.explicitState;
  }

  if (input.previousState === "NOT_APPLICABLE") return "NOT_APPLICABLE";
  if (input.previousState === "UNABLE_TO_COMPLETE") {
    const unableOk = validateSectionAnswersForCompletion({
      sectionId: input.sectionId,
      answers: input.answers,
      completionState: "UNABLE_TO_COMPLETE",
      unableReason: input.unableReason,
    });
    if (unableOk.ok) return "UNABLE_TO_COMPLETE";
  }

  if (input.mode === "CONTINUE") {
    const unableOk = validateSectionAnswersForCompletion({
      sectionId: input.sectionId,
      answers: input.answers,
      completionState: "UNABLE_TO_COMPLETE",
      unableReason: input.unableReason,
    });
    if (unableOk.ok && String(input.unableReason ?? "").trim()) {
      return "UNABLE_TO_COMPLETE";
    }
    const completeOk = validateSectionAnswersForCompletion({
      sectionId: input.sectionId,
      answers: input.answers,
      completionState: "COMPLETE",
      unableReason: input.unableReason,
    });
    if (completeOk.ok) return "COMPLETE";
  }

  if (sectionHasMeaningfulAnswers(input.answers)) return "IN_PROGRESS";
  if (input.previousState === "COMPLETE") return "COMPLETE";
  return "NOT_STARTED";
}

/**
 * UI Save & Continue uses mode CONTINUE. The API enum must never receive "CONTINUE".
 */
export function persistableAdmissionSectionCompletion(
  input: Parameters<typeof deriveAdmissionSectionCompletion>[0]
): AdmissionSectionCompletionState {
  const derived = deriveAdmissionSectionCompletion(input);
  if ((derived as string) === "CONTINUE") {
    return sectionHasMeaningfulAnswers(input.answers) ? "IN_PROGRESS" : "NOT_STARTED";
  }
  if (input.sectionId === "PROVIDER_ADMISSION" && derived === "COMPLETE") {
    const notify = String(input.answers.providerNotifiedOfArrival ?? "").toUpperCase();
    const handoff = String(input.answers.handoffStatus ?? "");
    if (notify !== "YES" || nursingAdmissionStage6HandoffIsPending(handoff)) {
      return "IN_PROGRESS";
    }
  }
  return derived;
}

/** Opening a section must never invent clinical findings. */
export function openingSectionMustNotAutoDocumentFindings(): true {
  return true;
}

export function nursingAdmissionAttestationText(locale: "en" | "fr"): string {
  if (locale === "fr") {
    return "J’atteste avoir réalisé ou revu cette évaluation d’admission infirmière et que la documentation reflète l’état du patient et les informations disponibles au moment de l’évaluation.";
  }
  return "I attest that I completed or reviewed this nursing admission assessment and that the documentation reflects the patient’s condition and information available at the time of assessment.";
}

export type NursingAdmissionAddendumV1 = {
  addendumId: string;
  createdAt: string;
  createdByUserId: string;
  reason: string;
  sectionId?: InpatientAdmissionClinicalSection | null;
  previousAnswers?: SectionAnswers | null;
  nextAnswers?: SectionAnswers | null;
  note?: string | null;
};

export type InpatientLifecycleMetaV1 = {
  version: 1;
  cancelledAt?: string | null;
  cancelledByUserId?: string | null;
  cancelReasonCode?: InpatientCancelReasonCode | null;
  cancelExplanation?: string | null;
  voidedAt?: string | null;
  voidedByUserId?: string | null;
  voidReason?: string | null;
  admissionDetailEdits?: Array<{
    editedAt: string;
    editedByUserId: string;
    fields: string[];
    previous: Record<string, unknown>;
    next: Record<string, unknown>;
  }>;
  bedTransfers?: Array<{
    transferredAt: string;
    transferredByUserId: string;
    fromUnit: string | null;
    fromBedKey: string | null;
    toUnit: string;
    toBedKey: string;
    reason: string;
    effectiveAt: string;
  }>;
  discharge?: {
    dischargedAt: string;
    dischargedByUserId: string;
    disposition: string;
    condition?: string | null;
    destination?: string | null;
    responsibleProviderUserId?: string | null;
    nursingDischargeComplete?: boolean;
    instructionsStatus?: string | null;
    medReconStatus?: string | null;
    followUpStatus?: string | null;
    note?: string | null;
  } | null;
};

export const INPATIENT_LIFECYCLE_META_KEY = "inpatientLifecycleV1" as const;

export function readInpatientLifecycleMeta(
  admissionSummaryJson: unknown
): InpatientLifecycleMetaV1 | null {
  if (!admissionSummaryJson || typeof admissionSummaryJson !== "object") return null;
  const raw = (admissionSummaryJson as Record<string, unknown>)[INPATIENT_LIFECYCLE_META_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as InpatientLifecycleMetaV1;
}

export function mergeInpatientLifecycleMeta(
  admissionSummaryJson: unknown,
  meta: InpatientLifecycleMetaV1
): Record<string, unknown> {
  const base =
    admissionSummaryJson &&
    typeof admissionSummaryJson === "object" &&
    !Array.isArray(admissionSummaryJson)
      ? { ...(admissionSummaryJson as Record<string, unknown>) }
      : {};
  base[INPATIENT_LIFECYCLE_META_KEY] = meta;
  return base;
}

export function emptyInpatientLifecycleMeta(): InpatientLifecycleMetaV1 {
  return { version: 1, admissionDetailEdits: [], bedTransfers: [], discharge: null };
}

export function reviewNursingAdmission(doc: MedSurgNursingAdmissionDocV1): {
  sections: Array<{
    sectionId: InpatientAdmissionClinicalSection;
    completionState: AdmissionSectionCompletionState;
    missingRequired: string[];
  }>;
  signed: boolean;
  warnings: string[];
} {
  const sections = INPATIENT_ADMISSION_CLINICAL_SECTIONS.map((sectionId) => {
    const sec = doc.sections[sectionId];
    const answers = (sec as { answers?: SectionAnswers } | undefined)?.answers ?? {};
    const completionState = sec?.completionState ?? "NOT_STARTED";
    const validation = validateSectionAnswersForCompletion({
      sectionId,
      answers,
      completionState: completionState === "COMPLETE" ? "COMPLETE" : "IN_PROGRESS",
      unableReason: (sec as { unableReason?: string } | undefined)?.unableReason,
    });
    return {
      sectionId,
      completionState,
      missingRequired: validation.ok ? [] : validation.missing,
    };
  });
  const warnings: string[] = [];
  for (const s of sections) {
    if (s.completionState === "UNABLE_TO_COMPLETE") {
      warnings.push(`${s.sectionId}:UNABLE_TO_COMPLETE`);
    }
    if (s.missingRequired.length && s.completionState === "COMPLETE") {
      warnings.push(`${s.sectionId}:MISSING_REQUIRED`);
    }
  }
  return {
    sections,
    signed: Boolean(doc.nurseSignature?.signed),
    warnings,
  };
}

export function isInpatientCancelReasonCode(raw: unknown): raw is InpatientCancelReasonCode {
  return (
    typeof raw === "string" &&
    (INPATIENT_CANCEL_REASON_CODES as readonly string[]).includes(raw)
  );
}
