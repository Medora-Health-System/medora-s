/**
 * MEDUI.D5A.4A — Enterprise Dental Clinical Evaluation (structured documentation).
 * Zero-schema JSON under Encounter.nursingAssessment — not a parallel DentalNote engine.
 * Tooth-level findings remain MEDUI.D5A.4 ToothFinding authority.
 */

import { D5A3_DENTAL_SERVICE_LINE_TAG } from "./enterpriseDentalEncounterWorkspaceD5a3.js";

export const D5A4A_CERTIFICATION_ID = "MEDUI.D5A.4A" as const;

/** nursingAssessment namespace for structured dental clinical evaluation. */
export const D5A4A_DENTAL_CLINICAL_EVALUATION_KEY = "dentalClinicalEvaluationV1" as const;

export const D5A4A_CHIEF_CONCERN_CODES = [
  "TOOTH_PAIN",
  "SENSITIVITY",
  "SWELLING",
  "BROKEN_CHIPPED_TOOTH",
  "LOOSE_TOOTH",
  "BLEEDING_GUMS",
  "ORAL_LESION",
  "DENTAL_TRAUMA",
  "PROSTHETIC_RESTORATION",
  "PREVENTIVE_ROUTINE",
  "OTHER",
] as const;
export type D5a4aChiefConcernCode = (typeof D5A4A_CHIEF_CONCERN_CODES)[number];

/** Codes that must never appear as Dental Evaluation primary complaint vocabulary. */
export const D5A4A_FORBIDDEN_MEDICAL_COMPLAINT_MARKERS = [
  "chest pain",
  "chest_pain",
  "abdominal pain",
  "abdominal_pain",
  "headache",
  "flank pain",
  "flank_pain",
  "limb pain",
  "limb_pain",
  "back pain",
  "back_pain",
  "nausea",
  "ecg normal",
  "smoking cessation",
  "hv-smoking-cessation",
] as const;

export const D5A4A_SEVERITY_LEVELS = ["NONE", "MILD", "MODERATE", "SEVERE"] as const;
export type D5a4aSeverityLevel = (typeof D5A4A_SEVERITY_LEVELS)[number];

export const D5A4A_YES_NO_UNKNOWN = ["YES", "NO", "UNKNOWN", ""] as const;
export type D5a4aYesNoUnknown = (typeof D5A4A_YES_NO_UNKNOWN)[number];

export type D5a4aDentalHpi = {
  toothOrRegion: string;
  onset: string;
  duration: string;
  severity: D5a4aSeverityLevel | "";
  spontaneousVsProvoked: string;
  hotSensitivity: D5a4aYesNoUnknown;
  coldSensitivity: D5a4aYesNoUnknown;
  sweetsSensitivity: D5a4aYesNoUnknown;
  bitingSensitivity: D5a4aYesNoUnknown;
  swelling: D5a4aYesNoUnknown;
  drainage: D5a4aYesNoUnknown;
  trauma: D5a4aYesNoUnknown;
  priorTreatment: string;
  analgesicUse: string;
  antibioticUse: string;
  narrative: string;
};

export type D5a4aExtraoralExam = {
  facialSymmetry: string;
  facialSwelling: string;
  lymphNodes: string;
  tmj: string;
  mouthOpeningTrismus: string;
  other: string;
};

export type D5a4aIntraoralExam = {
  oralMucosa: string;
  tongue: string;
  floorOfMouth: string;
  palate: string;
  gingiva: string;
  dentition: string;
  occlusion: string;
  swelling: string;
  drainage: string;
  lesions: string;
  other: string;
};

export type D5a4aDentalDiagnostics = {
  percussion: string;
  palpation: string;
  mobility: string;
  vitalityPulpTesting: string;
  radiographicFindings: string;
  other: string;
};

export type D5a4aClinicalDecision = {
  findingsReviewed: boolean;
  dentalImagingReviewed: boolean;
  diagnosticImpression: string;
  treatmentOptionsDiscussed: string;
  risksBenefitsDiscussed: string;
  procedureRecommended: string;
  procedureDeferred: string;
  referralConsultation: string;
  urgentReferral: boolean;
  followUpDisposition: string;
  clinicalReasoning: string;
};

export type D5a4aDentalClinicalEvaluationV1 = {
  schemaVersion: 1;
  certificationId: typeof D5A4A_CERTIFICATION_ID;
  chiefConcerns: D5a4aChiefConcernCode[];
  chiefConcernOther: string;
  hpi: D5a4aDentalHpi;
  /** Attestation / notes only — allergies/meds/history stay on Patient authority. */
  riskReview: {
    enterpriseHistoryReviewed: boolean;
    anticoagulantAntiplateletNoted: boolean;
    diabetesNoted: boolean;
    pregnancyRelevant: boolean;
    tobaccoNoted: boolean;
    priorDentalComplications: string;
    notes: string;
  };
  extraoral: D5a4aExtraoralExam;
  intraoral: D5a4aIntraoralExam;
  /** Narrative bridge to D5A.4 odontogram — not a second ToothFinding store. */
  toothExamNotes: string;
  referencedToothCodes: string[];
  diagnostics: D5a4aDentalDiagnostics;
  assessment: string;
  clinicalDecision: D5a4aClinicalDecision;
  metadata?: {
    savedAt?: string;
    savedBy?: string;
  };
};

function emptyHpi(): D5a4aDentalHpi {
  return {
    toothOrRegion: "",
    onset: "",
    duration: "",
    severity: "",
    spontaneousVsProvoked: "",
    hotSensitivity: "",
    coldSensitivity: "",
    sweetsSensitivity: "",
    bitingSensitivity: "",
    swelling: "",
    drainage: "",
    trauma: "",
    priorTreatment: "",
    analgesicUse: "",
    antibioticUse: "",
    narrative: "",
  };
}

export function emptyDentalClinicalEvaluationV1(): D5a4aDentalClinicalEvaluationV1 {
  return {
    schemaVersion: 1,
    certificationId: D5A4A_CERTIFICATION_ID,
    chiefConcerns: [],
    chiefConcernOther: "",
    hpi: emptyHpi(),
    riskReview: {
      enterpriseHistoryReviewed: false,
      anticoagulantAntiplateletNoted: false,
      diabetesNoted: false,
      pregnancyRelevant: false,
      tobaccoNoted: false,
      priorDentalComplications: "",
      notes: "",
    },
    extraoral: {
      facialSymmetry: "",
      facialSwelling: "",
      lymphNodes: "",
      tmj: "",
      mouthOpeningTrismus: "",
      other: "",
    },
    intraoral: {
      oralMucosa: "",
      tongue: "",
      floorOfMouth: "",
      palate: "",
      gingiva: "",
      dentition: "",
      occlusion: "",
      swelling: "",
      drainage: "",
      lesions: "",
      other: "",
    },
    toothExamNotes: "",
    referencedToothCodes: [],
    diagnostics: {
      percussion: "",
      palpation: "",
      mobility: "",
      vitalityPulpTesting: "",
      radiographicFindings: "",
      other: "",
    },
    assessment: "",
    clinicalDecision: {
      findingsReviewed: false,
      dentalImagingReviewed: false,
      diagnosticImpression: "",
      treatmentOptionsDiscussed: "",
      risksBenefitsDiscussed: "",
      procedureRecommended: "",
      procedureDeferred: "",
      referralConsultation: "",
      urgentReferral: false,
      followUpDisposition: "",
      clinicalReasoning: "",
    },
  };
}

function asObject(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asBool(v: unknown): boolean {
  return v === true;
}

function isChiefConcern(v: string): v is D5a4aChiefConcernCode {
  return (D5A4A_CHIEF_CONCERN_CODES as readonly string[]).includes(v);
}

export function parseDentalClinicalEvaluationV1(
  raw: unknown
): D5a4aDentalClinicalEvaluationV1 {
  const base = emptyDentalClinicalEvaluationV1();
  const o = asObject(raw);
  if (!o) return base;

  const concernsRaw = Array.isArray(o.chiefConcerns) ? o.chiefConcerns : [];
  const chiefConcerns = concernsRaw
    .map((c) => String(c ?? "").trim().toUpperCase())
    .filter(isChiefConcern);

  const hpi = asObject(o.hpi) ?? {};
  const risk = asObject(o.riskReview) ?? {};
  const extra = asObject(o.extraoral) ?? {};
  const intra = asObject(o.intraoral) ?? {};
  const diag = asObject(o.diagnostics) ?? {};
  const cd = asObject(o.clinicalDecision) ?? {};
  const meta = asObject(o.metadata);

  const severityRaw = asString(hpi.severity).toUpperCase();
  const severity = (D5A4A_SEVERITY_LEVELS as readonly string[]).includes(severityRaw)
    ? (severityRaw as D5a4aSeverityLevel)
    : "";

  const yn = (v: unknown): D5a4aYesNoUnknown => {
    const s = asString(v).toUpperCase();
    return (D5A4A_YES_NO_UNKNOWN as readonly string[]).includes(s)
      ? (s as D5a4aYesNoUnknown)
      : "";
  };

  return {
    schemaVersion: 1,
    certificationId: D5A4A_CERTIFICATION_ID,
    chiefConcerns,
    chiefConcernOther: asString(o.chiefConcernOther),
    hpi: {
      toothOrRegion: asString(hpi.toothOrRegion),
      onset: asString(hpi.onset),
      duration: asString(hpi.duration),
      severity,
      spontaneousVsProvoked: asString(hpi.spontaneousVsProvoked),
      hotSensitivity: yn(hpi.hotSensitivity),
      coldSensitivity: yn(hpi.coldSensitivity),
      sweetsSensitivity: yn(hpi.sweetsSensitivity),
      bitingSensitivity: yn(hpi.bitingSensitivity),
      swelling: yn(hpi.swelling),
      drainage: yn(hpi.drainage),
      trauma: yn(hpi.trauma),
      priorTreatment: asString(hpi.priorTreatment),
      analgesicUse: asString(hpi.analgesicUse),
      antibioticUse: asString(hpi.antibioticUse),
      narrative: asString(hpi.narrative),
    },
    riskReview: {
      enterpriseHistoryReviewed: asBool(risk.enterpriseHistoryReviewed),
      anticoagulantAntiplateletNoted: asBool(risk.anticoagulantAntiplateletNoted),
      diabetesNoted: asBool(risk.diabetesNoted),
      pregnancyRelevant: asBool(risk.pregnancyRelevant),
      tobaccoNoted: asBool(risk.tobaccoNoted),
      priorDentalComplications: asString(risk.priorDentalComplications),
      notes: asString(risk.notes),
    },
    extraoral: {
      facialSymmetry: asString(extra.facialSymmetry),
      facialSwelling: asString(extra.facialSwelling),
      lymphNodes: asString(extra.lymphNodes),
      tmj: asString(extra.tmj),
      mouthOpeningTrismus: asString(extra.mouthOpeningTrismus),
      other: asString(extra.other),
    },
    intraoral: {
      oralMucosa: asString(intra.oralMucosa),
      tongue: asString(intra.tongue),
      floorOfMouth: asString(intra.floorOfMouth),
      palate: asString(intra.palate),
      gingiva: asString(intra.gingiva),
      dentition: asString(intra.dentition),
      occlusion: asString(intra.occlusion),
      swelling: asString(intra.swelling),
      drainage: asString(intra.drainage),
      lesions: asString(intra.lesions),
      other: asString(intra.other),
    },
    toothExamNotes: asString(o.toothExamNotes),
    referencedToothCodes: Array.isArray(o.referencedToothCodes)
      ? o.referencedToothCodes.map((t) => String(t ?? "").trim()).filter(Boolean)
      : [],
    diagnostics: {
      percussion: asString(diag.percussion),
      palpation: asString(diag.palpation),
      mobility: asString(diag.mobility),
      vitalityPulpTesting: asString(diag.vitalityPulpTesting),
      radiographicFindings: asString(diag.radiographicFindings),
      other: asString(diag.other),
    },
    assessment: asString(o.assessment),
    clinicalDecision: {
      findingsReviewed: asBool(cd.findingsReviewed),
      dentalImagingReviewed: asBool(cd.dentalImagingReviewed),
      diagnosticImpression: asString(cd.diagnosticImpression),
      treatmentOptionsDiscussed: asString(cd.treatmentOptionsDiscussed),
      risksBenefitsDiscussed: asString(cd.risksBenefitsDiscussed),
      procedureRecommended: asString(cd.procedureRecommended),
      procedureDeferred: asString(cd.procedureDeferred),
      referralConsultation: asString(cd.referralConsultation),
      urgentReferral: asBool(cd.urgentReferral),
      followUpDisposition: asString(cd.followUpDisposition),
      clinicalReasoning: asString(cd.clinicalReasoning),
    },
    metadata: meta
      ? {
          savedAt: asString(meta.savedAt) || undefined,
          savedBy: asString(meta.savedBy) || undefined,
        }
      : undefined,
  };
}

export function readDentalClinicalEvaluationFromNursingAssessment(
  nursingAssessment: unknown
): D5a4aDentalClinicalEvaluationV1 {
  const root = asObject(nursingAssessment);
  return parseDentalClinicalEvaluationV1(root?.[D5A4A_DENTAL_CLINICAL_EVALUATION_KEY]);
}

function hasNonEmptyString(v: string | undefined | null): boolean {
  return Boolean(String(v ?? "").trim());
}

/** True when structured dental evaluation has clinician-authored content. */
export function hasDentalClinicalEvaluationContent(
  evaluation: D5a4aDentalClinicalEvaluationV1 | unknown
): boolean {
  const e = parseDentalClinicalEvaluationV1(evaluation);
  if (e.chiefConcerns.length > 0) return true;
  if (hasNonEmptyString(e.chiefConcernOther)) return true;
  if (Object.values(e.hpi).some((v) => hasNonEmptyString(String(v)))) return true;
  if (
    e.riskReview.enterpriseHistoryReviewed ||
    e.riskReview.anticoagulantAntiplateletNoted ||
    e.riskReview.diabetesNoted ||
    e.riskReview.pregnancyRelevant ||
    e.riskReview.tobaccoNoted ||
    hasNonEmptyString(e.riskReview.priorDentalComplications) ||
    hasNonEmptyString(e.riskReview.notes)
  ) {
    return true;
  }
  if (Object.values(e.extraoral).some((v) => hasNonEmptyString(v))) return true;
  if (Object.values(e.intraoral).some((v) => hasNonEmptyString(v))) return true;
  if (hasNonEmptyString(e.toothExamNotes) || e.referencedToothCodes.length > 0) return true;
  if (Object.values(e.diagnostics).some((v) => hasNonEmptyString(v))) return true;
  if (hasNonEmptyString(e.assessment)) return true;
  const cd = e.clinicalDecision;
  if (
    cd.findingsReviewed ||
    cd.dentalImagingReviewed ||
    cd.urgentReferral ||
    hasNonEmptyString(cd.diagnosticImpression) ||
    hasNonEmptyString(cd.treatmentOptionsDiscussed) ||
    hasNonEmptyString(cd.risksBenefitsDiscussed) ||
    hasNonEmptyString(cd.procedureRecommended) ||
    hasNonEmptyString(cd.procedureDeferred) ||
    hasNonEmptyString(cd.referralConsultation) ||
    hasNonEmptyString(cd.followUpDisposition) ||
    hasNonEmptyString(cd.clinicalReasoning)
  ) {
    return true;
  }
  return false;
}

export function nursingAssessmentHasDentalClinicalEvaluationContent(
  nursingAssessment: unknown
): boolean {
  return hasDentalClinicalEvaluationContent(
    readDentalClinicalEvaluationFromNursingAssessment(nursingAssessment)
  );
}

/** Build a concise chief complaint string from dental concerns (enterprise column bridge). */
export function buildDentalChiefComplaintText(
  evaluation: D5a4aDentalClinicalEvaluationV1,
  labelFor: (code: D5a4aChiefConcernCode) => string
): string {
  const parts = evaluation.chiefConcerns.map((c) => labelFor(c));
  if (evaluation.chiefConcernOther.trim()) parts.push(evaluation.chiefConcernOther.trim());
  if (evaluation.hpi.toothOrRegion.trim()) {
    parts.push(`(${evaluation.hpi.toothOrRegion.trim()})`);
  }
  return parts.join("; ").slice(0, 500);
}

/** Roll dental structured fields into physicianEvalV1 for enterprise sign/summary compatibility. */
export function buildPhysicianEvalBridgeFromDentalEvaluation(
  evaluation: D5a4aDentalClinicalEvaluationV1
): Record<string, string> {
  const hpiParts: string[] = [];
  if (evaluation.hpi.narrative.trim()) hpiParts.push(evaluation.hpi.narrative.trim());
  if (evaluation.hpi.toothOrRegion.trim()) {
    hpiParts.push(`Region/tooth: ${evaluation.hpi.toothOrRegion.trim()}`);
  }
  if (evaluation.hpi.onset.trim()) hpiParts.push(`Onset: ${evaluation.hpi.onset.trim()}`);
  if (evaluation.hpi.duration.trim()) hpiParts.push(`Duration: ${evaluation.hpi.duration.trim()}`);
  if (evaluation.hpi.severity) hpiParts.push(`Severity: ${evaluation.hpi.severity}`);

  const examParts: string[] = [];
  for (const [k, v] of Object.entries(evaluation.extraoral)) {
    if (v.trim()) examParts.push(`Extraoral ${k}: ${v.trim()}`);
  }
  for (const [k, v] of Object.entries(evaluation.intraoral)) {
    if (v.trim()) examParts.push(`Intraoral ${k}: ${v.trim()}`);
  }
  for (const [k, v] of Object.entries(evaluation.diagnostics)) {
    if (v.trim()) examParts.push(`Diagnostic ${k}: ${v.trim()}`);
  }
  if (evaluation.toothExamNotes.trim()) {
    examParts.push(`Tooth exam (odontogram): ${evaluation.toothExamNotes.trim()}`);
  }

  const mdmParts: string[] = [];
  const cd = evaluation.clinicalDecision;
  if (cd.findingsReviewed) mdmParts.push("Dental findings reviewed");
  if (cd.dentalImagingReviewed) mdmParts.push("Dental imaging reviewed");
  if (cd.diagnosticImpression.trim()) mdmParts.push(`Impression: ${cd.diagnosticImpression.trim()}`);
  if (cd.treatmentOptionsDiscussed.trim()) {
    mdmParts.push(`Options discussed: ${cd.treatmentOptionsDiscussed.trim()}`);
  }
  if (cd.risksBenefitsDiscussed.trim()) {
    mdmParts.push(`Risks/benefits: ${cd.risksBenefitsDiscussed.trim()}`);
  }
  if (cd.procedureRecommended.trim()) {
    mdmParts.push(`Recommended: ${cd.procedureRecommended.trim()}`);
  }
  if (cd.procedureDeferred.trim()) mdmParts.push(`Deferred: ${cd.procedureDeferred.trim()}`);
  if (cd.referralConsultation.trim()) mdmParts.push(`Referral: ${cd.referralConsultation.trim()}`);
  if (cd.urgentReferral) mdmParts.push("Urgent referral indicated");
  if (cd.followUpDisposition.trim()) mdmParts.push(`Follow-up: ${cd.followUpDisposition.trim()}`);
  if (cd.clinicalReasoning.trim()) mdmParts.push(cd.clinicalReasoning.trim());

  const out: Record<string, string> = {};
  if (hpiParts.length) out.hpi = hpiParts.join("\n");
  if (examParts.length) out.physicalExam = examParts.join("\n");
  if (mdmParts.length) out.mdm = mdmParts.join("\n");
  if (evaluation.assessment.trim()) {
    out.hpi = out.hpi
      ? `${out.hpi}\nAssessment: ${evaluation.assessment.trim()}`
      : `Assessment: ${evaluation.assessment.trim()}`;
  }
  return out;
}

export function mergeDentalClinicalEvaluationIntoNursingAssessment(input: {
  previousNursingAssessment: unknown;
  evaluation: D5a4aDentalClinicalEvaluationV1;
  metadata?: { savedAt?: string; savedBy?: string };
}): Record<string, unknown> {
  const prev = asObject(input.previousNursingAssessment) ?? {};
  const next: Record<string, unknown> = { ...prev };
  // Preserve dental service-line tag if present.
  if (!next[D5A3_DENTAL_SERVICE_LINE_TAG] && prev[D5A3_DENTAL_SERVICE_LINE_TAG]) {
    next[D5A3_DENTAL_SERVICE_LINE_TAG] = prev[D5A3_DENTAL_SERVICE_LINE_TAG];
  }

  const persisted: D5a4aDentalClinicalEvaluationV1 = {
    ...parseDentalClinicalEvaluationV1(input.evaluation),
    metadata: {
      savedAt: input.metadata?.savedAt,
      savedBy: input.metadata?.savedBy,
    },
  };
  next[D5A4A_DENTAL_CLINICAL_EVALUATION_KEY] = persisted;

  const bridge = buildPhysicianEvalBridgeFromDentalEvaluation(persisted);
  if (Object.keys(bridge).length > 0) {
    next.physicianEvalV1 = bridge;
  }

  return next;
}

/**
 * Encounter PATCH body for dental clinical evaluation save.
 * Reuses enterprise Encounter columns + nursingAssessment — no DentalNote table.
 */
export function buildDentalClinicalEvaluationSavePayload(input: {
  previousNursingAssessment: unknown;
  evaluation: D5a4aDentalClinicalEvaluationV1;
  metadata?: { savedAt?: string; savedBy?: string };
  chiefComplaintLabelFor: (code: D5a4aChiefConcernCode) => string;
}): {
  nursingAssessment: Record<string, unknown>;
  visitReason?: string;
  chiefComplaint?: string;
  providerNote?: string;
  treatmentPlan?: string;
} {
  const nursingAssessment = mergeDentalClinicalEvaluationIntoNursingAssessment({
    previousNursingAssessment: input.previousNursingAssessment,
    evaluation: input.evaluation,
    metadata: input.metadata,
  });
  const evaluation = parseDentalClinicalEvaluationV1(input.evaluation);
  const chief = buildDentalChiefComplaintText(evaluation, input.chiefComplaintLabelFor);
  const planParts: string[] = [];
  if (evaluation.clinicalDecision.procedureRecommended.trim()) {
    planParts.push(evaluation.clinicalDecision.procedureRecommended.trim());
  }
  if (evaluation.clinicalDecision.followUpDisposition.trim()) {
    planParts.push(evaluation.clinicalDecision.followUpDisposition.trim());
  }
  if (evaluation.clinicalDecision.referralConsultation.trim()) {
    planParts.push(evaluation.clinicalDecision.referralConsultation.trim());
  }

  return {
    nursingAssessment,
    ...(chief ? { visitReason: chief, chiefComplaint: chief } : {}),
    ...(evaluation.assessment.trim()
      ? { providerNote: evaluation.assessment.trim() }
      : {}),
    ...(planParts.length ? { treatmentPlan: planParts.join("\n") } : {}),
  };
}

export function dentalEvaluationContainsForbiddenMedicalMarkers(
  haystack: string
): boolean {
  const lower = haystack.toLowerCase();
  return D5A4A_FORBIDDEN_MEDICAL_COMPLAINT_MARKERS.some((m) => lower.includes(m));
}
