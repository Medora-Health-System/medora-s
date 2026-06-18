import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("marAllergyReviewPanel", () => {
  const panelSrc = readFileSync(
    join(process.cwd(), "src/components/mar/MedicationAllergyReviewPanel.tsx"),
    "utf8"
  );
  const drawerSrc = readFileSync(
    join(process.cwd(), "src/components/encounters/FacilityMarShiftTimelineDrawer.tsx"),
    "utf8"
  );

  it("drawer displays recommendation panel", () => {
    expect(drawerSrc).toContain("MedicationAllergyReviewPanel");
    expect(drawerSrc).toContain("allergyReviewCandidates");
  });

  it("panel shows review and dismiss actions (informational only)", () => {
    expect(panelSrc).toContain('data-testid="mar-allergy-review-panel"');
    expect(panelSrc).toContain("mar-allergy-review-review-button");
    expect(panelSrc).toContain("mar-allergy-review-dismiss-button");
    expect(panelSrc).not.toMatch(/createAllergy|updateAllergy/i);
  });

  it("panel visible only when recommendation active", () => {
    expect(panelSrc).toContain('c.recommendationLevel !== "NONE"');
    expect(panelSrc).toContain("activeCandidates.length === 0");
  });
});
