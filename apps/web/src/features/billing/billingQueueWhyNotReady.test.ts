import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../../..");
const apiRoot = join(import.meta.dirname, "../../../../api/src");

function readFile(relativePath: string, root = webRoot): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("billingQueueWhyNotReady (MEDUI.BILLING.READINESS.EXPLAINER.1)", () => {
  it("billing queue shows Why not ready link", () => {
    const page = readFile("app/app/billing/page.tsx");
    expect(page).toContain("readinessExplainerWhyNotReady");
    expect(page).toContain("openReadinessExplainer");
    expect(page).toContain("BillingReadinessExplainerPanel");
  });

  it("uses queue readinessExplainer when present", () => {
    const page = readFile("app/app/billing/page.tsx");
    expect(page).toContain("encounter.readinessExplainer");
    expect(page).toContain("/billing/encounters/${encounter.id}/readiness-explainer");
  });

  it("no mutation or claim submission on billing queue page", () => {
    const page = readFile("app/app/billing/page.tsx");
    expect(page).not.toContain("submitClaim");
    expect(page).not.toContain("readinessFinalize");
    expect(page).not.toContain("postPayment");
  });

  it("no ED lifecycle regression", () => {
    const page = readFile("app/app/billing/page.tsx");
    expect(page).not.toContain("edLifecycle");
    expect(page).not.toContain("trackboard");
  });

  it("queues API builds readinessExplainer in read path", () => {
    const service = readFile("queues/queues.service.ts", apiRoot);
    expect(service).toContain("summarizeManualReviewForEncounters");
    expect(service).toContain("readinessExplainer");
  });

  it("manual review regression guard excludes approved decisions", () => {
    const service = readFile("billing/billing.service.ts", apiRoot);
    expect(service).toContain("summarizeManualReviewForEncounters");
    expect(service).toContain("BillingReviewDecisionStatus.APPROVED");
    expect(service).toContain("BillingReviewDecisionStatus.DO_NOT_BILL");
  });
});
