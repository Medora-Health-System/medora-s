import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../../..");

function readFile(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("billingReadinessExplainerPanel (MEDUI.BILLING.READINESS.EXPLAINER.1)", () => {
  it("renders title and category sections", () => {
    const panel = readFile("src/features/billing/BillingReadinessExplainerPanel.tsx");
    expect(panel).toContain("readinessExplainerTitle");
    expect(panel).toContain("BILLING_READINESS_EXPLAINER_CATEGORY_I18N");
    expect(panel).toContain("readinessExplainerSuggestedAction");
  });

  it("suggested action links are read-only navigation", () => {
    const panel = readFile("src/features/billing/BillingReadinessExplainerPanel.tsx");
    expect(panel).toContain("<Link href=");
    expect(panel).not.toContain('method: "POST"');
    expect(panel).not.toContain("finalize");
    expect(panel).not.toContain("submitClaim");
  });

  it("navigation resolves ledger fallback", () => {
    const navigation = readFile("src/features/billing/billingReadinessExplainerNavigation.ts");
    const fallback = navigation.match(/open_billing_ledger[\s\S]*?encounters\/\$\{encounterId\}/);
    expect(fallback).toBeTruthy();
    expect(navigation).toContain("readinessExplainerOpenLedger");
  });

  it("EN and FR explainer keys exist", () => {
    const en = readFile("src/i18n/messages/en.ts");
    const fr = readFile("src/i18n/messages/fr.ts");
    for (const key of [
      "readinessExplainerWhyNotReady",
      "readinessExplainerCategoryCoding",
      "readinessExplainerOpenLedger",
      "readinessExplainerManualReviewComplete",
    ]) {
      expect(en).toContain(key);
      expect(fr).toContain(key);
    }
  });
});
