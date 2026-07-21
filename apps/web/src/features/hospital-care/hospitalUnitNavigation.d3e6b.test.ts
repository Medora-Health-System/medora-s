import { describe, expect, it } from "vitest";
import {
  ALL_HOSPITAL_UNITS_SELECTION_ID,
  buildHospitalUnitRegistryV1,
  filterCensusByUnitSelection,
  selectionFromUnitDropdownValue,
  unitDropdownValueFromSelection,
  unitTreeMustNotUseFloorHierarchy,
} from "@medora/shared";

describe("D3E.6B hospital unit navigation (web)", () => {
  it("defaults All Hospital Units and syncs dropdown with tree selection", () => {
    const all = selectionFromUnitDropdownValue(ALL_HOSPITAL_UNITS_SELECTION_ID);
    expect(all.kind).toBe("ALL");
    expect(unitDropdownValueFromSelection(all)).toBe(ALL_HOSPITAL_UNITS_SELECTION_ID);
    const ms = selectionFromUnitDropdownValue("MS");
    expect(ms.kind).toBe("UNIT");
    expect(unitDropdownValueFromSelection(ms)).toBe("MS");
  });

  it("loads configured units when placement is disabled and keeps zero-patient units", () => {
    const reg = buildHospitalUnitRegistryV1({
      facilityId: "fac-1",
      placementAvailability: "FEATURE_DISABLED",
      patients: [],
      includeDevelopmentFixtures: false,
    });
    expect(reg.units.some((u) => u.code === "MS")).toBe(true);
    expect(reg.units.some((u) => u.code === "ICU")).toBe(true);
    expect(reg.units.every((u) => u.patientCount === 0)).toBe(true);
    expect(reg.units.some((u) => /floor|level/i.test(u.name))).toBe(false);
  });

  it("filters unit census without duplicating patients", () => {
    const patients = [
      {
        encounterId: "e1",
        clinicalContext: "INPATIENT" as const,
        patientName: "A",
        mrn: "1",
        ageSex: null,
        unitRoomBed: "MS-2",
        chiefComplaint: null,
        attendingName: null,
        nurseName: null,
        admittedAt: null,
        losHours: 2,
        alerts: [],
      },
    ];
    const ms = filterCensusByUnitSelection(patients, { kind: "UNIT", unitCode: "MS" });
    const all = filterCensusByUnitSelection(patients, { kind: "ALL" });
    expect(ms).toHaveLength(1);
    expect(all).toHaveLength(1);
    expect(unitTreeMustNotUseFloorHierarchy()).toBe(true);
  });

  it("keeps awaiting-bed patients under All and Awaiting buckets", () => {
    const patients = [
      {
        encounterId: "e2",
        clinicalContext: "INPATIENT" as const,
        patientName: "B",
        mrn: "2",
        ageSex: null,
        unitRoomBed: null,
        chiefComplaint: null,
        attendingName: null,
        nurseName: null,
        admittedAt: null,
        losHours: 1,
        alerts: [],
      },
    ];
    expect(filterCensusByUnitSelection(patients, { kind: "ALL" })).toHaveLength(1);
    expect(filterCensusByUnitSelection(patients, { kind: "AWAITING" })).toHaveLength(1);
  });
});
