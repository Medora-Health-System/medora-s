import {
  isEdPhysicalDepartureCompleted,
  resolveEdDispositionPath,
} from "../../edEncounterLifecycle.js";
import { advisoryEffects, establishedEffects, makeDeficiency } from "../deficiency.js";
import {
  CertificationModule,
  ChartCertificationModuleAuthority,
  ChartCertificationOwner,
  ChartCertificationSeverity,
  ChartCertificationSourceAuthority,
  type ChartCertificationB1Context,
  type ModuleCertificationResult,
} from "../types.js";

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function hasDischargePacketContent(raw: unknown): boolean {
  const o = asObject(raw);
  if (!o) return false;
  const keys = Object.keys(o).filter((k) => k !== "dischargeMode");
  return keys.some((k) => {
    const v = o[k];
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    if (v && typeof v === "object") return Object.keys(v as object).length > 0;
    return v != null && v !== false;
  });
}

function hasAdmissionContent(raw: unknown): boolean {
  const o = asObject(raw);
  if (!o) return false;
  return Object.values(o).some((v) => {
    if (typeof v === "string") return v.trim().length > 0;
    if (v && typeof v === "object") return Object.keys(v as object).length > 0;
    return false;
  });
}

export function evaluateDispositionDocumentationModule(
  context: ChartCertificationB1Context
): ModuleCertificationResult {
  const started = Date.now();
  const deficiencies = [];
  const warnings = [];
  const informationalItems = [];

  const path = resolveEdDispositionPath({
    dischargeSummaryJson: context.encounter.dischargeSummaryJson,
    admissionSummaryJson: context.encounter.admissionSummaryJson,
    nursingAssessment: context.encounter.nursingAssessment,
  });

  // Project established disposition blockers (authoritative effects preserved).
  for (const blocker of context.established.dispositionBlockers) {
    const dedupe =
      blocker.code === "PROVIDER_DOCUMENTATION_UNSIGNED"
        ? "PROVIDER_NOTE_UNSIGNED"
        : blocker.code === "DISCHARGE_INSTRUCTIONS_MISSING" ||
            blocker.code === "DISCHARGE_INSTRUCTIONS_NOT_GIVEN" ||
            blocker.code === "DISCHARGE_INSTRUCTIONS_INCOMPLETE"
          ? "DISCHARGE_INSTRUCTIONS_MISSING"
          : blocker.code === "ACTIVE_ORDERS_UNRESOLVED"
            ? "ACTIVE_ORDERS_UNRESOLVED"
            : `ESTABLISHED_${blocker.code}`;
    const d = makeDeficiency({
      stableCode:
        blocker.code === "PROVIDER_DOCUMENTATION_UNSIGNED"
          ? "PROVIDER_DOCUMENTATION_UNSIGNED"
          : "ESTABLISHED_DISPOSITION_BLOCKER",
      module: CertificationModule.DISPOSITION_DOCUMENTATION,
      owner: ChartCertificationOwner.DISPOSITION,
      severity: ChartCertificationSeverity.BLOCKING,
      sourceAuthority: ChartCertificationSourceAuthority.ESTABLISHED_WORKFLOW,
      effects: establishedEffects({
        blocksBilling:
          blocker.code === "PROVIDER_DOCUMENTATION_UNSIGNED" ||
          blocker.code === "ACTIVE_ORDERS_UNRESOLVED",
        suggestsProviderReview: blocker.code.includes("PROVIDER"),
        suggestsNursingReview: !blocker.code.includes("PROVIDER"),
      }),
      remediation: { route: "disposition", section: "readiness", requiredRole: "PROVIDER" },
      deduplicationKey: dedupe,
      evidence: { status: blocker.code, structuredField: "dispositionReadiness" },
    });
    deficiencies.push({
      ...d,
      titleKey: "edLifecycle.certification.b1.codes.ESTABLISHED_DISPOSITION_BLOCKER.title",
      descriptionKey: "edLifecycle.certification.b1.codes.ESTABLISHED_DISPOSITION_BLOCKER.description",
    });
  }

  if (path === "NONE") {
    informationalItems.push({
      stableCode: "DISPOSITION_PATH_NONE",
      module: CertificationModule.DISPOSITION_DOCUMENTATION,
      titleKey: "edLifecycle.certification.b1.codes.DISPOSITION_PATH_NONE.title",
      descriptionKey: "edLifecycle.certification.b1.codes.DISPOSITION_PATH_NONE.description",
    });
  }

  if (path === "HOME" || path === "AMA") {
    if (!hasDischargePacketContent(context.encounter.dischargeSummaryJson)) {
      deficiencies.push(
        makeDeficiency({
          stableCode: "DISCHARGE_PACKET_INCOMPLETE",
          module: CertificationModule.DISPOSITION_DOCUMENTATION,
          owner: ChartCertificationOwner.DISPOSITION,
          sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
          effects: advisoryEffects({
            suggestsNursingReview: true,
            suggestsDocumentationReview: true,
          }),
          remediation: { route: "disposition", section: "discharge", requiredRole: "RN" },
          deduplicationKey: "DISCHARGE_INSTRUCTIONS_MISSING",
        })
      );
    }
    if (path === "AMA") {
      const packet = asObject(context.encounter.dischargeSummaryJson);
      const amaSigned = packet?.amaSigned === true || packet?.amaRefusalToSign === true;
      if (!amaSigned) {
        warnings.push({
          stableCode: "AMA_SIGNATURE_OR_REFUSAL_REVIEW",
          module: CertificationModule.DISPOSITION_DOCUMENTATION,
          titleKey: "edLifecycle.certification.b1.codes.AMA_SIGNATURE_OR_REFUSAL_REVIEW.title",
          descriptionKey:
            "edLifecycle.certification.b1.codes.AMA_SIGNATURE_OR_REFUSAL_REVIEW.description",
          sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
        });
      }
    }
  }

  if (path === "ADMISSION") {
    // Explicitly do NOT require home-discharge instructions.
    informationalItems.push({
      stableCode: "ADMISSION_EXCLUDES_HOME_DISCHARGE_RULES",
      module: CertificationModule.DISPOSITION_DOCUMENTATION,
      titleKey: "edLifecycle.certification.b1.codes.ADMISSION_EXCLUDES_HOME_DISCHARGE_RULES.title",
      descriptionKey:
        "edLifecycle.certification.b1.codes.ADMISSION_EXCLUDES_HOME_DISCHARGE_RULES.description",
    });
    if (!hasAdmissionContent(context.encounter.admissionSummaryJson)) {
      deficiencies.push(
        makeDeficiency({
          stableCode: "ADMISSION_DOCUMENTATION_INCOMPLETE",
          module: CertificationModule.DISPOSITION_DOCUMENTATION,
          owner: ChartCertificationOwner.DISPOSITION,
          sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
          effects: advisoryEffects({
            suggestsProviderReview: true,
            suggestsDocumentationReview: true,
          }),
          remediation: { route: "disposition", section: "admission", requiredRole: "PROVIDER" },
        })
      );
    }
  }

  if (path === "TRANSFER") {
    informationalItems.push({
      stableCode: "TRANSFER_EXCLUDES_HOME_DISCHARGE_RULES",
      module: CertificationModule.DISPOSITION_DOCUMENTATION,
      titleKey: "edLifecycle.certification.b1.codes.TRANSFER_EXCLUDES_HOME_DISCHARGE_RULES.title",
      descriptionKey:
        "edLifecycle.certification.b1.codes.TRANSFER_EXCLUDES_HOME_DISCHARGE_RULES.description",
    });
    const packet = asObject(context.encounter.dischargeSummaryJson);
    const receiving =
      typeof packet?.receivingFacility === "string" && packet.receivingFacility.trim().length > 0;
    if (!receiving) {
      deficiencies.push(
        makeDeficiency({
          stableCode: "TRANSFER_RECEIVING_FACILITY_MISSING",
          module: CertificationModule.DISPOSITION_DOCUMENTATION,
          owner: ChartCertificationOwner.DISPOSITION,
          sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
          effects: advisoryEffects({ suggestsProviderReview: true }),
          remediation: { route: "disposition", section: "transfer", requiredRole: "PROVIDER" },
        })
      );
    }
  }

  if (path === "LWBS") {
    informationalItems.push({
      stableCode: "LWBS_LIMITED_REQUIREMENTS",
      module: CertificationModule.DISPOSITION_DOCUMENTATION,
      titleKey: "edLifecycle.certification.b1.codes.LWBS_LIMITED_REQUIREMENTS.title",
      descriptionKey: "edLifecycle.certification.b1.codes.LWBS_LIMITED_REQUIREMENTS.description",
    });
  }

  if (path === "DECEASED") {
    warnings.push({
      stableCode: "DECEASED_DOCUMENTATION_REVIEW",
      module: CertificationModule.DISPOSITION_DOCUMENTATION,
      titleKey: "edLifecycle.certification.b1.codes.DECEASED_DOCUMENTATION_REVIEW.title",
      descriptionKey: "edLifecycle.certification.b1.codes.DECEASED_DOCUMENTATION_REVIEW.description",
      sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
    });
  }

  if (
    path !== "NONE" &&
    path !== "LWBS" &&
    path !== "DECEASED" &&
    !context.established.physicalDepartureComplete &&
    !isEdPhysicalDepartureCompleted({
      dischargeSummaryJson: context.encounter.dischargeSummaryJson,
      admissionSummaryJson: context.encounter.admissionSummaryJson,
      nursingAssessment: context.encounter.nursingAssessment,
    })
  ) {
    deficiencies.push(
      makeDeficiency({
        stableCode: "DEPARTURE_INCOMPLETE",
        module: CertificationModule.DISPOSITION_DOCUMENTATION,
        owner: ChartCertificationOwner.DISPOSITION,
        sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
        effects: advisoryEffects({
          suggestsNursingReview: true,
          suggestsDocumentationReview: true,
        }),
        remediation: { route: "disposition", section: "departure", requiredRole: "RN" },
        deduplicationKey: "DEPARTURE_INCOMPLETE",
      })
    );
  }

  const ready =
    deficiencies.filter(
      (d) => d.sourceAuthority === ChartCertificationSourceAuthority.STAGE_B1_EVALUATED
    ).length === 0 &&
    context.established.dispositionBlockers.length === 0;

  return {
    module: CertificationModule.DISPOSITION_DOCUMENTATION,
    evaluated: true,
    ready,
    authority: ChartCertificationModuleAuthority.STAGE_B1_ADVISORY,
    deficiencies,
    warnings,
    informationalItems,
    sourceFreshness: {
      module: CertificationModule.DISPOSITION_DOCUMENTATION,
      encounterVersionAtLoad: context.encounterVersion,
      status: context.established.dispositionLoadError ? "ERROR" : "CURRENT",
    },
    evaluationErrors: context.established.dispositionLoadError
      ? [
          {
            code: "DISPOSITION_READINESS_LOAD_FAILED",
            module: CertificationModule.DISPOSITION_DOCUMENTATION,
            messageKey: "edLifecycle.certification.b1.errors.dispositionReadinessLoadFailed",
          },
        ]
      : [],
    executionTimeMs: Date.now() - started,
  };
}
