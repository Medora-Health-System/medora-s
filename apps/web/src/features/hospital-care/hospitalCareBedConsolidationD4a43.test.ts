import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveBedBoardUnitCode } from "@/features/inpatient-workspace/UnitBedBoard";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";

describe("MEDUI.D4A.4.3 hospital bed consolidation", () => {
  it("resolves inpatient unit codes to enterprise bed pools", () => {
    expect(resolveBedBoardUnitCode("ms")).toBe("MS");
    expect(resolveBedBoardUnitCode("ICU")).toBe("ICU");
    expect(resolveBedBoardUnitCode("OBS")).toBe("OBS");
    expect(resolveBedBoardUnitCode("ED")).toBe("ED");
    expect(resolveBedBoardUnitCode("UNKNOWN")).toBeNull();
  });

  it("Hospital Care Dashboard title is not Observation care", () => {
    expect(en.hospitalCareD3e6a.floorBoard.dashboardTitle).toBe("Hospital Care Dashboard");
    expect(fr.hospitalCareD3e6a.floorBoard.dashboardTitle).toMatch(/Soins hospitaliers/i);
    expect(en.hospitalCareD3e6a.floorBoard.dashboardTitle).not.toMatch(/Observation/i);
    expect(en.bedBoard.statusChangeRoom).toBe("Change room");
    expect(fr.bedBoard.statusChangeRoom).toMatch(/chambre/i);
  });

  it("floor-board page uses hospitalCareDashboard projection", () => {
    const page = readFileSync(
      join(import.meta.dirname, "../../../app/app/hospitalisation/floor-board/page.tsx"),
      "utf8"
    );
    expect(page).toContain('projection="hospitalCareDashboard"');
    expect(page).toContain("HospitalizationBoardView");
  });

  it("UnitBedBoard wires enterprise manage/assign/change-room handlers", () => {
    const src = readFileSync(
      join(import.meta.dirname, "../inpatient-workspace/UnitBedBoard.tsx"),
      "utf8"
    );
    expect(src).toContain("canManageBedStatus");
    expect(src).toContain("canAssignRoom");
    expect(src).toContain("onChangeRoom");
    expect(src).toContain("BedBoardAssignEncounterPicker");
    expect(src).toContain("RoomAssignmentModal");
    expect(src).toContain("fetchFacilityBedBoard");
  });

  it("shared bed modal exposes change-room action", () => {
    const modal = readFileSync(
      join(import.meta.dirname, "../../components/encounters/BedBoardStatusDetailModal.tsx"),
      "utf8"
    );
    expect(modal).toContain('data-testid="bed-board-status-change-room"');
    expect(modal).toContain("onChangeRoom");
    expect(modal).toContain("statusChangeRoom");
  });
});
