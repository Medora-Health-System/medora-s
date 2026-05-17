import { describe, expect, it } from "vitest";
import { resolveLabRadMilestoneDisplay } from "./labRadiologyEffectiveTimeDisplay";

describe("resolveLabRadMilestoneDisplay", () => {
  const documented = "2026-05-16T14:00:00.000Z";

  it("returns null when no documented timestamp", () => {
    expect(resolveLabRadMilestoneDisplay({ documentedAt: null, effectiveAt: null, version: 0 })).toEqual({
      clinicalIso: null,
      documentedIso: null,
      showAdjustedBadge: false,
      showDualLabels: false,
    });
  });

  it("shows single label when effective matches documented", () => {
    const display = resolveLabRadMilestoneDisplay({
      documentedAt: documented,
      effectiveAt: null,
      version: 0,
    });
    expect(display.documentedIso).toBe(documented);
    expect(display.clinicalIso).toBe(documented);
    expect(display.showAdjustedBadge).toBe(false);
    expect(display.showDualLabels).toBe(false);
  });

  it("shows dual labels and adjusted badge when effective differs", () => {
    const display = resolveLabRadMilestoneDisplay({
      documentedAt: documented,
      effectiveAt: "2026-05-16T13:00:00.000Z",
      version: 1,
    });
    expect(display.showAdjustedBadge).toBe(true);
    expect(display.showDualLabels).toBe(true);
    expect(display.clinicalIso).toBe("2026-05-16T13:00:00.000Z");
    expect(display.documentedIso).toBe(documented);
  });
});
