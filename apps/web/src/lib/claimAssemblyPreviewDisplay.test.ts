import { describe, expect, it } from "vitest";
import fr from "@/i18n/messages/fr";
import en from "@/i18n/messages/en";
import {
  claimAssemblyClassificationFilterOptions,
  claimAssemblyPackageTypeFilterOptions,
  claimAssemblyReasonLabelKey,
  claimAssemblyStatusFilterOptions,
  claimAssemblyStatusLabelKey,
} from "@/lib/claimAssemblyPreviewDisplay";
import { FORBIDDEN_CLAIM_ASSEMBLY_PREVIEW_KEYS } from "@medora/shared";

function tFrom(messages: Record<string, unknown>, key: string): string {
  const parts = key.split(".");
  let cur: unknown = messages;
  for (const p of parts) {
    if (cur && typeof cur === "object") cur = (cur as Record<string, unknown>)[p];
    else return key;
  }
  return typeof cur === "string" ? cur : key;
}

describe("claimAssemblyPreview display (19UCED.8)", () => {
  it("renders preview-only disclaimer in FR", () => {
    expect(tFrom(fr, "claimAssemblyPreview.previewOnlyDisclaimer")).toMatch(/Aperçu uniquement/i);
    expect(tFrom(fr, "claimAssemblyPreview.previewOnlyDisclaimer")).toMatch(/aucune réclamation/i);
  });

  it("covers status labels including ready for export review", () => {
    expect(tFrom(fr, claimAssemblyStatusLabelKey("READY_FOR_EXPORT_REVIEW"))).toMatch(/export/i);
    for (const status of claimAssemblyStatusFilterOptions()) {
      expect(tFrom(fr, claimAssemblyStatusLabelKey(status))).not.toBe(claimAssemblyStatusLabelKey(status));
    }
  });

  it("covers package type labels", () => {
    for (const packageType of claimAssemblyPackageTypeFilterOptions()) {
      expect(tFrom(fr, `claimAssemblyPreview.packageType.${packageType}`)).not.toBe(
        `claimAssemblyPreview.packageType.${packageType}`,
      );
    }
  });

  it("covers classification filter options", () => {
    expect(claimAssemblyClassificationFilterOptions().length).toBe(7);
  });

  it("covers reason labels", () => {
    expect(tFrom(fr, claimAssemblyReasonLabelKey("MISSING_PAYER"))).toMatch(/payeur/i);
    expect(tFrom(en, claimAssemblyReasonLabelKey("CHARGE_REVIEW_REQUIRED"))).toMatch(/charge/i);
  });

  it("claim assembly preview page source has no submit/generate/send buttons", async () => {
    const fs = await import("node:fs/promises");
    const pagePath = new URL("../../app/app/billing/claim-assembly-preview/page.tsx", import.meta.url);
    const cardPath = new URL("../components/billing/EncounterClaimAssemblyPreviewCard.tsx", import.meta.url);
    const pageSrc = await fs.readFile(pagePath, "utf8");
    const cardSrc = await fs.readFile(cardPath, "utf8");
    for (const src of [pageSrc, cardSrc]) {
      expect(src).not.toMatch(/submit.*claim|soumettre.*réclamation|clearinghouse|generate.*claim|837/i);
      expect(src).not.toMatch(/type=\"submit\"/i);
    }
    expect(pageSrc).toContain("claim-assembly-page-disclaimer");
    expect(pageSrc).toContain("claim-assembly-professional-panel");
    expect(pageSrc).toContain("claim-assembly-facility-panel");
    expect(cardSrc).toContain("claim-assembly-disclaimer");
  });

  it("forbidden PHI keys remain documented in shared package", () => {
    expect(FORBIDDEN_CLAIM_ASSEMBLY_PREVIEW_KEYS).toContain("x12Payload");
    expect(FORBIDDEN_CLAIM_ASSEMBLY_PREVIEW_KEYS).toContain("icdAutoCode");
  });
});
