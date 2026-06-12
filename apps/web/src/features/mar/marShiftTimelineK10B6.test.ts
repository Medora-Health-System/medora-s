import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildMarShiftTimelineCellDisplay } from "@medora/shared";
import { extractMarSaveErrorMessage } from "./marSaveErrorMessage";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("marShiftTimelineK10B6", () => {
  it("MAR displays NS 0.9% at 100 mL/hr rate clearly", () => {
    const display = buildMarShiftTimelineCellDisplay({
      medicationLabel: "Normal Saline",
      doseKind: "IVPB_SESSION",
      doseStatus: "DUE",
      route: "IVPB",
      frequencyCode: "NOW",
      requiresWitness: false,
      directionsSig: "NS 0.9% at 100 mL/hr",
    });
    expect(display.primaryText).toBe("NS 0.9%");
    expect(display.secondaryText).toBe("100 mL/hr");
  });

  it("extractMarSaveErrorMessage hides raw .json is not a function errors", () => {
    const fallback = "Erreur lors de l'enregistrement.";
    const msg = extractMarSaveErrorMessage(
      new Error("u.json is not a function"),
      "fr",
      fallback
    );
    expect(msg).toBe(fallback);
    expect(msg).not.toContain(".json");
  });

  it("FacilityMarShiftTimelineDrawer uses extractMarSaveErrorMessage for refuse/hold", () => {
    const source = readFileSync(
      join(webSrcRoot, "components/encounters/FacilityMarShiftTimelineDrawer.tsx"),
      "utf8"
    );
    expect(source).toContain("extractMarSaveErrorMessage");
    expect(source).toContain("onExecuteRefuse");
    expect(source).toContain("onExecuteHold");
  });

  it("MedicationAdministrationTab refreshes timeline after terminal MAR submit", () => {
    const source = readFileSync(
      join(webSrcRoot, "components/encounters/MedicationAdministrationTab.tsx"),
      "utf8"
    );
    expect(source).toContain("submitMarShiftTimelineTerminalMar");
    expect(source).toContain("timelineRefreshRef.current?.()");
  });
});
