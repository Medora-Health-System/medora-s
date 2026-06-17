import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const panelSrc = readFileSync(
  join(process.cwd(), "src/components/mar/MedicationResponseDocumentationPanel.tsx"),
  "utf8"
);

describe("MedicationResponseDocumentationPanel", () => {
  it("renders recommended expanded by default", () => {
    expect(panelSrc).toContain('useState(visibilityTier === "RECOMMENDED")');
    expect(panelSrc).toContain("marMedicationResponse.panel.recommendedTitle");
  });

  it("renders optional collapsed by default", () => {
    expect(panelSrc).toContain("marMedicationResponse.panel.optionalTitle");
    expect(panelSrc).toContain("{expanded ? (");
  });

  it("does not render when visibility is hidden", () => {
    expect(panelSrc).toContain('if (visibilityTier === "HIDDEN") return null');
  });
});
