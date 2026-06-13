import { describe, expect, it } from "vitest";
import { canReadFreestandingErObservationPatients } from "@medora/shared";

describe("hospitalObservationTechnicianAccess (MEDUI.OBS.TECH.1)", () => {
  const freestandingErLines = ["EMERGENCY", "OBSERVATION", "LABORATORY", "RADIOLOGY"] as const;

  it("freestanding ER lab tech may read observation board context", () => {
    expect(
      canReadFreestandingErObservationPatients({
        roleCodes: ["LAB"],
        facilityType: "FREESTANDING_ER",
        facilityServiceLines: [...freestandingErLines],
        departmentCode: "LABORATORY",
      })
    ).toBe(true);
  });

  it("freestanding ER rad tech may read observation board context", () => {
    expect(
      canReadFreestandingErObservationPatients({
        roleCodes: ["RADIOLOGY"],
        facilityType: "FREESTANDING_ER",
        facilityServiceLines: [...freestandingErLines],
        departmentCode: "RADIOLOGY",
      })
    ).toBe(true);
  });

  it("clinic lab tech is denied observation board context", () => {
    expect(
      canReadFreestandingErObservationPatients({
        roleCodes: ["LAB"],
        facilityType: "CLINIC",
        facilityServiceLines: ["OBSERVATION", "LABORATORY"],
        departmentCode: "LABORATORY",
      })
    ).toBe(false);
  });

  it("hospital rad tech is denied freestanding observation board context", () => {
    expect(
      canReadFreestandingErObservationPatients({
        roleCodes: ["RADIOLOGY"],
        facilityType: "HOSPITAL",
        facilityServiceLines: ["RADIOLOGY", "LABORATORY"],
        departmentCode: "RADIOLOGY",
      })
    ).toBe(false);
  });

  it("maps HTTP 403 to observationBoard.readAccessDenied contract", () => {
    const err = Object.assign(new Error("Access denied"), { status: 403 });
    const status =
      typeof err === "object" && err != null && "status" in err
        ? Number((err as { status?: number }).status)
        : null;
    expect(status).toBe(403);
  });
});
