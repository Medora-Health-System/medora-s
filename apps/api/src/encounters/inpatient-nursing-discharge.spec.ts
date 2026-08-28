/**
 * INP.DIS.1D — Nursing inpatient discharge API surface regression.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("INP.DIS.1D inpatient nursing discharge API", () => {
  it("registers governed GET/PATCH routes on InpatientOperationsController", () => {
    const controller = readFileSync(
      join(__dirname, "inpatient-operations.controller.ts"),
      "utf8"
    );
    expect(controller).toContain(
      '@Get("encounters/:encounterId/inpatient-nursing-discharge")'
    );
    expect(controller).toContain(
      '@Patch("encounters/:encounterId/inpatient-nursing-discharge")'
    );
    expect(controller).toContain("@RequireRoles(RoleCode.RN)");
    expect(controller).toContain("InpatientNursingDischargeService");
  });

  it("service enforces RN-only write, authorship, and no encounter close", () => {
    const service = readFileSync(
      join(__dirname, "inpatient-nursing-discharge.service.ts"),
      "utf8"
    );
    expect(service).toContain("requireNurseWrite");
    expect(service).toContain("sanitizeInpatientNursingDischargeClientPayload");
    expect(service).toContain("buildClinicalAuthorSnapshotPersist");
    expect(service).toContain("assertSameClinicalAuthor");
    expect(service).toContain("mergeInpatientNursingDischargeIntoDischargeSummary");
    expect(service).toContain("INPATIENT_NURSING_DISCHARGE_REVISION_CONFLICT");
    expect(service).toContain("encounterClosed: false");
    expect(service).toContain("does not close the encounter");
    expect(service).not.toContain("dischargeEncounter(");
  });

  it("provider PATCH returns server readiness (1C hardening)", () => {
    const service = readFileSync(
      join(__dirname, "inpatient-provider-discharge.service.ts"),
      "utf8"
    );
    expect(service).toContain("computeReadiness");
    expect(service).toContain("readiness: this.computeReadiness");
  });
});
