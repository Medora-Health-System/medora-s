/**
 * MEDPROC.5 — procedure billing readiness (web guards).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webRoot = join(import.meta.dirname, "../..");
const erOrdersPanelSource = readFileSync(
  join(webRoot, "src/features/emergency/EmergencyErOrdersPanel.tsx"),
  "utf8"
);
const indicatorSource = readFileSync(
  join(webRoot, "src/components/clinical/ProcedureBillingReadinessIndicator.tsx"),
  "utf8"
);
const readinessUiSource = readFileSync(
  join(webRoot, "src/lib/procedureBillingReadinessUi.ts"),
  "utf8"
);
const sharedReadinessSource = readFileSync(
  join(webRoot, "../../packages/shared/src/procedures/resolveProcedureBillingReadiness.ts"),
  "utf8"
);
const chargeReviewCardSource = readFileSync(
  join(webRoot, "src/components/billing/EncounterChargeReviewCard.tsx"),
  "utf8"
);

describe("MEDPROC.5 procedure billing readiness UI guards", () => {
  it("procedure billing readiness indicator renders in ER orders panel", () => {
    expect(erOrdersPanelSource).toContain("resolveProcedureBillingReadiness");
    expect(erOrdersPanelSource).toContain("ProcedureBillingReadinessIndicator");
    expect(indicatorSource).toContain("procedure-billing-readiness-indicator");
  });

  it("review-needed state renders", () => {
    expect(readinessUiSource).toContain("procedureBillingReadiness.billingReviewNeeded");
    expect(indicatorSource).toContain("indicatorStyles.review");
  });

  it("ready-for-review state renders", () => {
    expect(readinessUiSource).toContain("procedureBillingReadiness.readyForReview");
    expect(indicatorSource).toContain("indicatorStyles.ready");
  });

  it("no submit/generate claim button exists", () => {
    expect(indicatorSource).not.toMatch(/submit.*claim|generate.*claim|claim.*submit/i);
    expect(erOrdersPanelSource).not.toMatch(/procedure-billing-readiness[\s\S]{0,400}submit/i);
  });

  it("documentation-needed message appears when template required", () => {
    expect(readinessUiSource).toContain("procedureBillingReadiness.documentationRequired");
    expect(indicatorSource).toContain("requiresDocumentationReview");
  });

  it("ER order row still has lifecycle buttons", () => {
    expect(erOrdersPanelSource).toContain('op === "complete"');
    expect(erOrdersPanelSource).toContain('op === "acknowledge"');
    expect(erOrdersPanelSource).toContain('op === "start"');
  });

  it("MEDPROC.3 documentation link still works", () => {
    expect(erOrdersPanelSource).toContain("ProcedureOrderDocumentationLinkage");
    expect(erOrdersPanelSource).toContain("resolveProcedureDocumentationLinkage");
  });

  it("shared readiness helper does not create billing events", () => {
    expect(sharedReadinessSource).not.toMatch(/billingEvent\.create|BillingEvent\.create|createClaim|submitClaim/i);
    expect(sharedReadinessSource).toContain("previewOnly: true");
  });

  it("charge review workspace unchanged unless explicitly integrated", () => {
    expect(chargeReviewCardSource).not.toContain("ProcedureBillingReadinessIndicator");
    expect(chargeReviewCardSource).not.toContain("resolveProcedureBillingReadiness");
  });

  it("MEDPROC.4 role execution still works", () => {
    expect(erOrdersPanelSource).toContain("resolveProcedureExecutionProfile");
    expect(erOrdersPanelSource).toContain("requestorMayCompleteEnterpriseProcedure");
  });
});
