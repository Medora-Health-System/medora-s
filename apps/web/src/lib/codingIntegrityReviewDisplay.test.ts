import { describe, expect, it } from "vitest";
import fr from "@/i18n/messages/fr";
import en from "@/i18n/messages/en";
import {
  codingIntegrityClassificationFilterOptions,
  codingIntegrityReasonLabelKey,
  codingIntegrityStatusFilterOptions,
  codingIntegrityStatusLabelKey,
} from "@/lib/codingIntegrityReviewDisplay";
import { FORBIDDEN_CODING_REVIEW_KEYS } from "@medora/shared";

function tFrom(messages: Record<string, unknown>, key: string): string {
  const parts = key.split(".");
  let cur: unknown = messages;
  for (const p of parts) {
    if (cur && typeof cur === "object") cur = (cur as Record<string, unknown>)[p];
    else return key;
  }
  return typeof cur === "string" ? cur : key;
}

describe("codingIntegrityReview display (19UCED.7)", () => {
  it("renders preview-only disclaimer in FR", () => {
    expect(tFrom(fr, "codingIntegrityReview.previewOnlyDisclaimer")).toMatch(/Révision opérationnelle/i);
    expect(tFrom(fr, "codingIntegrityReview.previewOnlyDisclaimer")).toMatch(/aucune réclamation/i);
  });

  it("covers status labels", () => {
    for (const status of codingIntegrityStatusFilterOptions()) {
      expect(tFrom(fr, codingIntegrityStatusLabelKey(status))).not.toBe(codingIntegrityStatusLabelKey(status));
    }
  });

  it("covers classification filter options", () => {
    expect(codingIntegrityClassificationFilterOptions().length).toBe(7);
  });

  it("covers reason labels including MDM", () => {
    expect(tFrom(fr, codingIntegrityReasonLabelKey("MISSING_MDM"))).toMatch(/MDM/i);
    expect(tFrom(en, codingIntegrityReasonLabelKey("MISSING_REASSESSMENT"))).toMatch(/reassessment/i);
  });

  it("coding review page source has no auto-code buttons", async () => {
    const fs = await import("node:fs/promises");
    const pagePath = new URL("../../app/app/billing/coding-review/page.tsx", import.meta.url);
    const cardPath = new URL("../components/billing/EncounterCodingIntegrityReviewCard.tsx", import.meta.url);
    const pageSrc = await fs.readFile(pagePath, "utf8");
    const cardSrc = await fs.readFile(cardPath, "utf8");
    for (const src of [pageSrc, cardSrc]) {
      expect(src).not.toMatch(/auto-?code|autoCode|submit.*claim|soumettre.*réclamation/i);
      expect(src).not.toMatch(/type=\"submit\"/i);
    }
    expect(pageSrc).toContain("coding-review-page-disclaimer");
    expect(cardSrc).toContain("coding-integrity-disclaimer");
  });

  it("forbidden PHI keys remain documented in shared package", () => {
    expect(FORBIDDEN_CODING_REVIEW_KEYS).toContain("MDMText");
    expect(FORBIDDEN_CODING_REVIEW_KEYS).toContain("autoCodedICD");
  });
});
