import { describe, expect, it } from "vitest";
import fr from "@/i18n/messages/fr";
import en from "@/i18n/messages/en";
import {
  billingExportFormReadinessLabelKey,
  billingExportReadinessProviderSummaryKey,
  billingExportReasonLabelKey,
  billingExportRouteLabelKey,
} from "@/lib/billingExportReadinessDisplay";
import { FORBIDDEN_BILLING_EXPORT_READINESS_KEYS } from "@medora/shared";

function tFrom(messages: Record<string, unknown>, key: string): string {
  const parts = key.split(".");
  let cur: unknown = messages;
  for (const p of parts) {
    if (cur && typeof cur === "object") cur = (cur as Record<string, unknown>)[p];
    else return key;
  }
  return typeof cur === "string" ? cur : key;
}

describe("billingExportReadiness display (19UCED.3)", () => {
  it("renders route label for ED both professional and facility", () => {
    const key = billingExportRouteLabelKey("BOTH_PROFESSIONAL_AND_FACILITY");
    expect(tFrom(fr, key)).toMatch(/professionnel/i);
    expect(tFrom(en, key)).toMatch(/professional/i);
  });

  it("renders manual review provider summary", () => {
    const key = billingExportReadinessProviderSummaryKey({
      requiresManualReview: true,
      route: "REVIEW_REQUIRED",
    });
    expect(tFrom(fr, key)).toMatch(/révision/i);
  });

  it("renders preview-only disclaimer in FR", () => {
    expect(tFrom(fr, "billingExportReadiness.previewOnlyDisclaimer")).toMatch(/Aperçu uniquement/i);
    expect(tFrom(fr, "billingExportReadiness.previewOnlyDisclaimer")).toMatch(/aucune réclamation/i);
  });

  it("covers all route and form readiness i18n keys", () => {
    const routes = [
      "PROFESSIONAL_CLAIM",
      "FACILITY_CLAIM",
      "BOTH_PROFESSIONAL_AND_FACILITY",
      "NO_CLAIM_EXPORT",
      "REVIEW_REQUIRED",
    ] as const;
    for (const route of routes) {
      expect(tFrom(fr, billingExportRouteLabelKey(route))).not.toBe(billingExportRouteLabelKey(route));
    }
    const forms = ["CMS_1500_READY", "UB_04_READY", "BOTH_READY", "NOT_READY", "REVIEW_REQUIRED"] as const;
    for (const form of forms) {
      expect(tFrom(fr, billingExportFormReadinessLabelKey(form))).not.toBe(billingExportFormReadinessLabelKey(form));
    }
  });

  it("covers billing route reason labels", () => {
    expect(tFrom(fr, billingExportReasonLabelKey("MISSING_DIAGNOSIS"))).toMatch(/diagnostic/i);
    expect(tFrom(fr, billingExportReasonLabelKey("MISSING_FACILITY_BILLING_IDENTITY"))).toMatch(/établissement/i);
  });

  it("card component source has no submit claim action", async () => {
    const fs = await import("node:fs/promises");
    const cardPath = new URL("../components/billing/EncounterBillingExportReadinessCard.tsx", import.meta.url);
    const hintPath = new URL("../components/billing/EncounterBillingExportReadinessHint.tsx", import.meta.url);
    const cardSrc = await fs.readFile(cardPath, "utf8");
    const hintSrc = await fs.readFile(hintPath, "utf8");
    for (const src of [cardSrc, hintSrc]) {
      expect(src).not.toMatch(/submit.*claim|soumettre.*réclamation/i);
      expect(src).not.toMatch(/onSubmit|type=\"submit\"/i);
    }
    expect(cardSrc).toContain("previewOnlyDisclaimer");
  });

  it("forbidden PHI keys remain documented in shared package", () => {
    expect(FORBIDDEN_BILLING_EXPORT_READINESS_KEYS).toContain("patientName");
    expect(FORBIDDEN_BILLING_EXPORT_READINESS_KEYS).toContain("payerName");
  });
});
