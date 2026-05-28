import { describe, expect, it } from "vitest";
import fr from "@/i18n/messages/fr";
import en from "@/i18n/messages/en";
import {
  chargeReviewClassificationFilterOptions,
  chargeReviewDomainFilterOptions,
  chargeReviewReasonLabelKey,
  chargeReviewStatusFilterOptions,
  chargeReviewStatusLabelKey,
} from "@/lib/chargeCaptureReviewDisplay";
import { FORBIDDEN_CHARGE_REVIEW_KEYS } from "@medora/shared";

function tFrom(messages: Record<string, unknown>, key: string): string {
  const parts = key.split(".");
  let cur: unknown = messages;
  for (const p of parts) {
    if (cur && typeof cur === "object") cur = (cur as Record<string, unknown>)[p];
    else return key;
  }
  return typeof cur === "string" ? cur : key;
}

describe("chargeCaptureReview display (19UCED.6)", () => {
  it("renders preview-only disclaimer in FR", () => {
    expect(tFrom(fr, "chargeCaptureReview.previewOnlyDisclaimer")).toMatch(/Aperçu uniquement/i);
    expect(tFrom(fr, "chargeCaptureReview.previewOnlyDisclaimer")).toMatch(/aucune réclamation/i);
  });

  it("covers status labels", () => {
    for (const status of chargeReviewStatusFilterOptions()) {
      expect(tFrom(fr, chargeReviewStatusLabelKey(status))).not.toBe(chargeReviewStatusLabelKey(status));
    }
  });

  it("covers domain and classification filter options", () => {
    expect(chargeReviewClassificationFilterOptions().length).toBe(7);
    expect(chargeReviewDomainFilterOptions().length).toBe(7);
  });

  it("covers reason labels", () => {
    expect(tFrom(fr, chargeReviewReasonLabelKey("MISSING_PRIMARY_DIAGNOSIS"))).toMatch(/diagnostic/i);
    expect(tFrom(en, chargeReviewReasonLabelKey("UNKNOWN_BILLING_SIDE"))).toMatch(/billing side/i);
  });

  it("charge review page source has no submit/generate/send claim buttons", async () => {
    const fs = await import("node:fs/promises");
    const pagePath = new URL("../../app/app/billing/charge-review/page.tsx", import.meta.url);
    const cardPath = new URL("../components/billing/EncounterChargeReviewCard.tsx", import.meta.url);
    const pageSrc = await fs.readFile(pagePath, "utf8");
    const cardSrc = await fs.readFile(cardPath, "utf8");
    for (const src of [pageSrc, cardSrc]) {
      expect(src).not.toMatch(/submit.*claim|soumettre.*réclamation|generate.*claim|send.*payer/i);
      expect(src).not.toMatch(/type=\"submit\"/i);
    }
    expect(pageSrc).toContain("charge-review-page-disclaimer");
    expect(cardSrc).toContain("charge-review-disclaimer");
  });

  it("forbidden PHI keys remain documented in shared package", () => {
    expect(FORBIDDEN_CHARGE_REVIEW_KEYS).toContain("patientName");
    expect(FORBIDDEN_CHARGE_REVIEW_KEYS).toContain("cptAutoCode");
  });
});
