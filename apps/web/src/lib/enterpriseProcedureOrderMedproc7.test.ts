/**
 * MEDPROC.7 — procedure revenue review governance (web guards).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webRoot = join(import.meta.dirname, "../..");
const panelSource = readFileSync(
  join(webRoot, "src/components/billing/ProcedureRevenueReviewPanel.tsx"),
  "utf8"
);
const chargeReviewPageSource = readFileSync(
  join(webRoot, "app/app/billing/charge-review/page.tsx"),
  "utf8"
);
const controllerSource = readFileSync(
  join(webRoot, "../api/src/billing/billing.controller.ts"),
  "utf8"
);
const serviceSource = readFileSync(
  join(webRoot, "../api/src/billing/procedure-revenue-review.service.ts"),
  "utf8"
);

describe("MEDPROC.7 procedure revenue review UI guards", () => {
  it("procedure review queue renders on charge review page", () => {
    expect(chargeReviewPageSource).toContain("ProcedureRevenueReviewPanel");
    expect(panelSource).toContain("procedure-revenue-review-panel");
    expect(panelSource).toContain("procedure-revenue-review-queue");
  });

  it("documentation and charge master warnings render", () => {
    expect(panelSource).toContain("procedure-revenue-review-doc-missing");
    expect(panelSource).toContain("procedure-revenue-review-charge-master-missing");
  });

  it("approve/hold/reject actions render", () => {
    expect(panelSource).toContain("actionApprove");
    expect(panelSource).toContain("actionHoldDocumentation");
    expect(panelSource).toContain("actionReject");
    expect(panelSource).toContain("procedure-revenue-review-decision-form");
  });

  it("preview disclaimer and no claim buttons", () => {
    expect(panelSource).toContain("procedure-revenue-review-disclaimer");
    expect(panelSource).not.toMatch(/submit.*claim|generate.*claim|send.*payer/i);
    expect(controllerSource).toContain("billing/procedure-review");
    expect(controllerSource).toContain("RequireRoles(RoleCode.BILLING, RoleCode.ADMIN)");
  });

  it("professional/facility review side visible", () => {
    expect(panelSource).toContain("procedureBillingSideReview");
    expect(panelSource).toContain("procedureRevenueReview.side");
  });

  it("decision form requires reason code", () => {
    expect(panelSource).toContain("reasonCodeLabel");
    expect(panelSource).toContain("reasonCode");
  });

  it("does not create claims in service", () => {
    expect(serviceSource).not.toMatch(/createClaim|submitClaim|CMS.?1500|UB.?04/i);
    expect(serviceSource).toContain("appendProcedureRevenueReviewDecision");
  });

  it("MEDPROC.6 event card still available", () => {
    expect(chargeReviewPageSource).toContain("ProcedureBillableEventsCard");
  });
});
