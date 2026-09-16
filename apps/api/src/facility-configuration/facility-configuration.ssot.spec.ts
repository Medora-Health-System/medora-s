import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Facility configuration is the hospital SSoT", () => {
  it("does not add a second hospital feature-flag env for Digital Care or messaging", () => {
    const appModule = readFileSync(resolve(process.cwd(), "src/app.module.ts"), "utf8");
    expect(appModule).toContain("FacilityConfigurationModule");
    expect(appModule).not.toMatch(/DIGITAL_CARE_ENABLED/);
    expect(appModule).not.toMatch(/FACILITY_MESSAGING_ENABLED/);
  });

  it("keeps PATIENT_PORTAL_ENABLED as a process kill switch, not a hospital flag", () => {
    const appModule = readFileSync(resolve(process.cwd(), "src/app.module.ts"), "utf8");
    expect(appModule).toMatch(/PATIENT_PORTAL_ENABLED === "true"/);
  });
});
