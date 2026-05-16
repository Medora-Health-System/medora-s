import { describe, expect, it } from "vitest";
import { medicationAdministrationInfusionPhaseChipKind } from "@medora/shared";

const CHIP_I18N: Record<"start" | "stop", string> = {
  start: "marTab.adminTime.infusionPhaseChipStart",
  stop: "marTab.adminTime.infusionPhaseChipStop",
};

function resolveInfusionPhaseChipI18nKey(row: {
  marAction?: string | null;
  notes?: string | null;
  infusionPhase?: string | null;
}): string | null {
  const kind = medicationAdministrationInfusionPhaseChipKind(row);
  return kind ? CHIP_I18N[kind] : null;
}

describe("infusion phase chip display keys", () => {
  it("maps START row to start chip i18n key", () => {
    expect(
      resolveInfusionPhaseChipI18nKey({ marAction: "administered", infusionPhase: "INFUSION_START" })
    ).toBe("marTab.adminTime.infusionPhaseChipStart");
  });

  it("maps STOP row to stop chip i18n key", () => {
    expect(
      resolveInfusionPhaseChipI18nKey({ marAction: "administered", infusionPhase: "INFUSION_STOP" })
    ).toBe("marTab.adminTime.infusionPhaseChipStop");
  });

  it("returns null for standard medication row", () => {
    expect(
      resolveInfusionPhaseChipI18nKey({ marAction: "administered", notes: "Action: Administré" })
    ).toBeNull();
  });
});
