import { describe, expect, it } from "vitest";
import {
  evaluateConcurrentEncounterCreate,
  inpatientStartMustNotCloseEdEncounter,
  openEdEncounterIsAdvisoryNotBlocker,
  UNIT_BED_BOARDS_ADMISSION_INTAKE_CERTIFICATION_ID,
  composeFacilityBedBoard,
  DEFAULT_PILOT_BED_POOLS,
} from "@medora/shared";
import { resolveBedBoardUnitCode } from "@/features/inpatient-workspace/UnitBedBoard";
import { parseInpatientWorkspaceSection } from "@/features/inpatient-workspace/inpatientWorkspaceSections";

describe("D3E.6D unit bed boards & hospital admission intake (web)", () => {
  it("certification id is stable", () => {
    expect(UNIT_BED_BOARDS_ADMISSION_INTAKE_CERTIFICATION_ID).toBe(
      "MEDUI.UNIT_BED_BOARDS_ADMISSION_INTAKE.D3E6D"
    );
  });

  it("maps unit board codes to Floor Board pools", () => {
    expect(resolveBedBoardUnitCode("MS")).toBe("MS");
    expect(resolveBedBoardUnitCode("ICU")).toBe("ICU");
    expect(resolveBedBoardUnitCode("PEDS")).toBeNull();
  });

  it("unit-filtered board contains only that unit's beds", () => {
    const icu = composeFacilityBedBoard({
      facilityId: "fac-1",
      unitFilter: "ICU",
      encounters: [],
      overlays: new Map(),
    });
    expect(icu.units).toHaveLength(1);
    expect(icu.units[0]?.unitCode).toBe("ICU");
    expect(icu.units[0]?.beds).toHaveLength(DEFAULT_PILOT_BED_POOLS.ICU.length);
    expect(icu.units[0]?.beds.every((b) => b.unitCode === "ICU")).toBe(true);
  });

  it("allows concurrent ED + Inpatient and treats open ED as advisory", () => {
    const d = evaluateConcurrentEncounterCreate({
      pathway: "NURSE_ADMISSION_INTAKE",
      requestedType: "INPATIENT",
      existingOpen: [{ id: "ed-1", type: "EMERGENCY", status: "OPEN" }],
    });
    expect(d.allowed).toBe(true);
    expect(openEdEncounterIsAdvisoryNotBlocker()).toBe(true);
    expect(inpatientStartMustNotCloseEdEncounter()).toBe(true);
  });

  it("reuses only a correlated receiving Inpatient", () => {
    const blind = evaluateConcurrentEncounterCreate({
      pathway: "PLACEMENT_RECEIVING",
      requestedType: "INPATIENT",
      existingOpen: [{ id: "ip-1", type: "INPATIENT", status: "OPEN" }],
    });
    expect(blind.allowed).toBe(false);

    const correlated = evaluateConcurrentEncounterCreate({
      pathway: "PLACEMENT_RECEIVING",
      requestedType: "INPATIENT",
      existingOpen: [{ id: "ip-1", type: "INPATIENT", status: "OPEN" }],
      correlatedReceivingEncounterId: "ip-1",
    });
    expect(correlated.allowed).toBe(true);
    if (correlated.allowed) {
      expect(correlated.code).toBe("IDEMPOTENT_REUSE");
      expect(correlated.reuseEncounterId).toBe("ip-1");
    }
  });

  it("opens Admission section from receiving workflow", () => {
    expect(parseInpatientWorkspaceSection("admission")).toBe("admission");
  });
});
