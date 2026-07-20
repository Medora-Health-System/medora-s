import {
  CertificationModule,
  ChartCertificationModuleAuthority,
  ChartCertificationOwner,
  type ModuleCertificationResult,
} from "../../chartCertificationB1/types.js";
import { makeB2Deficiency } from "../deficiency.js";
import {
  DiagnosticCategory,
  DiagnosticLifecycleState,
  type ChartCertificationB2Context,
} from "../types.js";
import { normalizeAllDiagnosticItems } from "../lifecycle.js";

export function evaluateImagingModule(
  context: ChartCertificationB2Context
): ModuleCertificationResult {
  const started = Date.now();
  const deficiencies = [];
  const warnings = [];
  const informationalItems = [];
  const evaluationErrors = [];

  if (context.diagnostics.loadError) {
    evaluationErrors.push({
      code: context.diagnostics.loadError.code,
      module: CertificationModule.IMAGING,
      messageKey: context.diagnostics.loadError.messageKey,
    });
  }

  const normalized = normalizeAllDiagnosticItems(context.diagnostics.orderItems).filter(
    (n) => n.category === DiagnosticCategory.IMAGING
  );

  let unresolved = 0;

  for (const n of normalized) {
    const item = n.snapshot;
    const entityId = item.orderItemId;

    if (
      n.normalizedLifecycle === DiagnosticLifecycleState.CANCELLED_VALID ||
      n.normalizedLifecycle === DiagnosticLifecycleState.ENTERED_IN_ERROR ||
      n.normalizedLifecycle === DiagnosticLifecycleState.DUPLICATE_SUPERSEDED ||
      n.normalizedLifecycle === DiagnosticLifecycleState.REFUSED_VALID ||
      n.normalizedLifecycle === DiagnosticLifecycleState.NOT_PERFORMED_VALID ||
      n.normalizedLifecycle === DiagnosticLifecycleState.FUTURE_NOT_APPLICABLE
    ) {
      continue;
    }

    if (n.normalizedLifecycle === DiagnosticLifecycleState.UNKNOWN) {
      unresolved += 1;
      deficiencies.push(
        makeB2Deficiency({
          stableCode: "IMAGING_STATUS_CONFLICT",
          module: CertificationModule.IMAGING,
          owner: ChartCertificationOwner.IMAGING,
          effects: { suggestsDocumentationReview: true },
          remediation: { route: "orders", tab: "imaging", section: "status", requiredRole: "RN" },
          sourceEntityType: "OrderItem",
          sourceEntityId: entityId,
        })
      );
      continue;
    }

    const performed =
      Boolean(item.effectivePerformedAt) ||
      Boolean(item.documentedPerformedAt) ||
      Boolean(item.completedAt);

    if (!performed && !item.result) {
      unresolved += 1;
      deficiencies.push(
        makeB2Deficiency({
          stableCode: "IMAGING_NOT_PERFORMED",
          module: CertificationModule.IMAGING,
          owner: ChartCertificationOwner.IMAGING,
          effects: { suggestsNursingReview: true },
          remediation: {
            route: "orders",
            tab: "imaging",
            section: "perform",
            requiredRole: "RADIOLOGY",
          },
          sourceEntityType: "OrderItem",
          sourceEntityId: entityId,
        })
      );
      continue;
    }

    if (performed && !item.result?.hasResultPayload) {
      unresolved += 1;
      deficiencies.push(
        makeB2Deficiency({
          stableCode: "IMAGING_REPORT_MISSING",
          module: CertificationModule.IMAGING,
          owner: ChartCertificationOwner.IMAGING,
          effects: { suggestsDocumentationReview: true },
          remediation: {
            route: "orders",
            tab: "imaging",
            section: "report",
            requiredRole: "RADIOLOGY",
          },
          sourceEntityType: "OrderItem",
          sourceEntityId: entityId,
          deduplicationKey: `IMAGING_REPORT_MISSING::${entityId}`,
        })
      );
      continue;
    }

    if (!item.result) continue;

    if (!item.result.verifiedAt && item.result.preliminaryAcceptable) {
      warnings.push({
        stableCode: "IMAGING_PRELIMINARY_REVIEW",
        module: CertificationModule.IMAGING,
        titleKey: "edLifecycle.certification.b2.codes.IMAGING_PRELIMINARY_REVIEW.title",
        descriptionKey:
          "edLifecycle.certification.b2.codes.IMAGING_PRELIMINARY_REVIEW.description",
        sourceAuthority: "STAGE_B2_EVALUATED" as const,
      });
      informationalItems.push({
        stableCode: "IMAGING_PRELIMINARY_ACCEPTED",
        module: CertificationModule.IMAGING,
        titleKey: "edLifecycle.certification.b2.codes.IMAGING_PRELIMINARY_ACCEPTED.title",
        descriptionKey:
          "edLifecycle.certification.b2.codes.IMAGING_PRELIMINARY_ACCEPTED.description",
      });
      continue;
    }

    if (!item.result.verifiedAt) {
      unresolved += 1;
      deficiencies.push(
        makeB2Deficiency({
          stableCode: "IMAGING_FINAL_REPORT_UNREVIEWED",
          module: CertificationModule.IMAGING,
          owner: ChartCertificationOwner.PROVIDER,
          effects: { suggestsProviderReview: true },
          remediation: {
            route: "results",
            tab: "imaging",
            section: "review",
            requiredRole: "PROVIDER",
          },
          sourceEntityType: "Result",
          sourceEntityId: item.result.id,
          deduplicationKey: `IMAGING_FINAL_REPORT_UNREVIEWED::${item.result.id}`,
        })
      );
      continue;
    }

    const life = (item.lifecycleState ?? "").toUpperCase();
    const status = (item.itemStatus ?? "").toUpperCase();
    const reviewed =
      status === "VERIFIED" ||
      life === "REVIEWED" ||
      Boolean(item.result.acknowledgedByProviderAt);

    if (!reviewed) {
      unresolved += 1;
      deficiencies.push(
        makeB2Deficiency({
          stableCode: "IMAGING_FINAL_REPORT_UNREVIEWED",
          module: CertificationModule.IMAGING,
          owner: ChartCertificationOwner.PROVIDER,
          effects: { suggestsProviderReview: true },
          remediation: {
            route: "results",
            tab: "imaging",
            section: "review",
            requiredRole: "PROVIDER",
          },
          sourceEntityType: "Result",
          sourceEntityId: item.result.id,
          deduplicationKey: `IMAGING_FINAL_REPORT_UNREVIEWED::${item.result.id}`,
        })
      );
      continue;
    }

    if (item.result.criticalValue && !item.result.acknowledgedByProviderAt) {
      unresolved += 1;
      deficiencies.push(
        makeB2Deficiency({
          stableCode: "IMAGING_CRITICAL_FINDING_UNACKNOWLEDGED",
          module: CertificationModule.IMAGING,
          owner: ChartCertificationOwner.PROVIDER,
          effects: { suggestsProviderReview: true },
          remediation: {
            route: "results",
            tab: "critical",
            section: "acknowledge",
            requiredRole: "PROVIDER",
          },
          sourceEntityType: "Result",
          sourceEntityId: item.result.id,
          deduplicationKey: `CRITICAL_ACK::${item.result.id}`,
        })
      );
    }
  }

  const hasFatal = evaluationErrors.length > 0;
  return {
    module: CertificationModule.IMAGING,
    evaluated: true,
    ready: hasFatal ? null : unresolved === 0,
    authority: ChartCertificationModuleAuthority.STAGE_B2_ADVISORY,
    deficiencies,
    warnings,
    informationalItems,
    sourceFreshness: {
      module: CertificationModule.IMAGING,
      sourceUpdatedAt: context.diagnostics.diagnosticRevision,
      encounterVersionAtLoad: context.encounterVersion,
      status: hasFatal ? "ERROR" : "CURRENT",
    },
    evaluationErrors,
    executionTimeMs: Date.now() - started,
  };
}
