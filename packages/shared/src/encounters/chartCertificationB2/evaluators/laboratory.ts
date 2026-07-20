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
  type NormalizedDiagnosticItem,
} from "../types.js";
import { isB2IncludedCategory, normalizeAllDiagnosticItems } from "../lifecycle.js";

export const LAB_EVALUATOR_VERSION = "b2-lab-1.0.0";

export function evaluateLaboratoryModule(
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
      module: CertificationModule.LAB_RESULTS,
      messageKey: context.diagnostics.loadError.messageKey,
    });
  }

  const normalized = normalizeAllDiagnosticItems(context.diagnostics.orderItems).filter(
    (n) => n.category === DiagnosticCategory.LABORATORY
  );

  let complete = 0;
  let pendingOk = 0;
  let unresolved = 0;
  let excluded = 0;
  let oldest: string | null = null;

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
      excluded += 1;
      continue;
    }

    if (n.normalizedLifecycle === DiagnosticLifecycleState.UNKNOWN) {
      unresolved += 1;
      deficiencies.push(
        makeB2Deficiency({
          stableCode: "LAB_STATUS_CONFLICT",
          module: CertificationModule.LAB_RESULTS,
          owner: ChartCertificationOwner.LABORATORY,
          effects: { suggestsDocumentationReview: true },
          remediation: { route: "orders", tab: "laboratory", section: "status", requiredRole: "RN" },
          sourceEntityType: "OrderItem",
          sourceEntityId: entityId,
          deduplicationKey: `LAB_STATUS_CONFLICT::${entityId}`,
        })
      );
      continue;
    }

    if (item.specimenRejected) {
      unresolved += 1;
      trackOldest(item, (t) => (oldest = maxTs(oldest, t)));
      deficiencies.push(
        makeB2Deficiency({
          stableCode: "LAB_SPECIMEN_REJECTED",
          module: CertificationModule.LAB_RESULTS,
          owner: ChartCertificationOwner.LABORATORY,
          effects: { suggestsNursingReview: true },
          remediation: {
            route: "orders",
            tab: "laboratory",
            section: "specimen",
            requiredRole: "RN",
          },
          sourceEntityType: "OrderItem",
          sourceEntityId: entityId,
        })
      );
      continue;
    }

    const collected =
      Boolean(item.effectiveCollectedAt) || Boolean(item.documentedCollectedAt);
    if (!collected && !item.result) {
      unresolved += 1;
      trackOldest(item, (t) => (oldest = maxTs(oldest, t)));
      deficiencies.push(
        makeB2Deficiency({
          stableCode: "LAB_SPECIMEN_NOT_COLLECTED",
          module: CertificationModule.LAB_RESULTS,
          owner: ChartCertificationOwner.NURSING,
          effects: { suggestsNursingReview: true },
          remediation: {
            route: "orders",
            tab: "laboratory",
            section: "specimen",
            requiredRole: "RN",
          },
          sourceEntityType: "OrderItem",
          sourceEntityId: entityId,
          deduplicationKey: `LAB_SPECIMEN_NOT_COLLECTED::${entityId}`,
        })
      );
      continue;
    }

    if (n.normalizedLifecycle === DiagnosticLifecycleState.EXTERNAL_FOLLOW_UP) {
      pendingOk += 1;
      informationalItems.push({
        stableCode: "LAB_SEND_OUT_FOLLOW_UP_ACTIVE",
        module: CertificationModule.LAB_RESULTS,
        titleKey: "edLifecycle.certification.b2.codes.LAB_SEND_OUT_FOLLOW_UP_ACTIVE.title",
        descriptionKey:
          "edLifecycle.certification.b2.codes.LAB_SEND_OUT_FOLLOW_UP_ACTIVE.description",
      });
      continue;
    }

    if (item.sendOut && !item.followUpOwnerPresent) {
      unresolved += 1;
      deficiencies.push(
        makeB2Deficiency({
          stableCode: "LAB_SEND_OUT_FOLLOW_UP_MISSING",
          module: CertificationModule.LAB_RESULTS,
          owner: ChartCertificationOwner.PROVIDER,
          effects: { suggestsProviderReview: true },
          remediation: {
            route: "results",
            tab: "followUp",
            section: "sendOut",
            requiredRole: "PROVIDER",
          },
          sourceEntityType: "OrderItem",
          sourceEntityId: entityId,
        })
      );
      if (!context.diagnostics.sendOutFollowUpModelPresent) {
        informationalItems.push({
          stableCode: "SEND_OUT_FOLLOW_UP_MODEL_LIMITATION",
          module: CertificationModule.LAB_RESULTS,
          titleKey: "edLifecycle.certification.b2.codes.SEND_OUT_FOLLOW_UP_MODEL_LIMITATION.title",
          descriptionKey:
            "edLifecycle.certification.b2.codes.SEND_OUT_FOLLOW_UP_MODEL_LIMITATION.description",
        });
      }
      continue;
    }

    if (!item.result?.hasResultPayload) {
      unresolved += 1;
      trackOldest(item, (t) => (oldest = maxTs(oldest, t)));
      deficiencies.push(
        makeB2Deficiency({
          stableCode: "LAB_RESULT_MISSING",
          module: CertificationModule.LAB_RESULTS,
          owner: ChartCertificationOwner.LABORATORY,
          effects: { suggestsDocumentationReview: true },
          remediation: {
            route: "orders",
            tab: "laboratory",
            section: "result",
            requiredRole: "LAB",
          },
          sourceEntityType: "OrderItem",
          sourceEntityId: entityId,
          deduplicationKey: `DIAGNOSTIC_RESULT_MISSING::${entityId}`,
        })
      );
      continue;
    }

    if (!item.result.verifiedAt && item.result.preliminaryAcceptable) {
      pendingOk += 1;
      warnings.push({
        stableCode: "LAB_RESULT_PRELIMINARY",
        module: CertificationModule.LAB_RESULTS,
        titleKey: "edLifecycle.certification.b2.codes.LAB_RESULT_PRELIMINARY.title",
        descriptionKey: "edLifecycle.certification.b2.codes.LAB_RESULT_PRELIMINARY.description",
        sourceAuthority: "STAGE_B2_EVALUATED" as const,
      });
      continue;
    }

    if (!item.result.verifiedAt) {
      unresolved += 1;
      deficiencies.push(
        makeB2Deficiency({
          stableCode: "LAB_RESULT_UNVERIFIED",
          module: CertificationModule.LAB_RESULTS,
          owner: ChartCertificationOwner.PROVIDER,
          effects: { suggestsProviderReview: true },
          remediation: {
            route: "results",
            tab: "review",
            section: "verify",
            requiredRole: "PROVIDER",
          },
          sourceEntityType: "Result",
          sourceEntityId: item.result.id,
          deduplicationKey: `LAB_RESULT_UNREVIEWED::${item.result.id}`,
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
          stableCode: "LAB_RESULT_UNREVIEWED",
          module: CertificationModule.LAB_RESULTS,
          owner: ChartCertificationOwner.PROVIDER,
          effects: { suggestsProviderReview: true },
          remediation: {
            route: "results",
            tab: "review",
            section: "providerReview",
            requiredRole: "PROVIDER",
          },
          sourceEntityType: "Result",
          sourceEntityId: item.result.id,
          deduplicationKey: `LAB_RESULT_UNREVIEWED::${item.result.id}`,
        })
      );
      continue;
    }

    if (item.result.criticalValue && !item.result.acknowledgedByProviderAt) {
      unresolved += 1;
      deficiencies.push(
        makeB2Deficiency({
          stableCode: "LAB_CRITICAL_RESULT_UNACKNOWLEDGED",
          module: CertificationModule.LAB_RESULTS,
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
      continue;
    }

    complete += 1;
  }

  const hasFatal = evaluationErrors.length > 0;
  const ready = hasFatal ? null : unresolved === 0;

  return {
    module: CertificationModule.LAB_RESULTS,
    evaluated: true,
    ready,
    authority: ChartCertificationModuleAuthority.STAGE_B2_ADVISORY,
    deficiencies,
    warnings,
    informationalItems,
    sourceFreshness: {
      module: CertificationModule.LAB_RESULTS,
      sourceUpdatedAt: context.diagnostics.diagnosticRevision,
      encounterVersionAtLoad: context.encounterVersion,
      status: hasFatal ? "ERROR" : "CURRENT",
    },
    evaluationErrors,
    executionTimeMs: Date.now() - started,
  };
}

export function summarizeNormalized(
  items: NormalizedDiagnosticItem[]
): { included: number; excluded: number } {
  let included = 0;
  let excluded = 0;
  for (const n of items) {
    if (!isB2IncludedCategory(n.category)) excluded += 1;
    else included += 1;
  }
  return { included, excluded };
}

function maxTs(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

function trackOldest(
  item: { placedAt: string | null; updatedAt: string | null },
  set: (t: string | null) => void
): void {
  set(item.placedAt ?? item.updatedAt);
}
