/**
 * INP.DIS.1E — Final discharge API surface regression.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("INP.DIS.1E inpatient final discharge API", () => {
  it("registers GET/POST final-discharge routes", () => {
    const controller = readFileSync(
      join(__dirname, "inpatient-operations.controller.ts"),
      "utf8"
    );
    expect(controller).toContain(
      '@Get("encounters/:encounterId/inpatient-final-discharge")'
    );
    expect(controller).toContain(
      '@Post("encounters/:encounterId/inpatient-final-discharge")'
    );
    expect(controller).toContain("InpatientFinalDischargeService");
  });

  it("final discharge reuses lifecycle dischargeEncounter and does not mutate status directly", () => {
    const service = readFileSync(
      join(__dirname, "inpatient-final-discharge.service.ts"),
      "utf8"
    );
    expect(service).toContain("projectInpatientFinalDischargeReadiness");
    expect(service).toContain("this.lifecycle.dischargeEncounter");
    expect(service).toContain("INPATIENT_FINAL_DISCHARGE_COMPLETED");
    expect(service).toContain("expectedProviderRevision");
    expect(service).toContain("expectedNursingRevision");
    expect(service).not.toContain("status: EncounterStatus.CLOSED");
  });

  it("lifecycle discharge preserves clinical disposition and coarse status", () => {
    const lifecycle = readFileSync(
      join(__dirname, "inpatient-lifecycle.service.ts"),
      "utf8"
    );
    expect(lifecycle).toContain("clinicalDispositionCode");
    expect(lifecycle).toContain("dischargeStatus");
    expect(lifecycle).toContain("dischargeSummaryJson");
  });
});
