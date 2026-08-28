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

  it("final discharge roles match governed lifecycle/discharge policy", () => {
    const controller = readFileSync(
      join(__dirname, "inpatient-operations.controller.ts"),
      "utf8"
    );
    const lifecycleDischarge = controller.match(
      /@Post\("encounters\/:encounterId\/lifecycle\/discharge"\)[\s\S]*?@RequireRoles\(([^)]+)\)/
    );
    const finalDischarge = controller.match(
      /@Post\("encounters\/:encounterId\/inpatient-final-discharge"\)[\s\S]*?@RequireRoles\(([^)]+)\)/
    );
    expect(lifecycleDischarge?.[1]).toBeDefined();
    expect(finalDischarge?.[1]).toBeDefined();
    expect(finalDischarge?.[1]).toBe(lifecycleDischarge?.[1]);
  });

  it("final discharge reuses lifecycle dischargeEncounter with transactional clinical event", () => {
    const service = readFileSync(
      join(__dirname, "inpatient-final-discharge.service.ts"),
      "utf8"
    );
    expect(service).toContain("projectInpatientFinalDischargeReadiness");
    expect(service).toContain("this.lifecycle.dischargeEncounter");
    expect(service).toContain("clinicalEventOnClose");
    expect(service).toContain("INPATIENT_FINAL_DISCHARGE_COMPLETED");
    expect(service).toContain("validateFinalDischargeRevisionPayload");
    expect(service).toContain("resolveFinalDischargeRevisionRequirements");
    expect(service).not.toContain("this.prisma.encounterClinicalEvent.create");
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
    expect(lifecycle).toContain("clinicalEventOnClose");
  });

  it("print layout prefers clinicalDispositionCode over coarse mapped status", () => {
    const print = readFileSync(
      join(__dirname, "../../../web/src/components/encounters/DischargePrintLayout.tsx"),
      "utf8"
    );
    expect(print).toContain("clinicalDispositionCode");
    expect(print).toContain("ELOPED stays ELOPED");
  });
});
