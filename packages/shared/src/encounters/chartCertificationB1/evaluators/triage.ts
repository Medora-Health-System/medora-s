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

/** Structured vitals refusal / unable-to-obtain exception on vitalsJson. */
function hasVitalsException(nursingAssessment: unknown, triageVitalsHint: boolean): boolean {
  void triageVitalsHint;
  const nursing = asObject(nursingAssessment);
  const triageMeta = asObject(nursing?.triageExceptions);
  if (triageMeta?.vitalsRefused === true || triageMeta?.vitalsUnable === true) return true;
  const discharge = asObject(nursing);
  if (discharge?.directToRoom === true || discharge?.immediateResuscitation === true) return true;
  return false;
}

export function evaluateTriageModule(context: ChartCertificationB1Context): ModuleCertificationResult {
  const started = Date.now();
  const deficiencies = [];
  const warnings = [];
  const informationalItems = [];

  const triage = context.triage;
  const chief =
    (triage?.chiefComplaint ?? "").trim() || (context.encounter.chiefComplaint ?? "").trim();

  if (!triage?.present) {
    deficiencies.push(
      makeDeficiency({
        stableCode: "TRIAGE_NOT_COMPLETED",
        module: CertificationModule.TRIAGE,
        owner: ChartCertificationOwner.NURSING,
        sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
        effects: advisoryEffects({
          suggestsNursingReview: true,
          suggestsDocumentationReview: true,
        }),
        remediation: { route: "triage", section: "completion", requiredRole: "RN" },
        evidence: { structuredField: "triage.present" },
      })
    );
  } else if (!(triage.triageCompleteAt ?? "").trim()) {
    deficiencies.push(
      makeDeficiency({
        stableCode: "TRIAGE_NOT_COMPLETED",
        module: CertificationModule.TRIAGE,
        owner: ChartCertificationOwner.NURSING,
        sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
        effects: advisoryEffects({
          suggestsNursingReview: true,
          suggestsDocumentationReview: true,
        }),
        remediation: { route: "triage", section: "completion", requiredRole: "RN" },
        evidence: { structuredField: "triageCompleteAt", status: "MISSING" },
      })
    );
  }

  if (!chief) {
    deficiencies.push(
      makeDeficiency({
        stableCode: "CHIEF_COMPLAINT_MISSING",
        module: CertificationModule.TRIAGE,
        owner: ChartCertificationOwner.NURSING,
        sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
        effects: advisoryEffects({
          suggestsNursingReview: true,
          suggestsDocumentationReview: true,
        }),
        remediation: { route: "triage", section: "chiefComplaint", requiredRole: "RN" },
        evidence: { structuredField: "chiefComplaint" },
      })
    );
  }

  if (triage?.present && (triage.esi == null || !Number.isFinite(triage.esi))) {
    deficiencies.push(
      makeDeficiency({
        stableCode: "ACUITY_MISSING",
        module: CertificationModule.TRIAGE,
        owner: ChartCertificationOwner.NURSING,
        sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
        effects: advisoryEffects({ suggestsNursingReview: true }),
        remediation: { route: "triage", section: "acuity", requiredRole: "RN" },
        evidence: { structuredField: "esi" },
      })
    );
  }

  const vitalsException = hasVitalsException(
    context.encounter.nursingAssessment,
    Boolean(triage?.vitalsPresent)
  );
  const hasVitals =
    Boolean(triage?.vitalsPresent) || (triage?.activeVitalsReadingCount ?? 0) > 0;

  if (triage?.present && !hasVitals && !vitalsException) {
    deficiencies.push(
      makeDeficiency({
        stableCode: "INITIAL_VITALS_MISSING",
        module: CertificationModule.TRIAGE,
        owner: ChartCertificationOwner.NURSING,
        sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
        effects: advisoryEffects({ suggestsNursingReview: true }),
        remediation: { route: "triage", section: "vitals", requiredRole: "RN" },
        evidence: { structuredField: "vitalsJson|TriageVitalsReading" },
      })
    );
  } else if (vitalsException && !hasVitals) {
    informationalItems.push({
      stableCode: "INITIAL_VITALS_EXCEPTION_ACCEPTED",
      module: CertificationModule.TRIAGE,
      titleKey: "edLifecycle.certification.b1.codes.INITIAL_VITALS_EXCEPTION_ACCEPTED.title",
      descriptionKey:
        "edLifecycle.certification.b1.codes.INITIAL_VITALS_EXCEPTION_ACCEPTED.description",
    });
  }

  // Screenings are advisory reviews only — never universal blockers in B1.
  if (triage?.present && !triage.strokeScreenPresent && !triage.sepsisScreenPresent) {
    warnings.push({
      stableCode: "INFECTION_SCREENING_REVIEW",
      module: CertificationModule.TRIAGE,
      titleKey: "edLifecycle.certification.b1.codes.INFECTION_SCREENING_REVIEW.title",
      descriptionKey: "edLifecycle.certification.b1.codes.INFECTION_SCREENING_REVIEW.description",
      sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
    });
  }

  const ready = deficiencies.length === 0;
  return {
    module: CertificationModule.TRIAGE,
    evaluated: true,
    ready,
    authority: ChartCertificationModuleAuthority.STAGE_B1_ADVISORY,
    deficiencies,
    warnings,
    informationalItems,
    sourceFreshness: {
      module: CertificationModule.TRIAGE,
      sourceUpdatedAt: triage?.updatedAt ?? null,
      encounterVersionAtLoad: context.encounterVersion,
      status: "CURRENT",
    },
    evaluationErrors: [],
    executionTimeMs: Date.now() - started,
  };
}
