import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { buildAiSuggestion } from "../review.utils.js";

const ACUTE_CARE_SETTINGS = new Set([
  "EMERGENCY_DEPARTMENT",
  "HOSPITAL_INPATIENT_OBSERVATION",
  "CRITICAL_CARE",
]);

function hasTransitionOfCare(snapshot: EncounterAiSnapshot): boolean {
  if (String(snapshot.disposition.disposition ?? "").trim()) return true;
  if (String(snapshot.disposition.dischargeStatus ?? "").trim()) return true;
  const status = String(snapshot.encounterContext.status ?? "").trim().toUpperCase();
  return Boolean(status && status !== "OPEN");
}

/**
 * Phase 2B — contextual diagnostic-transition review.
 *
 * This rule intentionally does not infer disease, invent a diagnosis, or apply a disease-specific
 * pathway. It asks only whether the chart has enough structured diagnostic context to support a
 * transition of care after diagnostic work has been performed.
 */
export function rule8TransitionDiagnosticContext(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  if (!ACUTE_CARE_SETTINGS.has(snapshot.encounterContext.careSetting)) return [];
  if (!hasTransitionOfCare(snapshot)) return [];

  const results = snapshot.diagnostics.results ?? [];
  const pendingTests = snapshot.diagnostics.pendingTests ?? [];
  const diagnoses = snapshot.diagnoses.documentedDiagnoses ?? [];
  const providerStatus = String(snapshot.clinicalDocumentation.providerDocumentationStatus ?? "")
    .trim()
    .toUpperCase();

  const hasDiagnosticWork = results.length > 0 || pendingTests.length > 0;
  if (!hasDiagnosticWork) return [];

  const activeDiagnoses = diagnoses.filter((diagnosis) => {
    const status = String(diagnosis.status ?? "").trim().toUpperCase();
    return status !== "REMOVED";
  });

  if (activeDiagnoses.length === 0) {
    return [
      buildAiSuggestion(ctx, {
        category: "DIAGNOSTIC_GAP",
        priority: "MEDIUM",
        title: "Diagnostic impression not documented before transition",
        summary:
          "Diagnostic testing is documented and a transition of care is underway, but no active diagnosis is documented in the chart.",
        reasoningSummary:
          "This finding reviews documentation only. Medora Assist does not infer a diagnosis from symptoms or test results and does not determine which diagnosis is clinically appropriate.",
        evidence: [
          {
            sourceType: "RESULT",
            label: "Documented diagnostic results",
            value: results.length,
          },
          {
            sourceType: "DIAGNOSIS",
            label: "Active documented diagnoses",
            value: 0,
          },
          {
            sourceType: "DISPOSITION",
            label: "Transition of care",
            value:
              snapshot.disposition.disposition ??
              snapshot.disposition.dischargeStatus ??
              snapshot.encounterContext.status,
          },
        ],
        recommendedActions: [
          { actionType: "NAVIGATE", targetSection: "diagnoses", label: "Review documented diagnoses" },
        ],
      }),
    ];
  }

  if (providerStatus && providerStatus !== "SIGNED" && providerStatus !== "FINAL") {
    return [
      buildAiSuggestion(ctx, {
        category: "MDM_GAP",
        priority: "LOW",
        title: "Diagnostic context should be reconciled before transition",
        summary:
          "The record contains diagnostic results and an active documented diagnosis, but provider documentation remains incomplete at the time of transition.",
        reasoningSummary:
          "This finding does not question the clinical diagnosis. It identifies a documentation state mismatch between diagnostic context and transition-of-care readiness.",
        evidence: [
          {
            sourceType: "RESULT",
            label: "Documented diagnostic results",
            value: results.length,
          },
          {
            sourceType: "DIAGNOSIS",
            label: "Active documented diagnoses",
            value: activeDiagnoses.length,
          },
          {
            sourceType: "NOTE",
            label: "Provider documentation status",
            value: snapshot.clinicalDocumentation.providerDocumentationStatus ?? null,
          },
        ],
        recommendedActions: [
          { actionType: "NAVIGATE", targetSection: "medical-evaluation", label: "Review provider documentation" },
        ],
      }),
    ];
  }

  return [];
}
