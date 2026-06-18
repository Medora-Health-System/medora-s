import { BadRequestException } from "@nestjs/common";
import { buildEncounterClaimsFromEvents, type EncounterClaimsResult } from "./claim-builder.service";
import {
  applyManualReviewGateToEncounterClaims,
  buildBillingLedgerArtifactNotReadyPayload,
  manualBillingReviewUnresolvedIssue,
} from "./billing-ledger-artifact.util";

function emptyClaimsResult(): EncounterClaimsResult {
  return buildEncounterClaimsFromEvents([], 0);
}

describe("billing-ledger-artifact.util (MEDUI.BILLING.HOTFIX.1)", () => {
  it("adds manual review blocker without throwing", () => {
    const base = emptyClaimsResult();
    const gated = applyManualReviewGateToEncounterClaims(base, {
      encounterId: "enc-1",
      unresolvedCount: 2,
      unresolvedItems: [],
      doNotBillOrderItemIds: [],
    });
    expect(gated.summary.ready).toBe(false);
    expect(gated.validation.summary.blockers.some((b) => b.code === "MANUAL_BILLING_REVIEW_UNRESOLVED")).toBe(
      true
    );
    expect(manualBillingReviewUnresolvedIssue(2).meta?.unresolvedCount).toBe(2);
  });

  it("builds NOT_READY payload for safe ledger reads", () => {
    const payload = buildBillingLedgerArtifactNotReadyPayload({
      blockers: ["MISSING_PAYER"],
      warnings: ["MISSING_DIAGNOSIS"],
      summary: null,
      message: "Not ready",
    });
    expect(payload.status).toBe("NOT_READY");
    expect(payload.blockers).toEqual(["MISSING_PAYER"]);
    expect(payload.warnings).toEqual(["MISSING_DIAGNOSIS"]);
  });

  it("does not treat BadRequestException as the only ledger read outcome", () => {
    const err = new BadRequestException("Manual billing review unresolved for this encounter.");
    expect(err.getStatus()).toBe(400);
    const safe = buildBillingLedgerArtifactNotReadyPayload({
      blockers: [String(err.message)],
      warnings: [],
      summary: null,
    });
    expect(safe.status).toBe("NOT_READY");
  });
});
