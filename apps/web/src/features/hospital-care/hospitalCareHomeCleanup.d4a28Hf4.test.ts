/**
 * D4A.2.8-HF4 — Hospital Care Home is executive overview only (no patient census board).
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("MEDUI.D4A.2.8-HF4 Hospital Care Home cleanup", () => {
  it("Home view does not render Active Hospital Patients section", () => {
    const home = readFileSync(
      join(process.cwd(), "src/features/hospital-care/HospitalCareHomeView.tsx"),
      "utf8"
    );
    expect(home).not.toContain("HospitalCareActivePatientsSection");
    expect(home).not.toContain("hospital-care-active-patients");
    expect(home).toContain("hospital-care-dashboard-tiles");
    expect(home).toContain("hospital-care-operational-snapshot");
    expect(home).toContain("hospital-care-recent-activity");
    expect(home).toContain("hospital-care-floor-overview");
  });

  it("Observation census still uses Active Patients section", () => {
    const obs = readFileSync(
      join(process.cwd(), "src/features/observation-workspace/ObservationCensusView.tsx"),
      "utf8"
    );
    expect(obs).toContain("HospitalCareActivePatientsSection");
  });

  it("shared Active Patients component remains available for non-Home boards", () => {
    const section = readFileSync(
      join(process.cwd(), "src/features/hospital-care/HospitalCareActivePatientsSection.tsx"),
      "utf8"
    );
    expect(section).toContain("export function HospitalCareActivePatientsSection");
  });
});
