import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readWebSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("M1.7B.7 — MAR Record Administration modal billing field cleanup", () => {
  it("does not render NDC, dose value, or billing quantity inputs", () => {
    const mar = readWebSource("src/components/encounters/MedicationAdministrationTab.tsx");
    expect(mar).not.toContain('t("marTab.ndcLabel")');
    expect(mar).not.toContain('t("marTab.doseValuePlaceholder")');
    expect(mar).not.toContain('t("marTab.billingQuantityPlaceholder")');
  });

  it("silently merges hidden billing metadata into MAR create payload", () => {
    const mar = readWebSource("src/components/encounters/MedicationAdministrationTab.tsx");
    expect(mar).toContain("mergeMarCreateBillingFields");
    expect(mar).toContain("resolveMarHiddenBillingPayload");
    expect(mar).toContain("hiddenBilling");
  });
});
