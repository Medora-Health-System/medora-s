import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  D4C10D_CERTIFICATION_ID,
  isClinicAmbulatoryWorklistServiceLine,
  planDentalVisitStart,
} from "@medora/shared";

describe("MEDUI.D4C.10D web visit routing guards", () => {
  it("exports certification", () => {
    expect(D4C10D_CERTIFICATION_ID).toBe("MEDUI.D4C.10D");
  });

  it("Dental dashboard uses claim-or-start (not blind create)", () => {
    const dash = readFileSync(join(__dirname, "DentalCareDashboardView.tsx"), "utf8");
    expect(dash).toContain("claim-or-start");
    expect(dash).toContain("D4C.10D");
    expect(dash).not.toMatch(/\/patients\/\$\{encodeURIComponent\(patientId\)\}\/encounters/);
  });

  it("Clinic board semantics: Dental not clinic worklist", () => {
    expect(isClinicAmbulatoryWorklistServiceLine("DENTAL")).toBe(false);
  });

  it("same patient two legitimate visits not collapsed by patientId", () => {
    const plan = planDentalVisitStart([
      {
        id: "clinic-doc",
        type: "OUTPATIENT",
        status: "OPEN",
        serviceLine: "CLINIC",
        providerNote: "seen",
      },
    ]);
    expect(plan.action).toBe("CREATE_NEW_DENTAL");
  });
});
