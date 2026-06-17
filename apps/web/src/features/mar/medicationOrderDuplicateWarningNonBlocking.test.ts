import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { computeAdvancedMedicationSafetyWarnings } from "@medora/shared";

const repoRoot = join(__dirname, "../../../../../");

function readRepoFile(pathFromRoot: string): string {
  return readFileSync(join(repoRoot, pathFromRoot), "utf8");
}

describe("medicationOrderDuplicateWarningNonBlocking (H9E)", () => {
  it("9 — duplicate medication shows warning", () => {
    const warnings = computeAdvancedMedicationSafetyWarnings({
      stagedLines: [
        {
          lineKey: "staged-1",
          catalogItemId: "med-1",
          genericName: "Metformin",
          route: "PO",
        },
      ],
      activeEncounterLines: [
        {
          lineKey: "active-1",
          catalogItemId: "med-1",
          genericName: "Metformin",
          route: "PO",
        },
      ],
    });
    expect(warnings.some((w) => w.category === "DUPLICATE_ACTIVE_MEDICATION")).toBe(true);
  });

  it("10 — duplicate medication submit is not blocked in CreateOrderModal validation", () => {
    const src = readRepoFile("apps/web/src/components/orders/CreateOrderModal.tsx");
    expect(src).toContain("stagedCatalogDuplicateActive");
    expect(src).not.toMatch(/stagedCatalogDuplicateActive[\s\S]{0,200}return t\(/);
  });

  it("11 — duplicate therapy submit is not blocked in API guard for medications", () => {
    const guard = readRepoFile("apps/api/src/orders/order-safety.guard.ts");
    expect(guard).toContain('catalogType === "MEDICATION"');
    expect(guard).toContain("warning-only");
    expect(guard).not.toMatch(
      /catalogItemType === "MEDICATION"[\s\S]{0,80}catalogPairs\.push/
    );
  });

  it("12 — invalid order still blocked (allergy ack)", () => {
    const guard = readRepoFile("apps/api/src/orders/order-safety.guard.ts");
    expect(guard).toContain("assertMedicationOrderAllergyAckIfNeeded");
    expect(guard).toContain("throw new BadRequestException");
  });

  it("13 — PRN duplicate allowed with warning only", () => {
    const warnings = computeAdvancedMedicationSafetyWarnings({
      stagedLines: [
        {
          lineKey: "prn-staged",
          catalogItemId: "med-prn",
          genericName: "Morphine",
          route: "IV",
          notes: "PRN pain",
        },
      ],
      activeEncounterLines: [
        {
          lineKey: "prn-active",
          catalogItemId: "med-prn",
          genericName: "Morphine",
          route: "IV",
          notes: "PRN pain",
        },
      ],
    });
    expect(warnings.length).toBeGreaterThan(0);
    const guard = readRepoFile("apps/api/src/orders/order-safety.guard.ts");
    expect(guard).toContain("MEDICATION");
  });

  it("14 — NOW + PRN same med allowed with warning", () => {
    const warnings = computeAdvancedMedicationSafetyWarnings({
      stagedLines: [
        { lineKey: "a", catalogItemId: "x", genericName: "Ibuprofen", notes: "PRN" },
        { lineKey: "b", catalogItemId: "x", genericName: "Ibuprofen" },
      ],
      activeEncounterLines: [],
    });
    expect(warnings.some((w) => w.category === "DUPLICATE_THERAPY" || w.category === "DUPLICATE_ACTIVE_MEDICATION")).toBe(
      true
    );
  });

  it("15 — no regression to MAR actionability imports", () => {
    const actions = readRepoFile("apps/web/src/features/mar/marShiftTimelineActions.ts");
    expect(actions).toContain("isMarShiftTimelineItemActionable");
    expect(actions).toContain("validateMarShiftTimelineInfusionClinicalTime");
  });

  it("duplicate warning copy matches H9E spec (en)", () => {
    const en = readRepoFile("apps/web/src/i18n/messages/en.ts");
    expect(en).toContain(
      "Duplicate active medication warning. Continue only if clinically intended."
    );
  });
});
