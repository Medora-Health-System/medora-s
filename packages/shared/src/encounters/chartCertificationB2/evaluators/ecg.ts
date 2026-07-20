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

/**
 * ECG uses CARE OrderItem + EncounterClinicalDocumentationEntry cards.
 * No dedicated ECG Result model — module remains advisory / partially evaluated for signature.
 */
export function evaluateEcgModule(context: ChartCertificationB2Context): ModuleCertificationResult {
  const started = Date.now();
  const deficiencies = [];
  const warnings = [];
  const informationalItems = [];
  const evaluationErrors = [];

  if (context.diagnostics.loadError) {
    evaluationErrors.push({
      code: context.diagnostics.loadError.code,
      module: CertificationModule.ECG,
      messageKey: context.diagnostics.loadError.messageKey,
    });
  }

  informationalItems.push({
    stableCode: "ECG_FRAGMENTED_EVIDENCE_LIMITATION",
    module: CertificationModule.ECG,
    titleKey: "edLifecycle.certification.b2.codes.ECG_FRAGMENTED_EVIDENCE_LIMITATION.title",
    descriptionKey:
      "edLifecycle.certification.b2.codes.ECG_FRAGMENTED_EVIDENCE_LIMITATION.description",
  });

  const ecgOrders = normalizeAllDiagnosticItems(context.diagnostics.orderItems).filter(
    (n) => n.category === DiagnosticCategory.ECG
  );
  const docs = context.diagnostics.ecgDocumentation;
  let unresolved = 0;

  for (const n of ecgOrders) {
    const item = n.snapshot;
    const entityId = item.orderItemId;

    if (
      n.normalizedLifecycle === DiagnosticLifecycleState.CANCELLED_VALID ||
      n.normalizedLifecycle === DiagnosticLifecycleState.REFUSED_VALID ||
      n.normalizedLifecycle === DiagnosticLifecycleState.NOT_PERFORMED_VALID ||
      n.normalizedLifecycle === DiagnosticLifecycleState.ENTERED_IN_ERROR ||
      n.normalizedLifecycle === DiagnosticLifecycleState.DUPLICATE_SUPERSEDED
    ) {
      continue;
    }

    const acquired =
      Boolean(item.effectivePerformedAt) ||
      Boolean(item.documentedPerformedAt) ||
      Boolean(item.documentedCompletedAt) ||
      Boolean(item.completedAt) ||
      docs.some((d) => d.performed === true);

    if (!acquired) {
      unresolved += 1;
      deficiencies.push(
        makeB2Deficiency({
          stableCode: "ECG_NOT_ACQUIRED",
          module: CertificationModule.ECG,
          owner: ChartCertificationOwner.NURSING,
          effects: { suggestsNursingReview: true },
          remediation: { route: "orders", tab: "care", section: "ecg", requiredRole: "RN" },
          sourceEntityType: "OrderItem",
          sourceEntityId: entityId,
        })
      );
      continue;
    }

    const matchingDoc =
      docs.find((d) => d.performed === true) ?? docs.find((d) => d.entryId) ?? null;

    if (matchingDoc?.machineInterpretationOnly && !matchingDoc.interpretationPresent) {
      unresolved += 1;
      deficiencies.push(
        makeB2Deficiency({
          stableCode: "ECG_INTERPRETATION_MISSING",
          module: CertificationModule.ECG,
          owner: ChartCertificationOwner.PROVIDER,
          effects: { suggestsProviderReview: true },
          remediation: {
            route: "provider",
            tab: "ecg",
            section: "interpretation",
            requiredRole: "PROVIDER",
          },
          sourceEntityType: "EncounterClinicalDocumentationEntry",
          sourceEntityId: matchingDoc.entryId,
          deduplicationKey: `ECG_INTERPRETATION_MISSING::${entityId}`,
          evidence: { structuredField: "machineInterpretationOnly", status: "INSUFFICIENT" },
        })
      );
      continue;
    }

    const interpretationOk =
      Boolean(matchingDoc?.interpretationPresent) ||
      Boolean(matchingDoc?.providerReviewed === true);

    if (!interpretationOk) {
      unresolved += 1;
      deficiencies.push(
        makeB2Deficiency({
          stableCode: "ECG_INTERPRETATION_MISSING",
          module: CertificationModule.ECG,
          owner: ChartCertificationOwner.PROVIDER,
          effects: { suggestsProviderReview: true },
          remediation: {
            route: "provider",
            tab: "ecg",
            section: "interpretation",
            requiredRole: "PROVIDER",
          },
          sourceEntityType: "OrderItem",
          sourceEntityId: entityId,
          deduplicationKey: `ECG_INTERPRETATION_MISSING::${entityId}`,
        })
      );
      continue;
    }

    // Durable signature is rarely modeled — do not invent; warn when unsigned flag explicit.
    if (matchingDoc && matchingDoc.interpretationPresent && !matchingDoc.interpretationSigned) {
      warnings.push({
        stableCode: "ECG_INTERPRETATION_UNSIGNED",
        module: CertificationModule.ECG,
        titleKey: "edLifecycle.certification.b2.codes.ECG_INTERPRETATION_UNSIGNED.title",
        descriptionKey:
          "edLifecycle.certification.b2.codes.ECG_INTERPRETATION_UNSIGNED.description",
        sourceAuthority: "STAGE_B2_EVALUATED" as const,
      });
    }

    if (
      matchingDoc?.criticalFindingPresent === true &&
      matchingDoc.providerNotified !== true
    ) {
      unresolved += 1;
      deficiencies.push(
        makeB2Deficiency({
          stableCode: "ECG_CRITICAL_FINDING_UNACKNOWLEDGED",
          module: CertificationModule.ECG,
          owner: ChartCertificationOwner.PROVIDER,
          effects: { suggestsProviderReview: true },
          remediation: {
            route: "provider",
            tab: "ecg",
            section: "critical",
            requiredRole: "PROVIDER",
          },
          sourceEntityType: "EncounterClinicalDocumentationEntry",
          sourceEntityId: matchingDoc.entryId,
          deduplicationKey: `ECG_CRITICAL::${matchingDoc.entryId}`,
        })
      );
    }
  }

  const hasFatal = evaluationErrors.length > 0;
  return {
    module: CertificationModule.ECG,
    evaluated: true,
    ready: hasFatal ? null : unresolved === 0,
    authority: ChartCertificationModuleAuthority.PARTIALLY_EVALUATED,
    deficiencies,
    warnings,
    informationalItems,
    sourceFreshness: {
      module: CertificationModule.ECG,
      sourceUpdatedAt: context.diagnostics.diagnosticRevision,
      encounterVersionAtLoad: context.encounterVersion,
      status: hasFatal ? "ERROR" : "CURRENT",
    },
    evaluationErrors,
    executionTimeMs: Date.now() - started,
  };
}
