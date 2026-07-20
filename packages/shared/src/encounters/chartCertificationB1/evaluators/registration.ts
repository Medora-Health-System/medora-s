import { advisoryEffects, makeDeficiency } from "../deficiency.js";
import {
  CertificationModule,
  ChartCertificationModuleAuthority,
  ChartCertificationOwner,
  ChartCertificationSeverity,
  ChartCertificationSourceAuthority,
  type ChartCertificationB1Context,
  type ModuleCertificationResult,
} from "../types.js";

export function evaluateRegistrationModule(
  context: ChartCertificationB1Context
): ModuleCertificationResult {
  const started = Date.now();
  const deficiencies = [];
  const warnings = [];
  const informationalItems = [];

  const { patient, encounter } = context;

  if (!patient.firstNamePresent || !patient.lastNamePresent) {
    deficiencies.push(
      makeDeficiency({
        stableCode: "REGISTRATION_IDENTITY_INCOMPLETE",
        module: CertificationModule.REGISTRATION,
        owner: ChartCertificationOwner.REGISTRATION,
        sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
        effects: advisoryEffects({ suggestsDocumentationReview: true }),
        remediation: { route: "registration", section: "identity", requiredRole: "FRONT_DESK" },
      })
    );
  }

  const dobException =
    patient.demographicException === "UNKNOWN" ||
    patient.demographicException === "UNABLE_TO_PROVIDE";
  if (!(patient.dob ?? "").trim() && !dobException) {
    deficiencies.push(
      makeDeficiency({
        stableCode: "REGISTRATION_DOB_MISSING",
        module: CertificationModule.REGISTRATION,
        owner: ChartCertificationOwner.REGISTRATION,
        sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
        effects: advisoryEffects({ suggestsDocumentationReview: true }),
        remediation: { route: "registration", section: "demographics", requiredRole: "FRONT_DESK" },
      })
    );
  } else if (!(patient.dob ?? "").trim() && dobException) {
    informationalItems.push({
      stableCode: "REGISTRATION_DOB_EXCEPTION_ACCEPTED",
      module: CertificationModule.REGISTRATION,
      titleKey: "edLifecycle.certification.b1.codes.REGISTRATION_DOB_EXCEPTION_ACCEPTED.title",
      descriptionKey:
        "edLifecycle.certification.b1.codes.REGISTRATION_DOB_EXCEPTION_ACCEPTED.description",
    });
  }

  if (!(patient.sexAtBirth ?? "").trim()) {
    warnings.push({
      stableCode: "REGISTRATION_SEX_MISSING",
      module: CertificationModule.REGISTRATION,
      titleKey: "edLifecycle.certification.b1.codes.REGISTRATION_SEX_MISSING.title",
      descriptionKey: "edLifecycle.certification.b1.codes.REGISTRATION_SEX_MISSING.description",
      sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
    });
  }

  if (!(patient.mrn ?? "").trim()) {
    warnings.push({
      stableCode: "REGISTRATION_MRN_REVIEW",
      module: CertificationModule.REGISTRATION,
      titleKey: "edLifecycle.certification.b1.codes.REGISTRATION_MRN_REVIEW.title",
      descriptionKey: "edLifecycle.certification.b1.codes.REGISTRATION_MRN_REVIEW.description",
      sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
    });
  }

  if (!(encounter.createdAt ?? "").trim()) {
    deficiencies.push(
      makeDeficiency({
        stableCode: "REGISTRATION_ARRIVAL_TIME_MISSING",
        module: CertificationModule.REGISTRATION,
        owner: ChartCertificationOwner.REGISTRATION,
        severity: ChartCertificationSeverity.WARNING,
        sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
        effects: advisoryEffects({ suggestsDocumentationReview: true }),
        remediation: { route: "registration", section: "arrival", requiredRole: "FRONT_DESK" },
      })
    );
  }

  if (!(encounter.type ?? "").trim()) {
    deficiencies.push(
      makeDeficiency({
        stableCode: "REGISTRATION_ENCOUNTER_TYPE_MISSING",
        module: CertificationModule.REGISTRATION,
        owner: ChartCertificationOwner.REGISTRATION,
        sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
        effects: advisoryEffects({ suggestsDocumentationReview: true }),
        remediation: { route: "registration", section: "encounterType", requiredRole: "FRONT_DESK" },
      })
    );
  }

  // Insurance absence is never a clinical closure finding (self-pay is valid).
  informationalItems.push({
    stableCode: "REGISTRATION_INSURANCE_NOT_CLINICAL_GATE",
    module: CertificationModule.REGISTRATION,
    titleKey: "edLifecycle.certification.b1.codes.REGISTRATION_INSURANCE_NOT_CLINICAL_GATE.title",
    descriptionKey:
      "edLifecycle.certification.b1.codes.REGISTRATION_INSURANCE_NOT_CLINICAL_GATE.description",
  });

  const ready = deficiencies.length === 0;
  return {
    module: CertificationModule.REGISTRATION,
    evaluated: true,
    ready,
    authority: ChartCertificationModuleAuthority.STAGE_B1_ADVISORY,
    deficiencies,
    warnings,
    informationalItems,
    sourceFreshness: {
      module: CertificationModule.REGISTRATION,
      encounterVersionAtLoad: context.encounterVersion,
      status: "CURRENT",
    },
    evaluationErrors: [],
    executionTimeMs: Date.now() - started,
  };
}
