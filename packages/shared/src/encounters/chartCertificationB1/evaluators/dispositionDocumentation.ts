import {
  isEdPhysicalDepartureCompleted,
  resolveEdDispositionPath,
} from "../../edEncounterLifecycle.js";
import {
  EdDispositionDocumentationStatus,
  readEdDispositionDecisionFromNursingAssessment,
} from "../../edDispositionDecisionV1.js";
import { projectEdDispositionState } from "../../edDispositionStateMachine.js";
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
    const isCommunication =
      blocker.code === "DISCHARGE_INSTRUCTIONS_NOT_GIVEN" ||
      blocker.code === "DISCHARGE_INSTRUCTIONS_NOT_COMMUNICATED";
    const isInstructionContent =
      blocker.code === "DISCHARGE_INSTRUCTIONS_MISSING" ||
      blocker.code === "DISCHARGE_INSTRUCTIONS_INCOMPLETE";
    const dedupe =
      blocker.code === "PROVIDER_DOCUMENTATION_UNSIGNED"
        ? "PROVIDER_NOTE_UNSIGNED"
        : isCommunication
          ? "DISCHARGE_INSTRUCTIONS_NOT_COMMUNICATED"
          : isInstructionContent
            ? "DISCHARGE_INSTRUCTIONS_MISSING"
            : blocker.code === "DISCHARGE_FOLLOW_UP_MISSING"
              ? "DISCHARGE_FOLLOW_UP_MISSING"
              : blocker.code === "ACTIVE_ORDERS_UNRESOLVED"
                ? "ACTIVE_ORDERS_UNRESOLVED"
                : `ESTABLISHED_${blocker.code}`;
    const remediationSection = isCommunication
      ? "instructions-explained"
      : blocker.code === "DISCHARGE_FOLLOW_UP_MISSING"
        ? "follow-up"
        : isInstructionContent
          ? "discharge-instructions"
          : "readiness";
    const d = makeDeficiency({
      stableCode:
        blocker.code === "PROVIDER_DOCUMENTATION_UNSIGNED"
          ? "PROVIDER_DOCUMENTATION_UNSIGNED"
          : isCommunication
            ? "DISCHARGE_INSTRUCTIONS_NOT_COMMUNICATED"
            : isInstructionContent
              ? "DISCHARGE_INSTRUCTIONS_CONTENT_MISSING"
              : blocker.code === "DISCHARGE_FOLLOW_UP_MISSING"
                ? "DISCHARGE_FOLLOW_UP_MISSING"
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
      remediation: {
        route: "disposition",
        section: remediationSection,
        requiredRole: blocker.code.includes("PROVIDER") ? "PROVIDER" : "RN",
      },
      deduplicationKey: dedupe,
      evidence: { status: blocker.code, structuredField: "dispositionReadiness" },
    });
    const titleKey =
      isCommunication
        ? "edLifecycle.certification.b1.codes.DISCHARGE_INSTRUCTIONS_NOT_COMMUNICATED.title"
        : isInstructionContent
          ? "edLifecycle.certification.b1.codes.DISCHARGE_INSTRUCTIONS_CONTENT_MISSING.title"
          : blocker.code === "DISCHARGE_FOLLOW_UP_MISSING"
            ? "edLifecycle.certification.b1.codes.DISCHARGE_FOLLOW_UP_MISSING.title"
            : "edLifecycle.certification.b1.codes.ESTABLISHED_DISPOSITION_BLOCKER.title";
    const descriptionKey =
      isCommunication
        ? "edLifecycle.certification.b1.codes.DISCHARGE_INSTRUCTIONS_NOT_COMMUNICATED.description"
        : isInstructionContent
          ? "edLifecycle.certification.b1.codes.DISCHARGE_INSTRUCTIONS_CONTENT_MISSING.description"
          : blocker.code === "DISCHARGE_FOLLOW_UP_MISSING"
            ? "edLifecycle.certification.b1.codes.DISCHARGE_FOLLOW_UP_MISSING.description"
            : "edLifecycle.certification.b1.codes.ESTABLISHED_DISPOSITION_BLOCKER.description";
    deficiencies.push({
      ...d,
      titleKey,
      descriptionKey,
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

  const dispositionProjection = projectEdDispositionState({
    status: context.encounter.status ?? "OPEN",
    dischargeSummaryJson: context.encounter.dischargeSummaryJson,
    admissionSummaryJson: context.encounter.admissionSummaryJson,
    nursingAssessment: context.encounter.nursingAssessment,
    dispositionSafetyCanClose: context.established.dispositionCanClose,
  });

  // Only when D1 explicit DRAFT is persisted — avoid legacy false positives when status absent.
  const decisionMeta = readEdDispositionDecisionFromNursingAssessment(
    context.encounter.nursingAssessment
  );
  if (
    path !== "NONE" &&
    decisionMeta.documentationStatus === EdDispositionDocumentationStatus.DRAFT &&
    !dispositionProjection.encounterClosed
  ) {
    deficiencies.push({
      ...makeDeficiency({
        stableCode: "DISPOSITION_DECISION_UNSIGNED",
        module: CertificationModule.DISPOSITION_DOCUMENTATION,
        owner: ChartCertificationOwner.DISPOSITION,
        sourceAuthority: ChartCertificationSourceAuthority.STAGE_B1_EVALUATED,
        effects: advisoryEffects({
          suggestsProviderReview: true,
          suggestsDocumentationReview: true,
        }),
        remediation: { route: "disposition", section: "decision-sign", requiredRole: "PROVIDER" },
        deduplicationKey: "DISPOSITION_DECISION_UNSIGNED",
      }),
      titleKey: "edLifecycle.certification.b1.codes.DISPOSITION_DECISION_UNSIGNED.title",
      descriptionKey: "edLifecycle.certification.b1.codes.DISPOSITION_DECISION_UNSIGNED.description",
    });
  }

  // D2.5 — Home discharge packet is HOME-only; AMA uses dedicated pathway board.
  if (path === "HOME") {
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
  }
  if (path === "AMA") {
    const ama = asObject(
      asObject(context.encounter.nursingAssessment)?.erAmaDispositionV1
    );
    const sig = typeof ama?.signatureOrRefusal === "string" ? ama.signatureOrRefusal : "";
    if (!sig) {
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
