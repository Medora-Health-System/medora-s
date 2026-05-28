import { describe, expect, it } from "vitest";
import { BILLING_CLASSIFICATION_BADGE_SOFT } from "@medora/shared";
import { tBillingClassification } from "@/lib/encounterChromeI18n";
import fr from "@/i18n/messages/fr";
import en from "@/i18n/messages/en";

function tFr(key: string): string {
  const parts = key.split(".");
  let cur: unknown = fr;
  for (const p of parts) {
    if (cur && typeof cur === "object") cur = (cur as Record<string, unknown>)[p];
    else return key;
  }
  return typeof cur === "string" ? cur : key;
}

describe("BillingClassificationBadge i18n (19UCED.1)", () => {
  it("renders localized FR labels for UC and ED", () => {
    expect(tBillingClassification(tFr, "URGENT_CARE")).toBe("Soins urgents");
    expect(tBillingClassification(tFr, "EMERGENCY_DEPARTMENT")).toBe("Urgences");
  });

  it("renders localized EN labels for UC and ED", () => {
    const tEn = (key: string) => {
      const parts = key.split(".");
      let cur: unknown = en;
      for (const p of parts) {
        if (cur && typeof cur === "object") cur = (cur as Record<string, unknown>)[p];
        else return key;
      }
      return typeof cur === "string" ? cur : key;
    };
    expect(tBillingClassification(tEn, "URGENT_CARE")).toBe("Urgent Care");
    expect(tBillingClassification(tEn, "EMERGENCY_DEPARTMENT")).toBe("ER / ED");
  });

  it("badge soft tokens include text label colors (not color-only)", () => {
    for (const soft of Object.values(BILLING_CLASSIFICATION_BADGE_SOFT)) {
      expect(soft.text.length).toBeGreaterThan(0);
      expect(soft.bg.length).toBeGreaterThan(0);
    }
  });

  it("maps operational classifications to distinct badge palettes (19UCED.2)", () => {
    expect(BILLING_CLASSIFICATION_BADGE_SOFT.URGENT_CARE.text).not.toBe(
      BILLING_CLASSIFICATION_BADGE_SOFT.EMERGENCY_DEPARTMENT.text,
    );
    expect(BILLING_CLASSIFICATION_BADGE_SOFT.CLINIC_VISIT.bg).not.toBe(
      BILLING_CLASSIFICATION_BADGE_SOFT.PROCEDURE.border,
    );
    expect(BILLING_CLASSIFICATION_BADGE_SOFT.TELEHEALTH.text).toMatch(/0e7490/i);
    expect(BILLING_CLASSIFICATION_BADGE_SOFT.INPATIENT.text).toMatch(/312e81/i);
  });
});
