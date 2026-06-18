import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("marAllergyOrderingBanner", () => {
  const bannerSrc = readFileSync(
    join(process.cwd(), "src/components/mar/MedicationAllergyOrderingBanner.tsx"),
    "utf8"
  );
  const modalSrc = readFileSync(
    join(process.cwd(), "src/components/orders/CreateOrderModal.tsx"),
    "utf8"
  );
  const serviceSrc = readFileSync(
    join(process.cwd(), "../api/src/medication-administration/medication-administration.service.ts"),
    "utf8"
  );

  it("ordering banner appears for high-priority candidate medication", () => {
    expect(modalSrc).toContain("MedicationAllergyOrderingBanner");
    expect(bannerSrc).toContain('data-testid="mar-allergy-ordering-banner"');
    expect(bannerSrc).toContain("HIGH_PRIORITY_REVIEW");
  });

  it("continue order remains available and ordering is not blocked", () => {
    expect(bannerSrc).toContain("mar-allergy-ordering-continue");
    expect(bannerSrc).not.toMatch(/blockOrder|throw new|disabled=\{true\}/i);
    expect(modalSrc).not.toMatch(/allergyReview.*block|block.*allergyReview/i);
  });

  it("no MAR blocking in response documentation", () => {
    expect(serviceSrc).not.toMatch(/block.*administration|forbid.*administer/i);
    expect(serviceSrc).toContain("resolveMedicationResponseAllergyReviewRecommendation");
  });

  it("provider visibility component exists", () => {
    const providerSrc = readFileSync(
      join(process.cwd(), "src/components/mar/MedicationAllergyReviewProviderNotice.tsx"),
      "utf8"
    );
    expect(providerSrc).toContain("mar-allergy-review-provider-notice");
    expect(providerSrc).not.toMatch(/block|BPA/i);
  });
});
