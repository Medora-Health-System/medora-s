/**
 * INP.DIS.1E — Final discharge API surface regression.
 * INP.DIS.1F.3 — Legacy public lifecycle/discharge bypass must stay retired.
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

  it("final discharge POST uses InpatientFinalDischargeService with PROVIDER/RN/ADMIN roles", () => {
    const controller = readFileSync(
      join(__dirname, "inpatient-operations.controller.ts"),
      "utf8"
    );
    const finalDischarge = controller.match(
      /@Post\("encounters\/:encounterId\/inpatient-final-discharge"\)[\s\S]*?@RequireRoles\(([^)]+)\)/
    );
    expect(finalDischarge?.[1]).toBeDefined();
    expect(finalDischarge?.[1]).toContain("RoleCode.PROVIDER");
    expect(finalDischarge?.[1]).toContain("RoleCode.RN");
    expect(finalDischarge?.[1]).toContain("RoleCode.ADMIN");
    const postBlock = controller.slice(
      controller.indexOf('@Post("encounters/:encounterId/inpatient-final-discharge")')
    );
    expect(postBlock).toContain("this.inpatientFinalDischarge.execute");
  });

  it("INP.DIS.1F.3 — legacy public lifecycle/discharge route is removed (no bypass)", () => {
    const controller = readFileSync(
      join(__dirname, "inpatient-operations.controller.ts"),
      "utf8"
    );
    expect(controller).not.toContain(
      '@Post("encounters/:encounterId/lifecycle/discharge")'
    );
    // Controllers must not wire HTTP discharge → lifecycle.dischargeEncounter
    expect(controller).not.toMatch(
      /lifecycle\.dischargeEncounter\s*\(/
    );
    // Cancel / void / transfer remain
    expect(controller).toContain('lifecycle/cancel-admission');
    expect(controller).toContain('lifecycle/void-encounter');
    expect(controller).toContain('lifecycle/transfer-bed');
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
