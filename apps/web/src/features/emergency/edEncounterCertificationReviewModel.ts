import {
  EdChartCertificationSourceAuthority,
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

/**
 * Billing tone for close-review display.
 * Stage A: only ESTABLISHED_WORKFLOW blockers drive "closure_blocked" / billing deficiencies.
 */
export function resolveEdEncounterBillingReadinessTone(
  certification: EdClosedEncounterCertificationResult
): EdEncounterBillingReadinessTone {
  const authoritative = certification.authoritativeReadiness ?? {
    clinicalClosureReady: certification.closureReady,
    billingReady: certification.billingReady,
    dispositionReady: certification.dispositionReady ?? true,
  };
  if (!authoritative.clinicalClosureReady) return "closure_blocked";
  if (!authoritative.billingReady) return "billing_deficiencies";
  if (certification.advisoryReadiness?.billingReviewSuggested) return "billing_deficiencies";
  return "ready_for_billing";
}

/**
 * Continue to close-check is gated only by established disposition-safety acknowledgement.
 * Stage A advisory deficiencies must never disable this.
 */
export function canProceedToCloseCheckFromCertificationReview(input: {
  certification: EdClosedEncounterCertificationResult;
  dispositionReadiness: DispositionSafetyReadinessResponse | null;
  acknowledgeDispositionSafety: boolean;
}): boolean {
  void input.certification;
  const dispositionBlocks = Boolean(
    input.dispositionReadiness && !input.dispositionReadiness.canClose
  );
  if (dispositionBlocks && !input.acknowledgeDispositionSafety) return false;
  return true;
}

/**
 * Show review when established blockers exist or Stage A advisory findings are present for review.
 * Showing the panel does not block closure by itself.
 */
export function shouldShowCertificationReviewOnCloseRequest(
  certification: EdClosedEncounterCertificationResult
): boolean {
  const establishedClosure = (certification.closureBlockers ?? []).some(
    (d) => d.sourceAuthority === EdChartCertificationSourceAuthority.ESTABLISHED_WORKFLOW
  );
  const advisory =
    (certification.advisoryFindings?.length ?? 0) > 0 ||
    certification.advisoryReadiness?.clinicalClosureReviewSuggested === true;
  return establishedClosure || advisory || !certification.authoritativeReadiness?.clinicalClosureReady;
}

export function groupCertificationDeficienciesForReview(
  certification: EdClosedEncounterCertificationResult
): {
  established: EdClosedEncounterCertificationDeficiency[];
  advisory: EdClosedEncounterCertificationDeficiency[];
  provider: EdClosedEncounterCertificationDeficiency[];
  nursing: EdClosedEncounterCertificationDeficiency[];
  billing: EdClosedEncounterCertificationDeficiency[];
  coding: EdClosedEncounterCertificationDeficiency[];
  system: EdClosedEncounterCertificationDeficiency[];
} {
  const established =
    certification.establishedFindings ??
    certification.deficiencies.filter(
      (d) => d.sourceAuthority === EdChartCertificationSourceAuthority.ESTABLISHED_WORKFLOW
    );
  const advisory =
    certification.advisoryFindings ??
    certification.deficiencies.filter(
      (d) => d.sourceAuthority === EdChartCertificationSourceAuthority.STAGE_A_ADVISORY
    );
  const system = certification.deficiencies.filter(
    (d) =>
      d.responsibleRole === "SYSTEM" ||
      d.responsibleRole === "ADMIN" ||
      d.category === "TIMESTAMPS" ||
      d.category === "DEMOGRAPHICS"
  );
  return {
    established,
    advisory,
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
  const ready =
    certification.authoritativeReadiness?.clinicalClosureReady !== false &&
    certification.authoritativeReadiness?.billingReady !== false;
  const allEncountersEligible = ready;
  return {
    status: EdClosedEncounterCertificationStatus.CERTIFIED_CLOSED,
    allEncountersEligible,
    certifiedClosed: true,
  };
}

/** Guard: Stage A advisory findings never independently deny close-check continuation. */
export function stageAAdvisoryFindingsBlockCloseCheck(
  certification: EdClosedEncounterCertificationResult
): boolean {
  void certification;
  return false;
}
