import {
  EdClosedEncounterCertificationStatus,
  type DispositionSafetyReadinessResponse,
  type EdClosedEncounterCertificationDeficiency,
  type EdClosedEncounterCertificationResult,
} from "@medora/shared";

export type EdCertificationReadinessLevel = "ready" | "needs_attention" | "blocked";

export type EdEncounterBillingReadinessTone = "closure_blocked" | "billing_deficiencies" | "ready_for_billing";

export function resolveEdCertificationReadinessLevel(ready: boolean, blockerCount: number): EdCertificationReadinessLevel {
  if (ready) return "ready";
  if (blockerCount > 0) return "blocked";
  return "needs_attention";
}

export function resolveEdEncounterBillingReadinessTone(
  certification: EdClosedEncounterCertificationResult
): EdEncounterBillingReadinessTone {
  if (!certification.closureReady) return "closure_blocked";
  if (!certification.billingReady) return "billing_deficiencies";
  return "ready_for_billing";
}

export function canProceedToCloseCheckFromCertificationReview(input: {
  certification: EdClosedEncounterCertificationResult;
  dispositionReadiness: DispositionSafetyReadinessResponse | null;
  acknowledgeDispositionSafety: boolean;
}): boolean {
  const dispositionBlocks = Boolean(
    input.dispositionReadiness && !input.dispositionReadiness.canClose
  );
  if (dispositionBlocks && !input.acknowledgeDispositionSafety) return false;
  return true;
}

export function shouldShowCertificationReviewOnCloseRequest(
  certification: EdClosedEncounterCertificationResult
): boolean {
  return certification.closureBlockers.length > 0 || !certification.closureReady;
}

export function groupCertificationDeficienciesForReview(
  certification: EdClosedEncounterCertificationResult
): {
  provider: EdClosedEncounterCertificationDeficiency[];
  nursing: EdClosedEncounterCertificationDeficiency[];
  billing: EdClosedEncounterCertificationDeficiency[];
  coding: EdClosedEncounterCertificationDeficiency[];
  system: EdClosedEncounterCertificationDeficiency[];
} {
  const system = certification.deficiencies.filter(
    (d) =>
      d.responsibleRole === "SYSTEM" ||
      d.responsibleRole === "ADMIN" ||
      d.category === "TIMESTAMPS" ||
      d.category === "DEMOGRAPHICS"
  );
  return {
    provider: certification.providerDeficiencies,
    nursing: certification.nursingDeficiencies,
    billing: certification.billingDeficiencies,
    coding: certification.codingDeficiencies,
    system,
  };
}

export function projectCertificationAfterSuccessfulClose(
  certification: EdClosedEncounterCertificationResult
): Pick<EdClosedEncounterCertificationResult, "status" | "allEncountersEligible" | "certifiedClosed"> {
  const allEncountersEligible = certification.closureReady && certification.billingReady;
  return {
    status: EdClosedEncounterCertificationStatus.CERTIFIED_CLOSED,
    allEncountersEligible,
    certifiedClosed: true,
  };
}
