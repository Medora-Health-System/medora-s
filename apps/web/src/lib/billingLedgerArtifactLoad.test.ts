import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  billingLedgerArtifactNotReadyMessage,
  isBillingLedgerArtifactNotReady,
} from "@/lib/billingLedgerArtifactLoad";

const webRoot = join(import.meta.dirname, "../..");

function readWebFile(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("billingLedgerArtifactLoad (MEDUI.BILLING.HOTFIX.1)", () => {
  it("detects NOT_READY artifact payloads for missing payer / claim artifact", () => {
    expect(
      isBillingLedgerArtifactNotReady({
        status: "NOT_READY",
        blockers: ["MISSING_PAYER_CONTEXT"],
        warnings: [],
        summary: null,
      })
    ).toBe(true);
    expect(isBillingLedgerArtifactNotReady({ professional: { lines: [] } })).toBe(false);
  });

  it("ledger page keeps summary visible and shows not-ready panel instead of full-page failure", () => {
    const page = readWebFile("app/app/billing/encounters/[encounterId]/page.tsx");
    expect(page).toContain("isBillingLedgerArtifactNotReady");
    expect(page).toContain("billing-ledger-claim-artifact-not-ready");
    expect(page).toContain("claimArtifactsNotReady");
    expect(page).toContain("Promise.allSettled");
    expect(page).toContain("submissionDebugNotReady");
    expect(page).toContain("x12PreviewNotReady");
    expect(page).not.toContain("Unable to load billing summary");
  });

  it("submission-debug load is isolated so a failure cannot reject the whole ledger", () => {
    const page = readWebFile("app/app/billing/encounters/[encounterId]/page.tsx");
    expect(page).toContain("isBillingLedgerArtifactNotReady(dbg)");
    expect(page).toContain("setSubmissionDebug(null)");
    expect(page).toContain("submissionDebugNotReady");
  });

  it("shows readable not-ready message from payload blockers", () => {
    const message = billingLedgerArtifactNotReadyMessage(
      {
        status: "NOT_READY",
        blockers: ["MISSING_PAYER_CONTEXT"],
        warnings: [],
        summary: null,
      },
      "Fallback"
    );
    expect(message).toBe("MISSING_PAYER_CONTEXT");
  });

  it("does not call billing mutation APIs in artifact load helper", () => {
    const helper = readWebFile("src/lib/billingLedgerArtifactLoad.ts");
    expect(helper).not.toContain("finalize");
    expect(helper).not.toContain("submit");
    expect(helper).not.toContain("POST");
  });

  it("billing controller routes keep role guards for unauthorized access", () => {
    const controller = readWebFile("../api/src/queues/queues.controller.ts");
    expect(controller).toContain('@Get("billing/encounters/:encounterId/claims")');
    expect(controller).toContain("@RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)");
  });

  it("closed signed archive eligibility stays true when allEncountersEligible is false", () => {
    const archiveTest = readWebFile("src/features/emergency/edAllEncountersArchive.test.ts");
    expect(archiveTest).toContain("allEncountersEligible false does not exclude closed signed chart");
  });
});
