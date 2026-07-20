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

export function evaluateProviderModule(context: ChartCertificationB1Context): ModuleCertificationResult {
  const started = Date.now();
  const deficiencies = [];
  const warnings = [];
  const informationalItems = [];
  const { provider, encounter } = context;

  if (!provider.contentPresent) {
    deficiencies.push(
      makeDeficiency({
        stableCode: "PROVIDER_DOCUMENTATION_MISSING",
        module: CertificationModule.PROVIDER,
        owner: ChartCertificationOwner.PROVIDER,
        sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
        effects: advisoryEffects({
          suggestsProviderReview: true,
          suggestsDocumentationReview: true,
        }),
        remediation: { route: "provider", section: "documentation", requiredRole: "PROVIDER" },
        deduplicationKey: "PROVIDER_DOCUMENTATION_MISSING",
        evidence: { structuredField: "providerNote|physicianEvalV1" },
      })
    );
  } else if (!provider.signed) {
    // Single root-cause for unsigned documentation (collapse signature aliases).
    deficiencies.push(
      makeDeficiency({
        stableCode: "PROVIDER_DOCUMENTATION_UNSIGNED",
        module: CertificationModule.PROVIDER,
        owner: ChartCertificationOwner.PROVIDER,
        severity: ChartCertificationSeverity.WARNING,
        sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
        effects: advisoryEffects({
          suggestsProviderReview: true,
          suggestsDocumentationReview: true,
        }),
        remediation: { route: "provider", section: "sign", requiredRole: "PROVIDER" },
        deduplicationKey: "PROVIDER_NOTE_UNSIGNED",
        sourceEntityType: "Encounter",
        sourceEntityId: context.encounterId,
        evidence: {
          structuredField: "providerDocumentationStatus",
          status: encounter.providerDocumentationStatus ?? "DRAFT",
          timestamp: encounter.providerDocumentationSignedAt ?? undefined,
        },
      })
    );
  }

  if (provider.contentPresent && !provider.hasHistorySignal) {
    deficiencies.push(
      makeDeficiency({
        stableCode: "PROVIDER_HISTORY_INCOMPLETE",
        module: CertificationModule.PROVIDER,
        owner: ChartCertificationOwner.PROVIDER,
        sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
        effects: advisoryEffects({ suggestsProviderReview: true }),
        remediation: { route: "provider", section: "history", requiredRole: "PROVIDER" },
      })
    );
  }

  if (provider.contentPresent && !provider.hasPhysicalExamSignal) {
    deficiencies.push(
      makeDeficiency({
        stableCode: "PROVIDER_PHYSICAL_EXAM_MISSING",
        module: CertificationModule.PROVIDER,
        owner: ChartCertificationOwner.PROVIDER,
        sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
        effects: advisoryEffects({ suggestsProviderReview: true }),
        remediation: { route: "provider", section: "exam", requiredRole: "PROVIDER" },
        deduplicationKey: "PROVIDER_PHYSICAL_EXAM_MISSING",
      })
    );
  }

  if (provider.contentPresent && !provider.hasMdm) {
    warnings.push({
      stableCode: "PROVIDER_MDM_INCOMPLETE",
      module: CertificationModule.PROVIDER,
      titleKey: "edLifecycle.certification.b1.codes.PROVIDER_MDM_INCOMPLETE.title",
      descriptionKey: "edLifecycle.certification.b1.codes.PROVIDER_MDM_INCOMPLETE.description",
      sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
    });
  }

  if (provider.diagnosisCount <= 0) {
    deficiencies.push(
      makeDeficiency({
        stableCode: "FINAL_DIAGNOSIS_MISSING",
        module: CertificationModule.PROVIDER,
        owner: ChartCertificationOwner.PROVIDER,
        sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
        effects: advisoryEffects({
          suggestsProviderReview: true,
          suggestsDocumentationReview: true,
        }),
        remediation: { route: "provider", section: "diagnoses", requiredRole: "PROVIDER" },
      })
    );
  }

  if (provider.supervisingAttestationRequired && !provider.supervisingAttestationPresent) {
    deficiencies.push(
      makeDeficiency({
        stableCode: "SUPERVISING_ATTESTATION_MISSING",
        module: CertificationModule.PROVIDER,
        owner: ChartCertificationOwner.PROVIDER,
        sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
        effects: advisoryEffects({ suggestsProviderReview: true }),
        remediation: {
          route: "provider",
          section: "supervisingAttestation",
          requiredRole: "PROVIDER",
        },
        deduplicationKey: "SUPERVISING_ATTESTATION_MISSING",
      })
    );
  }

  // ROS is never universally required in B1.
  informationalItems.push({
    stableCode: "PROVIDER_ROS_NOT_UNIVERSAL",
    module: CertificationModule.PROVIDER,
    titleKey: "edLifecycle.certification.b1.codes.PROVIDER_ROS_NOT_UNIVERSAL.title",
    descriptionKey: "edLifecycle.certification.b1.codes.PROVIDER_ROS_NOT_UNIVERSAL.description",
  });

  const ready = deficiencies.length === 0;
  return {
    module: CertificationModule.PROVIDER,
    evaluated: true,
    ready,
    authority: ChartCertificationModuleAuthority.STAGE_B1_ADVISORY,
    deficiencies,
    warnings,
    informationalItems,
    sourceFreshness: {
      module: CertificationModule.PROVIDER,
      sourceUpdatedAt: encounter.providerDocumentationSignedAt,
      encounterVersionAtLoad: context.encounterVersion,
      status: "CURRENT",
    },
    evaluationErrors: [],
    executionTimeMs: Date.now() - started,
  };
}
