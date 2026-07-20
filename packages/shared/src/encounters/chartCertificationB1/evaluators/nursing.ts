import {
  isEdPhysicalDepartureCompleted,
  resolveEdDispositionPath,
} from "../../edEncounterLifecycle.js";
import { advisoryEffects, makeDeficiency } from "../deficiency.js";
import {
  CertificationModule,
  ChartCertificationModuleAuthority,
  ChartCertificationOwner,
  ChartCertificationSourceAuthority,
  type ChartCertificationB1Context,
  type ModuleCertificationResult,
} from "../types.js";

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function hasPainSignal(nursingAssessment: unknown): boolean {
  const o = asObject(nursingAssessment);
  if (!o) return false;
  if (o.painScore != null && o.painScore !== "") return true;
  const evalV1 = asObject(o.nursingEvalV1);
  const sections = asObject(evalV1?.sections);
  const pain = asObject(sections?.pain);
  if (pain && (pain.text || pain.score != null)) return true;
  return o.analgesiaAdministered === true;
}

function hasPainReassessment(nursingAssessment: unknown): boolean {
  const o = asObject(nursingAssessment);
  if (!o) return false;
  if (namespaceHasContent(o.erNursingReassessmentV1)) {
    const re = asObject(o.erNursingReassessmentV1);
    if (re?.painReassessed === true || re?.painScore != null) return true;
    if (typeof re?.pain === "string" && re.pain.trim()) return true;
  }
  return o.painReassessed === true;
}

function namespaceHasContent(value: unknown): boolean {
  const obj = asObject(value);
  if (!obj) return false;
  return Object.values(obj).some((v) => {
    if (typeof v === "string") return v.trim().length > 0;
    if (v && typeof v === "object") return namespaceHasContent(v);
    return false;
  });
}

function hasFallRisk(nursingAssessment: unknown): boolean {
  const o = asObject(nursingAssessment);
  if (!o) return false;
  if (o.fallRisk === true || o.fallRiskIdentified === true) return true;
  const evalV1 = asObject(o.nursingEvalV1);
  return evalV1?.fallRisk === true || evalV1?.fallRiskIdentified === true;
}

function hasFallPrecautions(nursingAssessment: unknown): boolean {
  const o = asObject(nursingAssessment);
  if (!o) return false;
  return (
    o.fallPrecautionsDocumented === true ||
    o.fallPrecautions === true ||
    Boolean(asObject(o.nursingEvalV1)?.fallPrecautions)
  );
}

export function evaluateNursingModule(context: ChartCertificationB1Context): ModuleCertificationResult {
  const started = Date.now();
  const deficiencies = [];
  const warnings = [];
  const informationalItems = [];

  const assessmentPresent =
    context.nursing.assessmentPresent ||
    context.nursing.clinicalDocActiveCount > 0 ||
    context.nursing.noteActiveCount > 0;

  if (!assessmentPresent) {
    deficiencies.push(
      makeDeficiency({
        stableCode: "NURSING_ASSESSMENT_INCOMPLETE",
        module: CertificationModule.NURSING,
        owner: ChartCertificationOwner.NURSING,
        sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
        effects: advisoryEffects({
          suggestsNursingReview: true,
          suggestsDocumentationReview: true,
        }),
        remediation: { route: "nursing", section: "assessment", requiredRole: "RN" },
        deduplicationKey: "NURSING_ASSESSMENT_INCOMPLETE",
      })
    );
  }

  if (hasPainSignal(context.encounter.nursingAssessment) && !hasPainReassessment(context.encounter.nursingAssessment)) {
    deficiencies.push(
      makeDeficiency({
        stableCode: "PAIN_REASSESSMENT_MISSING",
        module: CertificationModule.NURSING,
        owner: ChartCertificationOwner.NURSING,
        sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
        effects: advisoryEffects({ suggestsNursingReview: true }),
        remediation: { route: "nursing", section: "reassessment", requiredRole: "RN" },
      })
    );
  }

  if (
    hasFallRisk(context.encounter.nursingAssessment) &&
    !hasFallPrecautions(context.encounter.nursingAssessment)
  ) {
    deficiencies.push(
      makeDeficiency({
        stableCode: "FALL_PRECAUTIONS_REVIEW",
        module: CertificationModule.NURSING,
        owner: ChartCertificationOwner.NURSING,
        sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
        effects: advisoryEffects({ suggestsNursingReview: true }),
        remediation: { route: "nursing", section: "fallPrecautions", requiredRole: "RN" },
      })
    );
  } else if (
    hasFallRisk(context.encounter.nursingAssessment) &&
    hasFallPrecautions(context.encounter.nursingAssessment)
  ) {
    informationalItems.push({
      stableCode: "FALL_PRECAUTIONS_DOCUMENTED",
      module: CertificationModule.NURSING,
      titleKey: "edLifecycle.certification.b1.codes.FALL_PRECAUTIONS_DOCUMENTED.title",
      descriptionKey: "edLifecycle.certification.b1.codes.FALL_PRECAUTIONS_DOCUMENTED.description",
    });
  }

  const path = resolveEdDispositionPath({
    dischargeSummaryJson: context.encounter.dischargeSummaryJson,
    admissionSummaryJson: context.encounter.admissionSummaryJson,
    nursingAssessment: context.encounter.nursingAssessment,
  });

  if ((path === "HOME" || path === "AMA") && assessmentPresent) {
    const discharge = asObject(context.encounter.dischargeSummaryJson);
    // Communication acknowledgment only — instruction *content* is a separate established rule.
    const teachingCommunicated =
      Boolean(discharge?.patientInstructionsGiven) ||
      Boolean(discharge?.educationCompleted);
    if (!teachingCommunicated) {
      deficiencies.push(
        makeDeficiency({
          stableCode: "NURSING_DISCHARGE_EDUCATION_MISSING",
          module: CertificationModule.NURSING,
          owner: ChartCertificationOwner.NURSING,
          sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
          effects: advisoryEffects({
            suggestsNursingReview: true,
            suggestsDocumentationReview: true,
          }),
          remediation: {
            route: "disposition",
            section: "instructions-explained",
            requiredRole: "RN",
          },
          // Collapse with established DISCHARGE_INSTRUCTIONS_NOT_GIVEN when both fire.
          deduplicationKey: "DISCHARGE_INSTRUCTIONS_NOT_COMMUNICATED",
        })
      );
    }
  }

  if (
    (path === "ADMISSION" || path === "TRANSFER") &&
    !isEdPhysicalDepartureCompleted({
      dischargeSummaryJson: context.encounter.dischargeSummaryJson,
      admissionSummaryJson: context.encounter.admissionSummaryJson,
      nursingAssessment: context.encounter.nursingAssessment,
    })
  ) {
    warnings.push({
      stableCode: "NURSING_HANDOFF_MISSING",
      module: CertificationModule.NURSING,
      titleKey: "edLifecycle.certification.b1.codes.NURSING_HANDOFF_MISSING.title",
      descriptionKey: "edLifecycle.certification.b1.codes.NURSING_HANDOFF_MISSING.description",
      sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
    });
  }

  const ready = deficiencies.length === 0;
  return {
    module: CertificationModule.NURSING,
    evaluated: true,
    ready,
    authority: ChartCertificationModuleAuthority.STAGE_B1_ADVISORY,
    deficiencies,
    warnings,
    informationalItems,
    sourceFreshness: {
      module: CertificationModule.NURSING,
      encounterVersionAtLoad: context.encounterVersion,
      status: "CURRENT",
    },
    evaluationErrors: [],
    executionTimeMs: Date.now() - started,
  };
}
